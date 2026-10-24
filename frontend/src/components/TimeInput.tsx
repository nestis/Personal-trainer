import { useEffect, useState } from 'react';

interface Props {
  /** total seconds, or undefined when empty */
  value: number | undefined;
  onChange: (seconds: number | undefined) => void;
  label: string;
  readOnly?: boolean;
}

const s: Record<string, React.CSSProperties> = {
  wrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  field: {
    width: 64,
    minWidth: 0,
    textAlign: 'center' as const,
    fontVariantNumeric: 'tabular-nums',
  },
  colon: {
    fontSize: 20,
    fontWeight: 600,
    color: 'var(--text-secondary)',
  },
};

function split(total: number | undefined): { m: string; s: string } {
  if (!total) return { m: '', s: '' };
  return { m: String(Math.floor(total / 60)), s: String(total % 60).padStart(2, '0') };
}

/**
 * Minutes and seconds as two fields, so typing "4" means 4 minutes
 * (a single m:ss text box ends up filling the seconds first).
 */
function TimeInput({ value, onChange, label, readOnly }: Props) {
  const initial = split(value);
  const [mins, setMins] = useState(initial.m);
  const [secs, setSecs] = useState(initial.s);

  // Follow outside changes (e.g. the session reloading)
  useEffect(() => {
    const total = (parseInt(mins, 10) || 0) * 60 + (parseInt(secs, 10) || 0);
    if ((value || 0) !== total) {
      const next = split(value);
      setMins(next.m);
      setSecs(next.s);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const emit = (m: string, sec: string) => {
    const total = (parseInt(m, 10) || 0) * 60 + (parseInt(sec, 10) || 0);
    onChange(total > 0 ? total : undefined);
  };

  const onMins = (raw: string) => {
    const clean = raw.replace(/\D/g, '').slice(0, 3);
    setMins(clean);
    emit(clean, secs);
  };

  const onSecs = (raw: string) => {
    let clean = raw.replace(/\D/g, '').slice(0, 2);
    if (clean && parseInt(clean, 10) > 59) clean = '59';
    setSecs(clean);
    emit(mins, clean);
  };

  return (
    <div role="group" aria-label={label} style={s.wrap}>
      <input
        className="input input-sm"
        style={s.field}
        type="text"
        inputMode="numeric"
        enterKeyHint="next"
        placeholder="min"
        aria-label={`${label}, minutes`}
        value={mins}
        readOnly={readOnly}
        onFocus={(e) => e.target.select()}
        onChange={(e) => onMins(e.target.value)}
      />
      <span style={s.colon} aria-hidden="true">:</span>
      <input
        className="input input-sm"
        style={s.field}
        type="text"
        inputMode="numeric"
        enterKeyHint="done"
        placeholder="sec"
        aria-label={`${label}, seconds`}
        value={secs}
        readOnly={readOnly}
        onFocus={(e) => e.target.select()}
        onChange={(e) => onSecs(e.target.value)}
        onBlur={() => secs && setSecs(secs.padStart(2, '0'))}
      />
    </div>
  );
}

export default TimeInput;
