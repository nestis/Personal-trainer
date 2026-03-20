import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Session } from '../types';
import { api } from '../services/api';

const styles: Record<string, React.CSSProperties> = {
  page: {
    paddingTop: 16,
  },
  sessionCard: {
    display: 'block',
    textDecoration: 'none',
    color: 'inherit',
    marginBottom: 12,
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  date: {
    fontSize: '1rem',
    fontWeight: 600,
  },
  exerciseList: {
    fontSize: '0.9rem',
    color: 'var(--text-secondary)',
    lineHeight: 1.5,
  },
  wodPreview: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    marginTop: 8,
    fontStyle: 'italic',
  },
  empty: {
    textAlign: 'center' as const,
    padding: '60px 20px',
    color: 'var(--text-secondary)',
  },
  loading: {
    textAlign: 'center' as const,
    padding: '60px 20px',
    color: 'var(--text-secondary)',
  },
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function SessionList() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .listSessions()
      .then(setSessions)
      .catch((err) => console.error('Failed to load sessions:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div style={styles.loading}>Loading sessions...</div>;
  }

  if (sessions.length === 0) {
    return (
      <div style={styles.empty}>
        <p style={{ fontSize: '1.1rem', marginBottom: 12 }}>No sessions yet</p>
        <Link to="/new" className="btn btn-primary">
          Plan your first session
        </Link>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {sessions.map((session) => (
        <Link
          key={session.id}
          to={`/session/${session.id}`}
          style={styles.sessionCard}
        >
          <div className="card">
            <div style={styles.cardHeader}>
              <span style={styles.date}>{formatDate(session.date)}</span>
              <span className={`badge badge-${session.status}`}>
                {session.status}
              </span>
            </div>
            <div style={styles.exerciseList}>
              {session.strength.map((ex) => (
                <div key={ex.id}>
                  {ex.name || 'Unnamed'} — {ex.sets.length}x
                  {ex.sets[0]?.reps || 0} @ {ex.sets[0]?.kilos || 0}kg
                </div>
              ))}
            </div>
            {session.wod.description && (
              <div style={styles.wodPreview}>
                WOD: {session.wod.description.substring(0, 80)}
                {session.wod.description.length > 80 ? '...' : ''}
              </div>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}

export default SessionList;
