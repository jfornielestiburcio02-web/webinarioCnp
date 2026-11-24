import React, { useMemo, useState } from 'react';
import { T, rankLabel, type Lang } from '../lib/i18n';
import { GROUPS } from '../lib/ranks';
import {
  buildEmptyPortal,
  type PersonalRecord,
  type PortalRecord,
  type WebpolDb,
} from '../lib/db';
import {
  NO_UNIT_FILTER,
  filterApprovedAgents,
  getDistinctUnits,
} from '../lib/gestion';
import { POLICE_UNITS, unitDisplayLabel, unitNameForLang } from '../lib/units';
import {
  buildPortalTranslations,
  extractPortalTextItems,
  requestBilingualTranslation,
} from '../lib/translate';

interface GestionPersonalViewProps {
  lang: Lang;
  rows: PersonalRecord[];
  portals: Record<string, PortalRecord>;
  db: WebpolDb;
}

type TriValue = '' | 'yes' | 'no';

function toTri(v: boolean | null | undefined): TriValue {
  if (v === true) return 'yes';
  if (v === false) return 'no';
  return '';
}

function fromTri(v: TriValue): boolean | null {
  if (v === 'yes') return true;
  if (v === 'no') return false;
  return null;
}

function toOptNumber(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null;
}

function AgentPortalEditor({
  lang,
  agent,
  portal,
  db,
  onBack,
}: {
  lang: Lang;
  agent: PersonalRecord;
  portal: PortalRecord;
  db: WebpolDb;
  onBack: () => void;
}) {
  const t = T[lang];
  const d = portal.disciplinario || {};
  const j = portal.judicial || {};
  const pe = portal.personal || {};

  const [nombres, setNombres] = useState(agent.nombres);
  const [dni, setDni] = useState(agent.dni);
  const [rango, setRango] = useState(agent.rango);
  const [ingreso, setIngreso] = useState(portal.ingreso || '');
  const [unidades, setUnidades] = useState(
    Array.isArray(portal.unidades) ? portal.unidades.join(', ') : ''
  );
  const [licenciasPoliciales, setLicenciasPoliciales] = useState(
    portal.licenciasPoliciales || ''
  );
  const [foto, setFoto] = useState(portal.foto || '');

  const [leves, setLeves] = useState(
    d.leves !== null && d.leves !== undefined ? String(d.leves) : ''
  );
  const [graves, setGraves] = useState(
    d.graves !== null && d.graves !== undefined ? String(d.graves) : ''
  );
  const [ascensos, setAscensos] = useState(
    d.ascensos !== null && d.ascensos !== undefined ? String(d.ascensos) : ''
  );
  const [descensos, setDescensos] = useState(
    d.descensos !== null && d.descensos !== undefined ? String(d.descensos) : ''
  );
  const [traspaso, setTraspaso] = useState<TriValue>(toTri(d.traspaso));
  const [traspasoDe, setTraspasoDe] = useState(d.traspasoDe || '');
  const [juntaSuperior, setJuntaSuperior] = useState<TriValue>(
    toTri(d.juntaSuperior)
  );
  const [supervision, setSupervision] = useState<TriValue>(
    toTri(d.supervision)
  );
  const [expedientes, setExpedientes] = useState<TriValue>(
    toTri(d.expedientes)
  );
  const [gravedad, setGravedad] = useState(d.gravedad || '');

  const [demandado, setDemandado] = useState<TriValue>(toTri(j.demandado));
  const [causasAbiertas, setCausasAbiertas] = useState<TriValue>(
    toTri(j.causasAbiertas)
  );

  const [estadoLegal, setEstadoLegal] = useState(pe.estadoLegal || '');
  const [edad, setEdad] = useState(
    pe.edad !== null && pe.edad !== undefined ? String(pe.edad) : ''
  );
  const [nacimiento, setNacimiento] = useState(pe.nacimiento || '');

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    kind: 'success' | 'error';
    text: string;
  } | null>(null);

  const currentUnitList = useMemo(
    () =>
      unidades
        .split(',')
        .map((u) => u.trim())
        .filter(Boolean),
    [unidades]
  );

  function toggleUnit(unitName: string) {
    const exists = currentUnitList.some(
      (u) => u.toLowerCase() === unitName.toLowerCase()
    );
    const next = exists
      ? currentUnitList.filter((u) => u.toLowerCase() !== unitName.toLowerCase())
      : [...currentUnitList, unitName];
    setUnidades(next.join(', '));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setFeedback(null);

    const cleanNombres = nombres.trim().replace(/\s+/g, ' ');
    const cleanDni = dni.trim().toUpperCase();

    if (!/^[\p{L}][\p{L}\s'.-]{2,99}$/u.test(cleanNombres)) {
      setFeedback({ kind: 'error', text: t.vNombres });
      return;
    }
    if (!/^\d{8}[A-Z]$/.test(cleanDni)) {
      setFeedback({ kind: 'error', text: t.vDni });
      return;
    }

    const nextPortal: PortalRecord = {
      foto: foto.trim() || null,
      ingreso: ingreso.trim() || null,
      unidades: currentUnitList,
      licenciasPoliciales: licenciasPoliciales.trim() || null,
      ultimaCitaPsicologica: portal.ultimaCitaPsicologica ?? null,
      disciplinario: {
        leves: toOptNumber(leves),
        graves: toOptNumber(graves),
        ascensos: toOptNumber(ascensos),
        descensos: toOptNumber(descensos),
        traspaso: fromTri(traspaso),
        traspasoDe: traspaso === 'yes' ? traspasoDe.trim() || null : null,
        juntaSuperior: fromTri(juntaSuperior),
        supervision: fromTri(supervision),
        expedientes: fromTri(expedientes),
        gravedad: gravedad.trim() || null,
      },
      judicial: {
        demandado: fromTri(demandado),
        causasAbiertas: fromTri(causasAbiertas),
      },
      personal: {
        estadoLegal: estadoLegal.trim() || null,
        edad: toOptNumber(edad),
        nacimiento: nacimiento.trim() || null,
      },
    };

    const items = extractPortalTextItems(nextPortal);
    let warnMsg: string | null = null;
    if (items.length > 0) {
      setSaving(true);
      const tr = await requestBilingualTranslation(items);
      setSaving(false);
      if (tr.ok) {
        nextPortal.translations = buildPortalTranslations(nextPortal, tr);
      } else {
        warnMsg = `${t.trPortalWarn} ${tr.error}`;
      }
    }

    db.updateAgentAndPortal(
      agent.placa,
      {
        nombres: cleanNombres,
        dni: cleanDni,
        rango,
      },
      nextPortal
    );

    setFeedback(
      warnMsg
        ? { kind: 'error', text: warnMsg }
        : { kind: 'success', text: t.gestionSaved }
    );
  }

  return (
    <div className="portal">
      <button
        type="button"
        className="btn ghost small back"
        onClick={onBack}
      >
        {t.gestionBackList}
      </button>

      <div className="hero">
        <h2>{t.gestionEditingTitle}</h2>
        <p className="lead">{`${agent.nombres} · ${t.placa} ${agent.placa}`}</p>
      </div>

      <form className="portal" onSubmit={handleSave}>
        {feedback && (
          <div
            className={`msg ${feedback.kind}`}
            role={feedback.kind === 'error' ? 'alert' : 'status'}
          >
            {feedback.text}
          </div>
        )}

        <section className="section">
          <h2>{t.secMain}</h2>
          <div className="editor-grid">
            <label>
              {t.rAgente}
              <input
                value={nombres}
                maxLength={100}
                onChange={(e) => setNombres(e.target.value)}
              />
            </label>
            <label>
              {t.rPlaca}
              <input className="mono" value={agent.placa} disabled />
            </label>
            <label>
              {t.rRango}
              <select
                value={rango}
                onChange={(e) => setRango(e.target.value)}
              >
                {GROUPS.map((g) => (
                  <optgroup key={g.name} label={rankLabel(g.name, lang)}>
                    {g.ranks.map((r) => (
                      <option key={r} value={r}>
                        {rankLabel(r, lang)}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
            <label>
              {t.rIngreso}
              <input
                type="date"
                value={ingreso}
                onChange={(e) => setIngreso(e.target.value)}
              />
            </label>
            <label className="wide">
              {t.rUnidades}
              <input
                placeholder={t.gestionUnitsPh}
                value={unidades}
                onChange={(e) => setUnidades(e.target.value)}
              />
            </label>
            <div className="wide">
              <div className="hint" style={{ marginBottom: 8 }}>
                {t.gestionUnitsQuick}
              </div>
              <div className="unit-picker">
                {POLICE_UNITS.map((u) => {
                  const active = currentUnitList.some(
                    (item) => item.toLowerCase() === u.name.toLowerCase()
                  );
                  return (
                    <button
                      key={u.id}
                      type="button"
                      className={`unit-chip${active ? ' active' : ''}`}
                      aria-pressed={active}
                      onClick={() => toggleUnit(u.name)}
                    >
                      {unitDisplayLabel(u, lang)}
                    </button>
                  );
                })}
              </div>
            </div>
            <label className="wide">
              {t.rLicencias}
              <input
                placeholder={t.gestionLicenciasPh}
                value={licenciasPoliciales}
                onChange={(e) => setLicenciasPoliciales(e.target.value)}
              />
            </label>
            <label className="wide">
              {t.gestionFoto}
              <input
                placeholder="N/A"
                value={foto}
                onChange={(e) => setFoto(e.target.value)}
              />
            </label>
          </div>
        </section>

        <section className="section">
          <h2>{t.secDisc}</h2>
          <div className="editor-grid">
            <label>
              {t.gestionLeves}
              <input
                type="number"
                min={0}
                placeholder={t.na}
                value={leves}
                onChange={(e) => setLeves(e.target.value)}
              />
            </label>
            <label>
              {t.gestionGraves}
              <input
                type="number"
                min={0}
                placeholder={t.na}
                value={graves}
                onChange={(e) => setGraves(e.target.value)}
              />
            </label>
            <label>
              {t.rAsc}
              <input
                type="number"
                min={0}
                placeholder={t.na}
                value={ascensos}
                onChange={(e) => setAscensos(e.target.value)}
              />
            </label>
            <label>
              {t.rDesc}
              <input
                type="number"
                min={0}
                placeholder={t.na}
                value={descensos}
                onChange={(e) => setDescensos(e.target.value)}
              />
            </label>
            <label>
              {t.rTraspaso}
              <select
                value={traspaso}
                onChange={(e) => setTraspaso(e.target.value as TriValue)}
              >
                <option value="">{t.na}</option>
                <option value="yes">{t.yes}</option>
                <option value="no">{t.no}</option>
              </select>
            </label>
            {traspaso === 'yes' && (
              <label>
                {t.gestionTraspasoDe}
                <input
                  value={traspasoDe}
                  onChange={(e) => setTraspasoDe(e.target.value)}
                />
              </label>
            )}
            <label>
              {t.rJunta}
              <select
                value={juntaSuperior}
                onChange={(e) => setJuntaSuperior(e.target.value as TriValue)}
              >
                <option value="">{t.na}</option>
                <option value="yes">{t.yes}</option>
                <option value="no">{t.no}</option>
              </select>
            </label>
            <label>
              {t.rSuperv}
              <select
                value={supervision}
                onChange={(e) => setSupervision(e.target.value as TriValue)}
              >
                <option value="">{t.na}</option>
                <option value="yes">{t.yes}</option>
                <option value="no">{t.no}</option>
              </select>
            </label>
            <label>
              {t.rExped}
              <select
                value={expedientes}
                onChange={(e) => setExpedientes(e.target.value as TriValue)}
              >
                <option value="">{t.na}</option>
                <option value="yes">{t.yes}</option>
                <option value="no">{t.no}</option>
              </select>
            </label>
            <label>
              {t.rGravedad}
              <input
                placeholder={t.na}
                value={gravedad}
                onChange={(e) => setGravedad(e.target.value)}
              />
            </label>
          </div>
        </section>

        <section className="section">
          <h2>{t.secJud}</h2>
          <div className="editor-grid">
            <label>
              {t.rDemandado}
              <select
                value={demandado}
                onChange={(e) => setDemandado(e.target.value as TriValue)}
              >
                <option value="">{t.na}</option>
                <option value="yes">{t.yes}</option>
                <option value="no">{t.no}</option>
              </select>
            </label>
            <label>
              {t.rCausas}
              <select
                value={causasAbiertas}
                onChange={(e) => setCausasAbiertas(e.target.value as TriValue)}
              >
                <option value="">{t.na}</option>
                <option value="yes">{t.yes}</option>
                <option value="no">{t.no}</option>
              </select>
            </label>
          </div>
        </section>

        <section className="section">
          <h2>{t.secPers}</h2>
          <div className="editor-grid">
            <label>
              {t.rEstado}
              <input
                placeholder={t.na}
                value={estadoLegal}
                onChange={(e) => setEstadoLegal(e.target.value)}
              />
            </label>
            <label>
              {t.rEdad}
              <input
                type="number"
                min={18}
                max={99}
                placeholder={t.na}
                value={edad}
                onChange={(e) => setEdad(e.target.value)}
              />
            </label>
            <label>
              {t.rNacimiento}
              <input
                placeholder={t.na}
                value={nacimiento}
                onChange={(e) => setNacimiento(e.target.value)}
              />
            </label>
            <label>
              {t.rDniNum}
              <input
                className="mono"
                maxLength={9}
                value={dni}
                onChange={(e) => setDni(e.target.value)}
              />
            </label>
          </div>
        </section>

        <div className="editor-actions">
          <button className="btn" type="submit" disabled={saving}>
            {saving ? t.trSaving : t.gestionSave}
          </button>
          <button className="btn ghost" type="button" onClick={onBack}>
            {t.cancel}
          </button>
        </div>
      </form>
    </div>
  );
}

export function GestionPersonalView({
  lang,
  rows,
  portals,
  db,
}: GestionPersonalViewProps) {
  const t = T[lang];
  const [query, setQuery] = useState('');
  const [rankFilter, setRankFilter] = useState('');
  const [unitFilter, setUnitFilter] = useState('');
  const [editingPlaca, setEditingPlaca] = useState<string | null>(null);

  const distinctUnits = useMemo(
    () => getDistinctUnits(rows, portals),
    [rows, portals]
  );

  const filteredAgents = useMemo(
    () =>
      filterApprovedAgents(rows, portals, {
        query,
        rank: rankFilter,
        unit: unitFilter,
      }),
    [rows, portals, query, rankFilter, unitFilter]
  );

  const selectedAgent = editingPlaca
    ? rows.find((r) => r.placa === editingPlaca && r.estado === 'aprobado')
    : undefined;

  if (selectedAgent) {
    return (
      <AgentPortalEditor
        key={selectedAgent.placa}
        lang={lang}
        agent={selectedAgent}
        portal={portals[selectedAgent.placa] || buildEmptyPortal()}
        db={db}
        onBack={() => {
          setEditingPlaca(null);
          window.scrollTo(0, 0);
        }}
      />
    );
  }

  const hasFilters = Boolean(query.trim() || rankFilter || unitFilter);

  return (
    <div className="portal">
      <section className="section">
        <div className="gestion-filters">
          <label>
            {t.gestionSearchLabel}
            <input
              type="search"
              placeholder={t.gestionSearchPh}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <label>
            {t.gestionFilterRank}
            <select
              value={rankFilter}
              onChange={(e) => setRankFilter(e.target.value)}
            >
              <option value="">{t.gestionAllRanks}</option>
              {GROUPS.map((g) => (
                <optgroup key={g.name} label={rankLabel(g.name, lang)}>
                  {g.ranks.map((r) => (
                    <option key={r} value={r}>
                      {rankLabel(r, lang)}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <label>
            {t.gestionFilterUnit}
            <select
              value={unitFilter}
              onChange={(e) => setUnitFilter(e.target.value)}
            >
              <option value="">{t.gestionAllUnits}</option>
              <option value={NO_UNIT_FILTER}>{t.gestionNoUnit}</option>
              {distinctUnits.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="gestion-toolbar">
          <span>
            {filteredAgents.length === 1
              ? t.gestionCountOne
              : t.gestionCountMany.replace('{n}', String(filteredAgents.length))}
          </span>
          {hasFilters && (
            <button
              type="button"
              className="btn ghost small"
              onClick={() => {
                setQuery('');
                setRankFilter('');
                setUnitFilter('');
              }}
            >
              {t.gestionClear}
            </button>
          )}
        </div>
      </section>

      <section className="section">
        <div className="list">
          {filteredAgents.length === 0 ? (
            <div className="empty">{t.gestionEmpty}</div>
          ) : (
            filteredAgents.map((agent) => {
              const agentPortal = portals[agent.placa];
              const agentUnits =
                agentPortal &&
                Array.isArray(agentPortal.unidades) &&
                agentPortal.unidades.length > 0
                  ? agentPortal.unidades
                      .map((u) => unitNameForLang(u, lang))
                      .join(', ')
                  : t.na;

              return (
                <article key={agent.placa} className="req" data-placa={agent.placa}>
                  <div className="head">
                    <span className="who">{agent.nombres}</span>
                    <span className="badge">{rankLabel(agent.rango, lang)}</span>
                  </div>
                  <div className="meta">
                    <span className="mono">{`${t.placa} ${agent.placa}`}</span>
                    <span className="mono">{`${t.dni} ${agent.dni}`}</span>
                    <span>{`${t.gestionUnitsLabel}: ${agentUnits}`}</span>
                  </div>
                  <div className="actions">
                    <button
                      type="button"
                      className="btn small"
                      onClick={() => {
                        setEditingPlaca(agent.placa);
                        window.scrollTo(0, 0);
                      }}
                    >
                      {t.gestionEditPortal}
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
