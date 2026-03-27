import { useEffect, useState, useCallback } from 'react';
import { AggregatedExercise, WodRecord, ManualWodRecord, ManualRecord } from '../types';
import { api } from '../services/api';
import { formatTime, parseTime, formatDate } from '../utils/format';
import Spinner from '../components/Spinner';
import Toast from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../hooks/useToast';

const s: Record<string, React.CSSProperties> = {
  page: {
    paddingTop: 8,
    paddingBottom: 80,
  },
  title: {
    fontSize: 34,
    fontWeight: 700,
    letterSpacing: -0.7,
    marginBottom: 20,
    lineHeight: 1.1,
  },
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
    minHeight: 36,
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
    transition: 'all 0.2s ease',
    minHeight: 36,
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
  // Exercise cards
  exerciseCard: {
    marginBottom: 10,
    cursor: 'pointer',
    transition: 'transform 0.1s ease',
    WebkitTapHighlightColor: 'transparent',
  },
  cardRow: {
    display: 'flex',
    alignItems: 'center',
  },
  cardContent: {
    flex: 1,
    minWidth: 0,
  },
  exerciseName: {
    fontSize: 17,
    fontWeight: 600,
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  est1rm: {
    fontSize: 14,
    color: 'var(--tint)',
    fontWeight: 600,
    marginBottom: 4,
  },
  bestSet: {
    fontSize: 14,
    color: 'var(--text-secondary)',
  },
  chevron: {
    color: 'var(--text-tertiary)',
    flexShrink: 0,
    marginLeft: 8,
  },
  // Detail view
  backBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--tint)',
    fontSize: 17,
    fontWeight: 400,
    cursor: 'pointer',
    padding: '4px 0',
    marginBottom: 12,
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    minHeight: 44,
  },
  detailTitle: {
    fontSize: 28,
    fontWeight: 700,
    letterSpacing: -0.6,
    marginBottom: 16,
  },
  highlightCard: {
    background: 'linear-gradient(135deg, rgba(10,132,255,0.15) 0%, rgba(94,92,230,0.1) 100%)',
    borderRadius: 'var(--radius)',
    padding: 20,
    marginBottom: 20,
    textAlign: 'center' as const,
    boxShadow: '0 0 20px rgba(10,132,255,0.08)',
  },
  highlightLabel: {
    fontSize: 13,
    fontWeight: 400,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  highlightValue: {
    fontSize: 40,
    fontWeight: 700,
    color: 'var(--tint)',
    letterSpacing: -1,
    fontVariantNumeric: 'tabular-nums',
  },
  highlightUnit: {
    fontSize: 15,
    fontWeight: 500,
    color: 'var(--text-secondary)',
    marginTop: 2,
  },
  highlightSub: {
    fontSize: 14,
    color: 'var(--text-secondary)',
    marginTop: 8,
  },
  chartCard: {
    background: 'var(--bg-grouped-secondary)',
    borderRadius: 'var(--radius)',
    padding: 20,
    boxShadow: 'var(--shadow-card)',
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: 600,
    marginBottom: 16,
    letterSpacing: -0.2,
    color: 'var(--text-secondary)',
  },
  svgContainer: { width: '100%', overflow: 'visible' },
  historyRow: {
    display: 'grid',
    gridTemplateColumns: '60px 1fr 70px 64px',
    gap: 8,
    alignItems: 'center',
    padding: '12px 0',
    borderBottom: '0.5px solid var(--separator)',
  },
  historyReps: {
    fontSize: 14,
    fontWeight: 500,
    color: 'var(--text-secondary)',
  },
  historyKg: {
    fontSize: 16,
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  history1rm: {
    fontSize: 13,
    color: 'var(--tint)',
    fontWeight: 500,
    textAlign: 'right' as const,
    fontVariantNumeric: 'tabular-nums',
  },
  historyDate: {
    fontSize: 13,
    color: 'var(--text-tertiary)',
    textAlign: 'right' as const,
    fontVariantNumeric: 'tabular-nums',
  },
  // WOD styles
  wodCard: {
    marginBottom: 12,
  },
  manualWodCard: {
    marginBottom: 12,
    borderLeft: '3px solid var(--indigo)',
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
  delBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--red)',
    cursor: 'pointer',
    fontSize: 17,
    padding: 4,
    lineHeight: 1,
    opacity: 0.7,
    transition: 'opacity 0.15s',
    minWidth: 44,
    minHeight: 44,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
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
    minHeight: 48,
  },
  empty: {
    textAlign: 'center' as const,
    padding: '32px 20px',
    color: 'var(--text-tertiary)',
    fontSize: 15,
  },
  note: {
    fontSize: 13,
    color: 'var(--text-tertiary)',
    fontStyle: 'italic',
    marginTop: 2,
  },
};

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

