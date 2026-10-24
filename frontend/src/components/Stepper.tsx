import { useEffect, useState } from 'react';

interface Props {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
  decimal?: boolean;
  readOnly?: boolean;
}

const s: Record<string, React.CSSProperties> = {
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
  },
  label: {
    fontSize: 17,
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    marginRight: -4,
  },
  btn: {
    width: 44,
    height: 44,
    borderRadius: '50%',
    border: 'none',
    background: 'var(--fill)',
    color: 'var(--text-primary)',
    fontSize: 24,
    lineHeight: 1,
    cursor: 'pointer',
    touchAction: 'manipulation',
    WebkitTapHighlightColor: 'transparent',
  },
  input: {
    width: 64,
    height: 44,
    textAlign: 'center' as const,
    background: 'transparent',
    border: 'none',
    color: 'var(--text-primary)',
    fontSize: 22,
    fontWeight: 600,
    fontVariantNumeric: 'tabular-nums',
    padding: 0,
  },
};

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

function Stepper({ label, value, onChange, step = 1, min = 0, max = 9999, decimal, readOnly }: Props) {
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  const clamp = (n: number) => Math.min(max, Math.max(min, round(n)));

  const commit = (raw: string) => {
    const parsed = decimal ? parseFloat(raw) : parseInt(raw, 10);
    const next = Number.isNaN(parsed) ? min : clamp(parsed);
    setText(String(next));
    if (next !== value) onChange(next);
  };

  return (
    <div style={s.row}>
      <span style={s.label}>{label}</span>
      <div style={s.controls}>
        {!readOnly && (
          <button type="button" style={s.btn} aria-label={`Decrease ${label}`} onClick={() => onChange(clamp(value - step))}>
            −
          </button>
        )}
        <input
          style={s.input}
          type="text"
          inputMode={decimal ? 'decimal' : 'numeric'}
          enterKeyHint="done"
          aria-label={label}
          value={text}
          readOnly={readOnly}
          onFocus={(e) => e.target.select()}
          onChange={(e) => setText(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          }}
        />
        {!readOnly && (
          <button type="button" style={s.btn} aria-label={`Increase ${label}`} onClick={() => onChange(clamp(value + step))}>
            +
          </button>
        )}
      </div>
    </div>
  );
}

export default Stepper;
