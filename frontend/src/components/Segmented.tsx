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

// iOS 26 segmented control: a capsule track with a glass thumb that slides
const s: Record<string, React.CSSProperties> = {
  wrap: {
    position: 'relative',
    background: 'var(--fill)',
    borderRadius: 999,
    padding: 3,
  },
  thumb: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    left: 3,
    borderRadius: 999,
    background: 'rgba(255, 255, 255, 0.18)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.22), 0 2px 8px rgba(0,0,0,0.35)',
    transition: 'transform 0.4s var(--spring)',
  },
  seg: {
    position: 'relative',
    zIndex: 1,
    flex: '1 1 0',
    minWidth: 0,
    minHeight: 34,
    padding: '0 8px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    border: 'none',
    background: 'transparent',
    color: 'var(--text-secondary)',
    fontWeight: 500,
    fontSize: 14,
    borderRadius: 999,
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
    transition: 'color 0.2s ease',
  },
};

function Segmented<T extends string>({ options, value, onChange, label, fullWidth = true }: Props<T>) {
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  return (
    <div role="group" aria-label={label} style={{ ...s.wrap, display: fullWidth ? 'flex' : 'inline-flex' }}>
      <span
        aria-hidden="true"
        style={{ ...s.thumb, width: `calc((100% - 6px) / ${options.length})`, transform: `translateX(${index * 100}%)` }}
      />
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          style={{
            ...s.seg,
            ...(options.length > 2 && { fontSize: 13 }),
            ...(o.value === value ? { color: 'var(--text-primary)', fontWeight: 600 } : {}),
          }}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default Segmented;
