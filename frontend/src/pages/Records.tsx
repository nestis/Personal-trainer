import { useEffect, useState } from 'react';
import { StrengthPR, WodRecord, ManualStrengthPR, ManualWodRecord, ManualRecord } from '../types';
import { api } from '../services/api';
import { formatTime, parseTime, formatDate } from '../utils/format';

const s: Record<string, React.CSSProperties> = {
  page: {
    paddingTop: 20,
    paddingBottom: 40,
  },
  /* Apple-style segmented control */
  segmented: {
    display: 'flex',
    gap: 0,
    background: 'var(--fill)',
    borderRadius: 'var(--radius-xs)',
    padding: 2,
    marginBottom: 24,
  },
  seg: {
    flex: 1,
    padding: '8px 16px',
    border: 'none',
    background: 'transparent',
    color: 'var(--text-secondary)',
    fontWeight: 500,
    fontSize: 13,
    cursor: 'pointer',
    borderRadius: 7,
    transition: 'all 0.2s ease',
  },
  segActive: {
    flex: 1,
    padding: '8px 16px',
    border: 'none',
    background: 'var(--bg-tertiary)',
    color: 'var(--text-primary)',
    fontWeight: 600,
    fontSize: 13,
    cursor: 'pointer',
    borderRadius: 7,
    boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: 400,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 28,
    paddingLeft: 4,
  },
  firstSectionLabel: {
    fontSize: 13,
    fontWeight: 400,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 8,
    paddingLeft: 4,
  },
  /* Grouped card */
  group: {
    marginBottom: 12,
    overflow: 'hidden',
  },
  exerciseName: {
    fontSize: 17,
    fontWeight: 600,
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  est1rm: {
    fontSize: 13,
    color: 'var(--tint)',
    fontWeight: 500,
    marginBottom: 12,
  },
  prRow: {
    display: 'grid',
    gridTemplateColumns: '52px 1fr 80px',
    gap: 8,
    alignItems: 'center',
    padding: '10px 0',
  },
  prRowDel: {
    display: 'grid',
    gridTemplateColumns: '52px 1fr 72px 28px',
    gap: 8,
    alignItems: 'center',
    padding: '10px 0',
  },
  reps: {
    fontSize: 15,
    color: 'var(--text-secondary)',
    fontWeight: 500,
  },
  kg: {
    fontSize: 17,
    fontWeight: 600,
    fontVariantNumeric: 'tabular-nums',
  },
  dateSmall: {
    fontSize: 13,
    color: 'var(--text-tertiary)',
    textAlign: 'right' as const,
    fontVariantNumeric: 'tabular-nums',
  },
  separator: {
    height: '0.5px',
    background: 'var(--separator)',
    marginLeft: 52,
  },
  /* WOD cards */
  wodCard: {
    marginBottom: 12,
  },
  wodName: {
    fontSize: 17,
    fontWeight: 600,
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  wodTime: {
    fontSize: 28,
    fontWeight: 700,
    color: 'var(--tint)',
    letterSpacing: -0.5,
    fontVariantNumeric: 'tabular-nums',
    marginBottom: 6,
  },
  wodMeta: {
    display: 'flex',
    gap: 16,
    fontSize: 13,
    color: 'var(--text-secondary)',
    marginBottom: 12,
  },
  histLabel: {
    fontSize: 12,
    fontWeight: 400,
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  histRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '6px 0',
    fontSize: 14,
    color: 'var(--text-secondary)',
    borderBottom: '0.5px solid var(--separator)',
  },
  wodHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  wodDesc: {
    fontSize: 14,
    color: 'var(--text-secondary)',
    marginBottom: 8,
    lineHeight: 1.4,
  },
  /* Forms */
  formCard: {
    marginBottom: 12,
  },
  formTitle: {
    fontSize: 17,
    fontWeight: 600,
    marginBottom: 16,
    letterSpacing: -0.2,
  },
  formRow: {
    display: 'flex',
    gap: 10,
    marginBottom: 10,
  },
  formField: {
    flex: 1,
  },
  formActions: {
    display: 'flex',
    gap: 8,
    marginTop: 16,
  },
  /* Delete button */
  delBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--red)',
    cursor: 'pointer',
    fontSize: 17,
    padding: 0,
    lineHeight: 1,
    opacity: 0.7,
    transition: 'opacity 0.15s',
  },
  addBtn: {
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
  },
  empty: {
    textAlign: 'center' as const,
    padding: '24px 20px',
    color: 'var(--text-tertiary)',
    fontSize: 15,
  },
  note: {
    fontSize: 13,
    color: 'var(--text-tertiary)',
    fontStyle: 'italic',
    marginTop: 2,
  },
  loading: {
    textAlign: 'center' as const,
    padding: '60px 20px',
    color: 'var(--text-secondary)',
    fontSize: 15,
  },
};

