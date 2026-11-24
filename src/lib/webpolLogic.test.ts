import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isApprover,
  isCargoSuperior,
  isJuntaMember,
  isPsicologo,
  canManagePersonal,
  canResolve,
  TIER,
  ESCALA,
} from './ranks';
import { validateRegisterInput, derive, unb64, b64 } from './crypto';
import { fmtDay, rankLabel } from './i18n';
import {
  buildEmptyPortal,
  createWebpolDb,
  type PersonalRecord,
  type PortalRecord,
} from './db';
import {
  filterApprovedAgents,
  formatOptionalDay,
  formatOptionalNumber,
  formatOptionalString,
  formatTriBool,
  getDistinctUnits,
  NO_UNIT_FILTER,
} from './gestion';
import { POLICE_UNITS, hasUnit, unitDisplayLabel, unitNameForLang } from './units';
import {
  buildComunicadoRecord,
  buildInactivityRecord,
  buildMedicalRecord,
  buildPromotionRecord,
  buildSanctionRecord,
} from './records';
import {
  buildComunicadoTranslations,
  buildInactivityTranslations,
  buildMedicalTranslations,
  buildPortalTranslations,
  buildPromotionTranslations,
  buildSanctionTranslations,
  extractComunicadoItems,
  extractInactivityItems,
  extractMedicalItems,
  extractPortalTextItems,
  extractPromotionItems,
  extractSanctionItems,
  resolveComunicado,
  resolveInactivity,
  resolveMedical,
  resolvePortalText,
  resolvePromotion,
  resolveSanction,
} from './translate';

test('rank hierarchy permissions enforce approver, junta, and psychology rules', () => {
  assert.equal(isApprover('Jefe Superior de Cataluña'), true);
  assert.equal(isApprover('Comisario'), true);
  assert.equal(isApprover('Inspector Jefe'), false);
  assert.equal(isApprover('Policía'), false);

  assert.equal(isCargoSuperior('Jefe Superior de Cataluña'), true);
  assert.equal(isCargoSuperior('Director Adjunto Operativo'), true);
  assert.equal(isCargoSuperior('Comisario'), false);
  assert.equal(isCargoSuperior('Inspector'), false);

  const juntaPortal: PortalRecord = {
    ...buildEmptyPortal(),
    unidades: ['Junta Superior del Cuerpo Nacional de Policía'],
  };
  const psicologoPortal: PortalRecord = {
    ...buildEmptyPortal(),
    unidades: ['Departamento de Psicología'],
  };

  assert.equal(isJuntaMember('Inspector', juntaPortal), true);
  assert.equal(isJuntaMember('Inspector', buildEmptyPortal()), false);
  assert.equal(canManagePersonal('Inspector', juntaPortal), true);
  assert.equal(isPsicologo(psicologoPortal), true);
  assert.equal(isPsicologo(juntaPortal), false);
  assert.equal(hasUnit(psicologoPortal, 'Departamento de Psicologia'), true);

  assert.equal(canResolve('Jefe Superior de Cataluña', 'Director Adjunto Operativo'), true);
  assert.equal(canResolve('Comisario', 'Inspector'), true);
  assert.equal(canResolve('Comisario', 'Comisario 2°'), false);
  assert.equal(canResolve('Inspector Jefe', 'Policía'), false);
  assert.equal(TIER.get('Subinspector'), 1);
  assert.equal(ESCALA.get('Policía'), 'Escala Básica');
});

test('POLICE_UNITS includes all required judicial, scientific, and operational units', () => {
  const names = POLICE_UNITS.map((u) => u.name);
  for (const expected of [
    'Comisaría General de la Policía Judicial',
    'Unidad de Inteligencia Criminal',
    'Unidad de Drogas y Crimen Organizado',
    'Unidad Central de Delincuencia Económica y Fiscal',
    'Unidad Central de Ciberdelincuencia',
    'Comisaría General de la Policía Científica',
    'Unidad Central de Identificación',
    'Unidad Central de Criminalística',
    'Sección de Análisis de Conducta',
    'Unidad Central de Análisis Científicos',
    'Unidad de Prevención y Reacción',
    'División de Gestión de Licencias Policiales',
    'Departamento de Psicología',
    'Grupo de Atención al Ciudadano',
    'Junta Superior del Cuerpo Nacional de Policía',
  ]) {
    assert.equal(names.includes(expected), true);
  }
});

