import type { PortalRecord } from './db';
import { hasUnit } from './units';

export interface RankGroup {
  name: string;
  tier: number;
  ranks: string[];
}

export const GROUPS: RankGroup[] = [
  {
    name: 'Cargos Superiores',
    tier: 4,
    ranks: [
      'Director Adjunto Operativo',
      'Subdirector General de la Policía',
      'Jefe de División - Comisario General de Seguridad Ciudadana',
      'Jefe Superior de Cataluña',
    ],
  },
  {
    name: 'Escala Superior',
    tier: 3,
    ranks: [
      'Comisario Principal de la Policía Federada',
      'Comisario Principal de Territorio Provincial',
      'Comisario',
      'Comisario 2°',
    ],
  },
  {
    name: 'Escala Ejecutiva',
    tier: 2,
    ranks: [
      'Inspector Jefe',
      'Inspector',
      'Inspector en Prácticas',
      'Inspector Alumno 2° Año',
      'Inspector Alumno 1° Año',
    ],
  },
  {
    name: 'Escala Subinspección',
    tier: 1,
    ranks: ['Subinspector'],
  },
  {
    name: 'Escala Básica',
    tier: 0,
    ranks: ['Oficial de Policía', 'Policía', 'Policía en Prácticas'],
  },
];

export const CA_NAMES: Record<string, string> = {
  'Cargos Superiores': 'Càrrecs Superiors',
  'Escala Superior': 'Escala Superior',
  'Escala Ejecutiva': 'Escala Executiva',
  'Escala Subinspección': 'Escala de Subinspecció',
  'Escala Básica': 'Escala Bàsica',
  'Director Adjunto Operativo': 'Director Adjunt Operatiu',
  'Subdirector General de la Policía': 'Subdirector General de la Policia',
  'Jefe de División - Comisario General de Seguridad Ciudadana':
    'Cap de Divisió - Comissari General de Seguretat Ciutadana',
  'Jefe Superior de Cataluña': 'Cap Superior de Catalunya',
  'Comisario Principal de la Policía Federada': 'Comissari Principal de la Policia Federada',
  'Comisario Principal de Territorio Provincial': 'Comissari Principal de Territori Provincial',
  Comisario: 'Comissari',
  'Comisario 2°': 'Comissari 2n',
  'Inspector Jefe': 'Inspector Cap',
  Inspector: 'Inspector',
  'Inspector en Prácticas': 'Inspector en Pràctiques',
  'Inspector Alumno 2° Año': 'Inspector Alumne 2n Any',
  'Inspector Alumno 1° Año': 'Inspector Alumne 1r Any',
  Subinspector: 'Sotsinspector',
  'Oficial de Policía': 'Oficial de Policia',
  Policía: 'Policia',
  'Policía en Prácticas': 'Policia en Pràctiques',
};

export const TIER = new Map<string, number>();
export const ESCALA = new Map<string, string>();

for (const g of GROUPS) {
  for (const r of g.ranks) {
    TIER.set(r, g.tier);
    ESCALA.set(r, g.name);
  }
}

export function isApprover(rank: string): boolean {
  return (TIER.get(rank) ?? -1) >= 3;
}

export function isCargoSuperior(rank: string): boolean {
  return (TIER.get(rank) ?? -1) === 4;
}

export function isJuntaMember(
  rank: string,
  portal: PortalRecord | undefined,
  admin?: boolean
): boolean {
  return (
    Boolean(admin) ||
    isCargoSuperior(rank) ||
    portal?.disciplinario?.juntaSuperior === true ||
    hasUnit(portal, 'Junta Superior del Cuerpo Nacional de Policía')
  );
}

export function isPsicologo(portal: PortalRecord | undefined): boolean {
  return hasUnit(portal, 'Departamento de Psicología');
}

export function canManagePersonal(
  rank: string,
  portal: PortalRecord | undefined,
  admin?: boolean
): boolean {
  return isCargoSuperior(rank) || isJuntaMember(rank, portal, admin);
}

export function canResolve(approver: string, applicant: string): boolean {
  const a = TIER.get(approver) ?? -1;
  const b = TIER.get(applicant) ?? -1;
  if (a === 4) return true;
  if (a === 3) return b < 3;
  return false;
}
