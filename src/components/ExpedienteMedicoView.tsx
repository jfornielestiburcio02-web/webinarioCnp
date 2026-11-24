import React, { useEffect, useRef, useState } from 'react';
import { T, fmtDay, rankLabel, type Lang } from '../lib/i18n';
import type { MedicalRecord, PersonalRecord, WebpolDb } from '../lib/db';
import { buildMedicalRecord } from '../lib/records';
import {
  buildMedicalTranslations,
  extractMedicalItems,
  requestBilingualTranslation,
  resolveMedical,
} from '../lib/translate';

export function AgentMedicalHistoryView({
  lang,
  agent,
  records,
  db,
  onBack,
}: {
  lang: Lang;
  agent: PersonalRecord;
  records: MedicalRecord[];
  db: WebpolDb;
  onBack: () => void;
}) {
  const t = T[lang];
  const agentRecords = records
    .filter((r) => r.agentePlaca === agent.placa)
    .sort((a, b) => String(b.fechaCita).localeCompare(String(a.fechaCita)));

  const attemptedRef = useRef<Set<string>>(new Set());
  const [translatingId, setTranslatingId] = useState<string | null>(null);
  const [translateError, setTranslateError] = useState<string | null>(null);

  async function translateRecord(rec: MedicalRecord) {
    setTranslatingId(rec.id);
    setTranslateError(null);
    const tr = await requestBilingualTranslation(extractMedicalItems(rec));
    setTranslatingId(null);
    if (tr.ok) {
      db.updateMedicalTranslations(
        rec.id,
        tr.detectedSource,
        buildMedicalTranslations(rec, tr)
      );
    } else {
      setTranslateError(tr.error);
    }
  }

  useEffect(() => {
    const missing = agentRecords.find(
      (rec) => !rec.translations?.[lang] && !attemptedRef.current.has(`${rec.id}:${lang}`)
    );
    if (!missing) return;
    attemptedRef.current.add(`${missing.id}:${lang}`);
    void translateRecord(missing);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentRecords, lang]);

  return (
    <div className="portal">
      <button type="button" className="btn ghost small back" onClick={onBack}>
        {t.medBackPortal}
      </button>

      <div className="hero">
        <h2>{t.medHistoryTitle}</h2>
        <p className="lead">{`${agent.nombres} · ${t.placa} ${agent.placa}`}</p>
      </div>

      <section className="section">
        <h2>{t.medHistoryTitle}</h2>
        <p className="lead">{t.medHistoryLead}</p>
        {translateError && (
          <div className="msg error" style={{ marginBottom: 14 }} role="alert">
            {translateError}
          </div>
        )}
        {agentRecords.length === 0 ? (
          <div className="empty">{t.medHistoryEmpty}</div>
        ) : (
          <div className="list">
            {agentRecords.map((rec) => {
              const view = resolveMedical(rec, lang);
              const needsTranslation = !rec.translations?.[lang];
              return (
                <article key={rec.id} className="req">
                  <div className="head">
                    <span className="who">{`${t.medDateLbl}: ${fmtDay(rec.fechaCita)}`}</span>
                    <div className="actions">
                      {view.isTranslated && (
                        <span className="badge">{t.trAutoBadge}</span>
                      )}
                      <span className="badge">{view.aptitud}</span>
                    </div>
                  </div>
                  <div className="com-text">
                    <p>
                      <strong>{t.medEvalLbl}: </strong>
                      {view.evaluacion}
                    </p>
                    {view.recomendaciones && (
                      <p>
                        <strong>{t.medRecLbl}: </strong>
                        {view.recomendaciones}
                      </p>
                    )}
                  </div>
                  <div className="meta">
                    <span>{`${t.medIssuedBy}: ${rec.autorNombre}`}</span>
                    {needsTranslation && (
                      <button
                        type="button"
                        className="btn ghost small"
                        disabled={translatingId === rec.id}
                        onClick={() => translateRecord(rec)}
                      >
                        {translatingId === rec.id ? t.trRetrying : t.trRetry}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export function PsicologiaPanelView({
  lang,
  me,
  rows,
  records,
  db,
}: {
  lang: Lang;
  me: PersonalRecord;
  rows: PersonalRecord[];
  records: MedicalRecord[];
  db: WebpolDb;
}) {
  const t = T[lang];
  const approved = rows
    .filter((r) => r.estado === 'aprobado')
    .sort((a, b) => a.nombres.localeCompare(b.nombres));

  const [agentePlaca, setAgentePlaca] = useState('');
  const [fechaCita, setFechaCita] = useState(
    () => new Date().toISOString().slice(0, 10)
  );
  const [aptitud, setAptitud] = useState<string>(t.medApt1);
  const [evaluacion, setEvaluacion] = useState('');
  const [recomendaciones, setRecomendaciones] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [translatingId, setTranslatingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    kind: 'success' | 'error';
    text: string;
  } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setFeedback(null);

    const target = approved.find((r) => r.placa === agentePlaca);
    const result = buildMedicalRecord(
      {
        agentePlaca,
        fechaCita,
        aptitud,
        evaluacion,
        recomendaciones,
      },
      me,
      target
    );

    if (!result.ok) {
      setFeedback({ kind: 'error', text: t.medErr });
      return;
    }

    setSubmitting(true);
    const tr = await requestBilingualTranslation(extractMedicalItems(result.record));
    setSubmitting(false);

    if (tr.ok) {
      db.addMedicalRecord({
        ...result.record,
        sourceLang: tr.detectedSource,
        translations: buildMedicalTranslations(result.record, tr),
      });
      setEvaluacion('');
      setRecomendaciones('');
      setFeedback({ kind: 'success', text: t.medSaved });
    } else {
      db.addMedicalRecord(result.record);
      setEvaluacion('');
      setRecomendaciones('');
      setFeedback({
        kind: 'error',
        text: `${t.trSavedWarn} ${tr.error}`,
      });
    }
  }

  async function retryTranslate(rec: MedicalRecord) {
    setTranslatingId(rec.id);
    const tr = await requestBilingualTranslation(extractMedicalItems(rec));
    setTranslatingId(null);
    if (tr.ok) {
      db.updateMedicalTranslations(
        rec.id,
        tr.detectedSource,
        buildMedicalTranslations(rec, tr)
      );
      setFeedback({ kind: 'success', text: t.medSaved });
    } else {
      setFeedback({ kind: 'error', text: tr.error });
    }
  }

  return (
    <div className="portal">
      <section className="section">
        <h2>{t.medFormTitle}</h2>
        <p className="lead">{t.medFormLead}</p>

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
            <label>
              {t.medAuthorLbl}
              <input
                value={`${rankLabel(me.rango, lang)} · ${me.nombres} (${me.placa})`}
                disabled
              />
            </label>
            <label>
              {t.medAgentLbl}
              <select
                value={agentePlaca}
                onChange={(e) => setAgentePlaca(e.target.value)}
                disabled={submitting}
              >
                <option value="">{t.medAgentPh}</option>
                {approved.map((a) => (
                  <option key={a.placa} value={a.placa}>
                    {`${a.nombres} (${a.placa} · ${rankLabel(a.rango, lang)})`}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t.medDateLbl}
              <input
                type="date"
                value={fechaCita}
                onChange={(e) => setFechaCita(e.target.value)}
                disabled={submitting}
              />
            </label>
            <label>
              {t.medAptitudLbl}
              <select
                value={aptitud}
                onChange={(e) => setAptitud(e.target.value)}
                disabled={submitting}
              >
                <option value={t.medApt1}>{t.medApt1}</option>
                <option value={t.medApt2}>{t.medApt2}</option>
                <option value={t.medApt3}>{t.medApt3}</option>
              </select>
            </label>
            <label className="wide">
              {t.medEvalLbl}
              <textarea
                rows={4}
                placeholder={t.medEvalPh}
                value={evaluacion}
                onChange={(e) => setEvaluacion(e.target.value)}
                disabled={submitting}
              />
            </label>
            <label className="wide">
              {t.medRecLbl}
              <textarea
                rows={2}
                placeholder={t.medRecPh}
                value={recomendaciones}
                onChange={(e) => setRecomendaciones(e.target.value)}
                disabled={submitting}
              />
            </label>
          </div>
          <div className="editor-actions">
            <button type="submit" className="btn" disabled={submitting}>
              {submitting ? t.trPublishing : t.medSubmit}
            </button>
          </div>
        </form>
      </section>

      <section className="section">
        <h2>{t.medListTitle}</h2>
        {records.length === 0 ? (
          <div className="empty">{t.medHistoryEmpty}</div>
        ) : (
          <div className="list">
            {records.map((rec) => {
              const view = resolveMedical(rec, lang);
              const needsTranslation = !rec.translations?.[lang];
              return (
                <article key={rec.id} className="req">
                  <div className="head">
                    <span className="who">{`${rec.agenteNombre} (${rec.agentePlaca})`}</span>
                    <div className="actions">
                      {view.isTranslated && (
                        <span className="badge">{t.trAutoBadge}</span>
                      )}
                      <span className="badge">{view.aptitud}</span>
                    </div>
                  </div>
                  <div className="meta">
                    <span className="mono">{`${t.medDateLbl}: ${fmtDay(rec.fechaCita)}`}</span>
                    <span>{`${t.medIssuedBy}: ${rec.autorNombre}`}</span>
                  </div>
                  <p className="com-snip">{view.evaluacion}</p>
                  {needsTranslation && (
                    <div className="actions">
                      <button
                        type="button"
                        className="btn ghost small"
                        disabled={translatingId === rec.id}
                        onClick={() => retryTranslate(rec)}
                      >
                        {translatingId === rec.id ? t.trRetrying : t.trRetry}
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
