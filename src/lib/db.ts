import { TIER } from './ranks';

export type EstadoRegistro = 'aprobado' | 'pendiente' | 'rechazado';

export interface PersonalRecord {
  dni: string;
  nombres: string;
  placa: string;
  rango: string;
  salt: string;
  hash: string;
  estado: EstadoRegistro;
  creado: string;
  resueltoPor: string | null;
  resueltoEn: string | null;
  motivo: string | null;
  admin?: boolean;
}

export interface PortalTranslation {
  licenciasPoliciales?: string | null;
  traspasoDe?: string | null;
  gravedad?: string | null;
  estadoLegal?: string | null;
}

export interface PortalRecord {
  foto?: string | null;
  ingreso?: string | null;
  unidades?: string[];
  licenciasPoliciales?: string | null;
  ultimaCitaPsicologica?: string | null;
  translations?: Partial<Record<'es' | 'ca', PortalTranslation>>;
  disciplinario?: {
    leves?: number | null;
    graves?: number | null;
    ascensos?: number | null;
    descensos?: number | null;
    traspaso?: boolean | null;
    traspasoDe?: string | null;
    juntaSuperior?: boolean | null;
    supervision?: boolean | null;
    expedientes?: boolean | null;
    gravedad?: string | null;
  };
  judicial?: {
    demandado?: boolean | null;
    causasAbiertas?: boolean | null;
  };
  personal?: {
    estadoLegal?: string | null;
    edad?: number | null;
    nacimiento?: string | null;
  };
}

export interface MedicalTranslation {
  aptitud: string;
  evaluacion: string;
  recomendaciones: string;
}

export interface MedicalRecord {
  id: string;
  agentePlaca: string;
  agenteNombre: string;
  fechaCita: string;
  aptitud: string;
  evaluacion: string;
  recomendaciones: string;
  autorPlaca: string;
  autorNombre: string;
  creadoEn: string;
  sourceLang?: 'es' | 'ca';
  translations?: Partial<Record<'es' | 'ca', MedicalTranslation>>;
}

export interface SanctionTranslation {
  tipo: string;
  motivo: string;
  delitosEjercicio: string;
  apelacion: string;
  notas: string;
}

export interface SanctionRecord {
  id: string;
  superiorPlaca: string;
  superiorLabel: string;
  agentePlaca: string;
  agenteNombre: string;
  motivo: string;
  tipo: string;
  ceroTolerancia: boolean;
  fechaInfraccion: string;
  delitosEjercicio: string;
  apelacion: string;
  notas: string;
  creadoEn: string;
  sourceLang?: 'es' | 'ca';
  translations?: Partial<Record<'es' | 'ca', SanctionTranslation>>;
}

export interface ComunicadoBlock {
  t: 'p' | 'ul';
  x?: string;
  items?: Array<{ b: string; x?: string }>;
}

export interface ComunicadoTranslation {
  titulo: string;
  autor?: string;
  cuerpo: ComunicadoBlock[];
}

export interface ComunicadoRecord {
  id: string;
  titulo: string;
  fecha: string;
  autor?: string;
  cuerpo: ComunicadoBlock[];
  sourceLang?: 'es' | 'ca';
  translations?: Partial<Record<'es' | 'ca', ComunicadoTranslation>>;
}

export interface PromotionTranslation {
  superiores: string;
  motivo: string;
  observaciones: string;
}

export interface PromotionRecord {
  id: string;
  superiores: string;
  agentePlaca: string;
  agenteNombre: string;
  rangoPromociona: string;
  rangoAnterior: string;
  motivo: string;
  fechaPromocion: string;
  observaciones: string;
  autorPlaca: string;
  creadoEn: string;
  sourceLang?: 'es' | 'ca';
  translations?: Partial<Record<'es' | 'ca', PromotionTranslation>>;
}

export type InactivityStatus = 'pendiente' | 'aprobado' | 'rechazado';

export interface InactivityTranslation {
  motivo: string;
  motivoResolucion?: string;
}

export interface InactivityRecord {
  id: string;
  agentePlaca: string;
  agenteNombre: string;
  agenteRango: string;
  motivo: string;
  fechaInicio: string;
  fechaFin: string;
  estado: InactivityStatus;
  creadoEn: string;
  resueltoPor: string | null;
  resueltoEn: string | null;
  motivoResolucion: string | null;
  sourceLang?: 'es' | 'ca';
  translations?: Partial<Record<'es' | 'ca', InactivityTranslation>>;
}

