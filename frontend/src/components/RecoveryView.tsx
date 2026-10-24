import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { WodRecoveryPoint } from '../types';
import { api } from '../services/api';
import { formatDayLabel, parseLocalDate, toDateString } from '../utils/format';
import Spinner from './Spinner';

const s: Record<string, React.CSSProperties> = {
  card: {
    background: 'var(--bg-grouped-secondary)',
    borderRadius: 16,
    padding: '14px 16px 16px',
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 0.7,
    textTransform: 'uppercase' as const,
    color: 'var(--text-secondary)',
  },
  statRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 2,
    flexWrap: 'wrap' as const,
  },
  statValue: {
    fontSize: 34,
    fontWeight: 700,
    letterSpacing: -0.5,
    fontVariantNumeric: 'tabular-nums',
  },
  chips: {
    display: 'flex',
    gap: 8,
    overflowX: 'auto' as const,
    margin: '0 -20px 12px',
    padding: '0 20px',
  },
  chip: {
    flexShrink: 0,
    minHeight: 36,
    padding: '0 14px',
    borderRadius: 18,
    border: 'none',
    background: 'var(--bg-tertiary)',
    color: 'var(--text-primary)',
    fontSize: 15,
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
  },
  chipActive: {
    background: 'var(--tint-fill)',
    color: '#fff',
    fontWeight: 600,
  },
  sectionLabel: {
    fontSize: 13,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    padding: '8px 4px 6px',
  },
  list: {
    background: 'var(--bg-grouped-secondary)',
    borderRadius: 16,
    overflow: 'hidden',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: 64,
    padding: '8px 16px',
    color: 'inherit',
    textDecoration: 'none',
  },
  sep: {
    height: '0.5px',
    background: 'var(--separator)',
    marginLeft: 16,
  },
  empty: {
    color: 'var(--text-secondary)',
    fontSize: 15,
    lineHeight: 1.4,
    textAlign: 'center' as const,
    padding: '32px 16px',
  },
};

const DAY_MS = 86400000;

function avg(values: number[]): number | null {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
}

function daysAgoStr(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toDateString(d);
}

function DropChart({ points }: { points: WodRecoveryPoint[] }) {
  const data = points.filter((p) => p.drop !== undefined);
  if (data.length === 0) return null;

  const W = 318;
  const H = 120;
  const PAD_X = 10;
  const PAD_T = 12;
  const PAD_B = 8;

  const drops = data.map((p) => p.drop as number);
  const lo = Math.max(0, Math.min(...drops) - 5);
  const hi = Math.max(...drops) + 5;
  const range = hi - lo || 1;

  const t0 = parseLocalDate(data[0].date).getTime();
  const t1 = parseLocalDate(data[data.length - 1].date).getTime();
  const span = Math.max(DAY_MS, t1 - t0);
  const toX = (date: string) =>
    data.length === 1 ? W / 2 : PAD_X + ((parseLocalDate(date).getTime() - t0) / span) * (W - PAD_X * 2);
  const toY = (v: number) => PAD_T + (H - PAD_T - PAD_B) * (1 - (v - lo) / range);

  const line = data.map((p) => `${toX(p.date).toFixed(1)},${toY(p.drop as number).toFixed(1)}`).join(' ');
  const last = data[data.length - 1];
  const label = (d: string) => parseLocalDate(d).toLocaleDateString('en-US', { day: 'numeric', month: 'short' });

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', display: 'block', marginTop: 8 }}
        role="img"
        aria-label={`Heart-rate drop after 2 minutes over time. Latest ${last.drop} bpm.`}
      >
        {data.length > 1 && (
          <polyline points={line} fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        )}
        {data.map((p, i) => (
          <circle key={i} cx={toX(p.date)} cy={toY(p.drop as number)} r={i === data.length - 1 ? 4.5 : 3.5} fill="var(--green)" />
        ))}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 11, color: 'var(--text-secondary)' }}>
        <span>{label(data[0].date)}</span>
        <span>{data.length > 1 ? label(last.date) : ''}</span>
      </div>
    </div>
  );
}

