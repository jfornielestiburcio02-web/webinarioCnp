import React, { useEffect, useMemo, useState } from 'react';
import { T, pickLang, type Lang } from './lib/i18n';
import { createWebpolDb } from './lib/db';
import { AuthScreen } from './components/AuthScreen';
import { DashboardScreen } from './components/DashboardScreen';
import type { Theme } from './components/ThemeSwitch';

const SESSION_KEY = 'cnp.placa';
const THEME_KEY = 'cnp.theme';

function getStoredPlaca(): string | null {
  try {
    return sessionStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

function setStoredPlaca(v: string | null): void {
  try {
    if (v) sessionStorage.setItem(SESSION_KEY, v);
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // sin almacenamiento
  }
}

function pickTheme(): Theme {
  try {
    const t = localStorage.getItem(THEME_KEY);
    if (t === 'light' || t === 'dark') return t;
  } catch {
    // sin almacenamiento
  }
  return 'dark';
}

export default function App() {
  const db = useMemo(() => createWebpolDb(), []);
  const [snapshot, setSnapshot] = useState(() => db.getSnapshot());
  const [lang, setLang] = useState<Lang>(() => pickLang());
  const [theme, setTheme] = useState<Theme>(() => pickTheme());
  const [sessionPlaca, setSessionPlaca] = useState<string | null>(() =>
    getStoredPlaca()
  );

  useEffect(() => {
    return db.subscribe(() => {
      setSnapshot(db.getSnapshot());
    });
  }, [db]);

  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      localStorage.setItem('cnp.lang', lang);
    } catch {
      // sin almacenamiento
    }
  }, [lang]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // sin almacenamiento
    }
  }, [theme]);

  const activeUser = sessionPlaca
    ? snapshot.personal.find(
        (r) => r.placa === sessionPlaca && r.estado === 'aprobado'
      )
    : undefined;

  const handleLogin = (placa: string) => {
    setStoredPlaca(placa);
    setSessionPlaca(placa);
  };

  const handleLogout = () => {
    setStoredPlaca(null);
    setSessionPlaca(null);
  };

  return (
    <div className="app-shell">
      {activeUser ? (
        <DashboardScreen
          lang={lang}
          onLangChange={setLang}
          theme={theme}
          onThemeChange={setTheme}
          me={activeUser}
          rows={snapshot.personal}
          portals={snapshot.portals}
          comunicados={snapshot.comunicados}
          medicalRecords={snapshot.medicalRecords}
          sanctions={snapshot.sanctions}
          promotions={snapshot.promotions}
          inactivityRequests={snapshot.inactivityRequests}
          db={db}
          onLogout={handleLogout}
        />
      ) : (
        <AuthScreen
          lang={lang}
          onLangChange={setLang}
          theme={theme}
          onThemeChange={setTheme}
          rows={snapshot.personal}
          db={db}
          onLogin={handleLogin}
        />
      )}
      <footer className="mark">{T[lang].mark}</footer>
    </div>
  );
}
