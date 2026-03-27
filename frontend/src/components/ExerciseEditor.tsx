import { Exercise, ExerciseSet } from '../types';

interface Props {
  exercises: Exercise[];
  onChange: (exercises: Exercise[]) => void;
  readOnly?: boolean;
}

const s: Record<string, React.CSSProperties> = {
  exercise: {
    marginBottom: 12,
    overflow: 'hidden',
  },
  exerciseHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  nameInput: {
    flex: 1,
    fontWeight: 600,
    fontSize: 17,
  },
  removeExBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--red)',
    fontSize: 15,
    fontWeight: 500,
    cursor: 'pointer',
    padding: '8px 12px',
    borderRadius: 'var(--radius-xs)',
    transition: 'background 0.15s',
    minHeight: 44,
  },
  setsHeader: {
    display: 'grid',
    gridTemplateColumns: '36px 1fr 1fr 36px',
    gap: 8,
    marginBottom: 6,
    padding: '0 2px',
  },
  headerLabel: {
    fontSize: 12,
    fontWeight: 500,
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  setRow: {
    display: 'grid',
    gridTemplateColumns: '36px 1fr 1fr 36px',
    gap: 8,
    alignItems: 'center',
    padding: '6px 4px',
    borderRadius: 'var(--radius-xs)',
    transition: 'background 0.15s',
    minHeight: 44,
  },
  setNum: {
    fontSize: 15,
    color: 'var(--text-tertiary)',
    textAlign: 'center' as const,
    fontWeight: 500,
    fontVariantNumeric: 'tabular-nums',
  },
  checkbox: {
    width: 24,
    height: 24,
    accentColor: 'var(--green)',
    cursor: 'pointer',
    justifySelf: 'center' as const,
  },
  setActions: {
    display: 'flex',
    gap: 8,
    marginTop: 10,
  },
  setBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--tint)',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    padding: '8px 0',
    minHeight: 44,
  },
  addExercise: {
    background: 'none',
    border: 'none',
    color: 'var(--tint)',
    fontSize: 17,
    fontWeight: 500,
    cursor: 'pointer',
    padding: '14px 0',
    width: '100%',
    textAlign: 'center' as const,
    borderRadius: 'var(--radius)',
    transition: 'background 0.15s',
    minHeight: 48,
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
        <div key={exercise.id} className="card" style={s.exercise}>
          <div style={s.exerciseHeader}>
            <label className="label" style={{ flex: 1, margin: 0 }}>
              <input
                className="input"
                style={s.nameInput}
                placeholder="Exercise name"
                value={exercise.name}
                onChange={(e) =>
                  updateExercise(exIndex, { ...exercise, name: e.target.value })
                }
                readOnly={readOnly}
              />
            </label>
            {!readOnly && (
              <button
                style={s.removeExBtn}
                onClick={() => removeExercise(exIndex)}
                type="button"
              >
                Remove
              </button>
            )}
          </div>

          <div style={s.setsHeader}>
            <span style={{ ...s.headerLabel, textAlign: 'center' }}>SET</span>
            <span style={s.headerLabel}>REPS</span>
            <span style={s.headerLabel}>KG</span>
            <span style={{ ...s.headerLabel, textAlign: 'center' }}>{readOnly ? '' : ''}</span>
          </div>

          {exercise.sets.map((set, setIndex) => {
            const isCompleted = set.completed;
            const isEven = setIndex % 2 === 0;
            return (
              <div
                key={setIndex}
                style={{
                  ...s.setRow,
                  background: isCompleted
                    ? 'rgba(48, 209, 88, 0.06)'
                    : isEven
                    ? 'var(--fill-secondary)'
                    : 'transparent',
                  opacity: isCompleted ? 0.55 : 1,
                }}
              >
                <span style={s.setNum}>{set.setNumber}</span>
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
                  style={isCompleted ? { textDecoration: 'line-through' } : undefined}
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
                  style={isCompleted ? { textDecoration: 'line-through' } : undefined}
                />
                <input
                  type="checkbox"
                  style={s.checkbox}
                  checked={set.completed}
                  onChange={(e) =>
                    updateSet(exIndex, setIndex, 'completed', e.target.checked)
                  }
                  disabled={readOnly}
                />
              </div>
            );
          })}

          {!readOnly && (
            <div style={s.setActions}>
              <button style={s.setBtn} onClick={() => addSet(exIndex)} type="button">
                + Add Set
              </button>
              {exercise.sets.length > 1 && (
                <button
                  style={{ ...s.setBtn, color: 'var(--text-secondary)' }}
                  onClick={() => removeSet(exIndex, exercise.sets.length - 1)}
                  type="button"
                >
                  Remove Last
                </button>
              )}
            </div>
          )}
        </div>
      ))}

      {!readOnly && (
        <button style={s.addExercise} onClick={addExercise} type="button">
          + Add Exercise
        </button>
      )}
    </div>
  );
}

export default ExerciseEditor;
