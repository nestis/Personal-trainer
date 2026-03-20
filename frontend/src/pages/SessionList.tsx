import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Session } from '../types';
import { api } from '../services/api';
import { formatDate } from '../utils/format';

const s: Record<string, React.CSSProperties> = {
  page: {
    paddingTop: 20,
    paddingBottom: 32,
  },
  link: {
    display: 'block',
    textDecoration: 'none',
    color: 'inherit',
  },
  list: {
    background: 'var(--bg-grouped-secondary)',
    borderRadius: 'var(--radius)',
    overflow: 'hidden',
  },
  item: {
    padding: '14px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    transition: 'background 0.15s',
  },
  itemContent: {
    flex: 1,
    minWidth: 0,
  },
  dateRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  date: {
    fontSize: 17,
    fontWeight: 600,
    letterSpacing: -0.2,
  },
  exercises: {
    fontSize: 15,
    color: 'var(--text-secondary)',
    lineHeight: 1.4,
  },
  wodHint: {
    fontSize: 14,
    color: 'var(--text-tertiary)',
    marginTop: 4,
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  chevron: {
    color: 'var(--text-tertiary)',
    fontSize: 18,
    flexShrink: 0,
  },
  separator: {
    height: '0.5px',
    background: 'var(--separator)',
    marginLeft: 16,
  },
  empty: {
    textAlign: 'center' as const,
    padding: '80px 20px',
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 600,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  emptySubtitle: {
    fontSize: 15,
    color: 'var(--text-secondary)',
    marginBottom: 28,
  },
  loading: {
    textAlign: 'center' as const,
    padding: '80px 20px',
    color: 'var(--text-secondary)',
    fontSize: 15,
  },
};

function SessionList() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Workouts - Workout Tracker';
  }, []);

  const loadSessions = () => {
    setLoading(true);
    setError(null);
    api
      .listSessions()
      .then(setSessions)
      .catch((err) => {
        console.error('Failed to load sessions:', err);
        setError(err.message || 'Failed to load sessions.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSessions();
  }, []);

  if (loading) {
    return <div style={s.loading}>Loading...</div>;
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px' }} className="fade-in">
        <div className="card" style={{ background: 'rgba(255,69,58,0.12)', color: 'var(--red)' }}>
          {error}
        </div>
        <button className="btn btn-primary" onClick={loadSessions} style={{ marginTop: 16 }}>
          Retry
        </button>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div style={s.empty} className="fade-in">
        <div style={s.emptyTitle}>No Sessions Yet</div>
        <div style={s.emptySubtitle}>Plan your first workout to get started.</div>
        <Link to="/new" className="btn btn-primary">
          New Session
        </Link>
      </div>
    );
  }

  return (
    <div style={s.page} className="fade-in">
      <div style={s.list}>
        {sessions.map((session, i) => (
          <div key={session.id}>
            {i > 0 && <div style={s.separator} />}
            <Link to={`/session/${session.id}`} style={s.link}>
              <div style={s.item}>
                <div style={s.itemContent}>
                  <div style={s.dateRow}>
                    <span style={s.date}>{formatDate(session.date)}</span>
                    <span className={`badge badge-${session.status}`}>
                      {session.status}
                    </span>
                  </div>
                  <div style={s.exercises}>
                    {session.strength
                      .map((ex) =>
                        ex.name
                          ? `${ex.name} ${ex.sets.length}x${ex.sets[0]?.reps || 0}`
                          : null
                      )
                      .filter(Boolean)
                      .join(' / ') || 'No exercises'}
                  </div>
                  {session.wod.description && (
                    <div style={s.wodHint}>
                      {session.wod.name || 'WOD'}: {session.wod.description}
                    </div>
                  )}
                </div>
                <span style={s.chevron}>&#8250;</span>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SessionList;
