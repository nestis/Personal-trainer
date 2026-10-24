import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { HrvRecord } from '../types';
import { api } from '../services/api';
import { formatDayLabel, parseLocalDate, toDateString } from '../utils/format';
import PageHeader from '../components/PageHeader';
import Segmented from '../components/Segmented';
import RecoveryView from '../components/RecoveryView';
import AutoTextarea from '../components/AutoTextarea';
import Spinner from '../components/Spinner';
import Toast from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../hooks/useToast';

const COLORS = {
  max: '#ff6961',
  avg: '#0a84ff',
  min: '#30d158',
};

type RangeKey = '2w' | '3m' | 'all';

const RANGES: Record<RangeKey, { days: number | null; label: string; stat: string; prev: string }> = {
  '2w': { days: 14, label: '2 weeks', stat: '2-week average', prev: 'previous 2 weeks' },
  '3m': { days: 91, label: '3 months', stat: '3-month average', prev: 'previous 3 months' },
  all: { days: null, label: 'All', stat: 'Average of all readings', prev: '' },
};

const PAGE_SIZE = 30;

const s: Record<string, React.CSSProperties> = {
  page: {
    paddingBottom: 'calc(var(--tab-bar-height) + var(--safe-bottom) + 24px)',
  },
  card: {
    background: 'var(--bg-grouped-secondary)',
    borderRadius: 16,
    padding: '14px 16px 16px',
    marginBottom: 12,
  },
  cardHead: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 32,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: 600,
  },
  dateInput: {
    width: 'auto',
    minHeight: 36,
    padding: '6px 10px',
    fontSize: 15,
    color: 'var(--tint)',
  },
  fields: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: 8,
    marginTop: 8,
  },
  fieldLabel: {
    display: 'block',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.7,
    textTransform: 'uppercase' as const,
    padding: '0 2px 4px',
  },
  bigInput: {
    width: '100%',
    height: 60,
    textAlign: 'center' as const,
    background: 'var(--bg-tertiary)',
    border: 'none',
    borderRadius: 12,
    color: 'var(--text-primary)',
    fontSize: 28,
    fontWeight: 700,
    fontVariantNumeric: 'tabular-nums',
    outline: 'none',
    padding: 0,
  },
  fieldHint: {
    marginTop: 4,
    textAlign: 'center' as const,
    fontSize: 11,
    color: 'var(--text-secondary)',
    minHeight: 14,
  },
  linkBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--tint)',
    fontSize: 15,
    minHeight: 44,
    padding: 0,
    cursor: 'pointer',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 0.7,
    textTransform: 'uppercase' as const,
    color: 'var(--text-secondary)',
  },
  statRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 2,
    flexWrap: 'wrap' as const,
  },
  statValue: {
    fontSize: 34,
    fontWeight: 700,
    letterSpacing: -0.5,
    fontVariantNumeric: 'tabular-nums',
  },
  legend: {
    display: 'flex',
    gap: 16,
    marginTop: 8,
    fontSize: 12,
    color: 'var(--text-secondary)',
  },
  sectionLabel: {
    fontSize: 13,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    padding: '8px 4px 6px',
  },
  list: {
    background: 'var(--bg-grouped-secondary)',
    borderRadius: 16,
    overflow: 'hidden',
  },
  swipe: {
    display: 'flex',
    overflowX: 'auto' as const,
    scrollSnapType: 'x mandatory' as const,
  },
  rowBtn: {
    flex: '0 0 100%',
    scrollSnapAlign: 'start' as const,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
    padding: '0 16px',
    background: 'none',
    border: 'none',
    color: 'inherit',
    textAlign: 'left' as const,
    cursor: 'pointer',
    fontSize: 17,
  },
  action: {
    flex: '0 0 68px',
    scrollSnapAlign: 'end' as const,
    border: 'none',
    color: '#fff',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
  },
  sep: {
    height: '0.5px',
    background: 'var(--separator)',
    marginLeft: 16,
  },
  empty: {
    color: 'var(--text-secondary)',
    fontSize: 15,
    textAlign: 'center' as const,
    padding: '24px 8px',
  },
};

function getDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toDateString(d);
}

function avgOf(rs: HrvRecord[]): number | null {
  return rs.length ? rs.reduce((sum, r) => sum + r.avg, 0) / rs.length : null;
}

function dayIndex(date: string, start: string): number {
  return Math.round((parseLocalDate(date).getTime() - parseLocalDate(start).getTime()) / 86400000);
}

function HrvChart({ records, start, end, emptyHint }: { records: HrvRecord[]; start: string; end: string; emptyHint: string }) {
  if (records.length === 0) {
    return <div style={s.empty}>{emptyHint}</div>;
  }

  const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
  const vals = sorted.flatMap((r) => [r.min, r.max, r.avg]);
  const lo = Math.max(0, Math.min(...vals) - 5);
  const hi = Math.max(...vals) + 5;
  const range = hi - lo || 1;

  const W = 318;
  const H = 120;
  const PAD_X = 8;
  const PAD_T = 8;
  const PAD_B = 8;
  const span = Math.max(2, dayIndex(end, start) + 1);
  const toX = (date: string) => PAD_X + (dayIndex(date, start) / (span - 1)) * (W - PAD_X * 2);
  const toY = (v: number) => PAD_T + (H - PAD_T - PAD_B) * (1 - (v - lo) / range);

  const upper = sorted.map((r) => `${toX(r.date).toFixed(1)},${toY(r.max).toFixed(1)}`);
  const lower = [...sorted].reverse().map((r) => `${toX(r.date).toFixed(1)},${toY(r.min).toFixed(1)}`);
  const avgPts = sorted.map((r) => `${toX(r.date).toFixed(1)},${toY(r.avg).toFixed(1)}`).join(' ');
  const last = sorted[sorted.length - 1];

  const label = (d: string, withYear = false) =>
    parseLocalDate(d).toLocaleDateString('en-US', { day: 'numeric', month: 'short', ...(withYear && { year: '2-digit' }) });
  const midDate = toDateString(new Date(parseLocalDate(start).getTime() + ((span - 1) / 2) * 86400000));
  const long = span > 150;

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', display: 'block', marginTop: 8 }}
        role="img"
        aria-label={`Daily HRV from ${start} to ${end}. Latest average ${last.avg}, range ${last.min} to ${last.max}.`}
      >
        {sorted.length > 1 && <polygon points={[...upper, ...lower].join(' ')} fill="rgba(10,132,255,0.2)" />}
        {sorted.length === 1 && (
          <line x1={toX(last.date)} x2={toX(last.date)} y1={toY(last.max)} y2={toY(last.min)} stroke="rgba(10,132,255,0.35)" strokeWidth="8" strokeLinecap="round" />
        )}
        <polyline points={avgPts} fill="none" stroke={COLORS.avg} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={toX(last.date)} cy={toY(last.avg)} r="4" fill={COLORS.avg} />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 11, color: 'var(--text-secondary)' }}>
        <span>{label(start, long)}</span>
        <span>{label(midDate, long)}</span>
        <span>{label(end, long)}</span>
      </div>
      <div style={s.legend}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 14, height: 3, borderRadius: 2, background: COLORS.avg }} />Average
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 14, height: 8, borderRadius: 2, background: 'rgba(10,132,255,0.35)' }} />Min–max range
        </span>
      </div>
    </div>
  );
}

