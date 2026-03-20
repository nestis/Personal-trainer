import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Session } from '../types';
import { api } from '../services/api';
import ExerciseEditor from '../components/ExerciseEditor';
import WodEditor from '../components/WodEditor';

const s: Record<string, React.CSSProperties> = {
  page: {
    paddingTop: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 28,
  },
  dateRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  date: {
    fontSize: 28,
    fontWeight: 700,
    letterSpacing: -0.6,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 400,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 8,
    paddingLeft: 4,
  },
  notes: {
    fontSize: 15,
    color: 'var(--text-secondary)',
    lineHeight: 1.5,
    whiteSpace: 'pre-wrap' as const,
    padding: '12px 16px',
    background: 'var(--bg-grouped-secondary)',
    borderRadius: 'var(--radius)',
  },
  actions: {
    display: 'flex',
    gap: 10,
    marginTop: 32,
  },
  loading: {
    textAlign: 'center' as const,
    padding: 60,
    color: 'var(--text-secondary)',
    fontSize: 15,
  },
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
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
    return <div style={s.loading}>Loading...</div>;
  }

  if (!session) return null;

  return (
    <div style={s.page} className="fade-in">
      <div style={s.header}>
        <div style={s.dateRow}>
          <span style={s.date}>{formatDate(session.date)}</span>
        </div>
        <span className={`badge badge-${session.status}`}>{session.status}</span>
      </div>

      <div style={s.section}>
        <div style={s.sectionTitle}>Strength</div>
        <ExerciseEditor exercises={session.strength} onChange={() => {}} readOnly />
      </div>

      <div style={s.section}>
        <div style={s.sectionTitle}>WOD</div>
        <WodEditor wod={session.wod} onChange={() => {}} readOnly />
      </div>

      {session.notes && (
        <div style={s.section}>
          <div style={s.sectionTitle}>Notes</div>
          <div style={s.notes}>{session.notes}</div>
        </div>
      )}

      <div style={s.actions}>
        {session.status === 'planned' && (
          <button
            className="btn btn-primary"
            onClick={handleMarkCompleted}
            style={{ flex: 1 }}
          >
            Complete
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