test('validateRegisterInput accepts valid payloads and rejects invalid fields', () => {
  const valid = validateRegisterInput({
    dni: ' 12345678z ',
    nombres: 'Carlos   Mendoza',
    placa: ' cnp001 ',
    rango: 'Jefe Superior de Cataluña',
    pass: 'password123',
    pass2: 'password123',
  });
  assert.equal(valid.ok, true);
  if (valid.ok) {
    assert.equal(valid.dni, '12345678Z');
    assert.equal(valid.nombres, 'Carlos Mendoza');
    assert.equal(valid.placa, 'CNP001');
  }

  const badDni = validateRegisterInput({
    dni: '1234',
    nombres: 'Carlos Mendoza',
    placa: 'CNP001',
    rango: 'Policía',
    pass: 'password123',
    pass2: 'password123',
  });
  assert.deepEqual(badDni, { ok: false, errorKey: 'vDni' });
});

test('PBKDF2 derive produces stable base64 hashes for identical password and salt', async () => {
  const salt = new Uint8Array(16).fill(7);
  const encodedSalt = b64(salt);
  const h1 = await derive('claveSegura123', unb64(encodedSalt));
  const h2 = await derive('claveSegura123', unb64(encodedSalt));
  const h3 = await derive('otraClave123', unb64(encodedSalt));
  assert.equal(h1, h2);
  assert.notEqual(h1, h3);
});

test('i18n helpers format dates and Catalan rank names', () => {
  assert.equal(fmtDay('2026-11-18'), '18/11/2026');
  assert.equal(fmtDay(''), '—');
  assert.equal(rankLabel('Jefe Superior de Cataluña', 'es'), 'Jefe Superior de Cataluña');
  assert.equal(rankLabel('Jefe Superior de Cataluña', 'ca'), 'Cap Superior de Catalunya');
});

test('buildEmptyPortal initializes fields as unset so portal displays N/A', () => {
  const empty = buildEmptyPortal();
  assert.equal(formatOptionalDay(empty.ingreso), 'N/A');
  assert.equal(formatOptionalString(empty.licenciasPoliciales), 'N/A');
  assert.equal(formatOptionalDay(empty.ultimaCitaPsicologica), 'N/A');
  assert.equal(empty.unidades?.length, 0);
  assert.equal(formatTriBool(empty.disciplinario?.traspaso, 'Sí', 'No'), 'N/A');
  assert.equal(formatTriBool(empty.judicial?.demandado, 'Sí', 'No'), 'N/A');
  assert.equal(formatOptionalString(empty.personal?.estadoLegal), 'N/A');
  assert.equal(formatOptionalNumber(empty.personal?.edad), 'N/A');
});

test('filterApprovedAgents searches by placa or full name and filters by rank and unit', () => {
  const base: Omit<PersonalRecord, 'dni' | 'nombres' | 'placa' | 'rango' | 'estado'> = {
    salt: '',
    hash: '',
    creado: '2026-11-20T10:00:00.000Z',
    resueltoPor: null,
    resueltoEn: null,
    motivo: null,
  };
  const rows: PersonalRecord[] = [
    { ...base, dni: '11111111A', nombres: 'Ana García', placa: 'CNP101', rango: 'Inspector', estado: 'aprobado' },
    { ...base, dni: '22222222B', nombres: 'Carlos Mendoza', placa: 'CNP001', rango: 'Jefe Superior de Cataluña', estado: 'aprobado' },
    { ...base, dni: '33333333C', nombres: 'Luis Torres', placa: 'CNP202', rango: 'Policía', estado: 'pendiente' },
  ];
  const portals: Record<string, PortalRecord> = {
    CNP101: { ...buildEmptyPortal(), unidades: ['Unidad de Prevención y Reacción'] },
    CNP001: buildEmptyPortal(),
  };

  assert.equal(getDistinctUnits(rows, portals).includes('Unidad de Drogas y Crimen Organizado'), true);
  assert.deepEqual(
    filterApprovedAgents(rows, portals, { query: 'cnp101', rank: '', unit: '' }).map((r) => r.placa),
    ['CNP101']
  );
  assert.deepEqual(
    filterApprovedAgents(rows, portals, { query: 'garcia', rank: '', unit: '' }).map((r) => r.placa),
    ['CNP101']
  );
  assert.deepEqual(
    filterApprovedAgents(rows, portals, { query: '', rank: 'Inspector', unit: 'Unidad de Prevención y Reacción' }).map((r) => r.placa),
    ['CNP101']
  );
  assert.deepEqual(
    filterApprovedAgents(rows, portals, { query: '', rank: '', unit: NO_UNIT_FILTER }).map((r) => r.placa),
    ['CNP001']
  );
});

