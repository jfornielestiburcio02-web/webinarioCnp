import React, { useState } from 'react';
import { T, fmtDate, rankLabel, type Lang } from '../lib/i18n';
import {
  canManagePersonal,
  canResolve,
  isApprover,
  isJuntaMember,
  isPsicologo,
} from '../lib/ranks';
import type {
  ComunicadoRecord,
  EstadoRegistro,
  InactivityRecord,
  MedicalRecord,
  PersonalRecord,
  PortalRecord,
  PromotionRecord,
  SanctionRecord,
  WebpolDb,
} from '../lib/db';
import { Emblem, WebpolIcon, type IconName } from './Visuals';
import { LangSwitch } from './LangSwitch';
import { ThemeSwitch, type Theme } from './ThemeSwitch';
import { PortalView } from './PortalView';
import {
  ComunicadosView,
  LatestComunicadoSection,
} from './ComunicadosView';
import { GestionPersonalView } from './GestionPersonalView';
import { UnidadesView } from './UnidadesView';
import { SancionesView } from './SancionesView';
import { AscensosView } from './AscensosView';
import { InactividadView } from './InactividadView';
import {
  AgentMedicalHistoryView,
  PsicologiaPanelView,
} from './ExpedienteMedicoView';

export type DashboardPage =
  | 'home'
  | 'portal'
  | 'comunicados'
  | 'gestion'
  | 'unidades'
  | 'sanciones'
  | 'ascensos'
  | 'inactividad'
  | 'psicologia'
  | 'mi-expediente-medico';

interface DashboardScreenProps {
  lang: Lang;
  onLangChange: (lang: Lang) => void;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  me: PersonalRecord;
  rows: PersonalRecord[];
  portals: Record<string, PortalRecord>;
  comunicados: ComunicadoRecord[];
  medicalRecords: MedicalRecord[];
  sanctions: SanctionRecord[];
  promotions: PromotionRecord[];
  inactivityRequests: InactivityRecord[];
  db: WebpolDb;
  onLogout: () => void;
}

function Tile({
  icon,
  name,
  desc,
  badge,
  soonLabel,
  onClick,
}: {
  icon: IconName;
  name: string;
  desc?: string;
  badge?: string;
  soonLabel: string;
  onClick?: () => void;
}) {
  if (onClick) {
    return (
      <button className="tile" type="button" onClick={onClick}>
        <WebpolIcon name={icon} />
        <span className="t-name">{name}</span>
        {desc && <span className="t-desc">{desc}</span>}
        {badge && <span className="badge">{badge}</span>}
      </button>
    );
  }
  return (
    <div className="tile off" aria-disabled="true">
      <WebpolIcon name={icon} />
      <span className="t-name">{name}</span>
      <span className="badge">{soonLabel}</span>
    </div>
  );
}

function ApprovalsSection({
  lang,
  me,
  rows,
  db,
}: {
  lang: Lang;
  me: PersonalRecord;
  rows: PersonalRecord[];
  db: WebpolDb;
}) {
  const t = T[lang];
  const [statusMsg, setStatusMsg] = useState<{
    kind: 'success' | 'error';
    text: string;
  } | null>(null);
  const [denyingPlaca, setDenyingPlaca] = useState<string | null>(null);
  const [motivo, setMotivo] = useState('');

  const pending = rows
    .filter(
      (r) =>
        r.estado === 'pendiente' &&
        (me.admin || canResolve(me.rango, r.rango))
    )
    .sort((a, b) => String(a.creado).localeCompare(String(b.creado)));

  function resolve(
    r: PersonalRecord,
    estado: EstadoRegistro,
    reasonText?: string
  ) {
    try {
      db.updatePersonal(r.placa, {
        estado,
        motivo:
          estado === 'rechazado'
            ? (reasonText || '').trim().slice(0, 200) || null
            : null,
        resueltoPor: `${me.rango} ${me.nombres} (${me.placa})`,
        resueltoEn: new Date().toISOString(),
      });
      setDenyingPlaca(null);
      setMotivo('');
      setStatusMsg({
        kind: 'success',
        text: estado === 'aprobado' ? t.okApprove : t.okDeny,
      });
    } catch (err) {
      setStatusMsg({
        kind: 'error',
        text: err instanceof Error ? err.message : t.errSave,
      });
    }
  }

  return (
    <section className="section">
      <h2>{t.pendTitle}</h2>
      <p className="lead">{t.pendLead}</p>
      {statusMsg && (
        <div
          className={`msg ${statusMsg.kind}`}
          style={{ marginBottom: 12 }}
          role={statusMsg.kind === 'error' ? 'alert' : 'status'}
        >
          {statusMsg.text}
        </div>
      )}
      <div className="list">
        {pending.length === 0 ? (
          <div className="empty">{t.pendEmpty}</div>
        ) : (
          pending.map((r) => (
            <article key={r.placa} className="req" data-placa={r.placa}>
              <div className="head">
                <span className="who">{r.nombres}</span>
                <span className="badge">{rankLabel(r.rango, lang)}</span>
              </div>
              <div className="meta">
                <span className="mono">{`${t.placa} ${r.placa}`}</span>
                <span className="mono">{`${t.dni} ${r.dni}`}</span>
                <span>{`${t.requested} ${fmtDate(r.creado, lang)}`}</span>
              </div>
              {denyingPlaca === r.placa ? (
                <div className="deny-box">
                  <input
                    maxLength={200}
                    placeholder={t.motivePh}
                    aria-label={t.motiveAria}
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    autoFocus
                  />
                  <div className="actions">
                    <button
                      className="btn bad small"
                      type="button"
                      onClick={() => resolve(r, 'rechazado', motivo)}
                    >
                      {t.confirmDeny}
                    </button>
                    <button
                      className="btn ghost small"
                      type="button"
                      onClick={() => {
                        setDenyingPlaca(null);
                        setMotivo('');
                      }}
                    >
                      {t.cancel}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="actions">
                  <button
                    className="btn ok small"
                    type="button"
                    onClick={() => resolve(r, 'aprobado')}
                  >
                    {t.approve}
                  </button>
                  <button
                    className="btn bad small"
                    type="button"
                    onClick={() => {
                      setDenyingPlaca(r.placa);
                      setMotivo('');
                    }}
                  >
                    {t.deny}
                  </button>
                </div>
              )}
            </article>
          ))
        )}
      </div>
    </section>
  );
}

