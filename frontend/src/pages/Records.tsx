import { useEffect, useState } from 'react';
import { StrengthPR, WodRecord } from '../types';
import { api } from '../services/api';

const styles: Record<string, React.CSSProperties> = {
  page: {
    paddingTop: 16,
  },
  tabs: {
    display: 'flex',
    gap: 0,
    marginBottom: 20,
    borderRadius: 'var(--radius-sm)',
    overflow: 'hidden',
    border: '1px solid var(--border)',
  },
  tab: {
    flex: 1,
    padding: '12px 16px',
    border: 'none',
    background: 'var(--bg-card)',
    color: 'var(--text-secondary)',
    fontWeight: 600,
    fontSize: '0.95rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  tabActive: {
    flex: 1,
    padding: '12px 16px',
    border: 'none',
    background: 'var(--accent)',
    color: 'white',
    fontWeight: 600,
    fontSize: '0.95rem',
    cursor: 'pointer',
  },
  exerciseGroup: {
    marginBottom: 20,
  },
  exerciseName: {
    fontSize: '1.1rem',
    fontWeight: 700,
    marginBottom: 8,
    color: 'var(--text-primary)',
  },
  estimated1rm: {
    fontSize: '0.85rem',
    color: 'var(--accent)',
    fontWeight: 600,
    marginBottom: 10,
  },
  prRow: {
    display: 'grid',
    gridTemplateColumns: '60px 1fr 80px',
    gap: 8,
    alignItems: 'center',
    padding: '10px 12px',
    borderBottom: '1px solid var(--border)',
  },
  repsLabel: {
    fontSize: '0.9rem',
    color: 'var(--text-secondary)',
    fontWeight: 500,
  },
  kilosValue: {
    fontSize: '1.1rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  dateLabel: {
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
    textAlign: 'right' as const,
  },
  wodCard: {
    marginBottom: 16,
  },
  wodName: {
    fontSize: '1.1rem',
    fontWeight: 700,
    marginBottom: 4,
  },
  wodBest: {
    fontSize: '1.3rem',
    fontWeight: 700,
    color: 'var(--accent)',
    marginBottom: 8,
  },
  wodMeta: {
    display: 'flex',
    gap: 16,
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    marginBottom: 10,
  },
  historyTitle: {
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
    marginBottom: 6,
  },
  historyRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '4px 0',
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    borderBottom: '1px solid var(--border)',
  },
  empty: {
    textAlign: 'center' as const,
    padding: '40px 20px',
    color: 'var(--text-secondary)',
  },
};

function formatTime(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Group strength PRs by exercise
function groupByExercise(prs: StrengthPR[]): Map<string, StrengthPR[]> {
  const map = new Map<string, StrengthPR[]>();
  for (const pr of prs) {
    const key = pr.exercise.toLowerCase();
    const existing = map.get(key) || [];
    existing.push(pr);
    map.set(key, existing);
  }
  return map;
}

function Records() {
  const [tab, setTab] = useState<'strength' | 'wods'>('strength');
  const [strengthPRs, setStrengthPRs] = useState<StrengthPR[]>([]);
  const [wodRecords, setWodRecords] = useState<WodRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getStrengthPRs(), api.getWodRecords()])
      .then(([prs, wods]) => {
        setStrengthPRs(prs);
        setWodRecords(wods);
      })
      .catch((err) => console.error('Failed to load records:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div style={styles.empty}>Loading records...</div>;
  }

  const grouped = groupByExercise(strengthPRs);

  return (
    <div style={styles.page}>
      <div style={styles.tabs}>
        <button
          style={tab === 'strength' ? styles.tabActive : styles.tab}
          onClick={() => setTab('strength')}
        >
          Strength PRs
        </button>
        <button
          style={tab === 'wods' ? styles.tabActive : styles.tab}
          onClick={() => setTab('wods')}
        >
          WOD Records
        </button>
      </div>

      {tab === 'strength' && (
        <>
          {strengthPRs.length === 0 ? (
            <div style={styles.empty}>
              No strength records yet. Complete sessions to start tracking PRs.
            </div>
          ) : (
            Array.from(grouped.entries()).map(([key, prs]) => {
              const best1RM = Math.max(...prs.map((p) => p.estimated1RM));
              return (
                <div key={key} className="card" style={styles.exerciseGroup}>
                  <div style={styles.exerciseName}>{prs[0].exercise}</div>
                  <div style={styles.estimated1rm}>Est. 1RM: {best1RM} kg</div>
                  {prs.map((pr, i) => (
                    <div key={i} style={styles.prRow}>
                      <span style={styles.repsLabel}>{pr.reps} rep{pr.reps !== 1 ? 's' : ''}</span>
                      <span style={styles.kilosValue}>{pr.kilos} kg</span>
                      <span style={styles.dateLabel}>{formatDate(pr.date)}</span>
                    </div>
                  ))}
                </div>
              );
            })
          )}
        </>
      )}

      {tab === 'wods' && (
        <>
          {wodRecords.length === 0 ? (
            <div style={styles.empty}>
              No WOD records yet. Name your WODs and log times to start tracking.
            </div>
          ) : (
            wodRecords.map((record) => (
              <div key={record.name} className="card" style={styles.wodCard}>
                <div style={styles.wodName}>{record.name}</div>
                <div style={styles.wodBest}>{formatTime(record.bestTimeSeconds)}</div>
                <div style={styles.wodMeta}>
                  <span>Best on {formatDate(record.date)}</span>
                  {record.avgHeartRate && <span>Avg HR: {record.avgHeartRate}</span>}
                  {record.maxHeartRate && <span>Max HR: {record.maxHeartRate}</span>}
                </div>
                {record.history.length > 1 && (
                  <>
                    <div style={styles.historyTitle}>History</div>
                    {record.history.map((entry, i) => (
                      <div key={i} style={styles.historyRow}>
                        <span>{formatDate(entry.date)}</span>
                        <span style={i === 0 ? { color: 'var(--accent)', fontWeight: 600 } : undefined}>
                          {formatTime(entry.timeSeconds)}
                        </span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            ))
          )}
        </>
      )}
    </div>
  );
}

export default Records;
