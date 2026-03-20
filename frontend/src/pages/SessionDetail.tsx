import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Session } from '../types';
import { api } from '../services/api';
import ExerciseEditor from '../components/ExerciseEditor';
import WodEditor from '../components/WodEditor';

const styles: Record<string, React.CSSProperties> = {
  page: {
    paddingTop: 16,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  date: {
    fontSize: '1.3rem',
    fontWeight: 700,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    marginBottom: 12,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
  },
  actions: {
    display: 'flex',
    gap: 12,
    marginTop: 24,
  },
  notes: {
    fontSize: '0.9rem',
    color: 'var(--text-secondary)',
    lineHeight: 1.6,
    whiteSpace: 'pre-wrap' as const,
  },
  wodMeta: {
    display: 'flex',
    gap: 16,
    marginTop: 8,
    fontSize: '0.9rem',
  },
  metaItem: {
    color: 'var(--text-secondary)',
  },
  metaValue: {
    color: 'var(--text-primary)',
    fontWeight: 600,
  },
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function SessionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      api
        .getSession(id)
        .then(setSession)
        .catch((err) => {
          console.error('Failed to load session:', err);
          navigate('/');
        })
        .finally(() => setLoading(false));
    }
  }, [id, navigate]);

  const handleDelete = async () => {
    if (!id || !confirm('Delete this session?')) return;
    try {
      await api.deleteSession(id);
      navigate('/');
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  };

  const handleMarkCompleted = async () => {
    if (!id || !session) return;
    try {
      const updated = await api.updateSession(id, { status: 'completed' });
      setSession(updated);
    } catch (err) {
      console.error('Failed to update session:', err);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>Loading...</div>;
  }

  if (!session) return null;

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <span style={styles.date}>{formatDate(session.date)}</span>
        <span className={`badge badge-${session.status}`}>{session.status}</span>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Strength</h3>
        <ExerciseEditor exercises={session.strength} onChange={() => {}} readOnly />
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>WOD</h3>
        <WodEditor wod={session.wod} onChange={() => {}} readOnly />
        {(session.wod.timeSeconds || session.wod.avgHeartRate || session.wod.maxHeartRate) && (
          <div style={styles.wodMeta}>
            {session.wod.timeSeconds && (
              <span style={styles.metaItem}>
                Time: <span style={styles.metaValue}>{formatTime(session.wod.timeSeconds)}</span>
              </span>
            )}
            {session.wod.avgHeartRate && (
              <span style={styles.metaItem}>
                Avg HR: <span style={styles.metaValue}>{session.wod.avgHeartRate} bpm</span>
              </span>
            )}
            {session.wod.maxHeartRate && (
              <span style={styles.metaItem}>
                Max HR: <span style={styles.metaValue}>{session.wod.maxHeartRate} bpm</span>
              </span>
            )}
          </div>
        )}
      </div>

      {session.notes && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Notes</h3>
          <div style={styles.notes}>{session.notes}</div>
        </div>
      )}

      <div style={styles.actions}>
        {session.status === 'planned' && (
          <button
            className="btn btn-primary"
            onClick={handleMarkCompleted}
            style={{ flex: 1 }}
          >
            Mark Completed
          </button>
        )}
        <Link
          to={`/session/${session.id}/edit`}
          className="btn btn-secondary"
          style={{ flex: 1, textAlign: 'center' }}
        >
          Edit
        </Link>
        <button
          className="btn btn-danger"
          onClick={handleDelete}
          style={{ flex: 1 }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

export default SessionDetail;
