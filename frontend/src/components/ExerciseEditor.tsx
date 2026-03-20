import { Exercise, ExerciseSet } from '../types';

interface Props {
  exercises: Exercise[];
  onChange: (exercises: Exercise[]) => void;
  readOnly?: boolean;
}

const styles: Record<string, React.CSSProperties> = {
  exercise: {
    marginBottom: 16,
  },
  exerciseHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  nameInput: {
    flex: 1,
  },
  setRow: {
    display: 'grid',
    gridTemplateColumns: '40px 1fr 1fr 40px',
    gap: 8,
    alignItems: 'center',
    marginBottom: 6,
  },
  setLabel: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    textAlign: 'center' as const,
  },
  checkbox: {
    width: 20,
    height: 20,
    accentColor: 'var(--success)',
    cursor: 'pointer',
    justifySelf: 'center' as const,
  },
  setsHeader: {
    display: 'grid',
    gridTemplateColumns: '40px 1fr 1fr 40px',
    gap: 8,
    marginBottom: 4,
  },
};

function ExerciseEditor({ exercises, onChange, readOnly }: Props) {
  const updateExercise = (index: number, updated: Exercise) => {
    const copy = [...exercises];
    copy[index] = updated;
    onChange(copy);
  };

  const addExercise = () => {
    onChange([
      ...exercises,
      {
        id: crypto.randomUUID(),
        name: '',
        sets: [{ setNumber: 1, reps: 0, kilos: 0, completed: false }],
      },
    ]);
  };

  const removeExercise = (index: number) => {
    onChange(exercises.filter((_, i) => i !== index));
  };

  const updateSet = (exIndex: number, setIndex: number, field: keyof ExerciseSet, value: number | boolean) => {
    const ex = { ...exercises[exIndex] };
    const sets = [...ex.sets];
    sets[setIndex] = { ...sets[setIndex], [field]: value };
    ex.sets = sets;
    updateExercise(exIndex, ex);
  };

  const addSet = (exIndex: number) => {
    const ex = { ...exercises[exIndex] };
    const lastSet = ex.sets[ex.sets.length - 1];
    ex.sets = [
      ...ex.sets,
      {
        setNumber: ex.sets.length + 1,
        reps: lastSet?.reps || 0,
        kilos: lastSet?.kilos || 0,
        completed: false,
      },
    ];
    updateExercise(exIndex, ex);
  };

  const removeSet = (exIndex: number, setIndex: number) => {
    const ex = { ...exercises[exIndex] };
    ex.sets = ex.sets.filter((_, i) => i !== setIndex).map((s, i) => ({ ...s, setNumber: i + 1 }));
    updateExercise(exIndex, ex);
  };

  return (
    <div>
      {exercises.map((exercise, exIndex) => (
        <div key={exercise.id} className="card" style={styles.exercise}>
          <div style={styles.exerciseHeader}>
            <input
              className="input"
              style={styles.nameInput}
              placeholder="Exercise name"
              value={exercise.name}
              onChange={(e) =>
                updateExercise(exIndex, { ...exercise, name: e.target.value })
              }
              readOnly={readOnly}
            />
            {!readOnly && (
              <button
                className="btn btn-danger btn-sm"
                onClick={() => removeExercise(exIndex)}
                type="button"
              >
                X
              </button>
            )}
          </div>

          <div style={styles.setsHeader}>
            <span className="label" style={{ textAlign: 'center', marginBottom: 0 }}>Set</span>
            <span className="label" style={{ marginBottom: 0 }}>Reps</span>
            <span className="label" style={{ marginBottom: 0 }}>Kg</span>
            <span className="label" style={{ textAlign: 'center', marginBottom: 0 }}>Done</span>
          </div>

          {exercise.sets.map((set, setIndex) => (
            <div key={setIndex} style={styles.setRow}>
              <span style={styles.setLabel}>{set.setNumber}</span>
              <input
                className="input input-sm"
                type="number"
                inputMode="numeric"
                value={set.reps || ''}
                placeholder="0"
                onChange={(e) =>
                  updateSet(exIndex, setIndex, 'reps', parseInt(e.target.value) || 0)
                }
                readOnly={readOnly}
              />
              <input
                className="input input-sm"
                type="number"
                inputMode="decimal"
                value={set.kilos || ''}
                placeholder="0"
                onChange={(e) =>
                  updateSet(exIndex, setIndex, 'kilos', parseFloat(e.target.value) || 0)
                }
                readOnly={readOnly}
              />
              <input
                type="checkbox"
                style={styles.checkbox}
                checked={set.completed}
                onChange={(e) =>
                  updateSet(exIndex, setIndex, 'completed', e.target.checked)
                }
                disabled={readOnly}
              />
            </div>
          ))}

          {!readOnly && (
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => addSet(exIndex)}
                type="button"
              >
                + Set
              </button>
              {exercise.sets.length > 1 && (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => removeSet(exIndex, exercise.sets.length - 1)}
                  type="button"
                >
                  - Set
                </button>
              )}
            </div>
          )}
        </div>
      ))}

      {!readOnly && (
        <button
          className="btn btn-secondary btn-block"
          onClick={addExercise}
          type="button"
        >
          + Add Exercise
        </button>
      )}
    </div>
  );
}

export default ExerciseEditor;
