import React, { useEffect, useRef, useState } from 'react';
import { T, fmtDay, longDay, rankLabel, type Lang } from '../lib/i18n';
import type {
  ComunicadoBlock,
  ComunicadoRecord,
  PersonalRecord,
  WebpolDb,
} from '../lib/db';
import { buildComunicadoRecord } from '../lib/records';
import {
  buildComunicadoTranslations,
  extractComunicadoItems,
  requestBilingualTranslation,
  resolveComunicado,
} from '../lib/translate';

interface LatestComunicadoSectionProps {
  lang: Lang;
  me: PersonalRecord;
  canPublish: boolean;
  comunicados: ComunicadoRecord[];
  db: WebpolDb;
  onOpen: (id: string) => void;
}

interface ComunicadosViewProps {
  lang: Lang;
  comunicados: ComunicadoRecord[];
  openId: string | null;
  db: WebpolDb;
  onOpen: (id: string) => void;
}

function getSnippet(cuerpo: ComunicadoBlock[]): string {
  const first = (Array.isArray(cuerpo) ? cuerpo : []).find(
    (b) => b && b.t === 'p' && String(b.x || '').trim().length > 0
  );
  const x = first ? String(first.x).trim() : '';
  return x.length > 190 ? `${x.slice(0, 187).trimEnd()}…` : x;
}

export function sortComunicados(comunicados: ComunicadoRecord[]): ComunicadoRecord[] {
  return comunicados
    .slice()
    .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
}

export function LatestComunicadoSection({
  lang,
  me,
  canPublish,
  comunicados,
  db,
  onOpen,
}: LatestComunicadoSectionProps) {
  const t = T[lang];
  const sorted = sortComunicados(comunicados);
  const latest = sorted[0];

  const [composing, setComposing] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [cuerpo, setCuerpo] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [feedback, setFeedback] = useState<{
    kind: 'success' | 'error';
    text: string;
  } | null>(null);

  async function handlePublish(e: React.FormEvent) {
    e.preventDefault();
    if (publishing) return;
    setFeedback(null);

    const res = buildComunicadoRecord(
      titulo,
      cuerpo,
      me,
      rankLabel(me.rango, 'es')
    );
    if (!res.ok) {
      setFeedback({ kind: 'error', text: t.comPublishErr });
      return;
    }

    setPublishing(true);
    const tr = await requestBilingualTranslation(extractComunicadoItems(res.record));
    setPublishing(false);

    if (tr.ok) {
      db.addComunicado({
        ...res.record,
        sourceLang: tr.detectedSource,
        translations: buildComunicadoTranslations(res.record, tr),
      });
      setTitulo('');
      setCuerpo('');
      setComposing(false);
      setFeedback({ kind: 'success', text: t.comPublishOk });
    } else {
      db.addComunicado(res.record);
      setTitulo('');
      setCuerpo('');
      setComposing(false);
      setFeedback({
        kind: 'error',
        text: `${t.trSavedWarn} ${tr.error}`,
      });
    }
  }

  const latestView = latest ? resolveComunicado(latest, lang) : null;

  return (
    <section className="section">
      <div className="section-head">
        <div>
          <h2>{t.comTitle}</h2>
          <p className="lead" style={{ marginBottom: 0 }}>
            {t.comLead}
          </p>
        </div>
        {canPublish && (
          <button
            type="button"
            className="btn small"
            onClick={() => {
              setComposing((prev) => !prev);
              setFeedback(null);
            }}
          >
            {composing ? t.cancel : t.comNewBtn}
          </button>
        )}
      </div>

      {feedback && (
        <div
          className={`msg ${feedback.kind}`}
          style={{ marginTop: 14 }}
          role={feedback.kind === 'error' ? 'alert' : 'status'}
        >
          {feedback.text}
        </div>
      )}

      {composing && canPublish && (
        <form
          className="portal"
          style={{ marginTop: 16, marginBottom: 16 }}
          onSubmit={handlePublish}
        >
          <div className="editor-grid">
            <label className="wide">
              {t.comAutorAuto}
              <input
                value={`${rankLabel(me.rango, lang)} · ${me.nombres} (${me.placa})`}
                disabled
              />
            </label>
            <label className="wide">
              {t.comTituloLbl}
              <input
                placeholder={t.comTituloPh}
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                disabled={publishing}
              />
            </label>
            <label className="wide">
              {t.comCuerpoLbl}
              <textarea
                rows={4}
                placeholder={t.comCuerpoPh}
                value={cuerpo}
                onChange={(e) => setCuerpo(e.target.value)}
                disabled={publishing}
              />
            </label>
          </div>
          <div className="editor-actions">
            <button type="submit" className="btn small" disabled={publishing}>
              {publishing ? t.trPublishing : t.comPublishSubmit}
            </button>
          </div>
        </form>
      )}

      <div style={{ marginTop: 16 }}>
        {!latest || !latestView ? (
          <div className="empty">{t.comEmpty}</div>
        ) : (
          <button
            className="com-home-card"
            type="button"
            onClick={() => onOpen(latest.id)}
          >
            <div className="com-meta">
              <span className="kicker">{t.comOfficial}</span>
              <span className="mono">{fmtDay(latest.fecha)}</span>
              {latestView.autor && <span>{latestView.autor}</span>}
              {latestView.isTranslated && (
                <span className="badge">{t.trAutoBadge}</span>
              )}
            </div>
            <h3>{latestView.titulo || ''}</h3>
            {getSnippet(latestView.cuerpo) && (
              <p className="com-snip">{getSnippet(latestView.cuerpo)}</p>
            )}
            <span className="badge">{t.comRead}</span>
          </button>
        )}
      </div>
    </section>
  );
}

