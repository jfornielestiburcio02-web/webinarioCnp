import React, { useState } from 'react';
import { T, rankLabel, type Lang } from '../lib/i18n';
import { GROUPS, TIER } from '../lib/ranks';
import { b64, derive, unb64, validateRegisterInput } from '../lib/crypto';
import type { PersonalRecord, WebpolDb } from '../lib/db';
import { Emblem } from './Visuals';
import { LangSwitch } from './LangSwitch';
import { ThemeSwitch, type Theme } from './ThemeSwitch';
import { PassField } from './PassField';

interface AuthScreenProps {
  lang: Lang;
  onLangChange: (lang: Lang) => void;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  rows: PersonalRecord[];
  db: WebpolDb;
  onLogin: (placa: string) => void;
}

type Tab = 'login' | 'register';

export function AuthScreen({
  lang,
  onLangChange,
  theme,
  onThemeChange,
  rows,
  db,
  onLogin,
}: AuthScreenProps) {
  const t = T[lang];
  const [tab, setTab] = useState<Tab>('login');
  const [sent, setSent] = useState(false);

  // Login form state
  const [lPlaca, setLPlaca] = useState('');
  const [lPass, setLPass] = useState('');
  const [lMsg, setLMsg] = useState<{ kind: 'error' | 'warn'; text: string } | null>(null);
  const [lBusy, setLBusy] = useState(false);

  // Register form state
  const [rDni, setRDni] = useState('');
  const [rNombres, setRNombres] = useState('');
  const [rPlaca, setRPlaca] = useState('');
  const [rRango, setRRango] = useState('');
  const [rPass, setRPass] = useState('');
  const [rPass2, setRPass2] = useState('');
  const [rMsg, setRMsg] = useState<{ kind: 'error' | 'warn'; text: string } | null>(null);
  const [rBusy, setRBusy] = useState(false);

  async function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLBusy(true);
    setLMsg(null);
    const p = lPlaca.trim().toUpperCase();
    const row = rows.find((r) => r.placa === p);
    try {
      const salt =
        row && row.salt
          ? unb64(row.salt)
          : crypto.getRandomValues(new Uint8Array(16));
      const h = await derive(lPass.slice(0, 128), salt);
      if (!row || h !== row.hash) {
        setLMsg({ kind: 'error', text: t.errLogin });
        setLBusy(false);
        return;
      }
      if (row.estado === 'pendiente') {
        setLMsg({ kind: 'warn', text: t.errPending });
        setLBusy(false);
        return;
      }
      if (row.estado === 'rechazado') {
        setLMsg({
          kind: 'error',
          text:
            t.errDenied +
            (row.motivo ? t.motive + row.motivo : '') +
            t.retry,
        });
        setLBusy(false);
        return;
      }
      onLogin(p);
    } catch (err) {
      const message =
        err instanceof Error && err.message === 'NO_CRYPTO'
          ? t.noCrypto
          : err instanceof Error
            ? err.message
            : t.errLoginGeneric;
      setLMsg({ kind: 'error', text: message });
      setLBusy(false);
    }
  }

  async function handleRegisterSubmit(e: React.FormEvent) {
    e.preventDefault();
    setRMsg(null);

    const check = validateRegisterInput({
      dni: rDni,
      nombres: rNombres,
      placa: rPlaca,
      rango: rRango,
      pass: rPass,
      pass2: rPass2,
    });

    if (!check.ok) {
      setRMsg({ kind: 'error', text: t[check.errorKey] });
      return;
    }

    setRBusy(true);
    try {
      if (
        rows.some(
          (r) =>
            (r.dni === check.dni || r.placa === check.placa) &&
            r.estado !== 'rechazado'
        )
      ) {
        setRMsg({ kind: 'error', text: t.vDup });
        setRBusy(false);
        return;
      }

      for (const r of rows.filter(
        (x) =>
          x.dni === check.dni &&
          x.placa !== check.placa &&
          x.estado === 'rechazado'
      )) {
        db.deletePersonal(r.placa);
      }

      const bootstrap =
        rows.filter((r) => r.estado === 'aprobado').length === 0 &&
        TIER.get(check.rango) === 4;
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const hash = await derive(check.pass, salt);
      const now = new Date().toISOString();

      db.upsertPersonal({
        dni: check.dni,
        nombres: check.nombres,
        placa: check.placa,
        rango: check.rango,
        salt: b64(salt),
        hash,
        estado: bootstrap ? 'aprobado' : 'pendiente',
        creado: now,
        resueltoPor: bootstrap ? 'Arranque del sistema' : null,
        resueltoEn: bootstrap ? now : null,
        motivo: null,
      });

      setRBusy(false);
      if (bootstrap) {
        onLogin(check.placa);
        return;
      }

      setRDni('');
      setRNombres('');
      setRPlaca('');
      setRRango('');
      setRPass('');
      setRPass2('');
      setSent(true);
    } catch (err) {
      const message =
        err instanceof Error && err.message === 'NO_CRYPTO'
          ? t.noCrypto
          : err instanceof Error
            ? err.message
            : t.errRegister;
      setRMsg({ kind: 'error', text: message });
      setRBusy(false);
    }
  }

  return (
    <div className="auth">
      <aside className="brand">
        <Emblem alt={t.emblemAlt} />
        <div className="titles">
          <div className="kicker">{t.state}</div>
          <h1>
            <span className="gold">{t.titleLead}</span>
            {t.titleRest}
          </h1>
        </div>
        <div className="rule" />
        <p>{t.brandP}</p>
      </aside>

      <main className="panel">
        <div className="panel-controls">
          <ThemeSwitch theme={theme} lang={lang} onChange={onThemeChange} />
          <LangSwitch lang={lang} onChange={onLangChange} />
        </div>
        <div className="card">
          {sent ? (
            <div className="done">
              <h2>{t.sentTitle}</h2>
              <p>{t.sentText}</p>
              <button
                className="btn"
                type="button"
                onClick={() => {
                  setSent(false);
                  setTab('login');
                }}
              >
                {t.toLogin}
              </button>
            </div>
          ) : (
            <>
              <div className="tabs" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === 'login'}
                  onClick={() => {
                    setTab('login');
                    setLMsg(null);
                  }}
                >
                  {t.tabLogin}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === 'register'}
                  onClick={() => {
                    setTab('register');
                    setRMsg(null);
                  }}
                >
                  {t.tabRegister}
                </button>
              </div>

              {tab === 'login' ? (
                <form className="auth-form" noValidate onSubmit={handleLoginSubmit}>
                  {lMsg && (
                    <div
                      className={`msg ${lMsg.kind}`}
                      role={lMsg.kind === 'error' ? 'alert' : 'status'}
                    >
                      {lMsg.text}
                    </div>
                  )}
                  <label htmlFor="l-placa">
                    {t.lblPlaca}
                    <input
                      id="l-placa"
                      className="mono"
                      required
                      maxLength={10}
                      autoComplete="username"
                      autoCapitalize="characters"
                      value={lPlaca}
                      onChange={(e) => setLPlaca(e.target.value)}
                    />
                  </label>
                  <label htmlFor="l-pass">
                    {t.lblPass}
                    <PassField
                      id="l-pass"
                      lang={lang}
                      required
                      maxLength={128}
                      autoComplete="current-password"
                      value={lPass}
                      onChange={(e) => setLPass(e.target.value)}
                    />
                  </label>
                  <button className="btn" type="submit" disabled={lBusy}>
                    {t.btnEnter}
                  </button>
                  <div className="status-line">
                    <span className="dot on" />
                    <span>{t.connOk}</span>
                  </div>
                </form>
              ) : (
                <form className="auth-form" noValidate onSubmit={handleRegisterSubmit}>
                  {rMsg && (
                    <div
                      className={`msg ${rMsg.kind}`}
                      role={rMsg.kind === 'error' ? 'alert' : 'status'}
                    >
                      {rMsg.text}
                    </div>
                  )}
                  <label htmlFor="r-dni">
                    {t.lblDni}
                    <input
                      id="r-dni"
                      className="mono"
                      required
                      maxLength={9}
                      placeholder="12345678Z"
                      autoComplete="off"
                      autoCapitalize="characters"
                      value={rDni}
                      onChange={(e) => setRDni(e.target.value)}
                    />
                    <span className="hint">{t.hintDni}</span>
                  </label>
                  <label htmlFor="r-nombres">
                    {t.lblNombres}
                    <input
                      id="r-nombres"
                      required
                      maxLength={100}
                      autoComplete="off"
                      value={rNombres}
                      onChange={(e) => setRNombres(e.target.value)}
                    />
                  </label>
                  <label htmlFor="r-placa">
                    {t.lblPlaca}
                    <input
                      id="r-placa"
                      className="mono"
                      required
                      maxLength={10}
                      autoComplete="off"
                      autoCapitalize="characters"
                      value={rPlaca}
                      onChange={(e) => setRPlaca(e.target.value)}
                    />
                  </label>
                  <label htmlFor="r-rango">
                    {t.lblRango}
                    <select
                      id="r-rango"
                      required
                      value={rRango}
                      onChange={(e) => setRRango(e.target.value)}
                    >
                      <option value="">{t.phRango}</option>
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
                  <label htmlFor="r-pass">
                    {t.lblPass}
                    <PassField
                      id="r-pass"
                      lang={lang}
                      required
                      minLength={8}
                      maxLength={128}
                      autoComplete="new-password"
                      value={rPass}
                      onChange={(e) => setRPass(e.target.value)}
                    />
                    <span className="hint">{t.hintPass}</span>
                  </label>
                  <label htmlFor="r-pass2">
                    {t.lblPass2}
                    <PassField
                      id="r-pass2"
                      lang={lang}
                      required
                      minLength={8}
                      maxLength={128}
                      autoComplete="new-password"
                      value={rPass2}
                      onChange={(e) => setRPass2(e.target.value)}
                    />
                  </label>
                  <button className="btn" type="submit" disabled={rBusy}>
                    {t.btnRegister}
                  </button>
                  <div className="status-line">
                    <span className="dot on" />
                    <span>{t.connOk}</span>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