interface WebpolStoreState {
  personal: PersonalRecord[];
  portals: Record<string, PortalRecord>;
  comunicados: ComunicadoRecord[];
  medicalRecords: MedicalRecord[];
  sanctions: SanctionRecord[];
  promotions: PromotionRecord[];
  inactivityRequests: InactivityRecord[];
}

const STORAGE_KEY = 'webpol_cnp_preview_db_v1';

const SEED_COMUNICADOS: ComunicadoRecord[] = [
  {
    id: 'com-001',
    titulo: 'Protocolo de uniformidad y servicio en vía pública',
    fecha: '2026-11-18',
    autor: 'Jefatura Superior de Cataluña',
    sourceLang: 'es',
    cuerpo: [
      {
        t: 'p',
        x: 'Se recuerda a todos los integrantes del Cuerpo Nacional de Policía destinados en la demarcación de Cataluña la obligatoriedad de mantener la debida uniformidad reglamentaria y la identificación visible durante la prestación de servicio ordinario.',
      },
      {
        t: 'ul',
        items: [
          {
            b: 'Placa identificativa',
            x: 'Debe portarse de forma visible en todo momento durante patrullas y controles.',
          },
          {
            b: 'Registro de entrada',
            x: 'Toda unidad operativa notificará el inicio y fin de turno en el canal interno correspondiente.',
          },
          {
            b: 'Trato ciudadano',
            x: 'Se exigirá la máxima corrección institucional en todas las intervenciones.',
          },
        ],
      },
    ],
    translations: {
      es: {
        titulo: 'Protocolo de uniformidad y servicio en vía pública',
        autor: 'Jefatura Superior de Cataluña',
        cuerpo: [
          {
            t: 'p',
            x: 'Se recuerda a todos los integrantes del Cuerpo Nacional de Policía destinados en la demarcación de Cataluña la obligatoriedad de mantener la debida uniformidad reglamentaria y la identificación visible durante la prestación de servicio ordinario.',
          },
          {
            t: 'ul',
            items: [
              {
                b: 'Placa identificativa',
                x: 'Debe portarse de forma visible en todo momento durante patrullas y controles.',
              },
              {
                b: 'Registro de entrada',
                x: 'Toda unidad operativa notificará el inicio y fin de turno en el canal interno correspondiente.',
              },
              {
                b: 'Trato ciudadano',
                x: 'Se exigirá la máxima corrección institucional en todas las intervenciones.',
              },
            ],
          },
        ],
      },
      ca: {
        titulo: 'Protocol d’uniformitat i servei a la via pública',
        autor: 'Prefectura Superior de Catalunya',
        cuerpo: [
          {
            t: 'p',
            x: 'Es recorda a tots els integrants del Cos Nacional de Policia destinats a la demarcació de Catalunya l’obligatorietat de mantenir la deguda uniformitat reglamentària i la identificació visible durant la prestació del servei ordinari.',
          },
          {
            t: 'ul',
            items: [
              {
                b: 'Placa identificativa',
                x: 'S’ha de portar de manera visible en tot moment durant les patrulles i els controls.',
              },
              {
                b: 'Registre d’entrada',
                x: 'Tota unitat operativa notificarà l’inici i el final de torn al canal intern corresponent.',
              },
              {
                b: 'Tracte ciutadà',
                x: 'S’exigirà la màxima correcció institucional en totes les intervencions.',
              },
            ],
          },
        ],
      },
    },
  },
  {
    id: 'com-002',
    titulo: 'Apertura de solicitudes de acceso a la intranet Webpol',
    fecha: '2026-11-10',
    autor: 'Dirección Adjunta Operativa',
    sourceLang: 'es',
    cuerpo: [
      {
        t: 'p',
        x: 'Queda habilitado el sistema de registro de personal para las distintas escalas del cuerpo. Las solicitudes quedan sujetas a verificación por la Escala Superior o los Cargos Superiores antes de habilitar el acceso completo a los módulos internos.',
      },
    ],
    translations: {
      es: {
        titulo: 'Apertura de solicitudes de acceso a la intranet Webpol',
        autor: 'Dirección Adjunta Operativa',
        cuerpo: [
          {
            t: 'p',
            x: 'Queda habilitado el sistema de registro de personal para las distintas escalas del cuerpo. Las solicitudes quedan sujetas a verificación por la Escala Superior o los Cargos Superiores antes de habilitar el acceso completo a los módulos internos.',
          },
        ],
      },
      ca: {
        titulo: 'Obertura de sol·licituds d’accés a la intranet Webpol',
        autor: 'Direcció Adjunta Operativa',
        cuerpo: [
          {
            t: 'p',
            x: 'Queda habilitat el sistema de registre de personal per a les diferents escales del cos. Les sol·licituds queden subjectes a verificació per l’Escala Superior o els Càrrecs Superiors abans d’habilitar l’accés complet als mòduls interns.',
          },
        ],
      },
    },
  },
  {
    id: 'com-003',
    titulo: 'Actualización de fichas en el Portal del Funcionario',
    fecha: '2026-11-04',
    autor: 'Subdirección General de la Policía',
    sourceLang: 'es',
    cuerpo: [
      {
        t: 'p',
        x: 'Los Cargos Superiores y la Junta Superior disponen del módulo de Gestión de personal para completar los datos de destino, licencias policiales, historial disciplinario, estado judicial y datos personales de cada agente tras la aprobación de su alta en la intranet.',
      },
    ],
    translations: {
      es: {
        titulo: 'Actualización de fichas en el Portal del Funcionario',
        autor: 'Subdirección General de la Policía',
        cuerpo: [
          {
            t: 'p',
            x: 'Los Cargos Superiores y la Junta Superior disponen del módulo de Gestión de personal para completar los datos de destino, licencias policiales, historial disciplinario, estado judicial y datos personales de cada agente tras la aprobación de su alta en la intranet.',
          },
        ],
      },
      ca: {
        titulo: 'Actualització de fitxes al Portal del Funcionari',
        autor: 'Subdirecció General de la Policia',
        cuerpo: [
          {
            t: 'p',
            x: 'Els Càrrecs Superiors i la Junta Superior disposen del mòdul de Gestió de personal per completar les dades de destinació, llicències policials, historial disciplinari, estat judicial i dades personals de cada agent després d’aprovar-ne l’alta a la intranet.',
          },
        ],
      },
    },
  },
];

