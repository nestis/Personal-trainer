import { useState } from 'react';
import { Exercise, ExerciseSet } from '../types';
import Stepper from './Stepper';
import ConfirmDialog from './ConfirmDialog';

interface Props {
  exercises: Exercise[];
  onChange: (exercises: Exercise[]) => void;
  readOnly?: boolean;
}

const s: Record<string, React.CSSProperties> = {
  card: {
    background: 'var(--bg-grouped-secondary)',
    borderRadius: 16,
    padding: '4px 16px 0',
    marginBottom: 12,
  },
  head: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    minHeight: 52,
  },
  nameInput: {
    flex: 1,
    minWidth: 0,
    fontWeight: 700,
    fontSize: 20,
    letterSpacing: -0.3,
    background: 'transparent',
    border: 'none',
    color: 'var(--text-primary)',
    padding: '8px 0',
    outline: 'none',
  },
  menuBtn: {
    width: 44,
    height: 44,
    marginRight: -12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'none',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
  },
  menu: {
    position: 'absolute' as const,
    right: 0,
    top: 44,
    zIndex: 10,
    background: 'var(--bg-tertiary)',
    borderRadius: 12,
    boxShadow: 'var(--shadow-elevated)',
    overflow: 'hidden',
    minWidth: 180,
  },
  menuItem: {
    display: 'block',
    width: '100%',
    minHeight: 44,
    padding: '0 16px',
    textAlign: 'left' as const,
    background: 'none',
    border: 'none',
    fontSize: 17,
    cursor: 'pointer',
  },
  sep: {
    height: '0.5px',
    background: 'var(--separator)',
  },
  link: {
    display: 'flex',
    alignItems: 'center',
    minHeight: 44,
    background: 'none',
    border: 'none',
    padding: 0,
    color: 'var(--tint)',
    fontSize: 15,
    cursor: 'pointer',
  },
  setsHeader: {
    display: 'grid',
    gridTemplateColumns: '36px 1fr 1fr 36px',
    gap: 8,
    padding: '8px 4px 6px',
  },
  headerLabel: {
    fontSize: 12,
    fontWeight: 500,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  setRow: {
    display: 'grid',
    gridTemplateColumns: '36px 1fr 1fr 36px',
    gap: 8,
    alignItems: 'center',
    padding: '4px',
    borderRadius: 8,
    minHeight: 48,
  },
  setNum: {
    fontSize: 15,
    color: 'var(--text-secondary)',
    textAlign: 'center' as const,
    fontVariantNumeric: 'tabular-nums',
  },
  checkbox: {
    width: 24,
    height: 24,
    accentColor: 'var(--green)',
    cursor: 'pointer',
    justifySelf: 'center' as const,
  },
  roRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    minHeight: 40,
    fontSize: 17,
    fontVariantNumeric: 'tabular-nums',
  },
  roLabel: {
    width: 44,
    fontSize: 15,
    color: 'var(--text-secondary)',
  },
  doneDot: {
    width: 22,
    height: 22,
    borderRadius: '50%',
    background: 'var(--green)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  todoDot: {
    width: 22,
    height: 22,
    boxSizing: 'border-box' as const,
    borderRadius: '50%',
    border: '1.5px solid var(--text-muted)',
    flexShrink: 0,
  },
};

function isUniform(sets: ExerciseSet[]): boolean {
  return sets.every((st) => st.reps === sets[0].reps && st.kilos === sets[0].kilos);
}

function renumber(sets: ExerciseSet[]): ExerciseSet[] {
  return sets.map((st, i) => ({ ...st, setNumber: i + 1 }));
}