function groupByExercise<T extends { exercise: string }>(items: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = item.exercise.toLowerCase();
    const existing = map.get(key) || [];
    existing.push(item);
    map.set(key, existing);
  }
  return map;
}

interface StrengthFormState {
  exercise: string;
  reps: string;
  kilos: string;
  date: string;
  notes: string;
}

interface WodFormState {
  name: string;
  desc: string;
  time: string;
  reps: string;
  date: string;
  avgHR: string;
  maxHR: string;
  notes: string;
}

function Records() {
  const today = new Date().toISOString().split('T')[0];

  const [tab, setTab] = useState<'strength' | 'wods'>('strength');
  const [strengthPRs, setStrengthPRs] = useState<StrengthPR[]>([]);
  const [wodRecords, setWodRecords] = useState<WodRecord[]>([]);
  const [manualRecords, setManualRecords] = useState<ManualRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showStrengthForm, setShowStrengthForm] = useState(false);
  const [showWodForm, setShowWodForm] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [strengthForm, setStrengthForm] = useState<StrengthFormState>({ exercise: '', reps: '', kilos: '', date: today, notes: '' });
  const [wodForm, setWodForm] = useState<WodFormState>({ name: '', desc: '', time: '', reps: '', date: today, avgHR: '', maxHR: '', notes: '' });
  const [sSaving, setSSaving] = useState(false);
  const [wSaving, setWSaving] = useState(false);

  useEffect(() => {
    document.title = 'Records - Workout Tracker';
  }, []);

  const loadData = () => {
    setLoading(true);
    setError(null);
    Promise.all([api.getStrengthPRs(), api.getWodRecords(), api.listManualRecords()])
      .then(([prs, wods, manual]) => {
        setStrengthPRs(prs);
        setWodRecords(wods);
        setManualRecords(manual);
      })
      .catch((err) => {
        console.error('Failed to load records:', err);
        setError(err.message || 'Failed to load records.');
      })
      .finally(() => setLoading(false));
  };

  const reloadManualRecords = () => {
    api.listManualRecords()
      .then(setManualRecords)
      .catch((err) => console.error('Failed to reload manual records:', err));
  };

  useEffect(() => { loadData(); }, []);

  const handleAddStrengthPR = async () => {
    if (!strengthForm.exercise || !strengthForm.reps || !strengthForm.kilos) return;
    setSSaving(true);
    try {
      await api.createManualStrengthPR({
        exercise: strengthForm.exercise, reps: parseInt(strengthForm.reps), kilos: parseFloat(strengthForm.kilos),
        date: strengthForm.date, notes: strengthForm.notes || undefined,
      });
      setStrengthForm({ exercise: '', reps: '', kilos: '', date: today, notes: '' });
      setShowStrengthForm(false);
      reloadManualRecords();
    } catch (err) {
      console.error('Failed to add strength PR:', err);
    } finally { setSSaving(false); }
  };

  const handleAddWodRecord = async () => {
    if (!wodForm.name || !wodForm.time) return;
    setWSaving(true);
    try {
      await api.createManualWodRecord({
        name: wodForm.name, description: wodForm.desc || undefined,
        timeSeconds: parseTime(wodForm.time),
        totalReps: wodForm.reps ? parseInt(wodForm.reps) : undefined,
        avgHeartRate: wodForm.avgHR ? parseInt(wodForm.avgHR) : undefined,
        maxHeartRate: wodForm.maxHR ? parseInt(wodForm.maxHR) : undefined,
        date: wodForm.date, notes: wodForm.notes || undefined,
      });
      setWodForm({ name: '', desc: '', time: '', reps: '', date: today, avgHR: '', maxHR: '', notes: '' });
      setShowWodForm(false);
      reloadManualRecords();
    } catch (err) {
      console.error('Failed to add WOD record:', err);
    } finally { setWSaving(false); }
  };

  const handleDeleteManual = async (id: string) => {
    try { await api.deleteManualRecord(id); setConfirmDeleteId(null); reloadManualRecords(); }
    catch (err) { console.error('Failed to delete record:', err); }
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
        <button className="btn btn-primary" onClick={loadData} style={{ marginTop: 16 }}>
          Retry
        </button>
      </div>
    );
  }

  const grouped = groupByExercise(strengthPRs);
  const manualStrength = manualRecords.filter((r): r is ManualStrengthPR => r.type === 'strength');
  const manualWods = manualRecords.filter((r): r is ManualWodRecord => r.type === 'wod');
  const manualStrengthGrouped = groupByExercise(manualStrength);

  return (
    <div style={s.page} className="fade-in">
      {/* Segmented control */}
      <div style={s.segmented}>
        <button
          style={tab === 'strength' ? s.segActive : s.seg}
          onClick={() => setTab('strength')}
        >
          Strength PRs
        </button>
        <button
          style={tab === 'wods' ? s.segActive : s.seg}
          onClick={() => setTab('wods')}
        >
          WOD Records
        </button>
      </div>

      {/* STRENGTH */}
      {tab === 'strength' && (
        <>
          {strengthPRs.length > 0 && (
            <>
              <div style={s.firstSectionLabel}>From Sessions</div>
              {Array.from(grouped.entries()).map(([key, prs]) => {
                const best1RM = Math.max(...prs.map((p) => p.estimated1RM));
                return (
                  <div key={key} className="card" style={s.group}>
                    <div style={s.exerciseName}>{prs[0].exercise}</div>
                    <div style={s.est1rm}>Est. 1RM: {best1RM} kg</div>
                    {prs.map((pr, i) => (
                      <div key={i}>
                        {i > 0 && <div style={{ height: '0.5px', background: 'var(--separator)' }} />}
                        <div style={s.prRow}>
                          <span style={s.reps}>{pr.reps} rep{pr.reps !== 1 ? 's' : ''}</span>
                          <span style={s.kg}>{pr.kilos} kg</span>
                          <span style={s.dateSmall}>{formatDate(pr.date)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </>
          )}

          <div style={strengthPRs.length > 0 ? s.sectionLabel : s.firstSectionLabel}>Manual PRs</div>

          {manualStrength.length > 0 ? (
            Array.from(manualStrengthGrouped.entries()).map(([key, records]) => {
              const best1RM = Math.max(...records.map((r) => r.estimated1RM));
              return (
                <div key={key} className="card" style={s.group}>
                  <div style={s.exerciseName}>{records[0].exercise}</div>
                  <div style={s.est1rm}>Est. 1RM: {best1RM} kg</div>
                  {records.map((r, i) => (
                    <div key={r.id}>
                      {i > 0 && <div style={{ height: '0.5px', background: 'var(--separator)' }} />}
                      <div style={s.prRowDel}>
                        <span style={s.reps}>{r.reps} rep{r.reps !== 1 ? 's' : ''}</span>
                        <span>
                          <span style={s.kg}>{r.kilos} kg</span>
                          {r.notes && <div style={s.note}>{r.notes}</div>}
                        </span>
                        <span style={s.dateSmall}>{formatDate(r.date)}</span>
                        {confirmDeleteId === r.id ? (
                          <span style={{ display: 'flex', gap: 4 }}>
                            <button style={s.delBtn} onClick={() => handleDeleteManual(r.id)} aria-label="Delete record">Yes</button>
                            <button style={{ ...s.delBtn, color: 'var(--text-secondary)' }} onClick={() => setConfirmDeleteId(null)}>No</button>
                          </span>
                        ) : (
                          <button style={s.delBtn} onClick={() => setConfirmDeleteId(r.id)} aria-label="Delete record">-</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })
          ) : !showStrengthForm ? (
            <div style={s.empty}>No manual PRs yet</div>
          ) : null}

          {showStrengthForm ? (
            <div className="card" style={s.formCard}>
              <div style={s.formTitle}>New Strength PR</div>
              <div style={{ marginBottom: 10 }}>
                <label className="label">Exercise</label>
                <input className="input" placeholder="e.g., Bench Press" value={strengthForm.exercise} onChange={(e) => setStrengthForm({ ...strengthForm, exercise: e.target.value })} />
              </div>
              <div style={s.formRow}>
                <div style={s.formField}>
                  <label className="label">Reps</label>
                  <input className="input input-sm" type="number" inputMode="numeric" placeholder="5" value={strengthForm.reps} onChange={(e) => setStrengthForm({ ...strengthForm, reps: e.target.value })} />
                </div>
                <div style={s.formField}>
                  <label className="label">Kg</label>
                  <input className="input input-sm" type="number" inputMode="decimal" placeholder="100" value={strengthForm.kilos} onChange={(e) => setStrengthForm({ ...strengthForm, kilos: e.target.value })} />
                </div>
                <div style={s.formField}>
                  <label className="label">Date</label>
                  <input className="input input-sm" type="date" value={strengthForm.date} onChange={(e) => setStrengthForm({ ...strengthForm, date: e.target.value })} />
                </div>
              </div>
              <div style={{ marginBottom: 4 }}>
                <label className="label">Notes</label>
                <input className="input input-sm" placeholder="Optional" value={strengthForm.notes} onChange={(e) => setStrengthForm({ ...strengthForm, notes: e.target.value })} />
              </div>
              <div style={s.formActions}>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowStrengthForm(false)} style={{ flex: 1 }}>Cancel</button>
                <button className="btn btn-primary btn-sm" onClick={handleAddStrengthPR} disabled={sSaving || !strengthForm.exercise || !strengthForm.reps || !strengthForm.kilos} style={{ flex: 2 }}>
                  {sSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          ) : (
            <button style={s.addBtn} onClick={() => setShowStrengthForm(true)}>+ Add Strength PR</button>
          )}
        </>
      )}

      {/* WODs */}
      {tab === 'wods' && (
        <>
          {wodRecords.length > 0 && (
            <>
              <div style={s.firstSectionLabel}>From Sessions</div>
              {wodRecords.map((record) => (
                <div key={record.name} className="card" style={s.wodCard}>
                  <div style={s.wodName}>{record.name}</div>
                  <div style={s.wodTime}>{formatTime(record.bestTimeSeconds)}</div>
                  <div style={s.wodMeta}>
                    <span>{formatDate(record.date)}</span>
                    {record.avgHeartRate && <span>Avg {record.avgHeartRate} bpm</span>}
                    {record.maxHeartRate && <span>Max {record.maxHeartRate} bpm</span>}
                  </div>
                  {record.history.length > 1 && (
                    <>
                      <div style={s.histLabel}>History</div>
                      {record.history.map((entry) => (
                        <div key={`${entry.date}-${entry.sessionId}`} style={s.histRow}>
                          <span>{formatDate(entry.date)}</span>
                          <span>
                            {formatTime(entry.timeSeconds)}
                          </span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              ))}
            </>
          )}

          <div style={wodRecords.length > 0 ? s.sectionLabel : s.firstSectionLabel}>Manual Records</div>

          {manualWods.length > 0 ? (
            manualWods.map((r) => (
              <div key={r.id} className="card" style={s.wodCard}>
                <div style={s.wodHeader}>
                  <div>
                    <div style={s.wodName}>{r.name}</div>
                    <div style={s.wodTime}>{formatTime(r.timeSeconds)}</div>
                  </div>
                  {confirmDeleteId === r.id ? (
                    <span style={{ display: 'flex', gap: 8 }}>
                      <button style={s.delBtn} onClick={() => handleDeleteManual(r.id)} aria-label="Delete record">Delete</button>
                      <button style={{ ...s.delBtn, color: 'var(--text-secondary)' }} onClick={() => setConfirmDeleteId(null)}>Cancel</button>
                    </span>
                  ) : (
                    <button style={s.delBtn} onClick={() => setConfirmDeleteId(r.id)} aria-label="Delete record">-</button>
                  )}
                </div>
                {r.description && <div style={s.wodDesc}>{r.description}</div>}
                <div style={s.wodMeta}>
                  <span>{formatDate(r.date)}</span>
                  {r.totalReps && <span>{r.totalReps} reps</span>}
                  {r.avgHeartRate && <span>Avg {r.avgHeartRate} bpm</span>}
                  {r.maxHeartRate && <span>Max {r.maxHeartRate} bpm</span>}
                </div>
                {r.notes && <div style={s.note}>{r.notes}</div>}
              </div>
            ))
          ) : !showWodForm ? (
            <div style={s.empty}>No manual WOD records yet</div>
          ) : null}

          {showWodForm ? (
            <div className="card" style={s.formCard}>
              <div style={s.formTitle}>New WOD Record</div>
              <div style={{ marginBottom: 10 }}>
                <label className="label">WOD Name</label>
                <input className="input" placeholder="e.g., Fran" value={wodForm.name} onChange={(e) => setWodForm({ ...wodForm, name: e.target.value })} />
              </div>
              <div style={{ marginBottom: 10 }}>
                <label className="label">Description</label>
                <textarea className="input" placeholder="21-15-9 Thrusters & Pull-ups..." value={wodForm.desc} onChange={(e) => setWodForm({ ...wodForm, desc: e.target.value })} rows={2} />
              </div>
              <div style={s.formRow}>
                <div style={s.formField}>
                  <label className="label">Time (m:ss)</label>
                  <input className="input input-sm" placeholder="3:30" value={wodForm.time} onChange={(e) => setWodForm({ ...wodForm, time: e.target.value })} />
                </div>
                <div style={s.formField}>
                  <label className="label">Reps</label>
                  <input className="input input-sm" type="number" inputMode="numeric" placeholder="0" value={wodForm.reps} onChange={(e) => setWodForm({ ...wodForm, reps: e.target.value })} />
                </div>
                <div style={s.formField}>
                  <label className="label">Date</label>
                  <input className="input input-sm" type="date" value={wodForm.date} onChange={(e) => setWodForm({ ...wodForm, date: e.target.value })} />
                </div>
              </div>
              <div style={s.formRow}>
                <div style={s.formField}>
                  <label className="label">Avg HR</label>
                  <input className="input input-sm" type="number" inputMode="numeric" placeholder="bpm" value={wodForm.avgHR} onChange={(e) => setWodForm({ ...wodForm, avgHR: e.target.value })} />
                </div>
                <div style={s.formField}>
                  <label className="label">Max HR</label>
                  <input className="input input-sm" type="number" inputMode="numeric" placeholder="bpm" value={wodForm.maxHR} onChange={(e) => setWodForm({ ...wodForm, maxHR: e.target.value })} />
                </div>
              </div>
              <div style={{ marginBottom: 4 }}>
                <label className="label">Notes</label>
                <input className="input input-sm" placeholder="Optional" value={wodForm.notes} onChange={(e) => setWodForm({ ...wodForm, notes: e.target.value })} />
              </div>
              <div style={s.formActions}>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowWodForm(false)} style={{ flex: 1 }}>Cancel</button>
                <button className="btn btn-primary btn-sm" onClick={handleAddWodRecord} disabled={wSaving || !wodForm.name || !wodForm.time} style={{ flex: 2 }}>
                  {wSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          ) : (
            <button style={s.addBtn} onClick={() => setShowWodForm(true)}>+ Add WOD Record</button>
          )}
        </>
      )}
    </div>
  );
}

export default Records;
