import { useCallback, useRef } from 'react';
import { WOD } from '../types';
import AutoTextarea from './AutoTextarea';
import TimeInput from './TimeInput';
import RpeInput from './RpeInput';
import RecoveryTimer from './RecoveryTimer';

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
    alignSelf: 'end',
    paddingBottom: 12,
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
  readOnly?: boolean,
  inputRef?: React.Ref<HTMLInputElement>
) {
  return (
    <label>
      <span className="label">{label}</span>
      <input
        ref={inputRef}
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

function recoveryText(wod: WOD): string {
  const { maxHeartRate: max, recoveryHeartRate2min: rec } = wod;
  if (!rec) return '';
  if (!max) return 'Add max HR to see the drop';
  if (rec > max) return 'Higher than max HR, check values';
  return `Recovery −${max - rec} bpm`;
}

function WodEditor({ wod, onChange, readOnly }: Props) {
  const hrRef = useRef<HTMLInputElement>(null);
  const focusHr = useCallback(() => {
    hrRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    hrRef.current?.focus();
  }, []);

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

      {!readOnly && <RecoveryTimer onDone={focusHr} />}

      <div style={s.grid}>
        {numberField('Rounds / reps', wod.totalReps, '0', (totalReps) => onChange({ ...wod, totalReps }), readOnly)}
        <span />
        {numberField('Avg HR', wod.avgHeartRate, 'bpm', (avgHeartRate) => onChange({ ...wod, avgHeartRate }), readOnly)}
        {numberField('Max HR', wod.maxHeartRate, 'bpm', (maxHeartRate) => onChange({ ...wod, maxHeartRate }), readOnly)}
        {numberField('HR after 2 min', wod.recoveryHeartRate2min, 'bpm', (recoveryHeartRate2min) => onChange({ ...wod, recoveryHeartRate2min }), readOnly, hrRef)}
        <span style={s.recovery} aria-live="polite">
          {recoveryText(wod)}
        </span>
      </div>
    </div>
  );
}

export default WodEditor;
