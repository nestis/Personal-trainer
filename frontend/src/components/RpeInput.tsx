interface Props {
  label: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  readOnly?: boolean;
}

const MIN = 1;
const MAX = 10;
const START = 8; // first tap on + from empty

const s: Record<string, React.CSSProperties> = {
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
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
  },
  value: {
    minWidth: 56,
    textAlign: 'center' as const,
    fontSize: 22,
    fontWeight: 600,
    fontVariantNumeric: 'tabular-nums',
  },
  clear: {
    background: 'none',
    border: 'none',
    color: 'var(--tint)',
    fontSize: 15,
    minHeight: 44,
    padding: '0 4px 0 8px',
    cursor: 'pointer',
  },
};

/** RPE 1-10 in steps of 0.5. Shows "–" until it is set. */
function RpeInput({ label, value, onChange, readOnly }: Props) {
  const step = (delta: number) => {
    if (value === undefined) {
      onChange(START);
      return;
    }
    onChange(Math.min(MAX, Math.max(MIN, value + delta)));
  };

  return (
    <div style={s.row}>
      <span style={{ fontSize: 17 }}>{label}</span>
      <div style={s.controls}>
        {!readOnly && (
          <button type="button" style={s.btn} aria-label={`Decrease ${label}`} onClick={() => step(-0.5)}>
            −
          </button>
        )}
        <span style={{ ...s.value, color: value === undefined ? 'var(--text-secondary)' : 'var(--text-primary)' }} aria-live="polite">
          {value === undefined ? '–' : value}
        </span>
        {!readOnly && (
          <button type="button" style={s.btn} aria-label={`Increase ${label}`} onClick={() => step(0.5)}>
            +
          </button>
        )}
        {!readOnly && value !== undefined && (
          <button type="button" style={s.clear} onClick={() => onChange(undefined)}>
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

export default RpeInput;
