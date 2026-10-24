import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Exercise, WOD, Session, AggregatedExercise } from '../types';
import { api } from '../services/api';
import { toDateString } from '../utils/format';
import ExerciseEditor from '../components/ExerciseEditor';
import WodEditor from '../components/WodEditor';
import Segmented from '../components/Segmented';
import Spinner from '../components/Spinner';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';

const s: Record<string, React.CSSProperties> = {
  nav: {
    position: 'sticky',
    top: 0,
    zIndex: 50,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
    margin: '0 -20px 12px',
    padding: 'var(--safe-top) 8px 0',
    background: 'rgba(0, 0, 0, 0.72)',
    backdropFilter: 'saturate(180%) blur(20px)',
    WebkitBackdropFilter: 'saturate(180%) blur(20px)',
    borderBottom: '0.5px solid var(--separator)',
  },
  navBtn: {
    minWidth: 60,
    minHeight: 44,
    padding: '0 12px',
    display: 'flex',
    alignItems: 'center',
    background: 'none',
    border: 'none',
    color: 'var(--tint)',
    fontSize: 17,
    cursor: 'pointer',
  },
  navTitle: {
    fontSize: 17,
    fontWeight: 600,
  },
  page: {
    paddingBottom: 'calc(var(--safe-bottom) + 40px)',
  },
  group: {
    background: 'var(--bg-grouped-secondary)',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
  },
  groupRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
    padding: '0 16px',
  },
  sep: {
    height: '0.5px',
    background: 'var(--separator)',
    marginLeft: 16,
  },
  sectionTitle: {
    fontSize: 13,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    margin: '0 0 8px',
    paddingLeft: 4,
  },
  section: {
    marginBottom: 24,
  },
  addRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'var(--bg-grouped-secondary)',
    borderRadius: 12,
    padding: '0 4px 0 16px',
    minHeight: 48,
  },
  addInput: {
    flex: 1,
    minWidth: 0,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: 'var(--text-primary)',
    fontSize: 17,
    minHeight: 44,
  },
  addBtn: {
    minHeight: 44,
    padding: '0 12px',
    background: 'none',
    border: 'none',
    color: 'var(--tint)',
    fontSize: 17,
    fontWeight: 600,
    cursor: 'pointer',
  },
  chips: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 8,
    marginTop: 8,
  },
  chip: {
    minHeight: 36,
    padding: '0 14px',
    borderRadius: 18,
    border: 'none',
    background: 'var(--bg-tertiary)',
    color: 'var(--text-primary)',
    fontSize: 15,
    cursor: 'pointer',
  },
};

interface Suggestion {
  name: string;
  reps: number;
  kilos: number;
  last: string;
}

function toSuggestions(agg: AggregatedExercise[]): Suggestion[] {
  return agg
    .map((a) => {
      const last = a.history[a.history.length - 1];
      return { name: a.exercise, reps: last?.reps || 5, kilos: last?.kilos || 0, last: last?.date || '' };
    })
    .sort((a, b) => b.last.localeCompare(a.last));
}

function SessionForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [date, setDate] = useState(() => toDateString(new Date()));
  const [status, setStatus] = useState<'planned' | 'completed'>('planned');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [wod, setWod] = useState<WOD>({ description: '' });
  const [notes, setNotes] = useState('');
  const [newName, setNewName] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const { toast, showToast, dismissToast } = useToast();

  useEffect(() => {
    document.title = `${isEdit ? 'Edit' : 'New'} Session - Workout Tracker`;
  }, [isEdit]);

  useEffect(() => {
    api.getAggregatedStrength().then((agg) => setSuggestions(toSuggestions(agg))).catch(() => {});
  }, []);

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

  const visibleSuggestions = useMemo(() => {
    const used = new Set(exercises.map((e) => e.name.trim().toLowerCase()));
    const q = newName.trim().toLowerCase();
    return suggestions
      .filter((sg) => !used.has(sg.name.toLowerCase()) && (!q || sg.name.toLowerCase().includes(q)))
      .slice(0, 6);
  }, [suggestions, exercises, newName]);

  const addExercise = (name: string, reps = 5, kilos = 0) => {
    const clean = name.trim();
    if (!clean) return;
    setExercises((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: clean,
        sets: Array.from({ length: 3 }, (_, i) => ({ setNumber: i + 1, reps, kilos, completed: false })),
      },
    ]);
    setNewName('');
  };

  const handleSave = async () => {
    const strength = exercises.filter((ex) => ex.name.trim());
    setSaving(true);
    try {
      if (isEdit && id) {
        await api.updateSession(id, { date, status, strength, wod, notes });
      } else {
        await api.createSession({ date, strength, wod, notes });
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
      <div style={s.nav}>
        <button style={s.navBtn} onClick={() => navigate(-1)}>
          Cancel
        </button>
        <span style={s.navTitle}>{isEdit ? 'Edit session' : 'New session'}</span>
        <button style={{ ...s.navBtn, justifyContent: 'flex-end', fontWeight: 600 }} onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      <div style={s.group}>
        <div style={s.groupRow}>
          <label htmlFor="session-date" style={{ fontSize: 17 }}>Date</label>
          <input
            id="session-date"
            className="input input-sm"
            type="date"
            style={{ width: 'auto' }}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        {isEdit && (
          <>
            <div style={s.sep} />
            <div style={s.groupRow}>
              <span style={{ fontSize: 17 }}>Status</span>
              <Segmented
                label="Status"
                fullWidth={false}
                value={status}
                onChange={setStatus}
                options={[
                  { value: 'planned', label: 'Planned' },
                  { value: 'completed', label: 'Completed' },
                ]}
              />
            </div>
          </>
        )}
      </div>

      <div style={s.section}>
        <div style={s.sectionTitle}>Strength</div>
        <ExerciseEditor exercises={exercises} onChange={setExercises} />

        <form
          onSubmit={(e) => {
            e.preventDefault();
            const match = suggestions.find((sg) => sg.name.toLowerCase() === newName.trim().toLowerCase());
            addExercise(match ? match.name : newName, match?.reps, match?.kilos);
          }}
        >
          <div style={s.addRow}>
            <input
              style={s.addInput}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Add exercise…"
              aria-label="Add exercise"
              enterKeyHint="done"
              autoCapitalize="words"
            />
            {newName.trim() && (
              <button type="submit" style={s.addBtn}>
                Add
              </button>
            )}
          </div>
        </form>
        {visibleSuggestions.length > 0 && (
          <div style={s.chips} aria-label="Suggestions from your history">
            {visibleSuggestions.map((sg) => (
              <button key={sg.name} type="button" style={s.chip} onClick={() => addExercise(sg.name, sg.reps, sg.kilos)}>
                {sg.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={s.section}>
        <div style={s.sectionTitle}>WOD</div>
        <WodEditor wod={wod} onChange={setWod} />
      </div>

      <div style={s.section}>
        <div style={s.sectionTitle}>Notes</div>
        <textarea
          className="input"
          value={notes}
          placeholder="Any additional notes..."
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />
      </div>

      <Toast toast={toast} onDismiss={dismissToast} />
    </div>
  );
}

export default SessionForm;
