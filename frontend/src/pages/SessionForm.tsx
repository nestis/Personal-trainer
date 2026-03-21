import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Exercise, WOD, Session } from '../types';
import { api } from '../services/api';
import ExerciseEditor from '../components/ExerciseEditor';
import WodEditor from '../components/WodEditor';
import Spinner from '../components/Spinner';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';

const s: Record<string, React.CSSProperties> = {
  page: {
    paddingTop: 20,
    paddingBottom: 40,
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
  row: {
    display: 'flex',
    gap: 12,
    marginBottom: 14,
  },
  field: {
    flex: 1,
  },
  actions: {
    display: 'flex',
    gap: 10,
    marginTop: 32,
  },
};

function SessionForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<'planned' | 'completed'>('planned');
  const [exercises, setExercises] = useState<Exercise[]>([
    {
      id: crypto.randomUUID(),
      name: '',
      sets: [{ setNumber: 1, reps: 5, kilos: 0, completed: false }],
    },
  ]);
  const [wod, setWod] = useState<WOD>({ description: '' });
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const { toast, showToast, dismissToast } = useToast();

  useEffect(() => {
    if (id) {
      api
        .getSession(id)
        .then((session: Session) => {
          setDate(session.date);
          setStatus(session.status);
          setExercises(session.strength);
          setWod(session.wod);
          setNotes(session.notes || '');
        })
        .catch((err: Error) => {
          console.error('Failed to load session:', err);
          navigate('/');
        })
        .finally(() => setLoading(false));
    }
  }, [id, navigate]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (isEdit && id) {
        await api.updateSession(id, { date, status, strength: exercises, wod, notes });
      } else {
        await api.createSession({ date, strength: exercises, wod, notes });
      }
      navigate('/');
    } catch (err) {
      console.error('Failed to save session:', err);
      showToast('Failed to save session.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Spinner />;
  }

  return (
    <div style={s.page} className="fade-in">
      <div style={s.section}>
        <div style={s.row}>
          <div style={s.field}>
            <label className="label">Date</label>
            <input
              className="input"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          {isEdit && (
            <div style={s.field}>
              <label className="label">Status</label>
              <select
                className="input"
                value={status}
                onChange={(e) => setStatus(e.target.value as 'planned' | 'completed')}
              >
                <option value="planned">Planned</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          )}
        </div>
      </div>

      <div style={s.section}>
        <div style={s.sectionTitle}>Strength</div>
        <ExerciseEditor exercises={exercises} onChange={setExercises} />
      </div>

      <div style={s.section}>
        <div style={s.sectionTitle}>WOD</div>
        <WodEditor wod={wod} onChange={setWod} />
      </div>

      <div style={s.section}>
        <label className="label">Notes</label>
        <textarea
          className="input"
          value={notes}
          placeholder="Any additional notes..."
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />
      </div>

      <div style={s.actions}>
        <button
          className="btn btn-secondary"
          onClick={() => navigate(-1)}
          style={{ flex: 1 }}
        >
          Cancel
        </button>
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={saving}
          style={{ flex: 2 }}
        >
          {saving ? 'Saving...' : isEdit ? 'Update' : 'Plan Session'}
        </button>
      </div>

      <Toast toast={toast} onDismiss={dismissToast} />
    </div>
  );
}

export default SessionForm;
