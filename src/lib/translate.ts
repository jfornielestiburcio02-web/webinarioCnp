import type {
  ComunicadoBlock,
  ComunicadoRecord,
  ComunicadoTranslation,
  InactivityRecord,
  InactivityTranslation,
  MedicalRecord,
  MedicalTranslation,
  PortalRecord,
  PortalTranslation,
  PromotionRecord,
  PromotionTranslation,
  SanctionRecord,
  SanctionTranslation,
} from './db';
import type { Lang } from './i18n';

export interface TranslationKeyItem {
  key: string;
  text: string;
}

export interface BilingualMapResult {
  detectedSource: Lang;
  es: Record<string, string>;
  ca: Record<string, string>;
}

export interface TranslateApiError {
  ok: false;
  error: string;
  code?: string;
}

export interface TranslateApiSuccess extends BilingualMapResult {
  ok: true;
}

export type TranslateApiResponse = TranslateApiSuccess | TranslateApiError;

export async function requestBilingualTranslation(
  items: TranslationKeyItem[]
): Promise<TranslateApiResponse> {
  const nonEmpty = items.filter((item) => item.text.trim().length > 0);
  if (nonEmpty.length === 0) {
    const emptyMap: Record<string, string> = {};
    for (const item of items) emptyMap[item.key] = item.text;
    return {
      ok: true,
      detectedSource: 'es',
      es: emptyMap,
      ca: emptyMap,
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  try {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
      signal: controller.signal,
    });

    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      code?: string;
      detectedSource?: Lang;
      es?: Record<string, string>;
      ca?: Record<string, string>;
    };

    if (!res.ok || !data.es || !data.ca) {
      return {
        ok: false,
        error:
          data.error ||
          `Error ${res.status} al traducir automáticamente el contenido.`,
        code: data.code,
      };
    }

    return {
      ok: true,
      detectedSource: data.detectedSource === 'ca' ? 'ca' : 'es',
      es: data.es,
      ca: data.ca,
    };
  } catch (err) {
    const timedOut = err instanceof Error && err.name === 'AbortError';
    return {
      ok: false,
      error: timedOut
        ? 'Tiempo de espera agotado al traducir automáticamente.'
        : 'No se pudo conectar con el servicio de traducción automática.',
      code: timedOut ? 'TIMEOUT' : 'NETWORK_ERROR',
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

export function extractComunicadoItems(
  record: Pick<ComunicadoRecord, 'titulo' | 'autor' | 'cuerpo'>
): TranslationKeyItem[] {
  const items: TranslationKeyItem[] = [{ key: 'titulo', text: record.titulo }];
  if (record.autor && record.autor.trim()) {
    items.push({ key: 'autor', text: record.autor });
  }

  const cuerpo = Array.isArray(record.cuerpo) ? record.cuerpo : [];
  cuerpo.forEach((block, bIdx) => {
    if (!block) return;
    if (block.t === 'p' && block.x) {
      items.push({ key: `b_${bIdx}`, text: block.x });
    } else if (block.t === 'ul' && Array.isArray(block.items)) {
      block.items.forEach((li, iIdx) => {
        if (li.b) {
          items.push({ key: `b_${bIdx}_${iIdx}_b`, text: li.b });
        }
        if (li.x) {
          items.push({ key: `b_${bIdx}_${iIdx}_x`, text: li.x });
        }
      });
    }
  });

  return items;
}

export function buildComunicadoTranslations(
  record: Pick<ComunicadoRecord, 'titulo' | 'autor' | 'cuerpo'>,
  result: BilingualMapResult
): Record<Lang, ComunicadoTranslation> {
  const rebuild = (lang: Lang): ComunicadoTranslation => {
    const map = result[lang];
    const cuerpo: ComunicadoBlock[] = (
      Array.isArray(record.cuerpo) ? record.cuerpo : []
    ).map((block, bIdx) => {
      if (block.t === 'ul' && Array.isArray(block.items)) {
        return {
          t: 'ul',
          items: block.items.map((li, iIdx) => ({
            b: map[`b_${bIdx}_${iIdx}_b`] ?? li.b,
            ...(li.x !== undefined
              ? { x: map[`b_${bIdx}_${iIdx}_x`] ?? li.x }
              : {}),
          })),
        };
      }
      return {
        t: 'p',
        x: map[`b_${bIdx}`] ?? block.x ?? '',
      };
    });

    return {
      titulo: map.titulo ?? record.titulo,
      ...(record.autor ? { autor: map.autor ?? record.autor } : {}),
      cuerpo,
    };
  };

  return {
    es: rebuild('es'),
    ca: rebuild('ca'),
  };
}

export function resolveComunicado(
  record: ComunicadoRecord,
  lang: Lang
): { titulo: string; autor?: string; cuerpo: ComunicadoBlock[]; isTranslated: boolean } {
  const localized = record.translations?.[lang];
  if (localized) {
    return {
      titulo: localized.titulo,
      autor: localized.autor ?? record.autor,
      cuerpo: localized.cuerpo,
      isTranslated: Boolean(record.sourceLang && record.sourceLang !== lang),
    };
  }
  return {
    titulo: record.titulo,
    autor: record.autor,
    cuerpo: record.cuerpo,
    isTranslated: false,
  };
}

export function extractMedicalItems(
  record: Pick<MedicalRecord, 'aptitud' | 'evaluacion' | 'recomendaciones'>
): TranslationKeyItem[] {
  const items: TranslationKeyItem[] = [
    { key: 'aptitud', text: record.aptitud },
    { key: 'evaluacion', text: record.evaluacion },
  ];
  if (record.recomendaciones.trim()) {
    items.push({ key: 'recomendaciones', text: record.recomendaciones });
  }
  return items;
}

export function buildMedicalTranslations(
  record: Pick<MedicalRecord, 'aptitud' | 'evaluacion' | 'recomendaciones'>,
  result: BilingualMapResult
): Record<Lang, MedicalTranslation> {
  const rebuild = (lang: Lang): MedicalTranslation => {
    const map = result[lang];
    return {
      aptitud: map.aptitud ?? record.aptitud,
      evaluacion: map.evaluacion ?? record.evaluacion,
      recomendaciones: record.recomendaciones.trim()
        ? (map.recomendaciones ?? record.recomendaciones)
        : '',
    };
  };

  return {
    es: rebuild('es'),
    ca: rebuild('ca'),
  };
}

export function resolveMedical(
  record: MedicalRecord,
  lang: Lang
): MedicalTranslation & { isTranslated: boolean } {
  const localized = record.translations?.[lang];
  if (localized) {
    return {
      ...localized,
      isTranslated: Boolean(record.sourceLang && record.sourceLang !== lang),
    };
  }
  return {
    aptitud: record.aptitud,
    evaluacion: record.evaluacion,
    recomendaciones: record.recomendaciones,
    isTranslated: false,
  };
}

export function extractSanctionItems(
  record: Pick<
    SanctionRecord,
    'tipo' | 'motivo' | 'delitosEjercicio' | 'apelacion' | 'notas'
  >
): TranslationKeyItem[] {
  const items: TranslationKeyItem[] = [
    { key: 'tipo', text: record.tipo },
    { key: 'motivo', text: record.motivo },
    { key: 'delitosEjercicio', text: record.delitosEjercicio },
    { key: 'apelacion', text: record.apelacion },
  ];
  if (record.notas.trim()) {
    items.push({ key: 'notas', text: record.notas });
  }
  return items;
}

export function buildSanctionTranslations(
  record: Pick<
    SanctionRecord,
    'tipo' | 'motivo' | 'delitosEjercicio' | 'apelacion' | 'notas'
  >,
  result: BilingualMapResult
): Record<Lang, SanctionTranslation> {
  const rebuild = (lang: Lang): SanctionTranslation => {
    const map = result[lang];
    return {
      tipo: map.tipo ?? record.tipo,
      motivo: map.motivo ?? record.motivo,
      delitosEjercicio: map.delitosEjercicio ?? record.delitosEjercicio,
      apelacion: map.apelacion ?? record.apelacion,
      notas: record.notas.trim() ? (map.notas ?? record.notas) : '',
    };
  };

  return {
    es: rebuild('es'),
    ca: rebuild('ca'),
  };
}

export function resolveSanction(
  record: SanctionRecord,
  lang: Lang
): SanctionTranslation & { isTranslated: boolean } {
  const localized = record.translations?.[lang];
  if (localized) {
    return {
      ...localized,
      isTranslated: Boolean(record.sourceLang && record.sourceLang !== lang),
    };
  }
  return {
    tipo: record.tipo,
    motivo: record.motivo,
    delitosEjercicio: record.delitosEjercicio,
    apelacion: record.apelacion,
    notas: record.notas,
    isTranslated: false,
  };
}

export function extractPortalTextItems(portal: PortalRecord): TranslationKeyItem[] {
  const items: TranslationKeyItem[] = [];
  if (portal.licenciasPoliciales?.trim()) {
    items.push({ key: 'licenciasPoliciales', text: portal.licenciasPoliciales });
  }
  if (portal.disciplinario?.traspasoDe?.trim()) {
    items.push({ key: 'traspasoDe', text: portal.disciplinario.traspasoDe });
  }
  if (portal.disciplinario?.gravedad?.trim()) {
    items.push({ key: 'gravedad', text: portal.disciplinario.gravedad });
  }
  if (portal.personal?.estadoLegal?.trim()) {
    items.push({ key: 'estadoLegal', text: portal.personal.estadoLegal });
  }
  return items;
}

export function buildPortalTranslations(
  portal: PortalRecord,
  result: BilingualMapResult
): Record<Lang, PortalTranslation> {
  const rebuild = (lang: Lang): PortalTranslation => {
    const map = result[lang];
    return {
      licenciasPoliciales: portal.licenciasPoliciales
        ? (map.licenciasPoliciales ?? portal.licenciasPoliciales)
        : null,
      traspasoDe: portal.disciplinario?.traspasoDe
        ? (map.traspasoDe ?? portal.disciplinario.traspasoDe)
        : null,
      gravedad: portal.disciplinario?.gravedad
        ? (map.gravedad ?? portal.disciplinario.gravedad)
        : null,
      estadoLegal: portal.personal?.estadoLegal
        ? (map.estadoLegal ?? portal.personal.estadoLegal)
        : null,
    };
  };

  return {
    es: rebuild('es'),
    ca: rebuild('ca'),
  };
}

export function resolvePortalText(
  portal: PortalRecord,
  field: keyof PortalTranslation,
  lang: Lang
): string | null | undefined {
  const localized = portal.translations?.[lang]?.[field];
  if (localized !== undefined && localized !== null) return localized;
  if (field === 'licenciasPoliciales') return portal.licenciasPoliciales;
  if (field === 'traspasoDe') return portal.disciplinario?.traspasoDe;
  if (field === 'gravedad') return portal.disciplinario?.gravedad;
  return portal.personal?.estadoLegal;
}

export function extractPromotionItems(
  record: Pick<PromotionRecord, 'superiores' | 'motivo' | 'observaciones'>
): TranslationKeyItem[] {
  const items: TranslationKeyItem[] = [
    { key: 'superiores', text: record.superiores },
    { key: 'motivo', text: record.motivo },
  ];
  if (record.observaciones.trim()) {
    items.push({ key: 'observaciones', text: record.observaciones });
  }
  return items;
}

export function buildPromotionTranslations(
  record: Pick<PromotionRecord, 'superiores' | 'motivo' | 'observaciones'>,
  result: BilingualMapResult
): Record<Lang, PromotionTranslation> {
  const rebuild = (lang: Lang): PromotionTranslation => {
    const map = result[lang];
    return {
      superiores: map.superiores ?? record.superiores,
      motivo: map.motivo ?? record.motivo,
      observaciones: record.observaciones.trim()
        ? (map.observaciones ?? record.observaciones)
        : '',
    };
  };

  return {
    es: rebuild('es'),
    ca: rebuild('ca'),
  };
}

export function resolvePromotion(
  record: PromotionRecord,
  lang: Lang
): PromotionTranslation & { isTranslated: boolean } {
  const localized = record.translations?.[lang];
  if (localized) {
    return {
      ...localized,
      isTranslated: Boolean(record.sourceLang && record.sourceLang !== lang),
    };
  }
  return {
    superiores: record.superiores,
    motivo: record.motivo,
    observaciones: record.observaciones,
    isTranslated: false,
  };
}

export function extractInactivityItems(
  record: Pick<InactivityRecord, 'motivo' | 'motivoResolucion'>
): TranslationKeyItem[] {
  const items: TranslationKeyItem[] = [{ key: 'motivo', text: record.motivo }];
  if (record.motivoResolucion && record.motivoResolucion.trim()) {
    items.push({ key: 'motivoResolucion', text: record.motivoResolucion });
  }
  return items;
}

export function buildInactivityTranslations(
  record: Pick<InactivityRecord, 'motivo' | 'motivoResolucion'>,
  result: BilingualMapResult
): Record<Lang, InactivityTranslation> {
  const rebuild = (lang: Lang): InactivityTranslation => {
    const map = result[lang];
    return {
      motivo: map.motivo ?? record.motivo,
      ...(record.motivoResolucion
        ? {
            motivoResolucion:
              map.motivoResolucion ?? record.motivoResolucion,
          }
        : {}),
    };
  };

  return {
    es: rebuild('es'),
    ca: rebuild('ca'),
  };
}

export function resolveInactivity(
  record: InactivityRecord,
  lang: Lang
): { motivo: string; motivoResolucion: string | null; isTranslated: boolean } {
  const localized = record.translations?.[lang];
  if (localized) {
    return {
      motivo: localized.motivo,
      motivoResolucion:
        localized.motivoResolucion ?? record.motivoResolucion,
      isTranslated: Boolean(record.sourceLang && record.sourceLang !== lang),
    };
  }
  return {
    motivo: record.motivo,
    motivoResolucion: record.motivoResolucion,
    isTranslated: false,
  };
}
