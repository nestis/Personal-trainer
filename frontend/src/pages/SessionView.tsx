import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AggregatedExercise, Exercise, Session, WOD } from '../types';
import { api } from '../services/api';
import { formatDayLabel, formatTime } from '../utils/format';
import Stepper from '../components/Stepper';
import WodEditor from '../components/WodEditor';
import AutoTextarea from '../components/AutoTextarea';
import Spinner from '../components/Spinner';
import Toast from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../hooks/useToast';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';
type Focus = { exId: string; idx: number } | null; // the set being edited, if any

const s: Record<string, React.CSSProperties> = {
  page: {
    paddingBottom: 'calc(var(--safe-bottom) + 48px)',
  },
  nav: {
    position: 'relative',
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
  },
  navTitle: {
    fontSize: 17,
    fontWeight: 600,
  },
  menu: {
    position: 'absolute' as const,
    right: 12,
    top: 'calc(var(--safe-top) + 46px)',
    zIndex: 120,
    minWidth: 240,
    background: 'var(--bg-tertiary)',
    borderRadius: 14,
    boxShadow: 'var(--shadow-elevated)',
    overflow: 'hidden',
  },
  menuItem: {
    display: 'block',
    width: '100%',
    minHeight: 48,
    padding: '0 16px',
    textAlign: 'left' as const,
    background: 'none',
    border: 'none',
    fontSize: 17,
    color: 'var(--text-primary)',
    cursor: 'pointer',
  },
  menuSep: {
    height: '0.5px',
    background: 'var(--separator)',
  },
  statusRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    fontSize: 13,
    color: 'var(--text-secondary)',
    fontVariantNumeric: 'tabular-nums',
    margin: '4px 0 0',
    minHeight: 24,
  },
  track: {
    height: 4,
    borderRadius: 2,
    background: 'var(--bg-tertiary)',
    margin: '8px 0 16px',
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
    marginBottom: 6,
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
  setLine: {
    display: 'flex',
    alignItems: 'center',
    minHeight: 48,
  },
  tick: {
    width: 44,
    height: 48,
    marginLeft: -10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'none',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    flexShrink: 0,
  },
  setBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    minHeight: 48,
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
    width: 26,
    height: 26,
    borderRadius: '50%',
    background: 'var(--green)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  todoDot: {
    width: 26,
    height: 26,
    boxSizing: 'border-box' as const,
    borderRadius: '50%',
    border: '1.5px solid var(--text-muted)',
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
  link: {
    background: 'none',
    border: 'none',
    color: 'var(--tint)',
    fontSize: 15,
    minHeight: 44,
    padding: 0,
    cursor: 'pointer',
  },
  sectionTitle: {
    fontSize: 13,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    padding: '8px 4px 8px',
  },
  notesCard: {
    background: 'var(--bg-grouped-secondary)',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
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

const Check = () => (
  <svg width="13" height="11" viewBox="0 0 12 10" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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

function wodHasContent(w: WOD): boolean {
  return Boolean(w.name || w.description || w.timeSeconds || w.totalReps || w.avgHeartRate || w.maxHeartRate);
}

function SessionView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [wod, setWod] = useState<WOD>({ description: '' });
  const [notes, setNotes] = useState('');
  const [addWod, setAddWod] = useState(false);
  const [history, setHistory] = useState<AggregatedExercise[]>([]);
  const [focus, setFocus] = useState<Focus>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirm, setConfirm] = useState<'delete' | 'finish' | null>(null);
  const [busy, setBusy] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [lastLoggedAt, setLastLoggedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const startedAt = useRef<number>(Date.now());
  const { toast, showToast, dismissToast } = useToast();

  // Autosave of the free-form parts (WOD and notes)
  const skipNext = useRef(true);
  const dirty = useRef(false);
  const latest = useRef({ wod, notes });
  latest.current = { wod, notes };

  const isPlanned = session?.status === 'planned';

  useEffect(() => {
    document.title = 'Session - Workout Tracker';
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (saveState !== 'saved') return;
    const t = setTimeout(() => setSaveState('idle'), 2000);
    return () => clearTimeout(t);
  }, [saveState]);

  const load = useCallback(() => {
    if (!id) return;
    startedAt.current = startTimeFor(id);
    setLoading(true);
    setError(null);
    api
      .getSession(id)
      .then((sess) => {
        skipNext.current = true;
        setSession(sess);
        setExercises(sess.strength);
        setWod(sess.wod);
        setNotes(sess.notes || '');
        setAddWod(false);
      })
      .catch((err) => setError(err.message || 'Failed to load session.'))
      .finally(() => setLoading(false));
    // "Last time" hints are best effort
    api.getAggregatedStrength().then(setHistory).catch(() => {});
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const save = useCallback(
    (patch: Partial<Session>) => {
      if (!id) return Promise.resolve();
      setSaveState('saving');
      return api
        .updateSession(id, patch)
        .then(() => setSaveState('saved'))
        .catch((err) => {
          console.error('Failed to save session:', err);
          setSaveState('error');
          showToast('Could not save. Your changes are kept on screen.', 'error');
        });
    },
    [id, showToast]
  );

  const flush = useCallback(() => {
    if (!dirty.current) return;
    dirty.current = false;
    save({ wod: latest.current.wod, notes: latest.current.notes });
  }, [save]);

  useEffect(() => {
    if (skipNext.current) {
      skipNext.current = false;
      return;
    }
    dirty.current = true;
    const t = setTimeout(flush, 800);
    return () => clearTimeout(t);
  }, [wod, notes, flush]);

  // Save pending text when leaving the screen
  useEffect(() => () => flush(), [flush]);

  const updateExercises = (next: Exercise[], persist: boolean) => {
    setExercises(next);
    if (persist) save({ strength: next });
  };

  const patchSet = (exId: string, idx: number, patch: Partial<Exercise['sets'][number]>, persist = false) => {
    updateExercises(
      exercises.map((ex) =>
        ex.id === exId ? { ...ex, sets: ex.sets.map((st, i) => (i === idx ? { ...st, ...patch } : st)) } : ex
      ),
      persist
    );
  };

  const toggleSet = (exId: string, idx: number) => {
    const ex = exercises.find((e) => e.id === exId);
    const done = !ex?.sets[idx]?.completed;
    patchSet(exId, idx, { completed: done }, true);
    if (done) setLastLoggedAt(Date.now());
    setFocus(null);
  };

  const addSet = (exId: string) => {
    const ex = exercises.find((e) => e.id === exId);
    if (!ex) return;
    const last = ex.sets[ex.sets.length - 1];
    updateExercises(
      exercises.map((e) =>
        e.id === exId
          ? { ...e, sets: [...e.sets, { setNumber: e.sets.length + 1, reps: last?.reps || 0, kilos: last?.kilos || 0, completed: false }] }
          : e
      ),
      true
    );
    setFocus({ exId, idx: ex.sets.length });
  };

  // A set only opens for editing when tapped; ticking it never opens it
  const active = useMemo(() => {
    if (!focus) return null;
    const ex = exercises.find((e) => e.id === focus.exId);
    return ex && ex.sets[focus.idx] ? focus : null;
  }, [focus, exercises]);

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

  const setStatus = async (status: Session['status']) => {
    if (!id || !session) return;
    setBusy(true);
    try {
      const updated = await api.updateSession(id, { status });
      setSession(updated);
      setFocus(null);
      showToast(status === 'completed' ? 'Marked as completed' : 'Marked as not completed');
    } catch {
      showToast('Failed to update session.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const finish = async () => {
    if (!id) return;
    setBusy(true);
    try {
      await api.updateSession(id, { status: 'completed', strength: exercises, wod, notes });
      dirty.current = false;
      try {
        sessionStorage.removeItem(`wt_start_${id}`);
      } catch {
        /* storage unavailable */
      }
      navigate('/');
    } catch {
      showToast('Failed to finish workout.', 'error');
      setBusy(false);
      setConfirm(null);
    }
  };

  const remove = async () => {
    if (!id) return;
    try {
      await api.deleteSession(id);
      navigate('/');
    } catch {
      showToast('Failed to delete session.', 'error');
      setConfirm(null);
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
  const showWod = wodHasContent(wod) || addWod;

  return (
    <div style={{ ...s.page, paddingBottom: isPlanned ? 'calc(var(--safe-bottom) + 110px)' : s.page.paddingBottom }} className="fade-in">
      <div style={s.nav}>
        <button style={s.navBtn} onClick={() => navigate('/')}>
          <svg width="10" height="16" viewBox="0 0 10 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="8 2 2 8 8 14" />
          </svg>
          Workouts
        </button>
        <span style={s.navTitle}>{formatDayLabel(session.date)}</span>
        <button
          style={{ ...s.navBtn, justifyContent: 'center' }}
          aria-label="Session options"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
        >
          <svg width="22" height="6" viewBox="0 0 22 6" fill="currentColor" aria-hidden="true">
            <circle cx="3" cy="3" r="2.5" />
            <circle cx="11" cy="3" r="2.5" />
            <circle cx="19" cy="3" r="2.5" />
          </svg>
        </button>
        {menuOpen && (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 110 }} onClick={() => setMenuOpen(false)} />
            <div style={s.menu} role="menu">
              <button
                role="menuitem"
                style={s.menuItem}
                onClick={() => {
                  setMenuOpen(false);
                  flush();
                  navigate(`/session/${session.id}/edit`);
                }}
              >
                Edit date &amp; exercises
              </button>
              <div style={s.menuSep} />
              <button
                role="menuitem"
                style={s.menuItem}
                disabled={busy}
                onClick={() => {
                  setMenuOpen(false);
                  setStatus(isPlanned ? 'completed' : 'planned');
                }}
              >
                {isPlanned ? 'Mark as completed' : 'Mark as not completed'}
              </button>
              <div style={s.menuSep} />
              <button
                role="menuitem"
                style={{ ...s.menuItem, color: 'var(--red)' }}
                onClick={() => {
                  setMenuOpen(false);
                  setConfirm('delete');
                }}
              >
                Delete session
              </button>
            </div>
          </>
        )}
      </div>

      <div style={s.statusRow}>
        <span>
          <span className={`badge badge-${session.status}`} style={{ marginRight: 8 }}>{session.status}</span>
          {totals.all > 0 && `${totals.done} of ${totals.all} sets`}
          {isPlanned && ` · ${formatTime(elapsed)}`}
        </span>
        <span aria-live="polite" style={{ color: saveState === 'error' ? 'var(--red)' : 'var(--text-secondary)' }}>
          {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved ✓' : saveState === 'error' ? 'Not saved' : ''}
        </span>
      </div>
      {totals.all > 0 ? (
        <div style={s.track} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Sets completed">
          <div style={{ width: `${pct}%`, height: '100%', background: 'var(--green)', transition: 'width 0.3s ease' }} />
        </div>
      ) : (
        <div style={{ height: 12 }} />
      )}

      {exercises.map((ex) => {
        const hint = lastTime(ex.name);
        return (
          <section key={ex.id} style={s.card} aria-label={ex.name || 'Exercise'}>
            <div style={s.cardHead}>
              <h2 style={s.exName}>{ex.name || 'Exercise'}</h2>
              {hint && <span style={s.hint}>{hint}</span>}
            </div>

            {ex.sets.map((st, i) => {
              const isActive = active?.exId === ex.id && active.idx === i;
              if (isActive) {
                return (
                  <div key={i} style={s.active}>
                    <div style={s.activeLabel}>Set {st.setNumber}{st.completed ? '' : ' · now'}</div>
                    <Stepper label="Reps" value={st.reps} onChange={(v) => patchSet(ex.id, i, { reps: v }, st.completed)} />
                    <Stepper label="Weight (kg)" value={st.kilos} step={2.5} decimal onChange={(v) => patchSet(ex.id, i, { kilos: v }, st.completed)} />
                    {st.completed ? (
                      <button type="button" className="btn btn-secondary btn-block" style={{ height: 44, marginTop: 8, padding: 0 }} onClick={() => setFocus(null)}>
                        Done
                      </button>
                    ) : (
                      <button type="button" className="btn btn-success btn-block" style={{ height: 44, marginTop: 8, padding: 0 }} onClick={() => toggleSet(ex.id, i)}>
                        Log set {st.setNumber}
                      </button>
                    )}
                  </div>
                );
              }
              return (
                <div key={i} style={s.setLine}>
                  <button
                    type="button"
                    style={s.tick}
                    aria-label={st.completed ? `Set ${st.setNumber} done. Tap to undo` : `Mark set ${st.setNumber} done`}
                    onClick={() => toggleSet(ex.id, i)}
                  >
                    {st.completed ? <span style={s.doneDot}><Check /></span> : <span style={s.todoDot} />}
                  </button>
                  <button type="button" style={s.setBtn} aria-label={`Edit set ${st.setNumber}`} onClick={() => setFocus({ exId: ex.id, idx: i })}>
                    <span style={s.setLabel}>Set {st.setNumber}</span>
                    <span style={{ fontVariantNumeric: 'tabular-nums', color: st.completed ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
                      {st.reps} × {st.kilos} kg
                    </span>
                  </button>
                </div>
              );
            })}

            <button type="button" style={s.link} onClick={() => addSet(ex.id)}>
              + Add set
            </button>
          </section>
        );
      })}

      {showWod ? (
        <section aria-label="WOD" style={{ marginBottom: 12 }}>
          <div style={s.sectionTitle}>WOD</div>
          <WodEditor wod={wod} onChange={setWod} />
        </section>
      ) : (
        <button type="button" style={s.link} onClick={() => setAddWod(true)}>
          + Add WOD or result
        </button>
      )}

      <section aria-label="Notes">
        <div style={s.sectionTitle}>Notes</div>
        <div style={s.notesCard}>
          <AutoTextarea
            label="Session notes"
            value={notes}
            onChange={setNotes}
            onBlur={flush}
            minRows={5}
            maxLength={2000}
            placeholder="How did it go? Add notes after the session…"
          />
        </div>
      </section>

      {isPlanned && (
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
              disabled={busy}
              onClick={() => (remaining > 0 ? setConfirm('finish') : finish())}
            >
              {busy ? 'Saving...' : 'Finish workout'}
            </button>
          </div>
        </div>
      )}

      {confirm === 'finish' && (
        <ConfirmDialog
          title="Finish workout?"
          message={`${remaining} set${remaining === 1 ? ' is' : 's are'} not logged yet. They will stay in the session as planned.`}
          confirmLabel="Finish"
          destructive={false}
          onConfirm={finish}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm === 'delete' && (
        <ConfirmDialog
          title="Delete session"
          message="This action cannot be undone. Are you sure you want to delete this session?"
          onConfirm={remove}
          onCancel={() => setConfirm(null)}
        />
      )}

      <Toast toast={toast} onDismiss={dismissToast} />
    </div>
  );
}

export default SessionView;
