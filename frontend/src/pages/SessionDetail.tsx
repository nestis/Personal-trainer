import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Session } from '../types';
import { api } from '../services/api';
import ExerciseEditor from '../components/ExerciseEditor';
import WodEditor from '../components/WodEditor';
import { formatDate } from '../utils/format';

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

const noop = () => {};

function SessionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Session Details - Workout Tracker';
  }, []);

  const loadSession = () => {
    if (!id) return;
    setError(null);
    setLoading(true);
    api
      .getSession(id)
      .then(setSession)
      .catch((err) => {
        console.error('Failed to load session:', err);
        if (err.message === 'Not found' || err.message === 'Session not found') {
          navigate('/');
        } else {
          setError(err.message || 'Failed to load session.');
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleDelete = async () => {
    if (!id) return;
    setDeleteError(null);
    try {
      await api.deleteSession(id);
      navigate('/');
    } catch (err) {
      console.error('Failed to delete session:', err);
      setDeleteError('Failed to delete session. Please try again.');
      setConfirmDelete(false);
    }
  };

  const handleMarkCompleted = async () => {
    if (!id || !session) return;
    setSaving(true);
    try {
      const updated = await api.updateSession(id, { status: 'completed' });
      setSession(updated);
    } catch (err) {
      console.error('Failed to update session:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={s.loading}>Loading...</div>;
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px' }} className="fade-in">
        <div className="card" style={{ background: 'rgba(255,69,58,0.12)', color: 'var(--red)' }}>
          {error}
        </div>
        <button className="btn btn-primary" onClick={loadSession} style={{ marginTop: 16 }}>
          Retry
        </button>
      </div>
    );
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
        <ExerciseEditor exercises={session.strength} onChange={noop} readOnly />
      </div>

      <div style={s.section}>
        <div style={s.sectionTitle}>WOD</div>
        <WodEditor wod={session.wod} onChange={noop} readOnly />
      </div>

      {session.notes && (
        <div style={s.section}>
          <div style={s.sectionTitle}>Notes</div>
          <div style={s.notes}>{session.notes}</div>
        </div>
      )}

      {deleteError && (
        <div className="card" style={{ background: 'rgba(255,69,58,0.12)', color: 'var(--red)', marginBottom: 12 }}>
          {deleteError}
        </div>
      )}

      <div style={s.actions}>
        {session.status === 'planned' && (
          <button
            className="btn btn-primary"
            onClick={handleMarkCompleted}
            disabled={saving}
            style={{ flex: 1 }}
          >
            {saving ? 'Saving...' : 'Complete'}
          </button>
        )}
        <Link
          to={`/session/${session.id}/edit`}
          className="btn btn-secondary"
          style={{ flex: 1, textAlign: 'center' }}
        >
          Edit
        </Link>
        {confirmDelete ? (
          <>
            <button
              className="btn btn-danger"
              onClick={handleDelete}
              style={{ flex: 1 }}
            >
              Delete
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => setConfirmDelete(false)}
              style={{ flex: 1 }}
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            className="btn btn-danger"
            onClick={() => setConfirmDelete(true)}
            style={{ flex: 1 }}
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

export default SessionDetail;