test('sanction, medical, and comunicado builders attribute author automatically', () => {
  const base: Omit<PersonalRecord, 'dni' | 'nombres' | 'placa' | 'rango' | 'estado'> = {
    salt: '',
    hash: '',
    creado: '2026-11-20T10:00:00.000Z',
    resueltoPor: null,
    resueltoEn: null,
    motivo: null,
  };
  const superior: PersonalRecord = { ...base, dni: '12345678Z', nombres: 'Carlos Mendoza', placa: 'CNP001', rango: 'Jefe Superior de Cataluña', estado: 'aprobado' };
  const agente: PersonalRecord = { ...base, dni: '87654321X', nombres: 'Lucía Ferrer', placa: 'CNP204', rango: 'Policía', estado: 'aprobado' };

  const sanRes = buildSanctionRecord(
    {
      agentePlaca: 'CNP204',
      motivo: 'Incumplimiento de protocolo',
      tipo: 'Falta leve',
      ceroTolerancia: 'no',
      fechaInfraccion: '2026-11-20',
      delitosEjercicio: 'Ninguno',
      apelacion: '15 días hábiles',
      notas: 'Apercibimiento formal',
    },
    superior,
    agente,
    'Jefe Superior de Cataluña'
  );
  assert.equal(sanRes.ok, true);
  if (sanRes.ok) {
    assert.equal(sanRes.record.superiorPlaca, 'CNP001');
    assert.equal(sanRes.record.superiorLabel, 'Jefe Superior de Cataluña · Carlos Mendoza (CNP001)');
  }

  const medRes = buildMedicalRecord(
    {
      agentePlaca: 'CNP204',
      fechaCita: '2026-11-21',
      aptitud: 'Apto para el servicio',
      evaluacion: 'Estabilidad emocional y aptitud adecuada.',
      recomendaciones: 'Revisión anual',
    },
    superior,
    agente
  );
  assert.equal(medRes.ok, true);
  if (medRes.ok) {
    assert.equal(medRes.record.autorPlaca, 'CNP001');
  }

  const comRes = buildComunicadoRecord(
    'Orden general',
    'Primer párrafo\nSegundo párrafo',
    superior,
    'Jefe Superior de Cataluña',
    '2026-11-21'
  );
  assert.equal(comRes.ok, true);
  if (comRes.ok) {
    assert.equal(comRes.record.autor, 'Jefe Superior de Cataluña · Carlos Mendoza (CNP001)');
    assert.equal(comRes.record.cuerpo.length, 2);
  }
});

