import React from 'react';
import { T, type Lang } from '../lib/i18n';
import { FlagES, FlagCA } from './Visuals';

interface LangSwitchProps {
  lang: Lang;
  onChange: (lang: Lang) => void;
}

export function LangSwitch({ lang, onChange }: LangSwitchProps) {
  return (
    <div className="lang" role="group" aria-label={T[lang].langLabel}>
      <button
        type="button"
        className="lang-btn"
        lang="es"
        aria-pressed={lang === 'es'}
        onClick={() => onChange('es')}
      >
        <FlagES />
        <span>Español</span>
      </button>
      <button
        type="button"
        className="lang-btn"
        lang="ca"
        aria-pressed={lang === 'ca'}
        onClick={() => onChange('ca')}
      >
        <FlagCA />
        <span>Català</span>
      </button>
    </div>
  );
}