function ExerciseChart({ exercise }: { exercise: AggregatedExercise }) {
  const { history } = exercise;
  if (history.length < 2) return null;

  const allVals = history.map(h => h.estimated1RM);
  const minVal = Math.max(0, Math.min(...allVals) - 5);
  const maxVal = Math.max(...allVals) + 5;
  const range = maxVal - minVal || 1;

  const W = 500;
  const H = 200;
  const PAD_L = 40;
  const PAD_R = 10;
  const PAD_T = 10;
  const PAD_B = 30;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;

  const xStep = history.length > 1 ? chartW / (history.length - 1) : chartW / 2;

  function toX(i: number): number {
    return PAD_L + (history.length > 1 ? i * xStep : chartW / 2);
  }
  function toY(v: number): number {
    return PAD_T + chartH - ((v - minVal) / range) * chartH;
  }

  const path = history
    .map((h, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(h.estimated1RM).toFixed(1)}`)
    .join(' ');

  const areaPath = `${path} L${toX(history.length - 1)},${toY(minVal)} L${toX(0)},${toY(minVal)} Z`;

  const tickCount = 5;
  const ticks = Array.from({ length: tickCount }, (_, i) => minVal + (range * i) / (tickCount - 1));

  return (
    <div style={s.chartCard}>
      <div style={s.chartTitle}>Estimated 1RM Over Time</div>
      <svg viewBox={`0 0 ${W} ${H}`} style={s.svgContainer}>
        {ticks.map((v, i) => (
          <g key={i}>
            <line x1={PAD_L} x2={W - PAD_R} y1={toY(v)} y2={toY(v)} stroke="rgba(120,120,128,0.15)" strokeWidth="0.5" />
            <text x={PAD_L - 4} y={toY(v) + 4} textAnchor="end" fill="rgba(235,235,245,0.4)" fontSize="10">{Math.round(v)}</text>
          </g>
        ))}
        {history.map((h, i) => {
          if (history.length > 10 && i % Math.ceil(history.length / 8) !== 0 && i !== history.length - 1) return null;
          const d = new Date(h.date + 'T00:00:00');
          const label = `${d.getDate()}/${d.getMonth() + 1}`;
          return <text key={i} x={toX(i)} y={H - 4} textAnchor="middle" fill="rgba(235,235,245,0.4)" fontSize="10">{label}</text>;
        })}
        <path d={areaPath} fill="rgba(10,132,255,0.08)" />
        <path d={path} fill="none" stroke="var(--tint)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {history.map((h, i) => (
          <circle key={i} cx={toX(i)} cy={toY(h.estimated1RM)} r="3.5" fill="var(--tint)" />
        ))}
      </svg>
    </div>
  );
}

function Records() {
  const today = new Date().toISOString().split('T')[0];

  const [tab, setTab] = useState<'strength' | 'wods'>('strength');
  const [aggregated, setAggregated] = useState<AggregatedExercise[]>([]);
  const [wodRecords, setWodRecords] = useState<WodRecord[]>([]);
  const [manualRecords, setManualRecords] = useState<ManualRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showStrengthForm, setShowStrengthForm] = useState(false);
  const [showWodForm, setShowWodForm] = useState(false);
  const [editingWodId, setEditingWodId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteName, setConfirmDeleteName] = useState('');
  const [selectedExercise, setSelectedExercise] = useState<AggregatedExercise | null>(null);

  const [strengthForm, setStrengthForm] = useState<StrengthFormState>({ exercise: '', reps: '', kilos: '', date: today, notes: '' });
  const [wodForm, setWodForm] = useState<WodFormState>({ name: '', desc: '', time: '', reps: '', date: today, avgHR: '', maxHR: '', notes: '' });
  const [sSaving, setSSaving] = useState(false);
  const [wSaving, setWSaving] = useState(false);
  const { toast, showToast, dismissToast } = useToast();

  useEffect(() => {
    document.title = 'Records - Workout Tracker';
  }, []);

  const loadData = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([api.getAggregatedStrength(), api.getWodRecords(), api.listManualRecords()])
      .then(([agg, wods, manual]) => {
        setAggregated(agg);
        setWodRecords(wods);
        setManualRecords(manual);
      })
      .catch((err) => {
        console.error('Failed to load records:', err);
        setError(err.message || 'Failed to load records.');
      })
      .finally(() => setLoading(false));
  }, []);

  const reloadData = () => {
    Promise.all([api.getAggregatedStrength(), api.listManualRecords()])
      .then(([agg, manual]) => {
        setAggregated(agg);
        setManualRecords(manual);
        if (selectedExercise) {
          const updated = agg.find(e => e.exercise.toLowerCase() === selectedExercise.exercise.toLowerCase());
          setSelectedExercise(updated || null);
        }
      })
      .catch((err) => console.error('Failed to reload records:', err));
  };

  useEffect(() => { loadData(); }, [loadData]);

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
      showToast('Strength PR added!');
      reloadData();
    } catch (err) {
      console.error('Failed to add strength PR:', err);
      showToast('Failed to add strength PR.', 'error');
    } finally { setSSaving(false); }
  };

  const handleAddWodRecord = async () => {
    if (!wodForm.name || (!wodForm.time && !wodForm.reps)) return;
    setWSaving(true);
    try {
      const data = {
        name: wodForm.name, description: wodForm.desc || undefined,
        timeSeconds: wodForm.time ? parseTime(wodForm.time) : undefined,
        totalReps: wodForm.reps ? parseInt(wodForm.reps) : undefined,
        avgHeartRate: wodForm.avgHR ? parseInt(wodForm.avgHR) : undefined,
        maxHeartRate: wodForm.maxHR ? parseInt(wodForm.maxHR) : undefined,
        date: wodForm.date, notes: wodForm.notes || undefined,
      };

      if (editingWodId) {
        await api.updateManualWodRecord(editingWodId, data);
        setEditingWodId(null);
        showToast('WOD record updated!');
      } else {
        await api.createManualWodRecord(data);
        showToast('WOD record added!');
      }
      setWodForm({ name: '', desc: '', time: '', reps: '', date: today, avgHR: '', maxHR: '', notes: '' });
      setShowWodForm(false);
      api.listManualRecords().then(setManualRecords).catch(() => {});
    } catch (err) {
      console.error('Failed to save WOD record:', err);
      showToast('Failed to save WOD record.', 'error');
    } finally { setWSaving(false); }
  };

  const startEditWod = (r: ManualWodRecord) => {
    setWodForm({
      name: r.name, desc: r.description || '',
      time: r.timeSeconds ? formatTime(r.timeSeconds) : '',
      reps: r.totalReps ? String(r.totalReps) : '',
      date: r.date,
      avgHR: r.avgHeartRate ? String(r.avgHeartRate) : '',
      maxHR: r.maxHeartRate ? String(r.maxHeartRate) : '',
      notes: r.notes || '',
    });
    setEditingWodId(r.id);
    setShowWodForm(true);
  };

  const handleDeleteManual = async (id: string) => {
    try {
      await api.deleteManualRecord(id);
      setConfirmDeleteId(null);
      showToast('Record deleted.');
      reloadData();
    } catch (err) {
      console.error('Failed to delete record:', err);
      showToast('Failed to delete record.', 'error');
      setConfirmDeleteId(null);
    }
  };

  const askDeleteManual = (id: string, name: string) => {
    setConfirmDeleteId(id);
    setConfirmDeleteName(name);
  };

  if (loading) return <Spinner />;

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px' }} className="fade-in">
        <div className="card" style={{ background: 'rgba(255,69,58,0.12)', color: 'var(--red)' }}>{error}</div>
        <button className="btn btn-primary" onClick={loadData} style={{ marginTop: 16 }}>Retry</button>
      </div>
    );
  }

  const manualWods = manualRecords.filter((r): r is ManualWodRecord => r.type === 'wod');

  // Exercise detail view
  if (selectedExercise) {
    const reversedHistory = [...selectedExercise.history].reverse();
    return (
      <div style={s.page} className="fade-in">
        <button style={s.backBtn} onClick={() => setSelectedExercise(null)}>
          <svg width="10" height="16" viewBox="0 0 10 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="8 2 2 8 8 14" />
          </svg>
          Records
        </button>

        <div style={s.detailTitle}>{selectedExercise.exercise}</div>

        <div style={s.highlightCard}>
          <div style={s.highlightLabel}>Estimated 1RM</div>
          <div style={s.highlightValue}>{selectedExercise.estimated1RM}</div>
          <div style={s.highlightUnit}>kg</div>
          <div style={s.highlightSub}>
            {selectedExercise.bestSet.reps} rep{selectedExercise.bestSet.reps !== 1 ? 's' : ''} @ {selectedExercise.bestSet.kilos} kg — {formatDate(selectedExercise.bestSet.date)}
          </div>
        </div>

        <ExerciseChart exercise={selectedExercise} />

        <div style={s.sectionLabel}>All Entries</div>
        <div className="card" style={{ overflow: 'hidden' }}>
          {reversedHistory.map((h, i) => (
            <div key={i} style={{
              ...s.historyRow,
              ...(i === reversedHistory.length - 1 ? { borderBottom: 'none' } : {}),
            }}>
              <span style={s.historyReps}>{h.reps} rep{h.reps !== 1 ? 's' : ''}</span>
              <span style={s.historyKg}>{h.kilos} kg</span>
              <span style={s.history1rm}>{h.estimated1RM} kg</span>
              <span style={s.historyDate}>{formatDate(h.date)}</span>
            </div>
          ))}
        </div>

        <Toast toast={toast} onDismiss={dismissToast} />
      </div>
    );
  }

  return (
    <div style={s.page} className="fade-in">
      <div style={s.title}>Records</div>

      <div style={s.segmented}>
        <button style={tab === 'strength' ? s.segActive : s.seg} onClick={() => setTab('strength')}>
          Strength PRs
        </button>
        <button style={tab === 'wods' ? s.segActive : s.seg} onClick={() => setTab('wods')}>
          WOD Records
        </button>
      </div>

      {/* STRENGTH */}
      {tab === 'strength' && (
        <>
          {aggregated.length > 0 ? (
            aggregated.map((ex, i) => (
              <div
                key={ex.exercise.toLowerCase()}
                className="card fade-in-stagger"
                style={{ ...s.exerciseCard, '--delay': `${i * 0.04}s` } as React.CSSProperties}
                onClick={() => setSelectedExercise(ex)}
              >
                <div style={s.cardRow}>
                  <div style={s.cardContent}>
                    <div style={s.exerciseName}>{ex.exercise}</div>
                    <div style={s.est1rm}>Est. 1RM {ex.estimated1RM} kg</div>
                    <div style={s.bestSet}>
                      {ex.bestSet.reps} rep{ex.bestSet.reps !== 1 ? 's' : ''} {ex.bestSet.kilos} kg — {formatDate(ex.bestSet.date)}
                    </div>
                  </div>
                  <svg style={s.chevron} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              </div>
            ))
          ) : !showStrengthForm ? (
            <div style={s.empty}>No strength records yet</div>
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
                          <span>{formatTime(entry.timeSeconds)}</span>
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
              <div key={r.id} className="card" style={s.manualWodCard}>
                <div style={s.wodHeader}>
                  <div>
                    <div style={s.wodName}>{r.name}</div>
                    <div style={s.wodTime}>
                      {r.timeSeconds ? formatTime(r.timeSeconds) : `${r.totalReps} rounds`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button style={{ ...s.delBtn, color: 'var(--tint)' }} onClick={() => startEditWod(r)} aria-label="Edit record">&#9998;</button>
                    <button style={s.delBtn} onClick={() => askDeleteManual(r.id, r.name)} aria-label="Delete record">-</button>
                  </div>
                </div>
                {r.description && <div style={s.wodDesc}>{r.description}</div>}
                <div style={s.wodMeta}>
                  <span>{formatDate(r.date)}</span>
                  {r.timeSeconds && r.totalReps ? <span>{r.totalReps} rounds</span> : null}
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
              <div style={s.formTitle}>{editingWodId ? 'Edit WOD Record' : 'New WOD Record'}</div>
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
                  <label className="label">Rounds</label>
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
                <button className="btn btn-secondary btn-sm" onClick={() => { setShowWodForm(false); setEditingWodId(null); setWodForm({ name: '', desc: '', time: '', reps: '', date: today, avgHR: '', maxHR: '', notes: '' }); }} style={{ flex: 1 }}>Cancel</button>
                <button className="btn btn-primary btn-sm" onClick={handleAddWodRecord} disabled={wSaving || !wodForm.name || (!wodForm.time && !wodForm.reps)} style={{ flex: 2 }}>
                  {wSaving ? 'Saving...' : editingWodId ? 'Update' : 'Save'}
                </button>
              </div>
            </div>
          ) : (
            <button style={s.addBtn} onClick={() => setShowWodForm(true)}>+ Add WOD Record</button>
          )}
        </>
      )}

      {confirmDeleteId && (
        <ConfirmDialog
          title="Delete Record"
          message={`Delete "${confirmDeleteName}"? This action cannot be undone.`}
          onConfirm={() => handleDeleteManual(confirmDeleteId)}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}

      <Toast toast={toast} onDismiss={dismissToast} />
    </div>
  );
}

export default Records;
