import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const MODEL_NAME = 'gemini-3.1-flash-lite';
const MAX_ITEMS = 60;
const MAX_TOTAL_CHARS = 25000;

interface TranslationInputItem {
  key: string;
  text: string;
}

interface TranslationOutputItem {
  key: string;
  es: string;
  ca: string;
}

interface GeminiTranslationPayload {
  detectedSource?: 'es' | 'ca';
  translations?: TranslationOutputItem[];
}

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = String(process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
      timeout: 15000,
    },
  });
}

function extractStatusCode(err: unknown): number {
  if (err && typeof err === 'object') {
    const anyErr = err as { status?: unknown; code?: unknown };
    if (typeof anyErr.status === 'number') return anyErr.status;
    if (typeof anyErr.code === 'number') return anyErr.code;
  }
  const msg = err instanceof Error ? err.message : String(err);
  if (/429|RESOURCE_EXHAUSTED/i.test(msg)) return 429;
  if (/403|PERMISSION_DENIED/i.test(msg)) return 403;
  if (/400|API_KEY_INVALID|INVALID_ARGUMENT/i.test(msg)) return 400;
  if (/404|NOT_FOUND/i.test(msg)) return 404;
  return 502;
}

async function generateTranslationsWithRetry(
  ai: GoogleGenAI,
  nonEmptyItems: TranslationInputItem[]
): Promise<{
  detectedSource: 'es' | 'ca';
  es: Record<string, string>;
  ca: Record<string, string>;
}> {
  const promptPayload = JSON.stringify(nonEmptyItems);
  const systemInstruction = [
    'Eres un traductor institucional oficial bilingüe (castellano <-> catalán) para la intranet policial Webpol del Cuerpo Nacional de Policía (CNP) en Cataluña.',
    'Recibirás un array JSON de objetos { "key": string, "text": string }.',
    'Para cada elemento:',
    '1. Detecta si el texto original está redactado en castellano ("es") o en catalán ("ca").',
    '2. Devuelve exactamente la versión en castellano ("es") y la versión en catalán ("ca").',
    '3. Si el texto original ya está en uno de los dos idiomas, consérvalo fielmente en ese idioma y tradúcelo con rigor administrativo, policial y jurídico al otro idioma.',
    '4. Conserva nombres propios, números de placa (ej. CNP001), DNI, fechas, siglas oficiales (UCIC, UDYCO, UDEF, UIT, UCI, UCC, SAC, UCAC, UPR, GAC, CNP) y saltos de línea.',
    '5. Devuelve únicamente JSON válido ajustado al esquema solicitado, manteniendo exactamente cada "key".',
  ].join('\n');

  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: `Traduce al castellano y al catalán los siguientes campos:\n${promptPayload}`,
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              detectedSource: {
                type: Type.STRING,
                description: 'Detected source language: es or ca',
              },
              translations: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    key: { type: Type.STRING },
                    es: { type: Type.STRING },
                    ca: { type: Type.STRING },
                  },
                  required: ['key', 'es', 'ca'],
                },
              },
            },
            required: ['detectedSource', 'translations'],
          },
        },
      });

      const rawText = (response.text ?? '{}').trim();
      const parsed = JSON.parse(rawText) as GeminiTranslationPayload;
      const es: Record<string, string> = {};
      const ca: Record<string, string> = {};

      for (const original of nonEmptyItems) {
        const match = Array.isArray(parsed.translations)
          ? parsed.translations.find((t) => t && t.key === original.key)
          : undefined;
        es[original.key] =
          match && typeof match.es === 'string' && match.es.trim()
            ? match.es
            : original.text;
        ca[original.key] =
          match && typeof match.ca === 'string' && match.ca.trim()
            ? match.ca
            : original.text;
      }

      const detectedSource: 'es' | 'ca' =
        parsed.detectedSource === 'ca' ? 'ca' : 'es';
      return { detectedSource, es, ca };
    } catch (err) {
      lastError = err;
      const status = extractStatusCode(err);
      const retryable = status === 429 || status >= 500;
      if (!retryable || attempt === 1) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, 400 * Math.pow(2, attempt)));
    }
  }

  throw lastError;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '256kb' }));

  app.post('/api/translate', async (req, res) => {
    const body = req.body as { items?: unknown } | undefined;
    if (!body || !Array.isArray(body.items)) {
      res.status(400).json({
        error: 'Formato de solicitud inválido: se requiere un array items.',
        code: 'INVALID_BODY',
      });
      return;
    }

    if (body.items.length === 0 || body.items.length > MAX_ITEMS) {
      res.status(400).json({
        error: `Número de campos fuera de rango (1-${MAX_ITEMS}).`,
        code: 'INVALID_ITEM_COUNT',
      });
      return;
    }

    const sanitized: TranslationInputItem[] = [];
    let totalChars = 0;

    for (const entry of body.items) {
      if (
        !entry ||
        typeof entry !== 'object' ||
        typeof (entry as { key?: unknown }).key !== 'string' ||
        typeof (entry as { text?: unknown }).text !== 'string'
      ) {
        res.status(400).json({
          error: 'Cada elemento debe incluir key y text de tipo cadena.',
          code: 'INVALID_ITEM',
        });
        return;
      }

      const key = (entry as { key: string }).key.trim();
      const text = (entry as { text: string }).text;
      if (!key) {
        res.status(400).json({
          error: 'Las claves de traducción no pueden estar vacías.',
          code: 'EMPTY_KEY',
        });
        return;
      }

      totalChars += text.length;
      if (totalChars > MAX_TOTAL_CHARS) {
        res.status(400).json({
          error: 'El contenido supera el límite máximo permitido para traducción.',
          code: 'PAYLOAD_TOO_LARGE',
        });
        return;
      }

      sanitized.push({ key, text });
    }

    const nonEmptyItems = sanitized.filter((item) => item.text.trim().length > 0);
    if (nonEmptyItems.length === 0) {
      const emptyMap: Record<string, string> = {};
      for (const item of sanitized) emptyMap[item.key] = item.text;
      res.json({ detectedSource: 'es', es: emptyMap, ca: emptyMap });
      return;
    }

    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        error:
          'El servicio de traducción automática requiere configurar GEMINI_API_KEY en Settings > Secrets.',
        code: 'MISSING_API_KEY',
      });
      return;
    }

    try {
      const translated = await generateTranslationsWithRetry(ai, nonEmptyItems);
      const es = { ...translated.es };
      const ca = { ...translated.ca };
      for (const item of sanitized) {
        if (!(item.key in es)) es[item.key] = item.text;
        if (!(item.key in ca)) ca[item.key] = item.text;
      }

      res.json({
        detectedSource: translated.detectedSource,
        es,
        ca,
      });
    } catch (err) {
      const status = extractStatusCode(err);
      const rawMsg = err instanceof Error ? err.message : 'Error de traducción';
      res.status(status).json({
        error:
          status === 400 || status === 403
            ? 'No se pudo autenticar la clave GEMINI_API_KEY. Revísala en Settings > Secrets.'
            : status === 429
              ? 'Límite temporal de peticiones alcanzado al traducir. Inténtalo de nuevo en unos segundos.'
              : `No se pudo completar la traducción automática (${rawMsg}).`,
        code: `UPSTREAM_${status}`,
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexHtml = path.join(distDir, 'index.html');
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(404).send('Build not found');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Webpol CNP server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Webpol CNP server:', err);
  process.exit(1);
});