test('translation helpers extract, rebuild, and resolve ES <-> CA across published records', () => {
  const baseCom = {
    id: 'com-test',
    titulo: 'Ordre de servei',
    fecha: '2026-11-21',
    autor: 'Cap Superior de Catalunya · Carlos Mendoza (CNP001)',
    cuerpo: [
      { t: 'p' as const, x: 'Reforç a la zona centre.' },
      {
        t: 'ul' as const,
        items: [{ b: 'Horari', x: 'De 08:00 a 20:00.' }],
      },
    ],
  };

  const comItems = extractComunicadoItems(baseCom);
  assert.equal(comItems.length, 5);

  const comTranslations = buildComunicadoTranslations(baseCom, {
    detectedSource: 'ca',
    es: {
      titulo: 'Orden de servicio',
      autor: 'Jefe Superior de Cataluña · Carlos Mendoza (CNP001)',
      b_0: 'Refuerzo en la zona centro.',
      b_1_0_b: 'Horario',
      b_1_0_x: 'De 08:00 a 20:00.',
    },
    ca: {
      titulo: 'Ordre de servei',
      autor: 'Cap Superior de Catalunya · Carlos Mendoza (CNP001)',
      b_0: 'Reforç a la zona centre.',
      b_1_0_b: 'Horari',
      b_1_0_x: 'De 08:00 a 20:00.',
    },
  });

  const comRecord = { ...baseCom, sourceLang: 'ca' as const, translations: comTranslations };
  const resolvedEs = resolveComunicado(comRecord, 'es');
  const resolvedCa = resolveComunicado(comRecord, 'ca');
  assert.equal(resolvedEs.titulo, 'Orden de servicio');
  assert.equal(resolvedEs.isTranslated, true);
  assert.equal(resolvedCa.titulo, 'Ordre de servei');
  assert.equal(resolvedCa.isTranslated, false);

  const medRec = {
    id: 'med-1',
    agentePlaca: 'CNP204',
    agenteNombre: 'Lucía Ferrer',
    fechaCita: '2026-11-21',
    aptitud: 'Apto para el servicio',
    evaluacion: 'Valoración favorable.',
    recomendaciones: 'Revisión anual.',
    autorPlaca: 'CNP001',
    autorNombre: 'Carlos Mendoza (CNP001)',
    creadoEn: '2026-11-21T10:00:00.000Z',
  };
  assert.equal(extractMedicalItems(medRec).length, 3);
  const medTranslations = buildMedicalTranslations(medRec, {
    detectedSource: 'es',
    es: {
      aptitud: 'Apto para el servicio',
      evaluacion: 'Valoración favorable.',
      recomendaciones: 'Revisión anual.',
    },
    ca: {
      aptitud: 'Apte per al servei',
      evaluacion: 'Valoració favorable.',
      recomendaciones: 'Revisió anual.',
    },
  });
  const medCa = resolveMedical({ ...medRec, sourceLang: 'es', translations: medTranslations }, 'ca');
  assert.equal(medCa.aptitud, 'Apte per al servei');
  assert.equal(medCa.isTranslated, true);

  const sanRec = {
    id: 'san-1',
    superiorPlaca: 'CNP001',
    superiorLabel: 'Jefe Superior de Cataluña · Carlos Mendoza (CNP001)',
    agentePlaca: 'CNP204',
    agenteNombre: 'Lucía Ferrer',
    motivo: 'Incumplimiento horario',
    tipo: 'Falta leve',
    ceroTolerancia: false,
    fechaInfraccion: '2026-11-20',
    delitosEjercicio: 'Ninguno',
    apelacion: '10 días hábiles',
    notas: 'Advertencia escrita',
    creadoEn: '2026-11-21T10:00:00.000Z',
  };
  assert.equal(extractSanctionItems(sanRec).length, 5);
  const sanTranslations = buildSanctionTranslations(sanRec, {
    detectedSource: 'es',
    es: {
      tipo: 'Falta leve',
      motivo: 'Incumplimiento horario',
      delitosEjercicio: 'Ninguno',
      apelacion: '10 días hábiles',
      notas: 'Advertencia escrita',
    },
    ca: {
      tipo: 'Falta lleu',
      motivo: 'Incompliment horari',
      delitosEjercicio: 'Cap',
      apelacion: '10 dies hàbils',
      notas: 'Advertència escrita',
    },
  });
  const sanCa = resolveSanction({ ...sanRec, sourceLang: 'es', translations: sanTranslations }, 'ca');
  assert.equal(sanCa.tipo, 'Falta lleu');
  assert.equal(sanCa.isTranslated, true);

  const portal: PortalRecord = {
    ...buildEmptyPortal(),
    licenciasPoliciales: 'Licencia de armas tipo A',
    personal: { estadoLegal: 'En activo', edad: 34, nacimiento: '1992' },
  };
  assert.equal(extractPortalTextItems(portal).length, 2);
  const portalWithTr: PortalRecord = {
    ...portal,
    translations: buildPortalTranslations(portal, {
      detectedSource: 'es',
      es: { licenciasPoliciales: 'Licencia de armas tipo A', estadoLegal: 'En activo' },
      ca: { licenciasPoliciales: 'Llicència d’armes tipus A', estadoLegal: 'En actiu' },
    }),
  };
  assert.equal(resolvePortalText(portalWithTr, 'licenciasPoliciales', 'ca'), 'Llicència d’armes tipus A');
  assert.equal(unitNameForLang('Departamento de Psicología', 'ca'), 'Departament de Psicologia');
  assert.equal(unitDisplayLabel(POLICE_UNITS[1], 'ca'), 'Unitat d’Intel·ligència Criminal (UCIC)');
});

