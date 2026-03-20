import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Exercise, WOD, Session } from '../types';
import { api } from '../services/api';
import ExerciseEditor from '../components/ExerciseEditor';
import WodEditor from '../components/WodEditor';

const styles: Record<string, React.CSSProperties> = {
  page: {
    paddingTop: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: '1.1rem',
    fontWeight: 600,
    marginBottom: 12,
    color: 'var(--text-primary)',
  },
  actions: {
    display: 'flex',
    gap: 12,
    marginTop: 24,
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
      alert('Failed to save session. Check console for details.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>Loading...</div>;
  }

  return (
    <div style={styles.page}>
      <div style={styles.section}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <label className="label">Date</label>
            <input
              className="input"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          {isEdit && (
            <div style={{ flex: 1 }}>
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

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Strength</h2>
        <ExerciseEditor exercises={exercises} onChange={setExercises} />
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>WOD</h2>
        <WodEditor wod={wod} onChange={setWod} />
      </div>

      <div style={styles.section}>
        <label className="label">Notes</label>
        <textarea
          className="input"
          value={notes}
          placeholder="Any additional notes..."
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />
      </div>

      <div style={styles.actions}>
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
          {saving ? 'Saving...' : isEdit ? 'Update Session' : 'Plan Session'}
        </button>
      </div>
    </div>
  );
}

export default SessionForm;
