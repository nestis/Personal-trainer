import { useEffect, useState, useCallback } from 'react';
import { HrvRecord } from '../types';
import { api } from '../services/api';
import { formatDate, toDateString } from '../utils/format';
import Spinner from '../components/Spinner';
import Toast from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../hooks/useToast';

const s: Record<string, React.CSSProperties> = {
  page: { paddingTop: 8, paddingBottom: 80 },
  title: {
    fontSize: 34,
    fontWeight: 700,
    letterSpacing: -0.7,
    marginBottom: 20,
    lineHeight: 1.1,
  },
  chartCard: {
    background: 'var(--bg-grouped-secondary)',
    borderRadius: 'var(--radius)',
    padding: 20,
    boxShadow: 'var(--shadow-card)',
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 17,
    fontWeight: 600,
    marginBottom: 16,
    letterSpacing: -0.2,
  },
  svgContainer: { width: '100%', overflow: 'visible' },
  highlightCard: {
    background: 'linear-gradient(135deg, rgba(94,92,230,0.15) 0%, rgba(10,132,255,0.1) 100%)',
    borderRadius: 'var(--radius)',
    padding: 20,
    marginBottom: 20,
    textAlign: 'center' as const,
    boxShadow: '0 0 20px rgba(94,92,230,0.1)',
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
    color: 'var(--indigo)',
    letterSpacing: -1,
    fontVariantNumeric: 'tabular-nums',
  },
  highlightUnit: {
    fontSize: 15,
    fontWeight: 500,
    color: 'var(--text-secondary)',
    marginTop: 2,
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
  formCard: {
    background: 'var(--bg-grouped-secondary)',
    borderRadius: 'var(--radius)',
    padding: 16,
    boxShadow: 'var(--shadow-card)',
    marginBottom: 20,
  },
  formRow: {
    display: 'flex',
    gap: 10,
    marginBottom: 10,
  },
  formField: { flex: 1 },
  recordRow: {
    background: 'var(--bg-grouped-secondary)',
    borderRadius: 'var(--radius-sm)',
    padding: '12px 16px',
    marginBottom: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
    minHeight: 56,
  },
  recordDate: {
    fontSize: 15,
    fontWeight: 600,
    minWidth: 70,
  },
  recordValues: {
    display: 'flex',
    gap: 16,
    fontSize: 14,
    color: 'var(--text-secondary)',
  },
  recordVal: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center' as const,
    gap: 1,
  },
  recordValNum: {
    fontSize: 15,
    fontWeight: 600,
    color: 'var(--text-primary)',
    fontVariantNumeric: 'tabular-nums',
  },
  recordValLabel: {
    fontSize: 11,
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase' as const,
  },
  recordActions: {
    display: 'flex',
    gap: 4,
  },
  iconBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    padding: 8,
    fontSize: 14,
    minWidth: 40,
    minHeight: 40,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 'var(--radius-xs)',
  },
  legend: {
    display: 'flex',
    gap: 16,
    justifyContent: 'center',
    marginTop: 12,
    fontSize: 12,
    color: 'var(--text-secondary)',
  },
  legendDot: {
    display: 'inline-block',
    width: 8,
    height: 8,
    borderRadius: '50%',
    marginRight: 4,
    verticalAlign: 'middle',
  },
};

const COLORS = {
  max: '#ff453a',
  avg: '#0a84ff',
  min: '#30d158',
};

function getDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toDateString(d);
}

