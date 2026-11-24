import type {
  ComunicadoRecord,
  InactivityRecord,
  MedicalRecord,
  PersonalRecord,
  PromotionRecord,
  SanctionRecord,
} from './db';
import { TIER } from './ranks';

export interface SanctionDraft {
  agentePlaca: string;
  motivo: string;
  tipo: string;
  ceroTolerancia: 'yes' | 'no' | '';
  fechaInfraccion: string;
  delitosEjercicio: string;
  apelacion: string;
  notas: string;
}

export function buildSanctionRecord(
  draft: SanctionDraft,
  superior: PersonalRecord,
  targetAgent: PersonalRecord | undefined,
  superiorRankLabel: string,
  nowIso = new Date().toISOString()
): { ok: true; record: SanctionRecord } | { ok: false; error: 'missing_agent' | 'missing_fields' } {
  if (!targetAgent) return { ok: false, error: 'missing_agent' };

  const motivo = draft.motivo.trim();
  const tipo = draft.tipo.trim();
  const fechaInfraccion = draft.fechaInfraccion.trim();
  const delitosEjercicio = draft.delitosEjercicio.trim();
  const apelacion = draft.apelacion.trim();
  const notas = draft.notas.trim();

  if (
    !motivo ||
    !tipo ||
    !draft.ceroTolerancia ||
    !fechaInfraccion ||
    !delitosEjercicio ||
    !apelacion
  ) {
    return { ok: false, error: 'missing_fields' };
  }

  return {
    ok: true,
    record: {
      id: `san-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      superiorPlaca: superior.placa,
      superiorLabel: `${superiorRankLabel} · ${superior.nombres} (${superior.placa})`,
      agentePlaca: targetAgent.placa,
      agenteNombre: targetAgent.nombres,
      motivo,
      tipo,
      ceroTolerancia: draft.ceroTolerancia === 'yes',
      fechaInfraccion,
      delitosEjercicio,
      apelacion,
      notas,
      creadoEn: nowIso,
    },
  };
}

export interface MedicalDraft {
  agentePlaca: string;
  fechaCita: string;
  aptitud: string;
  evaluacion: string;
  recomendaciones: string;
}

export function buildMedicalRecord(
  draft: MedicalDraft,
  author: PersonalRecord,
  targetAgent: PersonalRecord | undefined,
  nowIso = new Date().toISOString()
): { ok: true; record: MedicalRecord } | { ok: false; error: 'missing_agent' | 'missing_fields' } {
  if (!targetAgent) return { ok: false, error: 'missing_agent' };

  const fechaCita = draft.fechaCita.trim();
  const aptitud = draft.aptitud.trim();
  const evaluacion = draft.evaluacion.trim();
  const recomendaciones = draft.recomendaciones.trim();

  if (!fechaCita || !aptitud || !evaluacion) {
    return { ok: false, error: 'missing_fields' };
  }

  return {
    ok: true,
    record: {
      id: `med-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      agentePlaca: targetAgent.placa,
      agenteNombre: targetAgent.nombres,
      fechaCita,
      aptitud,
      evaluacion,
      recomendaciones,
      autorPlaca: author.placa,
      autorNombre: `${author.nombres} (${author.placa})`,
      creadoEn: nowIso,
    },
  };
}

export function buildComunicadoRecord(
  titulo: string,
  texto: string,
  author: PersonalRecord,
  authorRankLabel: string,
  dateIso = new Date().toISOString().slice(0, 10)
): { ok: true; record: ComunicadoRecord } | { ok: false; error: 'missing_fields' } {
  const cleanTitulo = titulo.trim();
  const paragraphs = texto
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!cleanTitulo || paragraphs.length === 0) {
    return { ok: false, error: 'missing_fields' };
  }

  return {
    ok: true,
    record: {
      id: `com-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      titulo: cleanTitulo,
      fecha: dateIso,
      autor: `${authorRankLabel} · ${author.nombres} (${author.placa})`,
      cuerpo: paragraphs.map((x) => ({ t: 'p', x })),
    },
  };
}

export interface PromotionDraft {
  superiores: string;
  agentePlaca: string;
  rangoPromociona: string;
  motivo: string;
  fechaPromocion: string;
  observaciones: string;
}

export function buildPromotionRecord(
  draft: PromotionDraft,
  author: PersonalRecord,
  targetAgent: PersonalRecord | undefined,
  nowIso = new Date().toISOString()
):
  | { ok: true; record: PromotionRecord }
  | { ok: false; error: 'missing_agent' | 'missing_fields' | 'same_rank' } {
  if (!targetAgent) return { ok: false, error: 'missing_agent' };

  const superiores = draft.superiores.trim();
  const rangoPromociona = draft.rangoPromociona.trim();
  const motivo = draft.motivo.trim();
  const fechaPromocion = draft.fechaPromocion.trim();
  const observaciones = draft.observaciones.trim();

  if (!superiores || !rangoPromociona || !TIER.has(rangoPromociona) || !motivo || !fechaPromocion) {
    return { ok: false, error: 'missing_fields' };
  }

  if (rangoPromociona === targetAgent.rango) {
    return { ok: false, error: 'same_rank' };
  }

  return {
    ok: true,
    record: {
      id: `asc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      superiores,
      agentePlaca: targetAgent.placa,
      agenteNombre: targetAgent.nombres,
      rangoPromociona,
      rangoAnterior: targetAgent.rango,
      motivo,
      fechaPromocion,
      observaciones,
      autorPlaca: author.placa,
      creadoEn: nowIso,
    },
  };
}

export interface InactivityDraft {
  motivo: string;
  fechaInicio: string;
  fechaFin: string;
}

export function buildInactivityRecord(
  draft: InactivityDraft,
  requester: PersonalRecord,
  nowIso = new Date().toISOString()
):
  | { ok: true; record: InactivityRecord }
  | { ok: false; error: 'missing_fields' | 'invalid_dates' } {
  const motivo = draft.motivo.trim();
  const fechaInicio = draft.fechaInicio.trim();
  const fechaFin = draft.fechaFin.trim();

  if (!motivo || !fechaInicio || !fechaFin) {
    return { ok: false, error: 'missing_fields' };
  }

  if (fechaFin < fechaInicio) {
    return { ok: false, error: 'invalid_dates' };
  }

  return {
    ok: true,
    record: {
      id: `ina-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      agentePlaca: requester.placa,
      agenteNombre: requester.nombres,
      agenteRango: requester.rango,
      motivo,
      fechaInicio,
      fechaFin,
      estado: 'pendiente',
      creadoEn: nowIso,
      resueltoPor: null,
      resueltoEn: null,
      motivoResolucion: null,
    },
  };
}
