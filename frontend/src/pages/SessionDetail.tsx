import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Session } from '../types';
import { api } from '../services/api';
import ExerciseEditor from '../components/ExerciseEditor';
import WodEditor from '../components/WodEditor';
import { formatDate } from '../utils/format';
import Spinner from '../components/Spinner';
import Toast from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../hooks/useToast';

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
  const { toast, showToast, dismissToast } = useToast();

  useEffect(() => {
    document.title = 'Session Details - Workout Tracker';
  }, []);

  const loadSession = useCallback(() => {
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
  }, [id, navigate]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const handleDelete = async () => {
    if (!id) return;
    try {
      await api.deleteSession(id);
      navigate('/');
    } catch (err) {
      console.error('Failed to delete session:', err);
      showToast('Failed to delete session.', 'error');
      setConfirmDelete(false);
    }
  };

  const handleMarkCompleted = async () => {
    if (!id || !session) return;
    setSaving(true);
    try {
      const updated = await api.updateSession(id, { status: 'completed' });
      setSession(updated);
      showToast('Session marked as completed!');
    } catch (err) {
      console.error('Failed to update session:', err);
      showToast('Failed to update session.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Spinner />;
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
        <div style={s.sectionTitle}>Strength ({session.strength.length})</div>
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
        <button
          className="btn btn-danger"
          onClick={() => setConfirmDelete(true)}
          style={{ flex: 1 }}
        >
          Delete
        </button>
      </div>

      {confirmDelete && (
        <ConfirmDialog
          title="Delete Session"
          message="This action cannot be undone. Are you sure you want to delete this session?"
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}

      <Toast toast={toast} onDismiss={dismissToast} />
    </div>
  );
}

export default SessionDetail;
