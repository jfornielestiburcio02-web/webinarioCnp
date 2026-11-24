import type { PersonalRecord, PortalRecord } from './db';
import { POLICE_UNITS } from './units';

export interface AgentFilterOptions {
  query: string;
  rank: string;
  unit: string;
}

export const NO_UNIT_FILTER = '__NONE__';

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function getDistinctUnits(
  rows: PersonalRecord[],
  portals: Record<string, PortalRecord>
): string[] {
  const units = new Set<string>();
  for (const u of POLICE_UNITS) {
    units.add(u.name);
  }
  for (const r of rows) {
    if (r.estado !== 'aprobado') continue;
    const p = portals[r.placa];
    if (p && Array.isArray(p.unidades)) {
      for (const u of p.unidades) {
        const trimmed = u.trim();
        if (trimmed) units.add(trimmed);
      }
    }
  }
  return Array.from(units).sort((a, b) => a.localeCompare(b));
}

export function filterApprovedAgents(
  rows: PersonalRecord[],
  portals: Record<string, PortalRecord>,
  filters: AgentFilterOptions
): PersonalRecord[] {
  const q = normalize(filters.query);

  return rows
    .filter((r) => {
      if (r.estado !== 'aprobado') return false;

      if (q) {
        const matchName = normalize(r.nombres).includes(q);
        const matchPlaca = normalize(r.placa).includes(q);
        if (!matchName && !matchPlaca) return false;
      }

      if (filters.rank && r.rango !== filters.rank) {
        return false;
      }

      if (filters.unit) {
        const p = portals[r.placa];
        const agentUnits = Array.isArray(p?.unidades)
          ? p.unidades.map((u) => u.trim()).filter(Boolean)
          : [];
        if (filters.unit === NO_UNIT_FILTER) {
          if (agentUnits.length > 0) return false;
        } else if (!agentUnits.includes(filters.unit)) {
          return false;
        }
      }

      return true;
    })
    .sort((a, b) => a.nombres.localeCompare(b.nombres));
}

export function formatTriBool(
  v: boolean | null | undefined,
  yesLabel: string,
  noLabel: string,
  naLabel = 'N/A'
): string {
  if (v === true) return yesLabel;
  if (v === false) return noLabel;
  return naLabel;
}

export function formatOptionalString(
  v: string | null | undefined,
  naLabel = 'N/A'
): string {
  const s = String(v ?? '').trim();
  return s ? s : naLabel;
}

export function formatOptionalNumber(
  v: number | null | undefined,
  suffix?: string,
  naLabel = 'N/A'
): string {
  if (v === null || v === undefined || Number.isNaN(v)) return naLabel;
  return suffix ? `${v} ${suffix}` : String(v);
}

export function formatOptionalDay(
  iso: string | null | undefined,
  naLabel = 'N/A'
): string {
  const [y, m, d] = String(iso || '').split('-');
  return y && m && d
    ? `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`
    : naLabel;
}
