import React, { useRef, useState } from 'react';
import { T, type Lang } from '../lib/i18n';
import { WebpolIcon } from './Visuals';

interface PassFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  lang: Lang;
}

export function PassField({ lang, ...inputProps }: PassFieldProps) {
  const [shown, setShown] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const t = T[lang];

  return (
    <span className="pw">
      <input
        {...inputProps}
        ref={inputRef}
        type={shown ? 'text' : 'password'}
      />
      <button
        className="pw-btn"
        type="button"
        aria-label={shown ? t.hidePw : t.showPw}
        aria-pressed={shown}
        onClick={() => {
          setShown((prev) => !prev);
          inputRef.current?.focus();
        }}
      >
        <WebpolIcon name={shown ? 'eye' : 'eyeoff'} />
      </button>
    </span>
  );
}
