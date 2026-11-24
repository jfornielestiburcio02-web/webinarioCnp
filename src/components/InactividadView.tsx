import React, { useEffect, useRef, useState } from 'react';
import { T, fmtDate, fmtDay, rankLabel, type Lang } from '../lib/i18n';
import type {
  InactivityRecord,
  InactivityStatus,
  PersonalRecord,
  WebpolDb,
} from '../lib/db';
import { buildInactivityRecord } from '../lib/records';
import {
  buildInactivityTranslations,
  extractInactivityItems,
  requestBilingualTranslation,
  resolveInactivity,
} from '../lib/translate';

interface InactividadViewProps {
  lang: Lang;
  me: PersonalRecord;
  canApprove: boolean;
  requests: InactivityRecord[];
  db: WebpolDb;
}

function statusBadgeClass(status: InactivityStatus): string {
  if (status === 'aprobado') return 'badge ok';
  if (status === 'rechazado') return 'badge bad';
  return 'badge';
}

export function InactividadView({
  lang,
  me,
  canApprove,
  requests,
  db,
}: InactividadViewProps) {
  const t = T[lang];

  const [motivo, setMotivo] = useState('');
  const [fechaInicio, setFechaInicio] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [fechaFin, setFechaFin] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    kind: 'success' | 'error';
    text: string;
  } | null>(null);

  const [denyingId, setDenyingId] = useState<string | null>(null);
  const [denyReason, setDenyReason] = useState('');
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [queueFeedback, setQueueFeedback] = useState<{
    kind: 'success' | 'error';
    text: string;
  } | null>(null);
  const [translatingId, setTranslatingId] = useState<string | null>(null);
  const attemptedRef = useRef<Set<string>>(new Set());

  const statusLabel = (status: InactivityStatus): string => {
    if (status === 'aprobado') return t.inacStatusApproved;
    if (status === 'rechazado') return t.inacStatusDenied;
    return t.inacStatusPending;
  };

  const myRequests = requests.filter((r) => r.agentePlaca === me.placa);
  const queueRequests = requests.slice().sort((a, b) => {
    if (a.estado === 'pendiente' && b.estado !== 'pendiente') return -1;
    if (a.estado !== 'pendiente' && b.estado === 'pendiente') return 1;
    return String(b.creadoEn).localeCompare(String(a.creadoEn));
  });

  async function translateRequest(req: InactivityRecord) {
    setTranslatingId(req.id);
    const tr = await requestBilingualTranslation(extractInactivityItems(req));
    setTranslatingId(null);
    if (tr.ok) {
      db.updateInactivityTranslations(
        req.id,
        tr.detectedSource,
        buildInactivityTranslations(req, tr)
      );
    }
  }

  useEffect(() => {
    const visible = canApprove ? queueRequests : myRequests;
    const missing = visible.find(
      (r) => !r.translations?.[lang] && !attemptedRef.current.has(`${r.id}:${lang}`)
    );
    if (!missing) return;
    attemptedRef.current.add(`${missing.id}:${lang}`);
    void translateRequest(missing);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requests, lang, canApprove]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setFeedback(null);

    const res = buildInactivityRecord(
      { motivo, fechaInicio, fechaFin },
      me
    );
    if (!res.ok) {
      setFeedback({
        kind: 'error',
        text: res.error === 'invalid_dates' ? t.inacDateErr : t.inacErr,
      });
      return;
    }

    setSubmitting(true);
    const tr = await requestBilingualTranslation(
      extractInactivityItems(res.record)
    );
    setSubmitting(false);

    if (tr.ok) {
      db.addInactivityRequest({
        ...res.record,
        sourceLang: tr.detectedSource,
        translations: buildInactivityTranslations(res.record, tr),
      });
      setMotivo('');
      setFeedback({ kind: 'success', text: t.inacSaved });
    } else {
      db.addInactivityRequest(res.record);
      setMotivo('');
      setFeedback({
        kind: 'error',
        text: `${t.trSavedWarn} ${tr.error}`,
      });
    }
  }

  async function handleResolve(
    req: InactivityRecord,
    estado: 'aprobado' | 'rechazado',
    reasonText?: string
  ) {
    if (resolvingId) return;
    setQueueFeedback(null);

    const cleanReason =
      estado === 'rechazado'
        ? (reasonText || '').trim().slice(0, 200) || null
        : null;

    let resolutionTranslations: Partial<Record<'es' | 'ca', string>> | undefined;
    if (cleanReason) {
      setResolvingId(req.id);
      const tr = await requestBilingualTranslation([
        { key: 'motivoResolucion', text: cleanReason },
      ]);
      setResolvingId(null);
      if (tr.ok) {
        resolutionTranslations = {
          es: tr.es.motivoResolucion ?? cleanReason,
          ca: tr.ca.motivoResolucion ?? cleanReason,
        };
      }
    }

    db.resolveInactivityRequest(req.id, {
      estado,
      resueltoPor: `${rankLabel(me.rango, 'es')} · ${me.nombres} (${me.placa})`,
      resueltoEn: new Date().toISOString(),
      motivoResolucion: cleanReason,
      resolutionTranslations,
    });

    setDenyingId(null);
    setDenyReason('');
    setQueueFeedback({
      kind: 'success',
      text: estado === 'aprobado' ? t.inacApproveOk : t.inacDenyOk,
    });
  }

  function renderCard(req: InactivityRecord, isQueueView: boolean) {
    const view = resolveInactivity(req, lang);
    const needsTranslation = !req.translations?.[lang];
    return (
      <article key={req.id} className="req" data-inactivity-id={req.id}>
        <div className="head">
          <span className="who">
            {`${req.agenteNombre} (${req.agentePlaca} · ${rankLabel(req.agenteRango, lang)})`}
          </span>
          <div className="actions">
            {view.isTranslated && (
              <span className="badge">{t.trAutoBadge}</span>
            )}
            <span className={statusBadgeClass(req.estado)}>
              {statusLabel(req.estado)}
            </span>
          </div>
        </div>
        <div className="meta">
          <span className="mono">{`${t.inacStartLbl}: ${fmtDay(req.fechaInicio)}`}</span>
          <span className="mono">{`${t.inacEndLbl}: ${fmtDay(req.fechaFin)}`}</span>
          <span>{`${t.requested}: ${fmtDate(req.creadoEn, lang)}`}</span>
        </div>
        <div className="com-text">
          <p>
            <strong>{t.inacMotivoLbl}: </strong>
            {view.motivo}
          </p>
          {req.resueltoPor && (
            <p>
              <strong>{t.inacResolvedBy}: </strong>
              {req.resueltoPor}
            </p>
          )}
          {view.motivoResolucion && (
            <p>
              <strong>{t.motive}: </strong>
              {view.motivoResolucion}
            </p>
          )}
        </div>

        <div className="actions">
          {needsTranslation && (
            <button
              type="button"
              className="btn ghost small"
              disabled={translatingId === req.id}
              onClick={() => translateRequest(req)}
            >
              {translatingId === req.id ? t.trRetrying : t.trRetry}
            </button>
          )}

          {isQueueView && req.estado === 'pendiente' && denyingId !== req.id && (
            <>
              <button
                type="button"
                className="btn ok small"
                disabled={resolvingId === req.id}
                onClick={() => handleResolve(req, 'aprobado')}
              >
                {t.approve}
              </button>
              <button
                type="button"
                className="btn bad small"
                disabled={resolvingId === req.id}
                onClick={() => {
                  setDenyingId(req.id);
                  setDenyReason('');
                }}
              >
                {t.deny}
              </button>
            </>
          )}
        </div>

        {isQueueView && req.estado === 'pendiente' && denyingId === req.id && (
          <div className="deny-box">
            <input
              maxLength={200}
              placeholder={t.motivePh}
              aria-label={t.motiveAria}
              value={denyReason}
              onChange={(e) => setDenyReason(e.target.value)}
              disabled={resolvingId === req.id}
              autoFocus
            />
            <div className="actions">
              <button
                type="button"
                className="btn bad small"
                disabled={resolvingId === req.id}
                onClick={() => handleResolve(req, 'rechazado', denyReason)}
              >
                {resolvingId === req.id ? t.trSaving : t.confirmDeny}
              </button>
              <button
                type="button"
                className="btn ghost small"
                disabled={resolvingId === req.id}
                onClick={() => {
                  setDenyingId(null);
                  setDenyReason('');
                }}
              >
                {t.cancel}
              </button>
            </div>
          </div>
        )}
      </article>
    );
  }

  return (
    <div className="portal">
      <section className="section">
        <h2>{t.inacFormTitle}</h2>
        <p className="lead">{t.inacFormLead}</p>

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
              {t.inacNameLbl}
              <input value={`${me.nombres} (${me.placa})`} disabled />
            </label>
            <label>
              {t.inacStartLbl}
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                disabled={submitting}
              />
            </label>
            <label>
              {t.inacEndLbl}
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                disabled={submitting}
              />
            </label>
            <label className="wide">
              {t.inacMotivoLbl}
              <textarea
                rows={3}
                placeholder={t.inacMotivoPh}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                disabled={submitting}
              />
            </label>
          </div>
          <div className="editor-actions">
            <button type="submit" className="btn" disabled={submitting}>
              {submitting ? t.trPublishing : t.inacSubmit}
            </button>
          </div>
        </form>
      </section>

      {canApprove && (
        <section className="section">
          <h2>{t.inacQueueTitle}</h2>
          <p className="lead">{t.inacQueueLead}</p>
          {queueFeedback && (
            <div
              className={`msg ${queueFeedback.kind}`}
              style={{ marginBottom: 14 }}
              role={queueFeedback.kind === 'error' ? 'alert' : 'status'}
            >
              {queueFeedback.text}
            </div>
          )}
          {queueRequests.length === 0 ? (
            <div className="empty">{t.inacQueueEmpty}</div>
          ) : (
            <div className="list">
              {queueRequests.map((r) => renderCard(r, true))}
            </div>
          )}
        </section>
      )}

      <section className="section">
        <h2>{t.inacMyTitle}</h2>
        {myRequests.length === 0 ? (
          <div className="empty">{t.inacMyEmpty}</div>
        ) : (
          <div className="list">
            {myRequests.map((r) => renderCard(r, false))}
          </div>
        )}
      </section>
    </div>
  );
}