export function buildEmptyPortal(): PortalRecord {
  return {
    foto: null,
    ingreso: null,
    unidades: [],
    licenciasPoliciales: null,
    ultimaCitaPsicologica: null,
    disciplinario: {
      leves: null,
      graves: null,
      ascensos: null,
      descensos: null,
      traspaso: null,
      traspasoDe: null,
      juntaSuperior: null,
      supervision: null,
      expedientes: null,
      gravedad: null,
    },
    judicial: {
      demandado: null,
      causasAbiertas: null,
    },
    personal: {
      estadoLegal: null,
      edad: null,
      nacimiento: null,
    },
  };
}

function loadState(): WebpolStoreState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<WebpolStoreState>;
      return {
        personal: Array.isArray(parsed.personal) ? parsed.personal : [],
        portals:
          parsed.portals && typeof parsed.portals === 'object' ? parsed.portals : {},
        comunicados:
          Array.isArray(parsed.comunicados) && parsed.comunicados.length > 0
            ? parsed.comunicados
            : SEED_COMUNICADOS,
        medicalRecords: Array.isArray(parsed.medicalRecords)
          ? parsed.medicalRecords
          : [],
        sanctions: Array.isArray(parsed.sanctions) ? parsed.sanctions : [],
        promotions: Array.isArray(parsed.promotions) ? parsed.promotions : [],
        inactivityRequests: Array.isArray(parsed.inactivityRequests)
          ? parsed.inactivityRequests
          : [],
      };
    }
  } catch {
    // ignore storage errors
  }
  return {
    personal: [],
    portals: {},
    comunicados: SEED_COMUNICADOS,
    medicalRecords: [],
    sanctions: [],
    promotions: [],
    inactivityRequests: [],
  };
}

function saveState(state: WebpolStoreState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore storage errors
  }
}

