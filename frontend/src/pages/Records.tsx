import { useEffect, useState } from 'react';
import { StrengthPR, WodRecord, ManualStrengthPR, ManualWodRecord, ManualRecord } from '../types';
import { api } from '../services/api';

const styles: Record<string, React.CSSProperties> = {
  page: {
    paddingTop: 16,
  },
  tabs: {
    display: 'flex',
    gap: 0,
    marginBottom: 20,
    borderRadius: 'var(--radius-sm)',
    overflow: 'hidden',
    border: '1px solid var(--border)',
  },
  tab: {
    flex: 1,
    padding: '12px 16px',
    border: 'none',
    background: 'var(--bg-card)',
    color: 'var(--text-secondary)',
    fontWeight: 600,
    fontSize: '0.95rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  tabActive: {
    flex: 1,
    padding: '12px 16px',
    border: 'none',
    background: 'var(--accent)',
    color: 'white',
    fontWeight: 600,
    fontSize: '0.95rem',
    cursor: 'pointer',
  },
  sectionHeader: {
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
    marginBottom: 12,
    marginTop: 24,
    paddingBottom: 8,
    borderBottom: '1px solid var(--border)',
  },
  exerciseGroup: {
    marginBottom: 20,
  },
  exerciseName: {
    fontSize: '1.1rem',
    fontWeight: 700,
    marginBottom: 8,
    color: 'var(--text-primary)',
  },
  estimated1rm: {
    fontSize: '0.85rem',
    color: 'var(--accent)',
    fontWeight: 600,
    marginBottom: 10,
  },
  prRow: {
    display: 'grid',
    gridTemplateColumns: '60px 1fr 80px',
    gap: 8,
    alignItems: 'center',
    padding: '10px 12px',
    borderBottom: '1px solid var(--border)',
  },
  prRowDeletable: {
    display: 'grid',
    gridTemplateColumns: '60px 1fr 80px 36px',
    gap: 8,
    alignItems: 'center',
    padding: '10px 12px',
    borderBottom: '1px solid var(--border)',
  },
  repsLabel: {
    fontSize: '0.9rem',
    color: 'var(--text-secondary)',
    fontWeight: 500,
  },
  kilosValue: {
    fontSize: '1.1rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  dateLabel: {
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
    textAlign: 'right' as const,
  },
  wodCard: {
    marginBottom: 16,
  },
  wodHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  wodName: {
    fontSize: '1.1rem',
    fontWeight: 700,
    marginBottom: 4,
  },
  wodBest: {
    fontSize: '1.3rem',
    fontWeight: 700,
    color: 'var(--accent)',
    marginBottom: 8,
  },
  wodMeta: {
    display: 'flex',
    gap: 16,
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    marginBottom: 10,
  },
  historyTitle: {
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
    marginBottom: 6,
  },
  historyRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '4px 0',
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    borderBottom: '1px solid var(--border)',
  },
  empty: {
    textAlign: 'center' as const,
    padding: '40px 20px',
    color: 'var(--text-secondary)',
  },
  formCard: {
    marginBottom: 16,
  },
  formTitle: {
    fontSize: '0.95rem',
    fontWeight: 600,
    marginBottom: 12,
    color: 'var(--text-primary)',
  },
  formRow: {
    display: 'flex',
    gap: 8,
    marginBottom: 8,
  },
  formField: {
    flex: 1,
  },
  deleteBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--accent)',
    cursor: 'pointer',
    fontSize: '1rem',
    padding: '4px 8px',
    borderRadius: 4,
    lineHeight: 1,
  },
  notes: {
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
    fontStyle: 'italic',
    marginTop: 4,
  },
  wodDescription: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    marginBottom: 8,
  },
};