function HrvChart({ records }: { records: HrvRecord[] }) {
  if (records.length === 0) {
    return <div style={{ color: 'var(--text-secondary)', fontSize: 15, textAlign: 'center', padding: 20 }}>No data yet. Add your first HRV measurement below.</div>;
  }

  const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
  const allVals = sorted.flatMap(r => [r.min, r.max, r.avg]);
  const minVal = Math.max(0, Math.min(...allVals) - 10);
  const maxVal = Math.max(...allVals) + 10;
  const range = maxVal - minVal || 1;

  const W = 500;
  const H = 200;
  const PAD_L = 36;
  const PAD_R = 10;
  const PAD_T = 10;
  const PAD_B = 30;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;

  const xStep = sorted.length > 1 ? chartW / (sorted.length - 1) : chartW / 2;

  function toX(i: number): number {
    return PAD_L + (sorted.length > 1 ? i * xStep : chartW / 2);
  }
  function toY(v: number): number {
    return PAD_T + chartH - ((v - minVal) / range) * chartH;
  }

  function makePath(key: 'min' | 'max' | 'avg'): string {
    return sorted.map((r, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(r[key]).toFixed(1)}`).join(' ');
  }

  const tickCount = 5;
  const ticks = Array.from({ length: tickCount }, (_, i) => minVal + (range * i) / (tickCount - 1));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={s.svgContainer}>
      {ticks.map((v, i) => (
        <g key={i}>
          <line x1={PAD_L} x2={W - PAD_R} y1={toY(v)} y2={toY(v)} stroke="rgba(120,120,128,0.15)" strokeWidth="0.5" />
          <text x={PAD_L - 4} y={toY(v) + 4} textAnchor="end" fill="rgba(235,235,245,0.4)" fontSize="10">{Math.round(v)}</text>
        </g>
      ))}
      {sorted.map((r, i) => {
        if (sorted.length > 10 && i % 2 !== 0 && i !== sorted.length - 1) return null;
        const d = new Date(r.date + 'T00:00:00');
        const label = `${d.getDate()}/${d.getMonth() + 1}`;
        return <text key={r.id} x={toX(i)} y={H - 4} textAnchor="middle" fill="rgba(235,235,245,0.4)" fontSize="10">{label}</text>;
      })}
      <path d={`${makePath('avg')} L${toX(sorted.length - 1)},${toY(minVal)} L${toX(0)},${toY(minVal)} Z`} fill="rgba(10,132,255,0.08)" />
      <path d={makePath('max')} fill="none" stroke={COLORS.max} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d={makePath('avg')} fill="none" stroke={COLORS.avg} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d={makePath('min')} fill="none" stroke={COLORS.min} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {sorted.map((r, i) => (
        <g key={r.id}>
          <circle cx={toX(i)} cy={toY(r.max)} r="3" fill={COLORS.max} />
          <circle cx={toX(i)} cy={toY(r.avg)} r="3.5" fill={COLORS.avg} />
          <circle cx={toX(i)} cy={toY(r.min)} r="3" fill={COLORS.min} />
        </g>
      ))}
    </svg>
  );
}

function Hrv() {
  const [records, setRecords] = useState<HrvRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast, showToast, dismissToast } = useToast();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const [formDate, setFormDate] = useState(toDateString(new Date()));
  const [formMin, setFormMin] = useState('');
  const [formMax, setFormMax] = useState('');
  const [formAvg, setFormAvg] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const startDate = getDaysAgo(13);

  const loadRecords = useCallback(async () => {
    try {
      const data = await api.listHrvRecords(startDate);
      setRecords(data);
    } catch {
      showToast('Failed to load HRV data', 'error');
    } finally {
      setLoading(false);
    }
  }, [startDate]);

  useEffect(() => { loadRecords(); }, [loadRecords]);

  const resetForm = () => {
    setFormDate(toDateString(new Date()));
    setFormMin('');
    setFormMax('');
    setFormAvg('');
    setFormNotes('');
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const min = parseFloat(formMin);
    const max = parseFloat(formMax);
    const avg = parseFloat(formAvg);
    if (isNaN(min) || isNaN(max) || isNaN(avg)) {
      showToast('All HRV values are required', 'error');
      return;
    }
    if (min > max) {
      showToast('Min cannot be greater than max', 'error');
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await api.updateHrvRecord(editingId, {
          date: formDate,
          min, max, avg,
          ...(formNotes && { notes: formNotes }),
        });
        showToast('HRV updated');
      } else {
        await api.createHrvRecord({
          date: formDate,
          min, max, avg,
          ...(formNotes && { notes: formNotes }),
        });
        showToast('HRV recorded');
      }
      resetForm();
      await loadRecords();
    } catch {
      showToast('Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (r: HrvRecord) => {
    setEditingId(r.id);
    setFormDate(r.date);
    setFormMin(String(r.min));
    setFormMax(String(r.max));
    setFormAvg(String(r.avg));
    setFormNotes(r.notes || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await api.deleteHrvRecord(confirmDelete);
      showToast('Deleted');
      setConfirmDelete(null);
      if (editingId === confirmDelete) resetForm();
      await loadRecords();
    } catch {
      showToast('Failed to delete', 'error');
    }
  };

  if (loading) return <div style={{ paddingTop: 60 }}><Spinner /></div>;

  const twoWeekAvg = records.length > 0
    ? records.reduce((sum, r) => sum + r.avg, 0) / records.length
    : null;

  const sorted = [...records].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div style={s.page}>
      <div style={s.title}>HRV</div>

      {/* Chart */}
      <div style={s.chartCard}>
        <div style={s.chartTitle}>Last 14 Days</div>
        <HrvChart records={records} />
        <div style={s.legend}>
          <span><span style={{ ...s.legendDot, background: COLORS.max }} />Max</span>
          <span><span style={{ ...s.legendDot, background: COLORS.avg }} />Avg</span>
          <span><span style={{ ...s.legendDot, background: COLORS.min }} />Min</span>
        </div>
      </div>

      {/* Highlight */}
      {twoWeekAvg !== null && (
        <div style={s.highlightCard}>
          <div style={s.highlightLabel}>2-Week Average</div>
          <div style={s.highlightValue}>{twoWeekAvg.toFixed(1)}</div>
          <div style={s.highlightUnit}>ms</div>
        </div>
      )}

      {/* Entry form */}
      <div style={s.sectionLabel}>{editingId ? 'Edit Measurement' : 'New Measurement'}</div>
      <div style={s.formCard}>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 10 }}>
            <label className="label">Date</label>
            <input className="input input-sm" type="date" value={formDate} onChange={e => setFormDate(e.target.value)} required />
          </div>
          <div style={s.formRow}>
            <div style={s.formField}>
              <label className="label">Min</label>
              <input className="input input-sm" type="number" step="0.1" min="0" placeholder="e.g. 35" value={formMin} onChange={e => setFormMin(e.target.value)} required />
            </div>
            <div style={s.formField}>
              <label className="label">Max</label>
              <input className="input input-sm" type="number" step="0.1" min="0" placeholder="e.g. 120" value={formMax} onChange={e => setFormMax(e.target.value)} required />
            </div>
            <div style={s.formField}>
              <label className="label">Avg</label>
              <input className="input input-sm" type="number" step="0.1" min="0" placeholder="e.g. 65" value={formAvg} onChange={e => setFormAvg(e.target.value)} required />
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label className="label">Notes (optional)</label>
            <input className="input input-sm" type="text" placeholder="e.g. slept well, stressed..." value={formNotes} onChange={e => setFormNotes(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary btn-sm btn-block" type="submit" disabled={saving}>
              {saving ? 'Saving...' : editingId ? 'Update' : 'Save'}
            </button>
            {editingId && (
              <button className="btn btn-secondary btn-sm" type="button" onClick={resetForm}>Cancel</button>
            )}
          </div>
        </form>
      </div>

      {/* Previous values */}
      {sorted.length > 0 && (
        <>
          <div style={s.sectionLabel}>Previous Measurements</div>
          {sorted.map(r => (
            <div key={r.id} style={{
              ...s.recordRow,
              ...(editingId === r.id ? { boxShadow: '0 0 0 2px var(--indigo)' } : {}),
            }}>
              <div style={s.recordDate}>{formatDate(r.date)}</div>
              <div style={s.recordValues}>
                <div style={s.recordVal}>
                  <span style={{ ...s.recordValNum, color: COLORS.min }}>{r.min}</span>
                  <span style={s.recordValLabel}>min</span>
                </div>
                <div style={s.recordVal}>
                  <span style={{ ...s.recordValNum, color: COLORS.avg }}>{r.avg}</span>
                  <span style={s.recordValLabel}>avg</span>
                </div>
                <div style={s.recordVal}>
                  <span style={{ ...s.recordValNum, color: COLORS.max }}>{r.max}</span>
                  <span style={s.recordValLabel}>max</span>
                </div>
              </div>
              <div style={s.recordActions}>
                <button style={s.iconBtn} onClick={() => startEdit(r)} title="Edit">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                <button style={{ ...s.iconBtn, color: 'var(--red)' }} onClick={() => setConfirmDelete(r.id)} title="Delete">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </>
      )}

      {confirmDelete && (
        <ConfirmDialog title="Delete HRV" message="Delete this HRV measurement?" onConfirm={handleDelete} onCancel={() => setConfirmDelete(null)} />
      )}
      <Toast toast={toast} onDismiss={dismissToast} />
    </div>
  );
}

export default Hrv;