function ExerciseEditor({ exercises, onChange, readOnly }: Props) {
  // Exercises whose sets differ are edited set-by-set from the start
  const [customIds, setCustomIds] = useState<Set<string>>(
    () => new Set(exercises.filter((ex) => ex.sets.length > 0 && !isUniform(ex.sets)).map((ex) => ex.id))
  );
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<number | null>(null);

  const updateExercise = (index: number, updated: Exercise) => {
    const copy = [...exercises];
    copy[index] = updated;
    onChange(copy);
  };

  const setCount = (index: number, n: number) => {
    const ex = exercises[index];
    const first = ex.sets[0] || { reps: 5, kilos: 0 };
    const sets = Array.from({ length: n }, (_, i) =>
      ex.sets[i] ? ex.sets[i] : { setNumber: i + 1, reps: first.reps, kilos: first.kilos, completed: false }
    );
    updateExercise(index, { ...ex, sets: renumber(sets) });
  };

  const setAll = (index: number, field: 'reps' | 'kilos', value: number) => {
    const ex = exercises[index];
    updateExercise(index, { ...ex, sets: ex.sets.map((st) => ({ ...st, [field]: value })) });
  };

  const updateSet = (exIndex: number, setIndex: number, field: keyof ExerciseSet, value: number | boolean) => {
    const ex = exercises[exIndex];
    updateExercise(exIndex, {
      ...ex,
      sets: ex.sets.map((st, i) => (i === setIndex ? { ...st, [field]: value } : st)),
    });
  };

  const addSet = (exIndex: number) => {
    const ex = exercises[exIndex];
    const last = ex.sets[ex.sets.length - 1];
    updateExercise(exIndex, {
      ...ex,
      sets: [...ex.sets, { setNumber: ex.sets.length + 1, reps: last?.reps || 0, kilos: last?.kilos || 0, completed: false }],
    });
  };

  const removeSet = (exIndex: number, setIndex: number) => {
    const ex = exercises[exIndex];
    updateExercise(exIndex, { ...ex, sets: renumber(ex.sets.filter((_, i) => i !== setIndex)) });
  };

  const toggleCustom = (id: string, on: boolean) => {
    setCustomIds((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  if (readOnly) {
    return (
      <div>
        {exercises.map((ex) => (
          <section key={ex.id} style={{ ...s.card, padding: '12px 16px' }} aria-label={ex.name}>
            <h3 style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.3, marginBottom: 4 }}>{ex.name}</h3>
            {ex.sets.map((st) => (
              <div key={st.setNumber} style={s.roRow}>
                {st.completed ? (
                  <span style={s.doneDot} aria-label="Done">
                    <svg width="11" height="9" viewBox="0 0 12 10" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M1 5l3.5 3.5L11 1.5" />
                    </svg>
                  </span>
                ) : (
                  <span style={s.todoDot} aria-label="Not done" />
                )}
                <span style={s.roLabel}>Set {st.setNumber}</span>
                <span style={{ color: st.completed ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
                  {st.reps} × {st.kilos} kg
                </span>
              </div>
            ))}
          </section>
        ))}
      </div>
    );
  }

  return (
    <div>
      {exercises.map((exercise, exIndex) => {
        const custom = customIds.has(exercise.id) || exercise.sets.length === 0;
        const first = exercise.sets[0];
        return (
          <section key={exercise.id} style={s.card} aria-label={exercise.name || 'Exercise'}>
            <div style={{ ...s.head, position: 'relative' }}>
              <input
                style={s.nameInput}
                placeholder="Exercise name"
                aria-label="Exercise name"
                value={exercise.name}
                onChange={(e) => updateExercise(exIndex, { ...exercise, name: e.target.value })}
              />
              <button
                type="button"
                style={s.menuBtn}
                aria-label="Exercise options"
                aria-expanded={menuFor === exercise.id}
                onClick={() => setMenuFor(menuFor === exercise.id ? null : exercise.id)}
              >
                <svg width="20" height="6" viewBox="0 0 22 6" fill="currentColor" aria-hidden="true">
                  <circle cx="3" cy="3" r="2.5" />
                  <circle cx="11" cy="3" r="2.5" />
                  <circle cx="19" cy="3" r="2.5" />
                </svg>
              </button>
              {menuFor === exercise.id && (
                <div style={s.menu} role="menu">
                  {exIndex > 0 && (
                    <>
                      <button
                        type="button"
                        role="menuitem"
                        style={s.menuItem}
                        onClick={() => {
                          const copy = [...exercises];
                          [copy[exIndex - 1], copy[exIndex]] = [copy[exIndex], copy[exIndex - 1]];
                          onChange(copy);
                          setMenuFor(null);
                        }}
                      >
                        Move up
                      </button>
                      <div style={s.sep} />
                    </>
                  )}
                  <button
                    type="button"
                    role="menuitem"
                    style={{ ...s.menuItem, color: 'var(--red)' }}
                    onClick={() => {
                      setMenuFor(null);
                      setConfirmRemove(exIndex);
                    }}
                  >
                    Remove exercise
                  </button>
                </div>
              )}
            </div>
            <div style={s.sep} />

            {!custom && first ? (
              <>
                <Stepper label="Sets" value={exercise.sets.length} min={1} max={20} onChange={(n) => setCount(exIndex, n)} />
                <div style={s.sep} />
                <Stepper label="Reps" value={first.reps} min={0} max={999} onChange={(n) => setAll(exIndex, 'reps', n)} />
                <div style={s.sep} />
                <Stepper label="Weight (kg)" value={first.kilos} step={2.5} decimal onChange={(n) => setAll(exIndex, 'kilos', n)} />
                <div style={s.sep} />
                <button type="button" style={s.link} onClick={() => toggleCustom(exercise.id, true)}>
                  Customise each set
                </button>
              </>
            ) : (
              <>
                <div style={s.setsHeader}>
                  <span style={{ ...s.headerLabel, textAlign: 'center' }}>Set</span>
                  <span style={s.headerLabel}>Reps</span>
                  <span style={s.headerLabel}>Kg</span>
                  <span />
                </div>
                {exercise.sets.map((set, setIndex) => (
                  <div key={setIndex} style={{ ...s.setRow, background: setIndex % 2 === 0 ? 'var(--fill-secondary)' : 'transparent' }}>
                    <span style={s.setNum}>{set.setNumber}</span>
                    <input
                      className="input input-sm"
                      type="number"
                      inputMode="numeric"
                      aria-label={`Set ${set.setNumber} reps`}
                      value={set.reps || ''}
                      placeholder="0"
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => updateSet(exIndex, setIndex, 'reps', parseInt(e.target.value) || 0)}
                    />
                    <input
                      className="input input-sm"
                      type="number"
                      inputMode="decimal"
                      aria-label={`Set ${set.setNumber} kilos`}
                      value={set.kilos || ''}
                      placeholder="0"
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => updateSet(exIndex, setIndex, 'kilos', parseFloat(e.target.value) || 0)}
                    />
                    <input
                      type="checkbox"
                      style={s.checkbox}
                      aria-label={`Set ${set.setNumber} completed`}
                      checked={set.completed}
                      onChange={(e) => updateSet(exIndex, setIndex, 'completed', e.target.checked)}
                    />
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 20 }}>
                  <button type="button" style={s.link} onClick={() => addSet(exIndex)}>
                    + Add set
                  </button>
                  {exercise.sets.length > 1 && (
                    <button
                      type="button"
                      style={{ ...s.link, color: 'var(--text-secondary)' }}
                      onClick={() => removeSet(exIndex, exercise.sets.length - 1)}
                    >
                      Remove last
                    </button>
                  )}
                  {first && isUniform(exercise.sets) && (
                    <button type="button" style={s.link} onClick={() => toggleCustom(exercise.id, false)}>
                      Edit together
                    </button>
                  )}
                </div>
              </>
            )}
          </section>
        );
      })}

      {confirmRemove !== null && (
        <ConfirmDialog
          title="Remove exercise?"
          message={`Remove ${exercises[confirmRemove]?.name || 'this exercise'} and its sets from this session?`}
          confirmLabel="Remove"
          onConfirm={() => {
            onChange(exercises.filter((_, i) => i !== confirmRemove));
            setConfirmRemove(null);
          }}
          onCancel={() => setConfirmRemove(null)}
        />
      )}
    </div>
  );
}

export default ExerciseEditor;