function formatTime(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function parseTime(value: string): number {
  const parts = value.split(':');
  if (parts.length === 2) {
    return (parseInt(parts[0]) || 0) * 60 + (parseInt(parts[1]) || 0);
  }
  return parseInt(value) || 0;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function groupByExercise(prs: StrengthPR[]): Map<string, StrengthPR[]> {
  const map = new Map<string, StrengthPR[]>();
  for (const pr of prs) {
    const key = pr.exercise.toLowerCase();
    const existing = map.get(key) || [];
    existing.push(pr);
    map.set(key, existing);
  }
  return map;
}

function groupManualStrengthByExercise(records: ManualStrengthPR[]): Map<string, ManualStrengthPR[]> {
  const map = new Map<string, ManualStrengthPR[]>();
  for (const r of records) {
    const key = r.exercise.toLowerCase();
    const existing = map.get(key) || [];
    existing.push(r);
    map.set(key, existing);
  }
  return map;
}

function Records() {
  const [tab, setTab] = useState<'strength' | 'wods'>('strength');
  const [strengthPRs, setStrengthPRs] = useState<StrengthPR[]>([]);
  const [wodRecords, setWodRecords] = useState<WodRecord[]>([]);
  const [manualRecords, setManualRecords] = useState<ManualRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showStrengthForm, setShowStrengthForm] = useState(false);
  const [showWodForm, setShowWodForm] = useState(false);

  // Strength form state
  const [sExercise, setSExercise] = useState('');
  const [sReps, setSReps] = useState('');
  const [sKilos, setSKilos] = useState('');
  const [sDate, setSDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [sNotes, setSNotes] = useState('');
  const [sSaving, setSSaving] = useState(false);

  // WOD form state
  const [wName, setWName] = useState('');
  const [wDescription, setWDescription] = useState('');
  const [wTime, setWTime] = useState('');
  const [wAvgHR, setWAvgHR] = useState('');
  const [wMaxHR, setWMaxHR] = useState('');
  const [wDate, setWDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [wNotes, setWNotes] = useState('');
  const [wSaving, setWSaving] = useState(false);

  const loadData = () => {
    setLoading(true);
    Promise.all([api.getStrengthPRs(), api.getWodRecords(), api.listManualRecords()])
      .then(([prs, wods, manual]) => {
        setStrengthPRs(prs);
        setWodRecords(wods);
        setManualRecords(manual);
      })
      .catch((err) => console.error('Failed to load records:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const handleAddStrengthPR = async () => {
    if (!sExercise || !sReps || !sKilos) return;
    setSSaving(true);
    try {
      await api.createManualStrengthPR({
        exercise: sExercise,
        reps: parseInt(sReps),
        kilos: parseFloat(sKilos),
        date: sDate,
        notes: sNotes || undefined,
      });
      setSExercise('');
      setSReps('');
      setSKilos('');
      setSNotes('');
      setShowStrengthForm(false);
      loadData();
    } catch (err) {
      console.error('Failed to add strength PR:', err);
      alert('Failed to save. Check console.');
    } finally {
      setSSaving(false);
    }
  };

  const handleAddWodRecord = async () => {
    if (!wName || !wTime) return;
    setWSaving(true);
    try {
      await api.createManualWodRecord({
        name: wName,
        description: wDescription || undefined,
        timeSeconds: parseTime(wTime),
        avgHeartRate: wAvgHR ? parseInt(wAvgHR) : undefined,
        maxHeartRate: wMaxHR ? parseInt(wMaxHR) : undefined,
        date: wDate,
        notes: wNotes || undefined,
      });
      setWName('');
      setWDescription('');
      setWTime('');
      setWAvgHR('');
      setWMaxHR('');
      setWNotes('');
      setShowWodForm(false);
      loadData();
    } catch (err) {
      console.error('Failed to add WOD record:', err);
      alert('Failed to save. Check console.');
    } finally {
      setWSaving(false);
    }
  };

  const handleDeleteManual = async (id: string) => {
    if (!confirm('Delete this record?')) return;
    try {
      await api.deleteManualRecord(id);
      loadData();
    } catch (err) {
      console.error('Failed to delete record:', err);
    }
  };

  if (loading) {
    return <div style={styles.empty}>Loading records...</div>;
  }

  const grouped = groupByExercise(strengthPRs);
  const manualStrength = manualRecords.filter((r): r is ManualStrengthPR => r.type === 'strength');
  const manualWods = manualRecords.filter((r): r is ManualWodRecord => r.type === 'wod');
  const manualStrengthGrouped = groupManualStrengthByExercise(manualStrength);

  return (
    <div style={styles.page}>
      <div style={styles.tabs}>
        <button
          style={tab === 'strength' ? styles.tabActive : styles.tab}
          onClick={() => setTab('strength')}
        >
          Strength PRs
        </button>
        <button
          style={tab === 'wods' ? styles.tabActive : styles.tab}
          onClick={() => setTab('wods')}
        >
          WOD Records
        </button>
      </div>

      {/* ===== STRENGTH TAB ===== */}
      {tab === 'strength' && (
        <>
          {/* From sessions */}
          {strengthPRs.length > 0 && (
            <>
              <div style={styles.sectionHeader}>From Sessions</div>
              {Array.from(grouped.entries()).map(([key, prs]) => {
                const best1RM = Math.max(...prs.map((p) => p.estimated1RM));
                return (
                  <div key={key} className="card" style={styles.exerciseGroup}>
                    <div style={styles.exerciseName}>{prs[0].exercise}</div>
                    <div style={styles.estimated1rm}>Est. 1RM: {best1RM} kg</div>
                    {prs.map((pr, i) => (
                      <div key={i} style={styles.prRow}>
                        <span style={styles.repsLabel}>{pr.reps} rep{pr.reps !== 1 ? 's' : ''}</span>
                        <span style={styles.kilosValue}>{pr.kilos} kg</span>
                        <span style={styles.dateLabel}>{formatDate(pr.date)}</span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </>
          )}

          {/* Manual PRs */}
          <div style={styles.sectionHeader}>Manual PRs</div>

          {manualStrength.length > 0 && (
            Array.from(manualStrengthGrouped.entries()).map(([key, records]) => {
              const best1RM = Math.max(...records.map((r) => r.estimated1RM));
              return (
                <div key={key} className="card" style={styles.exerciseGroup}>
                  <div style={styles.exerciseName}>{records[0].exercise}</div>
                  <div style={styles.estimated1rm}>Est. 1RM: {best1RM} kg</div>
                  {records.map((r) => (
                    <div key={r.id} style={styles.prRowDeletable}>
                      <span style={styles.repsLabel}>{r.reps} rep{r.reps !== 1 ? 's' : ''}</span>
                      <span>
                        <span style={styles.kilosValue}>{r.kilos} kg</span>
                        {r.notes && <div style={styles.notes}>{r.notes}</div>}
                      </span>
                      <span style={styles.dateLabel}>{formatDate(r.date)}</span>
                      <button style={styles.deleteBtn} onClick={() => handleDeleteManual(r.id)} title="Delete">
                        x
                      </button>
                    </div>
                  ))}
                </div>
              );
            })
          )}

          {manualStrength.length === 0 && !showStrengthForm && (
            <div style={{ ...styles.empty, padding: '20px' }}>
              No manual PRs yet.
            </div>
          )}

          {/* Add Strength PR Form */}
          {showStrengthForm ? (
            <div className="card" style={styles.formCard}>
              <div style={styles.formTitle}>Add Strength PR</div>
              <div style={{ marginBottom: 8 }}>
                <label className="label">Exercise</label>
                <input
                  className="input"
                  placeholder="e.g., Bench Press, Squat..."
                  value={sExercise}
                  onChange={(e) => setSExercise(e.target.value)}
                />
              </div>
              <div style={styles.formRow}>
                <div style={styles.formField}>
                  <label className="label">Reps</label>
                  <input
                    className="input input-sm"
                    type="number"
                    inputMode="numeric"
                    placeholder="5"
                    value={sReps}
                    onChange={(e) => setSReps(e.target.value)}
                  />
                </div>
                <div style={styles.formField}>
                  <label className="label">Kg</label>
                  <input
                    className="input input-sm"
                    type="number"
                    inputMode="decimal"
                    placeholder="100"
                    value={sKilos}
                    onChange={(e) => setSKilos(e.target.value)}
                  />
                </div>
                <div style={styles.formField}>
                  <label className="label">Date</label>
                  <input
                    className="input input-sm"
                    type="date"
                    value={sDate}
                    onChange={(e) => setSDate(e.target.value)}
                  />
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label className="label">Notes (optional)</label>
                <input
                  className="input input-sm"
                  placeholder="Any context..."
                  value={sNotes}
                  onChange={(e) => setSNotes(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowStrengthForm(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleAddStrengthPR}
                  disabled={sSaving || !sExercise || !sReps || !sKilos}
                  style={{ flex: 1 }}
                >
                  {sSaving ? 'Saving...' : 'Save PR'}
                </button>
              </div>
            </div>
          ) : (
            <button
              className="btn btn-primary btn-block"
              onClick={() => setShowStrengthForm(true)}
              style={{ marginTop: 8 }}
            >
              + Add Strength PR
            </button>
          )}
        </>
      )}

      {/* ===== WODS TAB ===== */}
      {tab === 'wods' && (
        <>
          {/* From sessions */}
          {wodRecords.length > 0 && (
            <>
              <div style={styles.sectionHeader}>From Sessions</div>
              {wodRecords.map((record) => (
                <div key={record.name} className="card" style={styles.wodCard}>
                  <div style={styles.wodName}>{record.name}</div>
                  <div style={styles.wodBest}>{formatTime(record.bestTimeSeconds)}</div>
                  <div style={styles.wodMeta}>
                    <span>Best on {formatDate(record.date)}</span>
                    {record.avgHeartRate && <span>Avg HR: {record.avgHeartRate}</span>}
                    {record.maxHeartRate && <span>Max HR: {record.maxHeartRate}</span>}
                  </div>
                  {record.history.length > 1 && (
                    <>
                      <div style={styles.historyTitle}>History</div>
                      {record.history.map((entry, i) => (
                        <div key={i} style={styles.historyRow}>
                          <span>{formatDate(entry.date)}</span>
                          <span style={i === 0 ? { color: 'var(--accent)', fontWeight: 600 } : undefined}>
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

          {/* Manual WOD Records */}
          <div style={styles.sectionHeader}>Manual WOD Records</div>

          {manualWods.length > 0 && (
            manualWods.map((r) => (
              <div key={r.id} className="card" style={styles.wodCard}>
                <div style={styles.wodHeader}>
                  <div>
                    <div style={styles.wodName}>{r.name}</div>
                    <div style={styles.wodBest}>{formatTime(r.timeSeconds)}</div>
                  </div>
                  <button style={styles.deleteBtn} onClick={() => handleDeleteManual(r.id)} title="Delete">
                    x
                  </button>
                </div>
                {r.description && <div style={styles.wodDescription}>{r.description}</div>}
                <div style={styles.wodMeta}>
                  <span>{formatDate(r.date)}</span>
                  {r.avgHeartRate && <span>Avg HR: {r.avgHeartRate}</span>}
                  {r.maxHeartRate && <span>Max HR: {r.maxHeartRate}</span>}
                </div>
                {r.notes && <div style={styles.notes}>{r.notes}</div>}
              </div>
            ))
          )}

          {manualWods.length === 0 && !showWodForm && (
            <div style={{ ...styles.empty, padding: '20px' }}>
              No manual WOD records yet.
            </div>
          )}

          {/* Add WOD Record Form */}
          {showWodForm ? (
            <div className="card" style={styles.formCard}>
              <div style={styles.formTitle}>Add WOD Record</div>
              <div style={{ marginBottom: 8 }}>
                <label className="label">WOD Name</label>
                <input
                  className="input"
                  placeholder="e.g., Fran, Murph..."
                  value={wName}
                  onChange={(e) => setWName(e.target.value)}
                />
              </div>
              <div style={{ marginBottom: 8 }}>
                <label className="label">Description (optional)</label>
                <textarea
                  className="input"
                  placeholder="21-15-9 Thrusters & Pull-ups..."
                  value={wDescription}
                  onChange={(e) => setWDescription(e.target.value)}
                  rows={2}
                />
              </div>
              <div style={styles.formRow}>
                <div style={styles.formField}>
                  <label className="label">Time (m:ss)</label>
                  <input
                    className="input input-sm"
                    placeholder="3:30"
                    value={wTime}
                    onChange={(e) => setWTime(e.target.value)}
                  />
                </div>
                <div style={styles.formField}>
                  <label className="label">Date</label>
                  <input
                    className="input input-sm"
                    type="date"
                    value={wDate}
                    onChange={(e) => setWDate(e.target.value)}
                  />
                </div>
              </div>
              <div style={styles.formRow}>
                <div style={styles.formField}>
                  <label className="label">Avg HR (optional)</label>
                  <input
                    className="input input-sm"
                    type="number"
                    inputMode="numeric"
                    placeholder="bpm"
                    value={wAvgHR}
                    onChange={(e) => setWAvgHR(e.target.value)}
                  />
                </div>
                <div style={styles.formField}>
                  <label className="label">Max HR (optional)</label>
                  <input
                    className="input input-sm"
                    type="number"
                    inputMode="numeric"
                    placeholder="bpm"
                    value={wMaxHR}
                    onChange={(e) => setWMaxHR(e.target.value)}
                  />
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label className="label">Notes (optional)</label>
                <input
                  className="input input-sm"
                  placeholder="Any context..."
                  value={wNotes}
                  onChange={(e) => setWNotes(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowWodForm(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleAddWodRecord}
                  disabled={wSaving || !wName || !wTime}
                  style={{ flex: 1 }}
                >
                  {wSaving ? 'Saving...' : 'Save WOD Record'}
                </button>
              </div>
            </div>
          ) : (
            <button
              className="btn btn-primary btn-block"
              onClick={() => setShowWodForm(true)}
              style={{ marginTop: 8 }}
            >
              + Add WOD Record
            </button>
          )}
        </>
      )}
    </div>
  );
}

export default Records;