export function ComunicadosView({
  lang,
  comunicados,
  openId,
  db,
  onOpen,
}: ComunicadosViewProps) {
  const t = T[lang];
  const list = sortComunicados(comunicados);
  const attemptedRef = useRef<Set<string>>(new Set());
  const [translatingId, setTranslatingId] = useState<string | null>(null);
  const [translateError, setTranslateError] = useState<string | null>(null);

  const open = (openId && list.find((c) => c.id === openId)) || list[0];
  const needsTranslation = Boolean(open && !open.translations?.[lang]);

  async function translateComunicado(record: ComunicadoRecord) {
    setTranslatingId(record.id);
    setTranslateError(null);
    const tr = await requestBilingualTranslation(extractComunicadoItems(record));
    setTranslatingId(null);
    if (tr.ok) {
      db.updateComunicadoTranslations(
        record.id,
        tr.detectedSource,
        buildComunicadoTranslations(record, tr)
      );
    } else {
      setTranslateError(tr.error);
    }
  }

  useEffect(() => {
    if (!open || !needsTranslation) return;
    const key = `${open.id}:${lang}`;
    if (attemptedRef.current.has(key)) return;
    attemptedRef.current.add(key);
    void translateComunicado(open);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open?.id, lang, needsTranslation]);

  if (!list.length || !open) {
    return (
      <div className="portal">
        <div className="empty">{t.comEmpty}</div>
      </div>
    );
  }

  const openView = resolveComunicado(open, lang);
  const others = list.filter((c) => c.id !== open.id);

  return (
    <div className="portal">
      <article className="section com-article">
        <div className="kicker">{t.comOfficial}</div>
        <h2>{openView.titulo || ''}</h2>
        <div className="com-meta">
          <span>{longDay(open.fecha, lang)}</span>
          {openView.autor && <span>{`${t.comBy} ${openView.autor}`}</span>}
          {openView.isTranslated && (
            <span className="badge">{t.trAutoBadge}</span>
          )}
        </div>

        {needsTranslation && (
          <div className="editor-actions" style={{ marginBottom: 14 }}>
            {translatingId === open.id ? (
              <span className="hint">{t.trRetrying}</span>
            ) : (
              <button
                type="button"
                className="btn ghost small"
                onClick={() => translateComunicado(open)}
              >
                {t.trRetry}
              </button>
            )}
          </div>
        )}

        {translateError && needsTranslation && (
          <div className="msg error" style={{ marginBottom: 14 }} role="alert">
            {translateError}
          </div>
        )}

        <div className="com-text">
          {(Array.isArray(openView.cuerpo) ? openView.cuerpo : []).map((b, idx) => {
            if (b && b.t === 'ul') {
              return (
                <ul key={idx}>
                  {(Array.isArray(b.items) ? b.items : []).map((item, i) => (
                    <li key={i}>
                      <strong>{String(item.b || '')}</strong>
                      {item.x ? `: ${item.x}` : ''}
                    </li>
                  ))}
                </ul>
              );
            }
            return <p key={idx}>{String((b && b.x) || '')}</p>;
          })}
          {openView.autor && <p className="com-sign">{openView.autor}</p>}
        </div>
      </article>

      {others.length > 0 && (
        <section className="section">
          <h2>{t.comMoreTitle}</h2>
          <p className="lead">{t.comMoreLead}</p>
          <div className="list">
            {others.map((c) => {
              const cView = resolveComunicado(c, lang);
              const snip = getSnippet(cView.cuerpo);
              return (
                <button
                  key={c.id}
                  className="com-card"
                  type="button"
                  onClick={() => {
                    setTranslateError(null);
                    onOpen(c.id);
                    window.scrollTo(0, 0);
                  }}
                >
                  <div className="com-meta">
                    <span className="kicker">{t.comOfficial}</span>
                    <span className="mono">{fmtDay(c.fecha)}</span>
                    {cView.autor && <span>{cView.autor}</span>}
                    {cView.isTranslated && (
                      <span className="badge">{t.trAutoBadge}</span>
                    )}
                  </div>
                  <h3>{cView.titulo || ''}</h3>
                  {snip && <p className="com-snip">{snip}</p>}
                  <span className="badge">{t.comRead}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