export function DashboardScreen({
  lang,
  onLangChange,
  theme,
  onThemeChange,
  me,
  rows,
  portals,
  comunicados,
  medicalRecords,
  sanctions,
  promotions,
  inactivityRequests,
  db,
  onLogout,
}: DashboardScreenProps) {
  const t = T[lang];
  const [page, setPage] = useState<DashboardPage>('home');
  const [openCom, setOpenCom] = useState<string | null>(null);

  const myPortal = portals[me.placa];
  const allowManagePersonal = canManagePersonal(me.rango, myPortal, me.admin);
  const allowJunta = isJuntaMember(me.rango, myPortal, me.admin);
  const allowPsicologia = isPsicologo(myPortal);
  const pendingInactivityCount = inactivityRequests.filter(
    (r) => r.estado === 'pendiente'
  ).length;
  const inactivityBadge =
    allowJunta && pendingInactivityCount > 0
      ? pendingInactivityCount === 1
        ? t.inacPendingOne
        : t.inacPendingCount.replace('{n}', String(pendingInactivityCount))
      : undefined;

  const go = (nextPage: DashboardPage) => {
    setPage(nextPage);
    setOpenCom(null);
    window.scrollTo(0, 0);
  };

  const openComunicado = (id: string) => {
    setOpenCom(id);
    setPage('comunicados');
    window.scrollTo(0, 0);
  };

  return (
    <>
      <header className="topbar">
        <div className="id">
          <Emblem alt={t.emblemAlt} />
          <div>
            <div className="kicker">{`${t.titleLead} CNP · ${t.state}`}</div>
            <div className="name">{`${rankLabel(me.rango, lang)} · ${me.nombres}`}</div>
          </div>
        </div>
        <div className="top-actions">
          <ThemeSwitch theme={theme} lang={lang} onChange={onThemeChange} />
          <LangSwitch lang={lang} onChange={onLangChange} />
          <button className="btn ghost small" type="button" onClick={onLogout}>
            {t.logout}
          </button>
        </div>
      </header>

      <main className="wrap">
        {page === 'portal' && (
          <>
            <button
              className="btn ghost small back"
              type="button"
              onClick={() => go('home')}
            >
              {t.back}
            </button>
            <div className="hero">
              <h2>{t.portalTitle}</h2>
              <p className="lead">{t.portalDesc}</p>
            </div>
            <PortalView
              lang={lang}
              me={me}
              portal={myPortal}
              medicalRecords={medicalRecords}
              db={db}
              onOpenMedicalRecord={() => go('mi-expediente-medico')}
            />
          </>
        )}

        {page === 'mi-expediente-medico' && (
          <AgentMedicalHistoryView
            lang={lang}
            agent={me}
            records={medicalRecords}
            db={db}
            onBack={() => go('portal')}
          />
        )}

        {page === 'gestion' && allowManagePersonal && (
          <>
            <button
              className="btn ghost small back"
              type="button"
              onClick={() => go('home')}
            >
              {t.back}
            </button>
            <div className="hero">
              <h2>{t.gestionTitle}</h2>
              <p className="lead">{t.gestionDesc}</p>
            </div>
            <GestionPersonalView
              lang={lang}
              rows={rows}
              portals={portals}
              db={db}
            />
          </>
        )}

        {page === 'unidades' && (
          <>
            <button
              className="btn ghost small back"
              type="button"
              onClick={() => go('home')}
            >
              {t.back}
            </button>
            <div className="hero">
              <h2>{t.unidadesTitle}</h2>
              <p className="lead">{t.unidadesDesc}</p>
            </div>
            <UnidadesView lang={lang} rows={rows} portals={portals} />
          </>
        )}

        {page === 'sanciones' && (
          <>
            <button
              className="btn ghost small back"
              type="button"
              onClick={() => go('home')}
            >
              {t.back}
            </button>
            <div className="hero">
              <h2>{t.sancionesTitle}</h2>
              <p className="lead">{t.sancionesDesc}</p>
            </div>
            <SancionesView
              lang={lang}
              me={me}
              canImpose={allowJunta}
              rows={rows}
              sanctions={sanctions}
              db={db}
            />
          </>
        )}

        {page === 'ascensos' && (
          <>
            <button
              className="btn ghost small back"
              type="button"
              onClick={() => go('home')}
            >
              {t.back}
            </button>
            <div className="hero">
              <h2>{t.ascTitle}</h2>
              <p className="lead">{t.ascDesc}</p>
            </div>
            <AscensosView
              lang={lang}
              me={me}
              canPromote={allowJunta}
              rows={rows}
              portals={portals}
              promotions={promotions}
              db={db}
            />
          </>
        )}

        {page === 'inactividad' && (
          <>
            <button
              className="btn ghost small back"
              type="button"
              onClick={() => go('home')}
            >
              {t.back}
            </button>
            <div className="hero">
              <h2>{t.inacTitle}</h2>
              <p className="lead">{t.inacDesc}</p>
            </div>
            <InactividadView
              lang={lang}
              me={me}
              canApprove={allowJunta}
              requests={inactivityRequests}
              db={db}
            />
          </>
        )}

        {page === 'psicologia' && allowPsicologia && (
          <>
            <button
              className="btn ghost small back"
              type="button"
              onClick={() => go('home')}
            >
              {t.back}
            </button>
            <div className="hero">
              <h2>{t.medTitle}</h2>
              <p className="lead">{t.medDesc}</p>
            </div>
            <PsicologiaPanelView
              lang={lang}
              me={me}
              rows={rows}
              records={medicalRecords}
              db={db}
            />
          </>
        )}

        {page === 'comunicados' && (
          <>
            <button
              className="btn ghost small back"
              type="button"
              onClick={() => go('home')}
            >
              {t.back}
            </button>
            <ComunicadosView
              lang={lang}
              comunicados={comunicados}
              openId={openCom}
              db={db}
              onOpen={(id) => setOpenCom(id)}
            />
          </>
        )}

        {page === 'home' && (
          <>
            <div className="hero">
              <h2>{t.homeTitle}</h2>
              <p className="lead">{t.homeLead}</p>
            </div>
            <div className="modules">
              <Tile
                icon="portal"
                name={t.portalTitle}
                desc={t.portalDesc}
                soonLabel={t.soonTitle}
                onClick={() => go('portal')}
              />
              <Tile
                icon="personal"
                name={allowManagePersonal ? t.gestionTitle : t.soon1}
                desc={allowManagePersonal ? t.gestionDesc : undefined}
                soonLabel={t.soonTitle}
                onClick={allowManagePersonal ? () => go('gestion') : undefined}
              />
              <Tile
                icon="unidades"
                name={t.unidadesTitle}
                desc={t.unidadesDesc}
                soonLabel={t.soonTitle}
                onClick={() => go('unidades')}
              />
              <Tile
                icon="historial"
                name={t.sancionesTitle}
                desc={t.sancionesDesc}
                soonLabel={t.soonTitle}
                onClick={() => go('sanciones')}
              />
              <Tile
                icon="ascensos"
                name={t.ascTitle}
                desc={t.ascDesc}
                soonLabel={t.soonTitle}
                onClick={() => go('ascensos')}
              />
              <Tile
                icon="inactividad"
                name={t.inacTitle}
                desc={t.inacDesc}
                badge={inactivityBadge}
                soonLabel={t.soonTitle}
                onClick={() => go('inactividad')}
              />
              {allowPsicologia && (
                <Tile
                  icon="medico"
                  name={t.medTitle}
                  desc={t.medDesc}
                  soonLabel={t.soonTitle}
                  onClick={() => go('psicologia')}
                />
              )}
            </div>

            <LatestComunicadoSection
              lang={lang}
              me={me}
              canPublish={allowJunta}
              comunicados={comunicados}
              db={db}
              onOpen={openComunicado}
            />

            {(isApprover(me.rango) || me.admin) && (
              <ApprovalsSection lang={lang} me={me} rows={rows} db={db} />
            )}
          </>
        )}
      </main>
    </>
  );
}