test('promotion and inactivity builders, store updates, and translations behave accurately', () => {
  const base: Omit<PersonalRecord, 'dni' | 'nombres' | 'placa' | 'rango' | 'estado'> = {
    salt: '',
    hash: '',
    creado: '2026-11-20T10:00:00.000Z',
    resueltoPor: null,
    resueltoEn: null,
    motivo: null,
  };
  const superior: PersonalRecord = {
    ...base,
    dni: '12345678Z',
    nombres: 'Carlos Mendoza',
    placa: 'CNP001',
    rango: 'Jefe Superior de Cataluña',
    estado: 'aprobado',
  };
  const agente: PersonalRecord = {
    ...base,
    dni: '87654321X',
    nombres: 'Lucía Ferrer',
    placa: 'CNP204',
    rango: 'Policía',
    estado: 'aprobado',
  };

  const sameRank = buildPromotionRecord(
    {
      superiores: 'Jefe Superior de Cataluña · Carlos Mendoza (CNP001)',
      agentePlaca: 'CNP204',
      rangoPromociona: 'Policía',
      motivo: 'Mismo rango',
      fechaPromocion: '2026-11-21',
      observaciones: '',
    },
    superior,
    agente
  );
  assert.deepEqual(sameRank, { ok: false, error: 'same_rank' });

  const promoRes = buildPromotionRecord(
    {
      superiores: 'Jefe Superior de Cataluña · Carlos Mendoza (CNP001)',
      agentePlaca: 'CNP204',
      rangoPromociona: 'Oficial de Policía',
      motivo: 'Trayectoria ejemplar en operativos urbanos.',
      fechaPromocion: '2026-11-21',
      observaciones: 'Con felicitación pública.',
    },
    superior,
    agente
  );
  assert.equal(promoRes.ok, true);
  if (promoRes.ok) {
    assert.equal(promoRes.record.rangoAnterior, 'Policía');
    assert.equal(promoRes.record.rangoPromociona, 'Oficial de Policía');
    assert.equal(extractPromotionItems(promoRes.record).length, 3);

    const promoTranslations = buildPromotionTranslations(promoRes.record, {
      detectedSource: 'es',
      es: {
        superiores: promoRes.record.superiores,
        motivo: promoRes.record.motivo,
        observaciones: promoRes.record.observaciones,
      },
      ca: {
        superiores: 'Cap Superior de Catalunya · Carlos Mendoza (CNP001)',
        motivo: 'Trajectòria exemplar en operatius urbans.',
        observaciones: 'Amb felicitació pública.',
      },
    });
    const promoCa = resolvePromotion(
      { ...promoRes.record, sourceLang: 'es', translations: promoTranslations },
      'ca'
    );
    assert.equal(promoCa.motivo, 'Trajectòria exemplar en operatius urbans.');
    assert.equal(promoCa.isTranslated, true);

    const db = createWebpolDb();
    db.upsertPersonal(superior);
    db.upsertPersonal(agente);
    db.addPromotion(promoRes.record);
    const snap = db.getSnapshot();
    assert.equal(
      snap.personal.find((p) => p.placa === 'CNP204')?.rango,
      'Oficial de Policía'
    );
    assert.equal(snap.portals.CNP204?.disciplinario?.ascensos, 1);
    assert.equal(snap.promotions.length, 1);
  }

  const badDates = buildInactivityRecord(
    {
      motivo: 'Permiso personal',
      fechaInicio: '2026-12-10',
      fechaFin: '2026-12-05',
    },
    agente
  );
  assert.deepEqual(badDates, { ok: false, error: 'invalid_dates' });

  const inacRes = buildInactivityRecord(
    {
      motivo: 'Ausencia justificada por motivos familiares.',
      fechaInicio: '2026-12-01',
      fechaFin: '2026-12-10',
    },
    agente
  );
  assert.equal(inacRes.ok, true);
  if (inacRes.ok) {
    assert.equal(inacRes.record.estado, 'pendiente');
    assert.equal(extractInactivityItems(inacRes.record).length, 1);

    const inacTranslations = buildInactivityTranslations(inacRes.record, {
      detectedSource: 'es',
      es: { motivo: inacRes.record.motivo },
      ca: { motivo: 'Absència justificada per motius familiars.' },
    });

    const db = createWebpolDb();
    db.addInactivityRequest({
      ...inacRes.record,
      sourceLang: 'es',
      translations: inacTranslations,
    });
    db.resolveInactivityRequest(inacRes.record.id, {
      estado: 'rechazado',
      resueltoPor: 'Jefe Superior de Cataluña · Carlos Mendoza (CNP001)',
      resueltoEn: '2026-11-21T12:00:00.000Z',
      motivoResolucion: 'Falta cobertura de servicio.',
      resolutionTranslations: {
        es: 'Falta cobertura de servicio.',
        ca: 'Falta cobertura de servei.',
      },
    });
    const resolvedReq = db.getSnapshot().inactivityRequests[0];
    assert.equal(resolvedReq.estado, 'rechazado');
    const viewCa = resolveInactivity(resolvedReq, 'ca');
    assert.equal(viewCa.motivo, 'Absència justificada per motius familiars.');
    assert.equal(viewCa.motivoResolucion, 'Falta cobertura de servei.');
    assert.equal(viewCa.isTranslated, true);
  }
});

