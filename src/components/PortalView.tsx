import React, { useEffect, useRef } from 'react';
import { T, rankLabel, type Lang } from '../lib/i18n';
import type {
  MedicalRecord,
  PersonalRecord,
  PortalRecord,
  WebpolDb,
} from '../lib/db';
import {
  formatOptionalDay,
  formatOptionalNumber,
  formatOptionalString,
  formatTriBool,
} from '../lib/gestion';
import { unitNameForLang } from '../lib/units';
import {
  buildPortalTranslations,
  extractPortalTextItems,
  requestBilingualTranslation,
  resolvePortalText,
} from '../lib/translate';

interface PortalViewProps {
  lang: Lang;
  me: PersonalRecord;
  portal: PortalRecord | undefined;
  medicalRecords: MedicalRecord[];
  db: WebpolDb;
  onOpenMedicalRecord: () => void;
}

function Field({
  k,
  v,
  extra,
}: {
  k: string;
  v: string;
  extra?: 'mono' | 'wide' | 'sub';
}) {
  return (
    <div className={`field${extra ? ` ${extra}` : ''}`}>
      <div className="k">{k}</div>
      <div className={`v${extra === 'mono' ? ' mono' : ''}`}>{v}</div>
    </div>
  );
}

export function PortalView({
  lang,
  me,
  portal,
  medicalRecords,
  db,
  onOpenMedicalRecord,
}: PortalViewProps) {
  const t = T[lang];
  const attemptedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!portal) return;
    const items = extractPortalTextItems(portal);
    if (items.length === 0 || portal.translations?.[lang]) return;
    const key = `${me.placa}:${lang}`;
    if (attemptedRef.current.has(key)) return;
    attemptedRef.current.add(key);

    void requestBilingualTranslation(items).then((tr) => {
      if (tr.ok) {
        db.updatePortalTranslations(
          me.placa,
          buildPortalTranslations(portal, tr)
        );
      }
    });
  }, [portal, lang, me.placa, db]);

  if (!portal) {
    return (
      <div className="portal">
        <div className="empty">{t.portalNone}</div>
      </div>
    );
  }

  const d = portal.disciplinario || {};
  const j = portal.judicial || {};
  const pe = portal.personal || {};
  const yn = (v?: boolean | null) => formatTriBool(v, t.yes, t.no, t.na);
  const foto = /^([\w.-]+\.(png|jpe?g|webp)|https?:\/\/.+)$/i.test(
    String(portal.foto || '').trim()
  )
    ? String(portal.foto).trim()
    : null;

  const hasWarns =
    (d.leves !== null && d.leves !== undefined) ||
    (d.graves !== null && d.graves !== undefined);
  const warnText = hasWarns
    ? `${d.leves ?? 0} ${t.lLeves}, ${d.graves ?? 0} ${t.lGraves}`
    : t.na;

  const traspasoBase = yn(d.traspaso);
  const traspasoOrigin = resolvePortalText(portal, 'traspasoDe', lang);
  const traspasoText =
    d.traspaso === true && traspasoOrigin
      ? `${traspasoBase} · ${traspasoOrigin}`
      : traspasoBase;

  const myMedicalCount = medicalRecords.filter(
    (r) => r.agentePlaca === me.placa
  ).length;
  const lastAppointmentText = formatOptionalDay(
    portal.ultimaCitaPsicologica,
    t.na
  );

  const licenciasText = formatOptionalString(
    resolvePortalText(portal, 'licenciasPoliciales', lang),
    t.na
  );
  const gravedadText = formatOptionalString(
    resolvePortalText(portal, 'gravedad', lang),
    t.na
  );
  const estadoText = formatOptionalString(
    resolvePortalText(portal, 'estadoLegal', lang),
    t.na
  );

  return (
    <div className="portal">
      <section className="section hero-card">
        {foto && (
          <figure className="portrait">
            <img src={foto} alt={t.portraitAlt} />
            <figcaption>{t.portraitCap}</figcaption>
          </figure>
        )}
        <div className="hero-data">
          <h2>{t.secMain}</h2>
          <div className="profile">
            <Field k={t.rAgente} v={me.nombres} />
            <Field k={t.rPlaca} v={me.placa.split('').join('-')} extra="mono" />
            <Field k={t.rRango} v={rankLabel(me.rango, lang)} />
            <Field k={t.rIngreso} v={formatOptionalDay(portal.ingreso, t.na)} />
            <Field
              k={t.rUnidades}
              v={
                Array.isArray(portal.unidades) && portal.unidades.length
                  ? portal.unidades
                      .map((u) => unitNameForLang(u, lang))
                      .join(', ')
                  : t.na
              }
              extra="wide"
            />
          </div>
        </div>
      </section>

      <section className="section">
        <h2>{t.secLicencias}</h2>
        <div className="profile">
          <Field k={t.rLicencias} v={licenciasText} />
          <button
            type="button"
            className="field field-link"
            onClick={onOpenMedicalRecord}
          >
            <div className="k">{t.rUltimaCita}</div>
            <div className="v">{lastAppointmentText}</div>
            <div className="hint">
              {myMedicalCount > 0 ? t.rExpedienteOpen : t.rExpedienteNone}
            </div>
          </button>
        </div>
      </section>

      <section className="section">
        <h2>{t.secDisc}</h2>
        <div className="profile">
          <Field k={t.rWarn} v={warnText} />
          <Field
            k={t.rAsc}
            v={formatOptionalNumber(d.ascensos, t.lAsc, t.na)}
          />
          <Field
            k={t.rDesc}
            v={formatOptionalNumber(d.descensos, t.lDesc, t.na)}
          />
          <Field k={t.rTraspaso} v={traspasoText} />
          <Field k={t.rJunta} v={yn(d.juntaSuperior)} />
          <Field k={t.rSuperv} v={yn(d.supervision)} />
          <Field k={t.rExped} v={yn(d.expedientes)} />
          <Field k={t.rGravedad} v={gravedadText} extra="sub" />
        </div>
      </section>

      <section className="section">
        <h2>{t.secJud}</h2>
        <div className="profile">
          <Field k={t.rDemandado} v={yn(j.demandado)} />
          <Field k={t.rCausas} v={yn(j.causasAbiertas)} />
        </div>
      </section>

      <section className="section">
        <h2>{t.secPers}</h2>
        <div className="profile">
          <Field k={t.rEstado} v={estadoText} />
          <Field
            k={t.rEdad}
            v={formatOptionalNumber(pe.edad, undefined, t.na)}
          />
          <Field
            k={t.rNacimiento}
            v={formatOptionalString(pe.nacimiento, t.na)}
          />
          <Field k={t.rDniNum} v={me.dni} extra="mono" />
        </div>
      </section>
    </div>
  );
}