export function createWebpolDb() {
  let state = loadState();
  const listeners = new Set<() => void>();

  const emit = () => {
    saveState(state);
    listeners.forEach((fn) => fn());
  };

  return {
    subscribe(fn: () => void): () => void {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    getSnapshot(): WebpolStoreState {
      return state;
    },
    upsertPersonal(record: PersonalRecord): void {
      const idx = state.personal.findIndex((r) => r.placa === record.placa);
      const nextPersonal = [...state.personal];
      if (idx >= 0) nextPersonal[idx] = record;
      else nextPersonal.push(record);

      const nextPortals = { ...state.portals };
      if (record.estado === 'aprobado' && !nextPortals[record.placa]) {
        nextPortals[record.placa] = buildEmptyPortal();
      }

      state = {
        ...state,
        personal: nextPersonal,
        portals: nextPortals,
      };
      emit();
    },
    updatePersonal(placa: string, patch: Partial<PersonalRecord>): void {
      const idx = state.personal.findIndex((r) => r.placa === placa);
      if (idx < 0) return;
      const updated = { ...state.personal[idx], ...patch };
      const nextPersonal = [...state.personal];
      nextPersonal[idx] = updated;

      const nextPortals = { ...state.portals };
      if (updated.estado === 'aprobado' && !nextPortals[placa]) {
        nextPortals[placa] = buildEmptyPortal();
      }

      state = {
        ...state,
        personal: nextPersonal,
        portals: nextPortals,
      };
      emit();
    },
    updateAgentAndPortal(
      placa: string,
      personalPatch: Partial<Pick<PersonalRecord, 'nombres' | 'dni' | 'rango'>>,
      portal: PortalRecord
    ): void {
      const idx = state.personal.findIndex((r) => r.placa === placa);
      if (idx < 0) return;
      const nextPersonal = [...state.personal];
      nextPersonal[idx] = { ...nextPersonal[idx], ...personalPatch };

      state = {
        ...state,
        personal: nextPersonal,
        portals: {
          ...state.portals,
          [placa]: portal,
        },
      };
      emit();
    },
    addMedicalRecord(record: MedicalRecord): void {
      const currentPortal = state.portals[record.agentePlaca] || buildEmptyPortal();
      const updatedPortal: PortalRecord = {
        ...currentPortal,
        ultimaCitaPsicologica: record.fechaCita,
      };

      state = {
        ...state,
        medicalRecords: [record, ...state.medicalRecords],
        portals: {
          ...state.portals,
          [record.agentePlaca]: updatedPortal,
        },
      };
      emit();
    },
    addSanction(sanction: SanctionRecord): void {
      const currentPortal = state.portals[sanction.agentePlaca] || buildEmptyPortal();
      const currentDisc = currentPortal.disciplinario || {};
      const nextPortal: PortalRecord = {
        ...currentPortal,
        disciplinario: {
          ...currentDisc,
          expedientes: true,
        },
      };

      state = {
        ...state,
        sanctions: [sanction, ...state.sanctions],
        portals: {
          ...state.portals,
          [sanction.agentePlaca]: nextPortal,
        },
      };
      emit();
    },
    addComunicado(comunicado: ComunicadoRecord): void {
      state = {
        ...state,
        comunicados: [comunicado, ...state.comunicados],
      };
      emit();
    },
    updateComunicadoTranslations(
      id: string,
      sourceLang: 'es' | 'ca',
      translations: Partial<Record<'es' | 'ca', ComunicadoTranslation>>
    ): void {
      state = {
        ...state,
        comunicados: state.comunicados.map((c) =>
          c.id === id
            ? {
                ...c,
                sourceLang: c.sourceLang || sourceLang,
                translations: { ...(c.translations || {}), ...translations },
              }
            : c
        ),
      };
      emit();
    },
    updateMedicalTranslations(
      id: string,
      sourceLang: 'es' | 'ca',
      translations: Partial<Record<'es' | 'ca', MedicalTranslation>>
    ): void {
      state = {
        ...state,
        medicalRecords: state.medicalRecords.map((m) =>
          m.id === id
            ? {
                ...m,
                sourceLang: m.sourceLang || sourceLang,
                translations: { ...(m.translations || {}), ...translations },
              }
            : m
        ),
      };
      emit();
    },
    updateSanctionTranslations(
      id: string,
      sourceLang: 'es' | 'ca',
      translations: Partial<Record<'es' | 'ca', SanctionTranslation>>
    ): void {
      state = {
        ...state,
        sanctions: state.sanctions.map((s) =>
          s.id === id
            ? {
                ...s,
                sourceLang: s.sourceLang || sourceLang,
                translations: { ...(s.translations || {}), ...translations },
              }
            : s
        ),
      };
      emit();
    },
    updatePortalTranslations(
      placa: string,
      translations: Partial<Record<'es' | 'ca', PortalTranslation>>
    ): void {
      const existing = state.portals[placa];
      if (!existing) return;
      state = {
        ...state,
        portals: {
          ...state.portals,
          [placa]: {
            ...existing,
            translations: { ...(existing.translations || {}), ...translations },
          },
        },
      };
      emit();
    },
    addPromotion(record: PromotionRecord): void {
      const nextPersonal = state.personal.map((p) =>
        p.placa === record.agentePlaca
          ? { ...p, rango: record.rangoPromociona }
          : p
      );
      const currentPortal =
        state.portals[record.agentePlaca] || buildEmptyPortal();
      const currentDisc = currentPortal.disciplinario || {};
      const nextPortal: PortalRecord = {
        ...currentPortal,
        disciplinario: {
          ...currentDisc,
          ascensos: (currentDisc.ascensos ?? 0) + 1,
        },
      };

      state = {
        ...state,
        personal: nextPersonal,
        portals: {
          ...state.portals,
          [record.agentePlaca]: nextPortal,
        },
        promotions: [record, ...state.promotions],
      };
      emit();
    },
    updatePromotionTranslations(
      id: string,
      sourceLang: 'es' | 'ca',
      translations: Partial<Record<'es' | 'ca', PromotionTranslation>>
    ): void {
      state = {
        ...state,
        promotions: state.promotions.map((pr) =>
          pr.id === id
            ? {
                ...pr,
                sourceLang: pr.sourceLang || sourceLang,
                translations: { ...(pr.translations || {}), ...translations },
              }
            : pr
        ),
      };
      emit();
    },
    addInactivityRequest(record: InactivityRecord): void {
      state = {
        ...state,
        inactivityRequests: [record, ...state.inactivityRequests],
      };
      emit();
    },
    resolveInactivityRequest(
      id: string,
      patch: {
        estado: 'aprobado' | 'rechazado';
        resueltoPor: string;
        resueltoEn: string;
        motivoResolucion: string | null;
        resolutionTranslations?: Partial<Record<'es' | 'ca', string>>;
      }
    ): void {
      state = {
        ...state,
        inactivityRequests: state.inactivityRequests.map((req) => {
          if (req.id !== id) return req;
          const nextTranslations = { ...(req.translations || {}) };
          if (patch.resolutionTranslations) {
            (['es', 'ca'] as const).forEach((l) => {
              const resText = patch.resolutionTranslations?.[l];
              if (resText !== undefined) {
                nextTranslations[l] = {
                  motivo: nextTranslations[l]?.motivo ?? req.motivo,
                  motivoResolucion: resText,
                };
              }
            });
          }
          return {
            ...req,
            estado: patch.estado,
            resueltoPor: patch.resueltoPor,
            resueltoEn: patch.resueltoEn,
            motivoResolucion: patch.motivoResolucion,
            translations: nextTranslations,
          };
        }),
      };
      emit();
    },
    updateInactivityTranslations(
      id: string,
      sourceLang: 'es' | 'ca',
      translations: Partial<Record<'es' | 'ca', InactivityTranslation>>
    ): void {
      state = {
        ...state,
        inactivityRequests: state.inactivityRequests.map((req) =>
          req.id === id
            ? {
                ...req,
                sourceLang: req.sourceLang || sourceLang,
                translations: { ...(req.translations || {}), ...translations },
              }
            : req
        ),
      };
      emit();
    },
    deletePersonal(placa: string): void {
      state = {
        ...state,
        personal: state.personal.filter((r) => r.placa !== placa),
      };
      emit();
    },
  };
}

export type WebpolDb = ReturnType<typeof createWebpolDb>;
export { TIER };
