import { WOD } from '../types';

interface Props {
  wod: WOD;
  onChange: (wod: WOD) => void;
  readOnly?: boolean;
}

const styles: Record<string, React.CSSProperties> = {
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: 8,
    marginTop: 12,
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

function WodEditor({ wod, onChange, readOnly }: Props) {
  return (
    <div className="card">
      <div style={{ marginBottom: 12 }}>
        <label className="label">WOD Name (optional — for tracking records)</label>
        <input
          className="input"
          placeholder="e.g., Fran, Murph, Fight Gone Bad..."
          value={wod.name || ''}
          onChange={(e) => onChange({ ...wod, name: e.target.value || undefined })}
          readOnly={readOnly}
        />
      </div>
      <label className="label">WOD Description</label>
      <textarea
        className="input"
        value={wod.description}
        placeholder="Describe the WOD..."
        onChange={(e) => onChange({ ...wod, description: e.target.value })}
        readOnly={readOnly}
        rows={3}
      />

      <div style={styles.grid}>
        <div>
          <label className="label">Time (m:ss)</label>
          <input
            className="input input-sm"
            placeholder="0:00"
            value={wod.timeSeconds ? formatTime(wod.timeSeconds) : ''}
            onChange={(e) =>
              onChange({ ...wod, timeSeconds: parseTime(e.target.value) })
            }
            readOnly={readOnly}
          />
        </div>
        <div>
          <label className="label">Avg HR</label>
          <input
            className="input input-sm"
            type="number"
            inputMode="numeric"
            placeholder="bpm"
            value={wod.avgHeartRate || ''}
            onChange={(e) =>
              onChange({ ...wod, avgHeartRate: parseInt(e.target.value) || undefined })
            }
            readOnly={readOnly}
          />
        </div>
        <div>
          <label className="label">Max HR</label>
          <input
            className="input input-sm"
            type="number"
            inputMode="numeric"
            placeholder="bpm"
            value={wod.maxHeartRate || ''}
            onChange={(e) =>
              onChange({ ...wod, maxHeartRate: parseInt(e.target.value) || undefined })
            }
            readOnly={readOnly}
          />
        </div>
      </div>
    </div>
  );
}

export default WodEditor;