function hm(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`;
}

/** "RHR 52 · Sleep 7h 15m" for a reading, or '' */
function wellness(r: HrvRecord): string {
  const parts: string[] = [];
  if (r.restingHeartRate) parts.push(`RHR ${r.restingHeartRate}`);
  if (r.sleepMinutes) parts.push(`Sleep ${hm(r.sleepMinutes)}`);
  return parts.join(' · ');
}

function num(v: string): number {
  return parseFloat(v.replace(',', '.'));
}

function HrvView() {
  const [records, setRecords] = useState<HrvRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast, showToast, dismissToast } = useToast();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const [formDate, setFormDate] = useState(toDateString(new Date()));
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [formMin, setFormMin] = useState('');
  const [formMax, setFormMax] = useState('');
  const [formAvg, setFormAvg] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [showNote, setShowNote] = useState(false);
  const [saving, setSaving] = useState(false);
  const [version, setVersion] = useState(0);
  const [range, setRange] = useState<RangeKey>('2w');
  const [shown, setShown] = useState(PAGE_SIZE);
  const initDone = useRef(false);

  const today = toDateString(new Date());

  // All readings are loaded (a few hundred small records at most), so any range can be shown
  const loadRecords = useCallback(async () => {
    try {
      const data = await api.listHrvRecords();
      setRecords(data);
      setVersion((v) => v + 1);
      if (!initDone.current) {
        initDone.current = true;
        // Fewer than 3 readings in the last 2 weeks: open on a longer range so the history is visible
        if (data.filter((r) => r.date >= getDaysAgo(13)).length < 3) setRange('3m');
      }
    } catch {
      showToast('Failed to load HRV data', 'error');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.title = 'HRV - Workout Tracker';
    loadRecords();
  }, [loadRecords]);

  // The tapped record, else the first one saved for the chosen date
  const existing = useMemo(
    () => records.find((r) => r.id === pickedId) || records.find((r) => r.date === formDate) || null,
    [records, formDate, pickedId]
  );

  // Fill the form from that reading (or clear it)
  useEffect(() => {
    const r = existing;
    setFormMin(r ? String(r.min) : '');
    setFormMax(r ? String(r.max) : '');
    setFormAvg(r ? String(r.avg) : '');
    setFormNotes(r?.notes || '');
    setShowNote(Boolean(r?.notes));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formDate, version, pickedId]);

  const previous = useMemo(
    () => [...records].filter((r) => r.date < formDate).sort((a, b) => b.date.localeCompare(a.date))[0] || null,
    [records, formDate]
  );

  const cfg = RANGES[range];
  const earliest = useMemo(
    () => (records.length ? records.reduce((m, r) => (r.date < m ? r.date : m), records[0].date) : today),
    [records, today]
  );
  const windowStart = cfg.days ? getDaysAgo(cfg.days - 1) : earliest;
  const current = useMemo(() => records.filter((r) => r.date >= windowStart), [records, windowStart]);
  const rangeDays = cfg.days;
  const before = useMemo(
    () => (rangeDays ? records.filter((r) => r.date < windowStart && r.date >= getDaysAgo(rangeDays * 2 - 1)) : []),
    [records, windowStart, rangeDays]
  );
  const currentAvg = avgOf(current);
  const beforeAvg = avgOf(before);
  const delta = currentAvg !== null && beforeAvg !== null ? Math.round((currentAvg - beforeAvg) * 10) / 10 : null;
  const latestDate = useMemo(() => [...records].sort((a, b) => b.date.localeCompare(a.date))[0]?.date, [records]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const min = num(formMin);
    const max = num(formMax);
    const avg = num(formAvg);
    if (isNaN(min) || isNaN(max) || isNaN(avg)) {
      showToast('Enter min, avg and max', 'error');
      return;
    }
    if (min > max) {
      showToast('Min cannot be greater than max', 'error');
      return;
    }
    if (avg < min || avg > max) {
      showToast('Avg should be between min and max', 'error');
      return;
    }

    setSaving(true);
    try {
      const body = { date: formDate, min, max, avg, ...(formNotes && { notes: formNotes }) };
      if (existing) {
        await api.updateHrvRecord(existing.id, body);
        showToast('Reading updated');
      } else {
        await api.createHrvRecord(body);
        showToast('Reading saved');
      }
      await loadRecords();
    } catch {
      showToast('Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await api.deleteHrvRecord(confirmDelete);
      showToast('Deleted');
      if (pickedId === confirmDelete) setPickedId(null);
      setConfirmDelete(null);
      await loadRecords();
    } catch {
      showToast('Failed to delete', 'error');
    }
  };

  const edit = (r: HrvRecord) => {
    setPickedId(r.id);
    setFormDate(r.date);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) return <div style={{ paddingTop: 60 }}><Spinner /></div>;

  const history = [...current].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  const fields: { key: 'min' | 'avg' | 'max'; value: string; set: (v: string) => void }[] = [
    { key: 'min', value: formMin, set: setFormMin },
    { key: 'avg', value: formAvg, set: setFormAvg },
    { key: 'max', value: formMax, set: setFormMax },
  ];
  const emptyHint = latestDate
    ? `No readings in this range. Your latest is from ${formatDayLabel(latestDate)}; try a longer range.`
    : 'No data yet. Save your first reading above.';

  return (
    <div style={s.page} className="fade-in">
      <section style={s.card} aria-label="Reading">
        <form onSubmit={handleSubmit}>
          <div style={s.cardHead}>
            <h2 style={s.cardTitle}>{formDate === today ? "Today's reading" : 'Reading'}</h2>
            <input
              className="input"
              style={s.dateInput}
              type="date"
              aria-label="Date"
              value={formDate}
              max={today}
              onChange={(e) => {
                if (e.target.value) {
                  setPickedId(null);
                  setFormDate(e.target.value);
                }
              }}
            />
          </div>

          <div style={s.fields}>
            {fields.map((f) => (
              <div key={f.key}>
                <label htmlFor={`hrv-${f.key}`} style={{ ...s.fieldLabel, color: COLORS[f.key] }}>
                  {f.key}
                </label>
                <input
                  id={`hrv-${f.key}`}
                  style={s.bigInput}
                  type="text"
                  inputMode="decimal"
                  enterKeyHint="next"
                  placeholder="–"
                  value={f.value}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => f.set(e.target.value)}
                />
                <div style={s.fieldHint}>{previous ? `last ${previous[f.key]}` : ''}</div>
              </div>
            ))}
          </div>

          {existing && (existing.source === 'apple-health' || existing.restingHeartRate || existing.sleepMinutes) && (
            <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.45, color: 'var(--text-secondary)' }}>
              {existing.source === 'apple-health' && <div style={{ fontWeight: 600 }}>From Apple Health</div>}
              {wellness(existing) && <div>{wellness(existing)}</div>}
              {existing.sleepStages && existing.sleepMinutes ? (
                <div>
                  Deep {hm(existing.sleepStages.deep)} · REM {hm(existing.sleepStages.rem)} · Core {hm(existing.sleepStages.core)} · Awake {hm(existing.sleepStages.awake)}
                </div>
              ) : null}
              {existing.readings && existing.readings.length > 0 && (
                <div>Readings: {existing.readings.map((x) => `${x.time} ${x.value}`).join(', ')}</div>
              )}
            </div>
          )}

          {showNote ? (
            <div style={{ marginTop: 8 }}>
              <AutoTextarea
                label="Note"
                value={formNotes}
                onChange={setFormNotes}
                minRows={2}
                maxLength={500}
                placeholder="e.g. slept well, stressed…"
              />
            </div>
          ) : (
            <button type="button" style={s.linkBtn} onClick={() => setShowNote(true)}>
              + Add note
            </button>
          )}

          <button className="btn btn-primary btn-block" type="submit" disabled={saving} style={{ height: 50, marginTop: 4 }}>
            {saving ? 'Saving...' : existing ? 'Update reading' : 'Save reading'}
          </button>
          {existing && (
            <button type="button" style={{ ...s.linkBtn, color: 'var(--red)', width: '100%', marginTop: 4 }} onClick={() => setConfirmDelete(existing.id)}>
              Delete this reading
            </button>
          )}
        </form>
      </section>

      <div style={{ marginBottom: 12 }}>
        <Segmented
          label="Range"
          value={range}
          onChange={(r) => {
            setRange(r);
            setShown(PAGE_SIZE);
          }}
          options={(Object.keys(RANGES) as RangeKey[]).map((k) => ({ value: k, label: RANGES[k].label }))}
        />
      </div>

      <section style={s.card} aria-label="Average">
        <div style={s.statLabel}>{cfg.stat}</div>
        {currentAvg !== null ? (
          <div style={s.statRow}>
            <span style={s.statValue}>{currentAvg.toFixed(1)}</span>
            <span style={{ fontSize: 17, color: 'var(--text-secondary)' }}>ms</span>
            {delta !== null && cfg.prev && (
              <span
                style={{
                  marginLeft: 'auto',
                  fontSize: 13,
                  fontWeight: 600,
                  color: delta > 0 ? 'var(--green)' : delta < 0 ? 'var(--orange)' : 'var(--text-secondary)',
                }}
              >
                {delta > 0 ? `▲ ${delta}` : delta < 0 ? `▼ ${-delta}` : 'No change'} vs {cfg.prev}
              </span>
            )}
          </div>
        ) : (
          <div style={{ ...s.statValue, color: 'var(--text-secondary)' }}>–</div>
        )}
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
          {current.length} reading{current.length === 1 ? '' : 's'}
        </div>
        <HrvChart records={current} start={windowStart} end={today} emptyHint={emptyHint} />
      </section>

      {history.length > 0 && (
        <section aria-label="Readings">
          <div style={s.sectionLabel}>History · tap to edit, swipe to delete</div>
          <div style={s.list}>
            {history.slice(0, shown).map((r, i) => (
              <div key={r.id}>
                {i > 0 && <div style={s.sep} />}
                <div style={s.swipe} className="swipe-row">
                  <button
                    type="button"
                    style={{ ...s.rowBtn, background: r.id === existing?.id ? 'var(--fill-secondary)' : 'none' }}
                    onClick={() => edit(r)}
                    aria-label={`Edit reading for ${formatDayLabel(r.date)}`}
                  >
                    <span style={{ minWidth: 0, flex: 1 }}>
                      <span style={{ display: 'block' }}>{formatDayLabel(r.date)}</span>
                      {wellness(r) && (
                        <span style={{ display: 'block', marginTop: 2, fontSize: 13, color: 'var(--text-secondary)' }}>{wellness(r)}</span>
                      )}
                      {r.notes && (
                        <span style={{ display: 'block', marginTop: 2, fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {r.notes}
                        </span>
                      )}
                    </span>
                    <span style={{ fontSize: 15, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums', flexShrink: 0, marginLeft: 12 }}>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{r.avg}</span> avg · {r.min}–{r.max}
                    </span>
                  </button>
                  <button
                    type="button"
                    style={{ ...s.action, flexBasis: 80, background: '#d70015' }}
                    onClick={() => setConfirmDelete(r.id)}
                    aria-label={`Delete reading for ${formatDayLabel(r.date)}`}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
          {history.length > shown && (
            <button type="button" className="btn btn-secondary btn-block" style={{ marginTop: 12 }} onClick={() => setShown((n) => n + PAGE_SIZE)}>
              Show more ({history.length - shown} older)
            </button>
          )}
        </section>
      )}

      {confirmDelete && (
        <ConfirmDialog title="Delete reading" message="Delete this HRV reading?" onConfirm={handleDelete} onCancel={() => setConfirmDelete(null)} />
      )}
      <Toast toast={toast} onDismiss={dismissToast} />
    </div>
  );
}

function Hrv() {
  const [view, setView] = useState<'hrv' | 'recovery'>('hrv');

  return (
    <div>
      <PageHeader title="HRV" />
      <div style={{ marginBottom: 12 }}>
        <Segmented
          label="View"
          value={view}
          onChange={setView}
          options={[
            { value: 'hrv', label: 'HRV' },
            { value: 'recovery', label: 'Recovery' },
          ]}
        />
      </div>
      {view === 'hrv' ? (
        <HrvView />
      ) : (
        <div style={s.page} className="fade-in">
          <RecoveryView />
        </div>
      )}
    </div>
  );
}

export default Hrv;