function RecoveryView() {
  const [points, setPoints] = useState<WodRecoveryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api
      .getWodRecovery()
      .then(setPoints)
      .catch((err) => setError(err.message || 'Failed to load recovery data.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const names = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of points) counts.set(p.name, (counts.get(p.name) || 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([n]) => n).slice(0, 8);
  }, [points]);

  const shown = useMemo(() => (filter === 'all' ? points : points.filter((p) => p.name === filter)), [points, filter]);

  const stats = useMemo(() => {
    const recentFrom = daysAgoStr(27);
    const previousFrom = daysAgoStr(55);
    const drops = (from: string, to?: string) =>
      shown
        .filter((p) => p.drop !== undefined && p.date >= from && (!to || p.date < to))
        .map((p) => p.drop as number);
    const recent = avg(drops(recentFrom));
    const previous = avg(drops(previousFrom, recentFrom));
    const delta = recent !== null && previous !== null ? Math.round((recent - previous) * 10) / 10 : null;
    return { recent, delta };
  }, [shown]);

  if (loading) return <Spinner />;

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px' }}>
        <div className="card" style={{ background: 'rgba(255,69,58,0.12)', color: 'var(--red)' }}>{error}</div>
        <button className="btn btn-primary" onClick={load} style={{ marginTop: 16 }}>Retry</button>
      </div>
    );
  }

  if (points.length === 0) {
    return (
      <div style={s.card}>
        <div style={s.empty}>
          No recovery readings yet. After a WOD, wait 2 minutes, then enter your heart rate in
          &ldquo;HR after 2 min&rdquo; on the WOD card (and your max HR to see the drop).
        </div>
      </div>
    );
  }

  const newestFirst = [...shown].reverse();

  return (
    <div>
      {names.length > 1 && (
        <div style={s.chips} role="group" aria-label="Filter by WOD">
          {['all', ...names].map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={filter === n}
              style={{ ...s.chip, ...(filter === n ? s.chipActive : {}) }}
              onClick={() => setFilter(n)}
            >
              {n === 'all' ? 'All WODs' : n}
            </button>
          ))}
        </div>
      )}

      <section style={s.card} aria-label="Heart-rate recovery">
        <div style={s.statLabel}>Avg HR drop · last 4 weeks</div>
        {stats.recent !== null ? (
          <div style={s.statRow}>
            <span style={s.statValue}>{Math.round(stats.recent)}</span>
            <span style={{ fontSize: 17, color: 'var(--text-secondary)' }}>bpm</span>
            {stats.delta !== null && (
              <span
                style={{
                  marginLeft: 'auto',
                  fontSize: 13,
                  fontWeight: 600,
                  color: stats.delta > 0 ? 'var(--green)' : stats.delta < 0 ? 'var(--orange)' : 'var(--text-secondary)',
                }}
              >
                {stats.delta > 0 ? `▲ ${stats.delta}` : stats.delta < 0 ? `▼ ${-stats.delta}` : 'No change'} vs previous 4 weeks
              </span>
            )}
          </div>
        ) : (
          <div style={{ ...s.statValue, color: 'var(--text-secondary)' }}>–</div>
        )}
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
          Max HR minus HR 2 minutes later. A bigger drop is better.
        </div>
        <DropChart points={shown} />
        {shown.some((p) => p.drop === undefined) && (
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8 }}>
            Readings without a max HR are listed below but not charted.
          </div>
        )}
      </section>

      <div style={s.sectionLabel}>History</div>
      <div style={s.list}>
        {newestFirst.map((p, i) => {
          const inner = (
            <>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 17 }}>{p.name}</span>
                <span style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                  {formatDayLabel(p.date)}
                  {p.rpe !== undefined ? ` · RPE ${p.rpe}` : ''}
                </span>
              </span>
              <span style={{ textAlign: 'right', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                <span style={{ display: 'block', fontSize: 17, fontWeight: 600, color: p.drop !== undefined ? 'var(--green)' : 'var(--text-primary)' }}>
                  {p.drop !== undefined ? `−${p.drop} bpm` : `${p.recoveryHeartRate2min} bpm`}
                </span>
                <span style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                  {p.maxHeartRate !== undefined ? `${p.maxHeartRate} → ${p.recoveryHeartRate2min}` : 'HR after 2 min'}
                </span>
              </span>
            </>
          );
          const key = `${p.source}-${p.sessionId || p.recordId}-${i}`;
          return (
            <div key={key}>
              {i > 0 && <div style={s.sep} />}
              {p.sessionId ? (
                <Link to={`/session/${p.sessionId}`} style={s.row} className="list-item">{inner}</Link>
              ) : (
                <div style={s.row}>{inner}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default RecoveryView;
