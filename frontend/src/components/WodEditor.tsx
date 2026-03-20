import { WOD } from '../types';
import { formatTime, parseTime } from '../utils/format';

interface Props {
  wod: WOD;
  onChange: (wod: WOD) => void;
  readOnly?: boolean;
}

const s: Record<string, React.CSSProperties> = {
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 10,
    marginTop: 14,
  },
};

function WodEditor({ wod, onChange, readOnly }: Props) {
  return (
    <div className="card">
      <div style={{ marginBottom: 14 }}>
        <label className="label">WOD Name
          <input
            className="input"
            placeholder="e.g., Fran, Murph..."
            value={wod.name || ''}
            onChange={(e) => onChange({ ...wod, name: e.target.value || undefined })}
            readOnly={readOnly}
          />
        </label>
      </div>

      <div>
        <label className="label">Description
          <textarea
            className="input"
            value={wod.description}
            placeholder="Describe the WOD..."
            onChange={(e) => onChange({ ...wod, description: e.target.value })}
            readOnly={readOnly}
            rows={3}
          />
        </label>
      </div>

      <div style={s.grid}>
        <div>
          <label className="label">Time
            <input
              className="input input-sm"
              placeholder="m:ss"
              value={wod.timeSeconds ? formatTime(wod.timeSeconds) : ''}
              onChange={(e) =>
                onChange({ ...wod, timeSeconds: parseTime(e.target.value) })
              }
              readOnly={readOnly}
            />
          </label>
        </div>
        <div>
          <label className="label">Reps
            <input
              className="input input-sm"
              type="number"
              inputMode="numeric"
              placeholder="0"
              value={wod.totalReps || ''}
              onChange={(e) =>
                onChange({ ...wod, totalReps: parseInt(e.target.value) || undefined })
              }
              readOnly={readOnly}
            />
          </label>
        </div>
        <div>
          <label className="label">Avg HR
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
          </label>
        </div>
        <div>
          <label className="label">Max HR
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
          </label>
        </div>
      </div>
    </div>
  );
}

export default WodEditor;
