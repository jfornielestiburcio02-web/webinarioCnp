import React, { useEffect, useRef, useState } from 'react';
import { T, fmtDay, rankLabel, type Lang } from '../lib/i18n';
import { GROUPS, isJuntaMember } from '../lib/ranks';
import type {
  PersonalRecord,
  PortalRecord,
  PromotionRecord,
  WebpolDb,
} from '../lib/db';
import { buildPromotionRecord } from '../lib/records';
import {
  buildPromotionTranslations,
  extractPromotionItems,
  requestBilingualTranslation,
  resolvePromotion,
} from '../lib/translate';

interface AscensosViewProps {
  lang: Lang;
  me: PersonalRecord;
  canPromote: boolean;
  rows: PersonalRecord[];
  portals: Record<string, PortalRecord>;
  promotions: PromotionRecord[];
  db: WebpolDb;
}

export function AscensosView({
  lang,
  me,
  canPromote,
  rows,
  portals,
  promotions,
  db,
}: AscensosViewProps) {
  const t = T[lang];
  const approved = rows
    .filter((r) => r.estado === 'aprobado')
    .sort((a, b) => a.nombres.localeCompare(b.nombres));

  const juntaPeers = approved.filter((a) =>
    isJuntaMember(a.rango, portals[a.placa], a.admin)
  );

  const [superiores, setSuperiores] = useState(
    () => `${rankLabel(me.rango, lang)} · ${me.nombres} (${me.placa})`
  );
  const [agentePlaca, setAgentePlaca] = useState('');
  const [rangoPromociona, setRangoPromociona] = useState('');
  const [motivo, setMotivo] = useState('');
  const [fechaPromocion, setFechaPromocion] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [observaciones, setObservaciones] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [translatingId, setTranslatingId] = useState<string | null>(null);
  const [translateError, setTranslateError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    kind: 'success' | 'error';
    text: string;
  } | null>(null);
  const attemptedRef = useRef<Set<string>>(new Set());

  const targetAgent = approved.find((a) => a.placa === agentePlaca);
  const rangoAnteriorDisplay = targetAgent
    ? rankLabel(targetAgent.rango, lang)
    : '—';

  const visiblePromotions = canPromote
    ? promotions
    : promotions.filter((p) => p.agentePlaca === me.placa);

  async function translatePromotion(rec: PromotionRecord, showSuccess = false) {
    setTranslatingId(rec.id);
    setTranslateError(null);
    const tr = await requestBilingualTranslation(extractPromotionItems(rec));
    setTranslatingId(null);
    if (tr.ok) {
      db.updatePromotionTranslations(
        rec.id,
        tr.detectedSource,
        buildPromotionTranslations(rec, tr)
      );
      if (showSuccess) {
        setFeedback({ kind: 'success', text: t.ascSaved });
      }
    } else {
      setTranslateError(tr.error);
    }
  }

  useEffect(() => {
    const missing = visiblePromotions.find(
      (p) => !p.translations?.[lang] && !attemptedRef.current.has(`${p.id}:${lang}`)
    );
    if (!missing) return;
    attemptedRef.current.add(`${missing.id}:${lang}`);
    void translatePromotion(missing);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visiblePromotions, lang]);

  function addSuperiorChip(peer: PersonalRecord) {
    const entry = `${rankLabel(peer.rango, lang)} · ${peer.nombres} (${peer.placa})`;
    const current = superiores.trim();
    if (!current) {
      setSuperiores(entry);
      return;
    }
    if (current.includes(peer.placa)) return;
    setSuperiores(`${current}, ${entry}`);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setFeedback(null);

    const res = buildPromotionRecord(
      {
        superiores,
        agentePlaca,
        rangoPromociona,
        motivo,
        fechaPromocion,
        observaciones,
      },
      me,
      targetAgent
    );

    if (!res.ok) {
      setFeedback({
        kind: 'error',
        text: res.error === 'same_rank' ? t.ascSameRankErr : t.ascErr,
      });
      return;
    }

    setSubmitting(true);
    const tr = await requestBilingualTranslation(extractPromotionItems(res.record));
    setSubmitting(false);

    if (tr.ok) {
      db.addPromotion({
        ...res.record,
        sourceLang: tr.detectedSource,
        translations: buildPromotionTranslations(res.record, tr),
      });
      setAgentePlaca('');
      setRangoPromociona('');
      setMotivo('');
      setObservaciones('');
      setFeedback({ kind: 'success', text: t.ascSaved });
    } else {
      db.addPromotion(res.record);
      setAgentePlaca('');
      setRangoPromociona('');
      setMotivo('');
      setObservaciones('');
      setFeedback({
        kind: 'error',
        text: `${t.trSavedWarn} ${tr.error}`,
      });
    }
  }

  return (
    <div className="portal">
      {canPromote && (
        <section className="section">
          <h2>{t.ascFormTitle}</h2>
          <p className="lead">{t.ascFormLead}</p>

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
                {t.ascSuperioresLbl}
                <input
                  placeholder={t.ascSuperioresPh}
                  value={superiores}
                  onChange={(e) => setSuperiores(e.target.value)}
                  disabled={submitting}
                />
              </label>

              {juntaPeers.length > 1 && (
                <div className="wide">
                  <div className="unit-picker">
                    {juntaPeers.map((peer) => {
                      const included = superiores.includes(peer.placa);
                      return (
                        <button
                          key={peer.placa}
                          type="button"
                          className={`unit-chip${included ? ' active' : ''}`}
                          onClick={() => addSuperiorChip(peer)}
                        >
                          {`${peer.nombres} (${peer.placa})`}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <label>
                {t.ascAgenteLbl}
                <select
                  value={agentePlaca}
                  onChange={(e) => setAgentePlaca(e.target.value)}
                  disabled={submitting}
                >
                  <option value="">{t.ascAgentePh}</option>
                  {approved.map((a) => (
                    <option key={a.placa} value={a.placa}>
                      {`${a.nombres} (${a.placa} · ${rankLabel(a.rango, lang)})`}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                {t.ascRangoPrevLbl}
                <input value={rangoAnteriorDisplay} disabled />
              </label>

              <label>
                {t.ascRangoNewLbl}
                <select
                  value={rangoPromociona}
                  onChange={(e) => setRangoPromociona(e.target.value)}
                  disabled={submitting}
                >
                  <option value="">{t.ascRangoNewPh}</option>
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
                {t.ascFechaLbl}
                <input
                  type="date"
                  value={fechaPromocion}
                  onChange={(e) => setFechaPromocion(e.target.value)}
                  disabled={submitting}
                />
              </label>

              <label className="wide">
                {t.ascMotivoLbl}
                <textarea
                  rows={3}
                  placeholder={t.ascMotivoPh}
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  disabled={submitting}
                />
              </label>

              <label className="wide">
                {t.ascObsLbl}
                <textarea
                  rows={2}
                  placeholder={t.ascObsPh}
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  disabled={submitting}
                />
              </label>
            </div>

            <div className="editor-actions">
              <button type="submit" className="btn" disabled={submitting}>
                {submitting ? t.trPublishing : t.ascSubmit}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="section">
        <h2>{t.ascListTitle}</h2>
        <p className="lead">{canPromote ? t.ascDesc : t.ascMyLead}</p>

        {translateError && (
          <div className="msg error" style={{ marginBottom: 14 }} role="alert">
            {translateError}
          </div>
        )}

        {visiblePromotions.length === 0 ? (
          <div className="empty">{t.ascEmpty}</div>
        ) : (
          <div className="list">
            {visiblePromotions.map((p) => {
              const view = resolvePromotion(p, lang);
              const needsTranslation = !p.translations?.[lang];
              return (
                <article key={p.id} className="req">
                  <div className="head">
                    <span className="who">
                      {`${p.agenteNombre} (${p.agentePlaca})`}
                    </span>
                    <div className="actions">
                      {view.isTranslated && (
                        <span className="badge">{t.trAutoBadge}</span>
                      )}
                      <span className="badge ok">
                        {`${rankLabel(p.rangoAnterior, lang)} → ${rankLabel(p.rangoPromociona, lang)}`}
                      </span>
                    </div>
                  </div>
                  <div className="meta">
                    <span>{`${t.ascSuperioresLbl}: ${view.superiores}`}</span>
                    <span className="mono">
                      {`${t.ascFechaLbl}: ${fmtDay(p.fechaPromocion)}`}
                    </span>
                  </div>
                  <div className="com-text">
                    <p>
                      <strong>{t.ascMotivoLbl}: </strong>
                      {view.motivo}
                    </p>
                    {view.observaciones && (
                      <p>
                        <strong>{t.ascObsLbl}: </strong>
                        {view.observaciones}
                      </p>
                    )}
                  </div>
                  {needsTranslation && (
                    <div className="actions">
                      <button
                        type="button"
                        className="btn ghost small"
                        disabled={translatingId === p.id}
                        onClick={() => translatePromotion(p, true)}
                      >
                        {translatingId === p.id ? t.trRetrying : t.trRetry}
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
