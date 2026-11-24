import React from 'react';

export function Emblem({ alt, className = 'emblem' }: { alt: string; className?: string }) {
  return (
    <img
      className={className}
      src="/assets/aistudio/image_aec044e1.png"
      alt={alt}
      width={128}
      height={175}
    />
  );
}

export function FlagES() {
  return (
    <span className="flag" aria-hidden="true">
      <svg viewBox="0 0 27 18">
        <rect x="0" y="0" width="27" height="18" fill="#aa151b" />
        <rect x="0" y="4.5" width="27" height="9" fill="#f1bf00" />
      </svg>
    </span>
  );
}

export function FlagCA() {
  return (
    <span className="flag" aria-hidden="true">
      <svg viewBox="0 0 27 18">
        <rect x="0" y="0" width="27" height="18" fill="#fcdd09" />
        {[2, 6, 10, 14].map((y) => (
          <rect key={y} x="0" y={y} width="27" height="2" fill="#da121a" />
        ))}
      </svg>
    </span>
  );
}

export function MoonIcon() {
  return (
    <svg
      className="theme-ico"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export function SunIcon() {
  return (
    <svg
      className="theme-ico"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

export type IconName =
  | 'eye'
  | 'eyeoff'
  | 'portal'
  | 'personal'
  | 'unidades'
  | 'historial'
  | 'comunicados'
  | 'medico'
  | 'ascensos'
  | 'inactividad';

export function WebpolIcon({ name }: { name: IconName }) {
  return (
    <svg
      className="ico"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {name === 'eye' && (
        <>
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
          <circle cx="12" cy="12" r="3" />
        </>
      )}
      {name === 'eyeoff' && (
        <>
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
          <circle cx="12" cy="12" r="3" />
          <path d="M4 4l16 16" />
        </>
      )}
      {name === 'portal' && (
        <>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <circle cx="9" cy="11" r="2" />
          <path d="M5.5 16.5c.5-1.5 1.8-2.5 3.5-2.5s3 1 3.5 2.5M14 10h4M14 14h4" />
        </>
      )}
      {name === 'personal' && (
        <>
          <circle cx="9" cy="8" r="3" />
          <path d="M3 19c0-3 3-5 6-5s6 2 6 5" />
          <circle cx="17" cy="9" r="2.5" />
          <path d="M17 14c2.5 0 4 1.5 4 4" />
        </>
      )}
      {name === 'unidades' && <path d="M5 21V4M5 5h11l-2 3.5 2 3.5H5" />}
      {name === 'historial' && (
        <path d="M7 3h7l4 4v14H7zM14 3v4h4M10 12h5M10 16h5" />
      )}
      {name === 'comunicados' && (
        <path d="M4 10v4h3l7 4V6L7 10zM17 9c1.5 1 1.5 5 0 6" />
      )}
      {name === 'medico' && (
        <>
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <path d="M12 8v8M8 12h8" />
        </>
      )}
      {name === 'ascensos' && (
        <>
          <path d="M6 17l6-5 6 5" />
          <path d="M6 11l6-5 6 5" />
        </>
      )}
      {name === 'inactividad' && (
        <>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M8 3v4M16 3v4M3 10h18M10 14v4M14 14v4" />
        </>
      )}
    </svg>
  );
}
