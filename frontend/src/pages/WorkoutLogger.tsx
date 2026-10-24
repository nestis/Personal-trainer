import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AggregatedExercise, Exercise, Session } from '../types';
import { api } from '../services/api';
import { formatDayLabel, formatTime } from '../utils/format';
import Stepper from '../components/Stepper';
import Spinner from '../components/Spinner';
import Toast from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../hooks/useToast';

const s: Record<string, React.CSSProperties> = {
  page: {
    paddingBottom: 'calc(120px + var(--safe-bottom))',
  },
  nav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 'var(--safe-top)',
    minHeight: 52,
    margin: '0 -12px',
  },
  navBtn: {
    minWidth: 44,
    minHeight: 44,
    padding: '0 12px',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'none',
    border: 'none',
    color: 'var(--tint)',
    fontSize: 17,
    cursor: 'pointer',
    textDecoration: 'none',
  },
  navTitle: {
    fontSize: 17,
    fontWeight: 600,
  },
  progressRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 13,
    color: 'var(--text-secondary)',
    fontVariantNumeric: 'tabular-nums',
    marginTop: 4,
  },
  track: {
    height: 4,
    borderRadius: 2,
    background: 'var(--bg-tertiary)',
    marginTop: 8,
    marginBottom: 16,
    overflow: 'hidden',
  },
  card: {
    background: 'var(--bg-grouped-secondary)',
    borderRadius: 16,
    padding: '14px 16px 4px',
    marginBottom: 12,
  },
  cardHead: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  },
  exName: {
    fontSize: 20,
    fontWeight: 700,
    letterSpacing: -0.3,
  },
  hint: {
    fontSize: 13,
    color: 'var(--text-secondary)',
    whiteSpace: 'nowrap' as const,
  },
  setRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    minHeight: 44,
    background: 'none',
    border: 'none',
    color: 'inherit',
    textAlign: 'left' as const,
    padding: 0,
    cursor: 'pointer',
    fontSize: 17,
  },
  setLabel: {
    width: 44,
    fontSize: 15,
    color: 'var(--text-secondary)',
  },
  doneDot: {
    width: 24,
    height: 24,
    borderRadius: '50%',
    background: 'var(--green)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  todoDot: {
    width: 24,
    height: 24,
    boxSizing: 'border-box' as const,
    borderRadius: '50%',
    border: '1.5px solid var(--text-muted)',
    flexShrink: 0,
  },
  active: {
    background: 'var(--bg-tertiary)',
    borderRadius: 12,
    padding: 12,
    margin: '4px -4px',
  },
  activeLabel: {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 0.7,
    color: 'var(--tint)',
    textTransform: 'uppercase' as const,
  },
  addSet: {
    background: 'none',
    border: 'none',
    color: 'var(--tint)',
    fontSize: 15,
    minHeight: 44,
    padding: 0,
    cursor: 'pointer',
  },
  collapsed: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    minHeight: 64,
    padding: '0 16px',
    marginBottom: 12,
    background: 'var(--bg-grouped-secondary)',
    border: 'none',
    borderRadius: 16,
    color: 'inherit',
    textAlign: 'left' as const,
    cursor: 'pointer',
  },
  bottomBar: {
    position: 'fixed' as const,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
    background: 'rgba(18, 18, 20, 0.92)',
    backdropFilter: 'saturate(180%) blur(20px)',
    WebkitBackdropFilter: 'saturate(180%) blur(20px)',
    borderTop: '0.5px solid var(--separator)',
    paddingBottom: 'var(--safe-bottom)',
  },
  bottomInner: {
    maxWidth: 560,
    margin: '0 auto',
    padding: '12px 20px',
    display: 'flex',
    gap: 12,
    alignItems: 'center',
  },
  rest: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    height: 50,
    boxSizing: 'border-box' as const,
    padding: '0 16px',
    borderRadius: 25,
    background: 'var(--bg-tertiary)',
    fontSize: 17,
    fontWeight: 600,
    fontVariantNumeric: 'tabular-nums',
  },
};

const Check = ({ color = '#000' }: { color?: string }) => (
  <svg width="12" height="10" viewBox="0 0 12 10" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M1 5l3.5 3.5L11 1.5" />
  </svg>
);

function startTimeFor(id: string): number {
  const key = `wt_start_${id}`;
  try {
    const saved = Number(sessionStorage.getItem(key));
    if (saved) return saved;
    const now = Date.now();
    sessionStorage.setItem(key, String(now));
    return now;
  } catch {
    return Date.now();
  }
}

function firstIncomplete(ex: Exercise): number {
  return ex.sets.findIndex((st) => !st.completed);
}

