import { TIER } from './ranks';
import type { TranslationKey } from './i18n';

const enc = new TextEncoder();

export function b64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function unb64(s: string): Uint8Array {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}

export async function derive(password: string, salt: Uint8Array): Promise<string> {
  if (!(globalThis.crypto && globalThis.crypto.subtle)) {
    throw new Error('NO_CRYPTO');
  }
  const key = await globalThis.crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const saltCopy = new Uint8Array(salt);
  const bits = await globalThis.crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: saltCopy, iterations: 150000 },
    key,
    256
  );
  return b64(bits);
}

export interface RegisterValidationInput {
  dni: string;
  nombres: string;
  placa: string;
  rango: string;
  pass: string;
  pass2: string;
}

export function validateRegisterInput(
  raw: RegisterValidationInput
): { ok: true; dni: string; nombres: string; placa: string; rango: string; pass: string } | { ok: false; errorKey: TranslationKey } {
  const dni = raw.dni.trim().toUpperCase();
  const nombres = raw.nombres.trim().replace(/\s+/g, ' ');
  const placa = raw.placa.trim().toUpperCase();
  const rango = raw.rango;
  const pass = raw.pass;

  if (!/^\d{8}[A-Z]$/.test(dni)) return { ok: false, errorKey: 'vDni' };
  if (!/^[\p{L}][\p{L}\s'.-]{2,99}$/u.test(nombres)) return { ok: false, errorKey: 'vNombres' };
  if (!/^[A-Z0-9]{3,10}$/.test(placa)) return { ok: false, errorKey: 'vPlaca' };
  if (!TIER.has(rango)) return { ok: false, errorKey: 'vRango' };
  if (pass.length < 8 || pass.length > 128) return { ok: false, errorKey: 'vPass' };
  if (pass !== raw.pass2) return { ok: false, errorKey: 'vPass2' };

  return { ok: true, dni, nombres, placa, rango, pass };
}
