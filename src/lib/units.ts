import type { PortalRecord } from './db';

export interface PoliceUnit {
  id: string;
  name: string;
  nameCa: string;
  code?: string;
  category: 'judicial' | 'cientifica' | 'otras';
  description: string;
  descriptionCa: string;
}

export const UNIT_CATEGORIES: Array<{
  id: 'judicial' | 'cientifica' | 'otras';
  titleEs: string;
  titleCa: string;
  summaryEs: string;
  summaryCa: string;
}> = [
  {
    id: 'judicial',
    titleEs: 'Comisaría General de la Policía Judicial',
    titleCa: 'Comissaria General de la Policia Judicial',
    summaryEs:
      'Investigación rigurosa y persecución de la delincuencia compleja, desde el narcotráfico hasta los delitos económicos y tecnológicos.',
    summaryCa:
      'Investigació rigorosa i persecució de la delinqüència complexa, des del narcotràfic fins als delictes econòmics i tecnològics.',
  },
  {
    id: 'cientifica',
    titleEs: 'Comisaría General de la Policía Científica · Laboratorio de Actuaciones Especiales',
    titleCa: 'Comissaria General de la Policia Científica · Laboratori d’Actuacions Especials',
    summaryEs:
      'Investigación criminalística, identificación, analítica e informes periciales mediante la aplicación de métodos científicos.',
    summaryCa:
      'Investigació criminalística, identificació, analítica i informes pericials mitjançant l’aplicació de mètodes científics.',
  },
  {
    id: 'otras',
    titleEs: 'Otras Unidades Operativas, Técnicas y de Dirección',
    titleCa: 'Altres Unitats Operatives, Tècniques i de Direcció',
    summaryEs:
      'Unidades de prevención ciudadana, evaluación psicológica, gestión de licencias policiales y órgano superior de mando.',
    summaryCa:
      'Unitats de prevenció ciutadana, avaluació psicològica, gestió de llicències policials i òrgan superior de comandament.',
  },
];