function WorkoutLogger() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [history, setHistory] = useState<AggregatedExercise[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [focus, setFocus] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [lastLoggedAt, setLastLoggedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const startedAt = useRef<number>(Date.now());
  const { toast, showToast, dismissToast } = useToast();

  useEffect(() => {
    document.title = 'Workout - Workout Tracker';
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const load = useCallback(() => {
    if (!id) return;
    startedAt.current = startTimeFor(id);
    setLoading(true);
    setError(null);
    api
      .getSession(id)
      .then((sess) => {
        setSession(sess);
        setExercises(sess.strength);
        const firstOpen = sess.strength.find((ex) => firstIncomplete(ex) !== -1) || sess.strength[0];
        setOpenId(firstOpen ? firstOpen.id : null);
      })
      .catch((err) => setError(err.message || 'Failed to load session.'))
      .finally(() => setLoading(false));
    // Last-time hints are best effort
    api.getAggregatedStrength().then(setHistory).catch(() => {});
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const persist = (next: Exercise[]) => {
    if (!id) return;
    api.updateSession(id, { strength: next }).catch((err) => {
      console.error('Failed to save workout:', err);
      showToast('Could not save. Your changes are kept on screen.', 'error');
    });
  };

  const update = (next: Exercise[], save: boolean) => {
    setExercises(next);
    if (save) persist(next);
  };

  const patchSet = (exId: string, idx: number, patch: Partial<Exercise['sets'][number]>, save = false) => {
    update(
      exercises.map((ex) =>
        ex.id === exId ? { ...ex, sets: ex.sets.map((st, i) => (i === idx ? { ...st, ...patch } : st)) } : ex
      ),
      save
    );
  };

  const logSet = (ex: Exercise, idx: number) => {
    const next = exercises.map((e) =>
      e.id === ex.id ? { ...e, sets: e.sets.map((st, i) => (i === idx ? { ...st, completed: true } : st)) } : e
    );
    update(next, true);
    setLastLoggedAt(Date.now());
    setFocus((f) => {
      const copy = { ...f };
      delete copy[ex.id];
      return copy;
    });
    const updated = next.find((e) => e.id === ex.id)!;
    if (firstIncomplete(updated) === -1) {
      const following = next.find((e) => e.id !== ex.id && firstIncomplete(e) !== -1);
      if (following) setOpenId(following.id);
    }
  };

  const addSet = (exId: string) => {
    update(
      exercises.map((ex) => {
        if (ex.id !== exId) return ex;
        const last = ex.sets[ex.sets.length - 1];
        return {
          ...ex,
          sets: [...ex.sets, { setNumber: ex.sets.length + 1, reps: last?.reps || 0, kilos: last?.kilos || 0, completed: false }],
        };
      }),
      true
    );
  };

  const lastTime = (name: string): string | null => {
    const h = history.find((e) => e.exercise.toLowerCase() === name.trim().toLowerCase());
    const entry = h?.history[h.history.length - 1];
    return entry ? `Last: ${entry.reps} × ${entry.kilos} kg` : null;
  };

  const totals = useMemo(() => {
    const all = exercises.reduce((n, ex) => n + ex.sets.length, 0);
    const done = exercises.reduce((n, ex) => n + ex.sets.filter((st) => st.completed).length, 0);
    return { all, done };
  }, [exercises]);

  const finish = async () => {
    if (!id) return;
    setFinishing(true);
    try {
      await api.updateSession(id, { status: 'completed', strength: exercises });
      try {
        sessionStorage.removeItem(`wt_start_${id}`);
      } catch {
        /* storage unavailable */
      }
      navigate('/');
    } catch (err) {
      console.error('Failed to finish workout:', err);
      showToast('Failed to finish workout.', 'error');
      setFinishing(false);
      setConfirmFinish(false);
    }
  };

  if (loading) return <Spinner />;

  if (error || !session) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px' }}>
        <div className="card" style={{ background: 'rgba(255,69,58,0.12)', color: 'var(--red)' }}>
          {error || 'Session not found'}
        </div>
        <button className="btn btn-primary" onClick={load} style={{ marginTop: 16 }}>
          Retry
        </button>
      </div>
    );
  }

  const elapsed = Math.max(0, Math.floor((now - startedAt.current) / 1000));
  const rest = lastLoggedAt ? Math.max(0, Math.floor((now - lastLoggedAt) / 1000)) : null;
  const pct = totals.all ? Math.round((totals.done / totals.all) * 100) : 0;
  const remaining = totals.all - totals.done;

  return (
    <div style={s.page} className="fade-in">
      <div style={s.nav}>
        <button style={s.navBtn} onClick={() => navigate('/')}>
          <svg width="10" height="16" viewBox="0 0 10 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="8 2 2 8 8 14" />
          </svg>
          Back
        </button>
        <span style={s.navTitle}>{formatDayLabel(session.date)}</span>
        <Link to={`/session/${session.id}/edit`} style={{ ...s.navBtn, justifyContent: 'flex-end', minWidth: 60 }}>
          Edit
        </Link>
      </div>

      <div style={s.progressRow}>
        <span>
          Sets {totals.done} of {totals.all}
        </span>
        <span>{formatTime(elapsed)}</span>
      </div>
      <div style={s.track} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Workout progress">
        <div style={{ width: `${pct}%`, height: '100%', background: 'var(--green)', transition: 'width 0.3s ease' }} />
      </div>

      {exercises.length === 0 && (
        <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-secondary)' }}>
          No strength exercises in this session.
          {session.wod.description && <div style={{ marginTop: 12, color: 'var(--text-primary)' }}>WOD: {session.wod.description}</div>}
        </div>
      )}

      {exercises.map((ex) => {
        const open = ex.id === openId;
        const doneCount = ex.sets.filter((st) => st.completed).length;
        const allDone = doneCount === ex.sets.length && ex.sets.length > 0;

        if (!open) {
          const first = ex.sets[0];
          return (
            <button key={ex.id} style={s.collapsed} onClick={() => setOpenId(ex.id)} aria-label={`${ex.name || 'Exercise'}, ${doneCount} of ${ex.sets.length} sets`}>
              <span>
                <span style={{ display: 'block', fontSize: 17, fontWeight: 600 }}>{ex.name || 'Exercise'}</span>
                <span style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                  {allDone ? 'All sets done' : `${doneCount} of ${ex.sets.length} sets`}
                  {first ? ` · ${ex.sets.length} × ${first.reps} @ ${first.kilos} kg` : ''}
                </span>
              </span>
              {allDone ? (
                <span style={s.doneDot}><Check /></span>
              ) : (
                <svg width="14" height="8" viewBox="0 0 14 8" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M1 1l6 6 6-6" />
                </svg>
              )}
            </button>
          );
        }

        const focused = focus[ex.id];
        const activeIdx =
          typeof focused === 'number' && ex.sets[focused] && !ex.sets[focused].completed ? focused : firstIncomplete(ex);
        const hint = lastTime(ex.name);

        return (
          <section key={ex.id} style={s.card} aria-label={ex.name || 'Exercise'}>
            <div style={s.cardHead}>
              <h2 style={s.exName}>{ex.name || 'Exercise'}</h2>
              {hint && <span style={s.hint}>{hint}</span>}
            </div>

            <div style={{ marginTop: 10 }}>
              {ex.sets.map((st, i) => {
                if (i === activeIdx) {
                  return (
                    <div key={i} style={s.active}>
                      <div style={s.activeLabel}>Set {st.setNumber} · now</div>
                      <Stepper label="Reps" value={st.reps} onChange={(v) => patchSet(ex.id, i, { reps: v })} />
                      <Stepper label="Weight (kg)" value={st.kilos} step={2.5} decimal onChange={(v) => patchSet(ex.id, i, { kilos: v })} />
                      <button
                        type="button"
                        className="btn btn-success btn-block"
                        style={{ height: 44, marginTop: 8, padding: 0 }}
                        onClick={() => logSet(ex, i)}
                      >
                        Log set {st.setNumber}
                      </button>
                    </div>
                  );
                }
                return (
                  <button
                    key={i}
                    type="button"
                    style={s.setRow}
                    aria-label={st.completed ? `Set ${st.setNumber} done. Tap to undo` : `Set ${st.setNumber}. Tap to edit`}
                    onClick={() =>
                      st.completed
                        ? patchSet(ex.id, i, { completed: false }, true)
                        : setFocus((f) => ({ ...f, [ex.id]: i }))
                    }
                  >
                    {st.completed ? <span style={s.doneDot}><Check /></span> : <span style={s.todoDot} />}
                    <span style={s.setLabel}>Set {st.setNumber}</span>
                    <span style={{ fontVariantNumeric: 'tabular-nums', color: st.completed ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
                      {st.reps} × {st.kilos} kg
                    </span>
                  </button>
                );
              })}
            </div>

            <button type="button" style={s.addSet} onClick={() => addSet(ex.id)}>
              + Add set
            </button>
          </section>
        );
      })}

      <div style={s.bottomBar}>
        <div style={s.bottomInner}>
          <div style={s.rest} aria-label="Time since last set">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--orange)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="13" r="8" />
              <path d="M12 9v4l2.5 2M9 2h6" />
            </svg>
            {rest === null ? '–:––' : formatTime(rest)}
          </div>
          <button
            type="button"
            className="btn btn-primary"
            style={{ flex: 1, height: 50, padding: 0 }}
            disabled={finishing}
            onClick={() => (remaining > 0 ? setConfirmFinish(true) : finish())}
          >
            {finishing ? 'Saving...' : 'Finish workout'}
          </button>
        </div>
      </div>

      {confirmFinish && (
        <ConfirmDialog
          title="Finish workout?"
          message={`${remaining} set${remaining === 1 ? ' is' : 's are'} not logged yet. They will stay in the session as planned.`}
          confirmLabel="Finish"
          destructive={false}
          onConfirm={finish}
          onCancel={() => setConfirmFinish(false)}
        />
      )}

      <Toast toast={toast} onDismiss={dismissToast} />
    </div>
  );
}

export default WorkoutLogger;
