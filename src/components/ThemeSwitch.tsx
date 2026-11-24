import React from 'react';
import { T, type Lang } from '../lib/i18n';
import { MoonIcon, SunIcon } from './Visuals';

export type Theme = 'dark' | 'light';

interface ThemeSwitchProps {
  theme: Theme;
  lang: Lang;
  onChange: (theme: Theme) => void;
}

export function ThemeSwitch({ theme, lang, onChange }: ThemeSwitchProps) {
  const t = T[lang];

  return (
    <div className="lang theme-switch" role="group" aria-label={t.themeLabel}>
      <button
        type="button"
        className="lang-btn"
        aria-pressed={theme === 'dark'}
        aria-label={t.themeDark}
        onClick={() => onChange('dark')}
      >
        <MoonIcon />
        <span>{t.themeDark}</span>
      </button>
      <button
        type="button"
        className="lang-btn"
        aria-pressed={theme === 'light'}
        aria-label={t.themeLight}
        onClick={() => onChange('light')}
      >
        <SunIcon />
        <span>{t.themeLight}</span>
      </button>
    </div>
  );
}
