import { WOD } from '../types';
import AutoTextarea from './AutoTextarea';
import TimeInput from './TimeInput';
import RpeInput from './RpeInput';

interface Props {
  wod: WOD;
  onChange: (wod: WOD) => void;
  readOnly?: boolean;
}

const s: Record<string, React.CSSProperties> = {
  card: {
    background: 'var(--bg-grouped-secondary)',
    borderRadius: 16,
    padding: 16,
  },
  field: {
    marginBottom: 14,
  },
  recovery: {
    marginTop: 8,
    minHeight: 20,
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--green)',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 12,
  },
};

function numberField(
  label: string,
  value: number | undefined,
  placeholder: string,
  onChange: (n: number | undefined) => void,
  readOnly?: boolean
) {
  return (
    <label>
      <span className="label">{label}</span>
      <input
        className="input input-sm"
        type="number"
        inputMode="numeric"
        placeholder={placeholder}
        value={value || ''}
        onFocus={(e) => e.target.select()}
        onChange={(e) => onChange(parseInt(e.target.value) || undefined)}
        readOnly={readOnly}
      />
    </label>
  );
}

function recoveryText(wod: WOD): { text: string; warn: boolean } {
  const { recoveryFromHeartRate: from, recoveryToHeartRate: to, recoveryHeartRate2min: drop } = wod;
  if (from !== undefined && to !== undefined) {
    return to > from
      ? { text: 'To is higher than From, check values', warn: true }
      : { text: `Recovery −${from - to} bpm`, warn: false };
  }
  if (from !== undefined || to !== undefined) return { text: 'Fill in both to see the drop', warn: false };
  if (drop !== undefined) return { text: `Recovery −${drop} bpm (entered earlier)`, warn: false };
  return { text: '', warn: false };
}

/** Changing From or To keeps the stored drop in step (the backend recomputes it on save) */
function withRecovery(wod: WOD, patch: Pick<WOD, 'recoveryFromHeartRate' | 'recoveryToHeartRate'>): WOD {
  const next = { ...wod, ...patch };
  next.recoveryHeartRate2min =
    next.recoveryFromHeartRate !== undefined && next.recoveryToHeartRate !== undefined
      ? next.recoveryFromHeartRate - next.recoveryToHeartRate
      : undefined;
  return next;
}

function WodEditor({ wod, onChange, readOnly }: Props) {
  const recovery = recoveryText(wod);

  return (
    <div style={s.card}>
      <label style={{ display: 'block', ...s.field }}>
        <span className="label">WOD name</span>
        <input
          className="input"
          placeholder="e.g., Fran, Murph..."
          value={wod.name || ''}
          onChange={(e) => onChange({ ...wod, name: e.target.value || undefined })}
          readOnly={readOnly}
        />
      </label>

      <div style={s.field}>
        <span className="label">Description</span>
        <AutoTextarea
          label="WOD description"
          value={wod.description}
          placeholder="Describe the WOD..."
          minRows={3}
          maxLength={2000}
          onChange={(description) => onChange({ ...wod, description })}
          readOnly={readOnly}
        />
      </div>

      <div style={{ ...s.field }}>
        <span className="label">Time</span>
        <TimeInput
          label="WOD time"
          value={wod.timeSeconds}
          onChange={(timeSeconds) => onChange({ ...wod, timeSeconds })}
          readOnly={readOnly}
        />
      </div>

      <div style={s.field}>
        <RpeInput label="RPE" value={wod.rpe} onChange={(rpe) => onChange({ ...wod, rpe })} readOnly={readOnly} />
      </div>

      <div style={s.grid}>
        {numberField('Rounds / reps', wod.totalReps, '0', (totalReps) => onChange({ ...wod, totalReps }), readOnly)}
        <span />
        {numberField('Avg HR', wod.avgHeartRate, 'bpm', (avgHeartRate) => onChange({ ...wod, avgHeartRate }), readOnly)}
        {numberField('Max HR', wod.maxHeartRate, 'bpm', (maxHeartRate) => onChange({ ...wod, maxHeartRate }), readOnly)}
        <div style={{ gridColumn: '1 / -1' }}>
          <span className="label">Heart-rate recovery</span>
          <div style={s.grid}>
            {numberField('From (end of WOD)', wod.recoveryFromHeartRate, 'bpm', (v) => onChange(withRecovery(wod, { recoveryFromHeartRate: v, recoveryToHeartRate: wod.recoveryToHeartRate })), readOnly)}
            {numberField('To (2 min later)', wod.recoveryToHeartRate, 'bpm', (v) => onChange(withRecovery(wod, { recoveryFromHeartRate: wod.recoveryFromHeartRate, recoveryToHeartRate: v })), readOnly)}
          </div>
          <div style={{ ...s.recovery, color: recovery.warn ? 'var(--orange)' : 'var(--green)' }} aria-live="polite">
            {recovery.text}
          </div>
        </div>
      </div>
    </div>
  );
}

export default WodEditor;
