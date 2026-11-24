import React from 'react';
import { T, type Lang } from '../lib/i18n';
import type { PersonalRecord, PortalRecord } from '../lib/db';
import {
  POLICE_UNITS,
  UNIT_CATEGORIES,
  hasUnit,
  unitDisplayLabel,
} from '../lib/units';

interface UnidadesViewProps {
  lang: Lang;
  rows: PersonalRecord[];
  portals: Record<string, PortalRecord>;
}

export function UnidadesView({ lang, rows, portals }: UnidadesViewProps) {
  const t = T[lang];
  const approved = rows.filter((r) => r.estado === 'aprobado');

  return (
    <div className="portal">
      {UNIT_CATEGORIES.map((cat) => {
        const units = POLICE_UNITS.filter((u) => u.category === cat.id);
        return (
          <section key={cat.id} className="section">
            <h2>{lang === 'ca' ? cat.titleCa : cat.titleEs}</h2>
            <p className="lead">{lang === 'ca' ? cat.summaryCa : cat.summaryEs}</p>
            <div className="list">
              {units.map((unit) => {
                const assigned = approved.filter((r) =>
                  hasUnit(portals[r.placa], unit.name)
                );
                return (
                  <article key={unit.id} className="req">
                    <div className="head">
                      <span className="who">{unitDisplayLabel(unit, lang)}</span>
                      <span className="badge">
                        {assigned.length === 0
                          ? t.unidadesNone
                          : assigned.length === 1
                            ? t.unidadesAssignedOne
                            : `${assigned.length} ${t.unidadesAssigned}`}
                      </span>
                    </div>
                    <p className="com-snip">
                      {lang === 'ca' ? unit.descriptionCa : unit.description}
                    </p>
                    {assigned.length > 0 && (
                      <div className="meta">
                        {assigned.map((a) => (
                          <span key={a.placa} className="mono">
                            {`${a.nombres} (${a.placa})`}
                          </span>
                        ))}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
