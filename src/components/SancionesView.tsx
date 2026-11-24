import React, { useEffect, useRef, useState } from 'react';
import { T, fmtDay, rankLabel, type Lang } from '../lib/i18n';
import type { PersonalRecord, SanctionRecord, WebpolDb } from '../lib/db';
import { buildSanctionRecord } from '../lib/records';
import {
  buildSanctionTranslations,
  extractSanctionItems,
  requestBilingualTranslation,
  resolveSanction,
} from '../lib/translate';

interface SancionesViewProps {
  lang: Lang;
  me: PersonalRecord;
  canImpose: boolean;
  rows: PersonalRecord[];
  sanctions: SanctionRecord[];
  db: WebpolDb;
}

export function SancionesView({
  lang,
  me,
  canImpose,
  rows,
  sanctions,
  db,
}: SancionesViewProps) {
  const t = T[lang];
  const approved = rows
    .filter((r) => r.estado === 'aprobado')
    .sort((a, b) => a.nombres.localeCompare(b.nombres));

  const [agentePlaca, setAgentePlaca] = useState('');
  const [motivo, setMotivo] = useState('');
  const [tipo, setTipo] = useState('');
  const [ceroTolerancia, setCeroTolerancia] = useState<'yes' | 'no' | ''>('');
  const [fechaInfraccion, setFechaInfraccion] = useState('');
  const [delitosEjercicio, setDelitosEjercicio] = useState('');
  const [apelacion, setApelacion] = useState('');
  const [notas, setNotas] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [translatingId, setTranslatingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    kind: 'success' | 'error';
    text: string;
  } | null>(null);
  const [translateError, setTranslateError] = useState<string | null>(null);
  const attemptedRef = useRef<Set<string>>(new Set());

  const superiorDisplay = `${rankLabel(me.rango, lang)} · ${me.nombres} (${me.placa})`;

  const visibleSanctions = canImpose
    ? sanctions
    : sanctions.filter((s) => s.agentePlaca === me.placa);

  async function translateSanction(s: SanctionRecord, showSuccess = false) {
    setTranslatingId(s.id);
    setTranslateError(null);
    const tr = await requestBilingualTranslation(extractSanctionItems(s));
    setTranslatingId(null);
    if (tr.ok) {
      db.updateSanctionTranslations(
        s.id,
        tr.detectedSource,
        buildSanctionTranslations(s, tr)
      );
      if (showSuccess) {
        setFeedback({ kind: 'success', text: t.sancSaved });
      }
    } else {
      setTranslateError(tr.error);
    }
  }

  useEffect(() => {
    const missing = visibleSanctions.find(
      (s) => !s.translations?.[lang] && !attemptedRef.current.has(`${s.id}:${lang}`)
    );
    if (!missing) return;
    attemptedRef.current.add(`${missing.id}:${lang}`);
    void translateSanction(missing);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleSanctions, lang]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setFeedback(null);

    const target = approved.find((r) => r.placa === agentePlaca);
    const result = buildSanctionRecord(
      {
        agentePlaca,
        motivo,
        tipo,
        ceroTolerancia,
        fechaInfraccion,
        delitosEjercicio,
        apelacion,
        notas,
      },
      me,
      target,
      rankLabel(me.rango, 'es')
    );

    if (!result.ok) {
      setFeedback({ kind: 'error', text: t.sancErr });
      return;
    }

    setSubmitting(true);
    const tr = await requestBilingualTranslation(extractSanctionItems(result.record));
    setSubmitting(false);

    if (tr.ok) {
      db.addSanction({
        ...result.record,
        sourceLang: tr.detectedSource,
        translations: buildSanctionTranslations(result.record, tr),
      });
      setAgentePlaca('');
      setMotivo('');
      setTipo('');
      setCeroTolerancia('');
      setFechaInfraccion('');
      setDelitosEjercicio('');
      setApelacion('');
      setNotas('');
      setFeedback({ kind: 'success', text: t.sancSaved });
    } else {
      db.addSanction(result.record);
      setAgentePlaca('');
      setMotivo('');
      setTipo('');
      setCeroTolerancia('');
      setFechaInfraccion('');
      setDelitosEjercicio('');
      setApelacion('');
      setNotas('');
      setFeedback({
        kind: 'error',
        text: `${t.trSavedWarn} ${tr.error}`,
      });
    }
  }

  return (
    <div className="portal">
      {canImpose && (
        <section className="section">
          <h2>{t.sancFormTitle}</h2>
          <p className="lead">{t.sancFormLead}</p>

          {feedback && (
            <div
              className={`msg ${feedback.kind}`}
              style={{ marginBottom: 14 }}
              role={feedback.kind === 'error' ? 'alert' : 'status'}
            >
              {feedback.text}
            </div>
          )}

          <form className="portal" onSubmit={handleSubmit}>
            <div className="editor-grid">
              <label className="wide">
                {t.sancSuperiorLbl}
                <input value={superiorDisplay} disabled />
              </label>
              <label>
                {t.sancAgenteLbl}
                <select
                  value={agentePlaca}
                  onChange={(e) => setAgentePlaca(e.target.value)}
                  disabled={submitting}
                >
                  <option value="">{t.sancAgentePh}</option>
                  {approved.map((a) => (
                    <option key={a.placa} value={a.placa}>
                      {`${a.nombres} (${a.placa} · ${rankLabel(a.rango, lang)})`}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t.sancTipoLbl}
                <input
                  placeholder={t.sancTipoPh}
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                  disabled={submitting}
                />
              </label>
              <label>
                {t.sancCeroLbl}
                <select
                  value={ceroTolerancia}
                  onChange={(e) =>
                    setCeroTolerancia(e.target.value as 'yes' | 'no' | '')
                  }
                  disabled={submitting}
                >
                  <option value="">—</option>
                  <option value="yes">{t.yes}</option>
                  <option value="no">{t.no}</option>
                </select>
              </label>
              <label>
                {t.sancFechaLbl}
                <input
                  type="date"
                  value={fechaInfraccion}
                  onChange={(e) => setFechaInfraccion(e.target.value)}
                  disabled={submitting}
                />
              </label>
              <label className="wide">
                {t.sancMotivoLbl}
                <textarea
                  rows={3}
                  placeholder={t.sancMotivoPh}
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  disabled={submitting}
                />
              </label>
              <label className="wide">
                {t.sancDelitosLbl}
                <input
                  placeholder={t.sancDelitosPh}
                  value={delitosEjercicio}
                  onChange={(e) => setDelitosEjercicio(e.target.value)}
                  disabled={submitting}
                />
              </label>
              <label className="wide">
                {t.sancApelacionLbl}
                <input
                  placeholder={t.sancApelacionPh}
                  value={apelacion}
                  onChange={(e) => setApelacion(e.target.value)}
                  disabled={submitting}
                />
              </label>
              <label className="wide">
                {t.sancNotasLbl}
                <textarea
                  rows={3}
                  placeholder={t.sancNotasPh}
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  disabled={submitting}
                />
              </label>
            </div>
            <div className="editor-actions">
              <button type="submit" className="btn" disabled={submitting}>
                {submitting ? t.trPublishing : t.sancSubmit}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="section">
        <h2>{canImpose ? t.sancionesAllTitle : t.sancionesTitle}</h2>
        <p className="lead">{canImpose ? t.sancionesDesc : t.sancionesMyLead}</p>

        {translateError && (
          <div className="msg error" style={{ marginBottom: 14 }} role="alert">
            {translateError}
          </div>
        )}

        {visibleSanctions.length === 0 ? (
          <div className="empty">{t.sancionesEmpty}</div>
        ) : (
          <div className="list">
            {visibleSanctions.map((s) => {
              const view = resolveSanction(s, lang);
              const needsTranslation = !s.translations?.[lang];
              return (
                <article key={s.id} className="req">
                  <div className="head">
                    <span className="who">{`${s.agenteNombre} (${s.agentePlaca}) · ${view.tipo}`}</span>
                    <div className="actions">
                      {view.isTranslated && (
                        <span className="badge">{t.trAutoBadge}</span>
                      )}
                      <span className="badge">
                        {s.ceroTolerancia ? t.sancZeroYes : t.sancZeroNo}
                      </span>
                    </div>
                  </div>
                  <div className="meta">
                    <span>{`${t.sancSuperiorLbl}: ${s.superiorLabel}`}</span>
                    <span className="mono">{`${t.sancFechaLbl}: ${fmtDay(s.fechaInfraccion)}`}</span>
                  </div>
                  <div className="com-text">
                    <p>
                      <strong>{t.sancMotivoLbl}: </strong>
                      {view.motivo}
                    </p>
                    <p>
                      <strong>{t.sancDelitosLbl}: </strong>
                      {view.delitosEjercicio}
                    </p>
                    <p>
                      <strong>{t.sancApelacionLbl}: </strong>
                      {view.apelacion}
                    </p>
                    {view.notas && (
                      <p>
                        <strong>{t.sancNotasLbl}: </strong>
                        {view.notas}
                      </p>
                    )}
                  </div>
                  {needsTranslation && (
                    <div className="actions">
                      <button
                        type="button"
                        className="btn ghost small"
                        disabled={translatingId === s.id}
                        onClick={() => translateSanction(s, true)}
                      >
                        {translatingId === s.id ? t.trRetrying : t.trRetry}
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
