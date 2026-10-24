interface Option<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  fullWidth?: boolean;
}

const s: Record<string, React.CSSProperties> = {
  wrap: {
    display: 'flex',
    background: 'var(--fill)',
    borderRadius: 9,
    padding: 2,
  },
  seg: {
    flex: 1,
    minHeight: 32,
    padding: '0 14px',
    border: 'none',
    background: 'transparent',
    color: 'var(--text-secondary)',
    fontWeight: 500,
    fontSize: 14,
    borderRadius: 7,
    cursor: 'pointer',
    transition: 'background 0.2s ease, color 0.2s ease',
  },
  active: {
    background: 'var(--seg-active)',
    color: 'var(--text-primary)',
    fontWeight: 600,
    boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
  },
};

function Segmented<T extends string>({ options, value, onChange, label, fullWidth = true }: Props<T>) {
  return (
    <div role="group" aria-label={label} style={{ ...s.wrap, display: fullWidth ? 'flex' : 'inline-flex' }}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          style={{ ...s.seg, ...(o.value === value ? s.active : {}) }}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default Segmented;