export const POLICE_UNITS: PoliceUnit[] = [
  {
    id: 'cgpj',
    name: 'Comisaría General de la Policía Judicial',
    nameCa: 'Comissaria General de la Policia Judicial',
    category: 'judicial',
    description:
      'Órgano central encargado de investigar y perseguir delitos complejos, crimen organizado, tráfico de drogas y delitos financieros.',
    descriptionCa:
      'Òrgan central encarregat d’investigar i perseguir delictes complexos, crim organitzat, tràfic de drogues i delictes financers.',
  },
  {
    id: 'ucic',
    name: 'Unidad de Inteligencia Criminal',
    nameCa: 'Unitat d’Intel·ligència Criminal',
    code: 'UCIC',
    category: 'judicial',
    description:
      'Cerebro analítico de la Policía Judicial: capta y procesa información criminal, elabora prospectiva estratégica y centraliza bases de datos entre investigaciones.',
    descriptionCa:
      'Cervell analític de la Policia Judicial: capta i processa informació criminal, elabora prospectiva estratègica i centralitza bases de dades entre investigacions.',
  },
  {
    id: 'udyco',
    name: 'Unidad de Drogas y Crimen Organizado',
    nameCa: 'Unitat de Drogues i Crim Organitzat',
    code: 'UDYCO',
    category: 'judicial',
    description:
      'Unidad de élite dedicada a investigar el tráfico de estupefacientes, el blanqueo de capitales derivado y las redes de delincuencia organizada.',
    descriptionCa:
      'Unitat d’elit dedicada a investigar el tràfic d’estupefaents, el blanqueig de capitals derivat i les xarxes de delinqüència organitzada.',
  },
  {
    id: 'udef',
    name: 'Unidad Central de Delincuencia Económica y Fiscal',
    nameCa: 'Unitat Central de Delinqüència Econòmica i Fiscal',
    code: 'UDEF',
    category: 'judicial',
    description:
      'Unidad de élite especializada en delitos económicos, financieros, tecnológicos, monetarios y en la lucha contra la corrupción pública y privada.',
    descriptionCa:
      'Unitat d’elit especialitzada en delictes econòmics, financers, tecnològics, monetaris i en la lluita contra la corrupció pública i privada.',
  },
  {
    id: 'uit',
    name: 'Unidad Central de Ciberdelincuencia',
    nameCa: 'Unitat Central de Ciberdelinqüència',
    code: 'UIT',
    category: 'judicial',
    description:
      'Órgano especializado en la lucha contra la delincuencia informática y los fraudes cometidos mediante internet o nuevas tecnologías.',
    descriptionCa:
      'Òrgan especialitzat en la lluita contra la delinqüència informàtica i els fraus comesos mitjançant internet o noves tecnologies.',
  },
  {
    id: 'cgpc',
    name: 'Comisaría General de la Policía Científica',
    nameCa: 'Comissaria General de la Policia Científica',
    category: 'cientifica',
    description:
      'Laboratorio de Actuaciones Especiales encargado de la investigación criminalística, identificación, analítica e informes periciales científicos.',
    descriptionCa:
      'Laboratori d’Actuacions Especials encarregat de la investigació criminalística, identificació, analítica i informes pericials científics.',
  },
  {
    id: 'uci',
    name: 'Unidad Central de Identificación',
    nameCa: 'Unitat Central d’Identificació',
    code: 'UCI',
    category: 'cientifica',
    description:
      'Dedicada a la identificación lofoscópica (huellas dactilares), antropología forense y técnicas avanzadas de reconocimiento.',
    descriptionCa:
      'Dedicada a la identificació lofoscòpica (empremtes dactilars), antropologia forense i tècniques avançades de reconeixement.',
  },
  {
    id: 'ucc',
    name: 'Unidad Central de Criminalística',
    nameCa: 'Unitat Central de Criminalística',
    code: 'UCC',
    category: 'cientifica',
    description:
      'Encargada de peritajes de balística, documentoscopia, falsificaciones, acústica forense, análisis de patrones de escena e investigación de armas.',
    descriptionCa:
      'Encarregada de peritatges de balística, documentoscòpia, falsificacions, acústica forense, anàlisi de patrons d’escena i investigació d’armes.',
  },
  {
    id: 'sac',
    name: 'Sección de Análisis de Conducta',
    nameCa: 'Secció d’Anàlisi de Conducta',
    code: 'SAC',
    category: 'cientifica',
    description:
      'Unidad psicológica orientada al análisis de conducta criminal, perfilación de sospechosos e interrogatorios de alta tensión.',
    descriptionCa:
      'Unitat psicològica orientada a l’anàlisi de conducta criminal, perfilació de sospitosos i interrogatoris d’alta tensió.',
  },
  {
    id: 'ucac',
    name: 'Unidad Central de Análisis Científicos',
    nameCa: 'Unitat Central d’Anàlisis Científiques',
    code: 'UCAC',
    category: 'cientifica',
    description:
      'Realiza analíticas de laboratorio especializadas en las áreas de biología (ADN), química y toxicología forense.',
    descriptionCa:
      'Realitza analítiques de laboratori especialitzades en les àrees de biologia (ADN), química i toxicologia forense.',
  },
  {
    id: 'upr',
    name: 'Unidad de Prevención y Reacción',
    nameCa: 'Unitat de Prevenció i Reacció',
    code: 'UPR',
    category: 'otras',
    description:
      'Unidad operativa encargada de la prevención del delito, dispositivos de orden público y reacción rápida ante incidentes críticos.',
    descriptionCa:
      'Unitat operativa encarregada de la prevenció del delicte, dispositius d’ordre públic i reacció ràpida davant incidents crítics.',
  },
  {
    id: 'dglp',
    name: 'División de Gestión de Licencias Policiales',
    nameCa: 'Divisió de Gestió de Llicències Policials',
    category: 'otras',
    description:
      'División responsable de tramitar, supervisar y validar las licencias, habilitaciones operativas y permisos reglamentarios del cuerpo.',
    descriptionCa:
      'Divisió responsable de tramitar, supervisar i validar les llicències, habilitacions operatives i permisos reglamentaris del cos.',
  },
  {
    id: 'psicologia',
    name: 'Departamento de Psicología',
    nameCa: 'Departament de Psicologia',
    category: 'otras',
    description:
      'Departamento clínico encargado de evaluaciones psicológicas, seguimiento de citas y emisión de expedientes médicos psicológicos del personal.',
    descriptionCa:
      'Departament clínic encarregat d’avaluacions psicològiques, seguiment de cites i emissió d’expedients mèdics psicològics del personal.',
  },
  {
    id: 'gac',
    name: 'Grupo de Atención al Ciudadano',
    nameCa: 'Grup d’Atenció al Ciutadà',
    code: 'GAC',
    category: 'otras',
    description:
      'Unidad de primera respuesta en vía pública encargada de la atención inmediata a requerimientos ciudadanos y patrulla de seguridad.',
    descriptionCa:
      'Unitat de primera resposta en via pública encarregada de l’atenció immediata a requeriments ciutadans i patrulla de seguretat.',
  },
  {
    id: 'junta',
    name: 'Junta Superior del Cuerpo Nacional de Policía',
    nameCa: 'Junta Superior del Cos Nacional de Policia',
    category: 'otras',
    description:
      'Órgano colegiado de dirección con competencias en gestión de personal, imposición de sanciones disciplinarias y emisión de comunicados oficiales.',
    descriptionCa:
      'Òrgan col·legiat de direcció amb competències en gestió de personal, imposició de sancions disciplinàries i emissió de comunicats oficials.',
  },
];

function normalizeUnit(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function hasUnit(portal: PortalRecord | undefined, unitName: string): boolean {
  if (!portal || !Array.isArray(portal.unidades)) return false;
  const target = normalizeUnit(unitName);
  return portal.unidades.some((u) => {
    const norm = normalizeUnit(u);
    return norm === target || norm.includes(target);
  });
}

export function unitDisplayLabel(unit: PoliceUnit, lang: 'es' | 'ca' = 'es'): string {
  const title = lang === 'ca' ? unit.nameCa : unit.name;
  return unit.code ? `${title} (${unit.code})` : title;
}

export function unitNameForLang(rawName: string, lang: 'es' | 'ca'): string {
  if (lang === 'es') return rawName;
  const norm = normalizeUnit(rawName);
  const found = POLICE_UNITS.find((u) => normalizeUnit(u.name) === norm);
  return found ? found.nameCa : rawName;
}
