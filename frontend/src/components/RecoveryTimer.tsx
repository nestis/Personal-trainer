import { useEffect, useState } from 'react';
import { formatTime } from '../utils/format';

interface Props {
  seconds?: number;
  /** called when the countdown reaches zero */
  onDone: () => void;
}

const s: Record<string, React.CSSProperties> = {
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: 52,
    padding: '0 4px 0 14px',
    borderRadius: 12,
    background: 'var(--bg-tertiary)',
    marginBottom: 12,
  },
  time: {
    fontSize: 28,
    fontWeight: 700,
    fontVariantNumeric: 'tabular-nums',
  },
  btn: {
    minHeight: 44,
    padding: '0 14px',
    border: 'none',
    background: 'none',
    color: 'var(--tint)',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
  },
};

/**
 * Counts down to the moment you should read your heart rate (2 minutes after
 * the WOD). It counts against a timestamp, so it stays right if the phone
 * sleeps or the browser throttles timers.
 */
function RecoveryTimer({ seconds = 120, onDone }: Props) {
  const [endAt, setEndAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (endAt === null) return;
    const tick = () => {
      const t = Date.now();
      setNow(t);
      if (t >= endAt) {
        setEndAt(null);
        setFinished(true);
        try {
          navigator.vibrate?.([200, 100, 200]);
        } catch {
          /* vibration not supported (iOS) */
        }
        onDone();
      }
    };
    const id = setInterval(tick, 250);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [endAt, onDone]);

  if (endAt !== null) {
    const left = Math.max(0, Math.ceil((endAt - now) / 1000));
    return (
      <div style={s.row} role="timer" aria-label="Recovery countdown">
        <span>
          <span style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)' }}>Measure heart rate in</span>
          <span style={s.time}>{formatTime(left)}</span>
        </span>
        <button type="button" style={{ ...s.btn, color: 'var(--red)' }} onClick={() => setEndAt(null)}>
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div style={{ ...s.row, ...(finished ? { boxShadow: 'inset 0 0 0 2px var(--green)' } : {}) }}>
      <span style={{ fontSize: 15, color: finished ? 'var(--green)' : 'var(--text-secondary)', fontWeight: finished ? 600 : 400 }} aria-live="polite">
        {finished ? 'Time is up: enter HR' : 'Recovery timer'}
      </span>
      <button
        type="button"
        style={s.btn}
        onClick={() => {
          setFinished(false);
          setNow(Date.now());
          setEndAt(Date.now() + seconds * 1000);
        }}
      >
        {finished ? 'Restart' : `Start ${seconds / 60} min`}
      </button>
    </div>
  );
}

export default RecoveryTimer;
