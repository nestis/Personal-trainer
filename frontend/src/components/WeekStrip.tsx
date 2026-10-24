import { SessionStatus } from '../types';
import { addDays, toDateString } from '../utils/format';

interface Props {
  weekStart: Date;
  onWeekChange: (weekStart: Date) => void;
  selectedDate: string | null;
  onDateSelect: (date: string | null) => void;
  sessionDates: Record<string, SessionStatus>;
  onExpand: () => void;
}

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const s: Record<string, React.CSSProperties> = {
  card: {
    background: 'var(--bg-grouped-secondary)',
    borderRadius: 16,
    padding: '4px 12px 12px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    padding: '0 4px',
  },
  title: {
    fontSize: 17,
    fontWeight: 600,
  },
  headerBtns: {
    display: 'flex',
    alignItems: 'center',
  },
  iconBtn: {
    width: 44,
    height: 44,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'none',
    border: 'none',
    color: 'var(--tint)',
    cursor: 'pointer',
  },
  monthBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    padding: '0 4px 0 8px',
    background: 'none',
    border: 'none',
    color: 'var(--tint)',
    fontSize: 15,
    cursor: 'pointer',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
    textAlign: 'center' as const,
    rowGap: 2,
  },
  dayLabel: {
    fontSize: 12,
    color: 'var(--text-secondary)',
  },
  dayCell: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 3,
    padding: '2px 0',
    minHeight: 48,
    background: 'none',
    border: 'none',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    WebkitTapHighlightColor: 'transparent',
  },
  dayNum: {
    width: 36,
    height: 36,
    lineHeight: '36px',
    borderRadius: '50%',
    fontSize: 17,
    fontVariantNumeric: 'tabular-nums',
  },
  legend: {
    display: 'flex',
    justifyContent: 'center',
    gap: 18,
    paddingTop: 8,
    fontSize: 12,
    color: 'var(--text-secondary)',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
};

const Chevron = ({ dir }: { dir: 'left' | 'right' }) => (
  <svg width="10" height="16" viewBox="0 0 10 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points={dir === 'left' ? '8 2 2 8 8 14' : '2 2 8 8 2 14'} />
  </svg>
);

function dot(status: SessionStatus | undefined): React.CSSProperties {
  if (!status) return { width: 6, height: 6 };
  return status === 'completed'
    ? { width: 6, height: 6, borderRadius: '50%', background: 'var(--green)' }
    : { width: 6, height: 6, borderRadius: '50%', boxSizing: 'border-box', border: '1.5px solid var(--orange)' };
}

function WeekStrip({ weekStart, onWeekChange, selectedDate, onDateSelect, sessionDates, onExpand }: Props) {
  const todayStr = toDateString(new Date());
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const monthLabel = addDays(weekStart, 3).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <section style={s.card} aria-label="This week">
      <div style={s.header}>
        <div style={s.title}>{monthLabel}</div>
        <div style={s.headerBtns}>
          <button type="button" style={s.iconBtn} aria-label="Previous week" onClick={() => onWeekChange(addDays(weekStart, -7))}>
            <Chevron dir="left" />
          </button>
          <button type="button" style={s.iconBtn} aria-label="Next week" onClick={() => onWeekChange(addDays(weekStart, 7))}>
            <Chevron dir="right" />
          </button>
          <button type="button" style={s.monthBtn} onClick={onExpand}>
            Month
            <svg width="12" height="8" viewBox="0 0 12 8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M1 1.5l5 5 5-5" />
            </svg>
          </button>
        </div>
      </div>

      <div style={s.grid}>
        {DAY_LABELS.map((l, i) => (
          <div key={i} style={s.dayLabel}>{l}</div>
        ))}
        {days.map((d) => {
          const str = toDateString(d);
          const isToday = str === todayStr;
          const isSelected = str === selectedDate;
          return (
            <button
              key={str}
              type="button"
              style={s.dayCell}
              aria-label={d.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
              aria-pressed={isSelected}
              onClick={() => onDateSelect(isSelected ? null : str)}
            >
              <span
                style={{
                  ...s.dayNum,
                  ...(isToday && { background: 'var(--tint-fill)', color: '#fff', fontWeight: 600 }),
                  ...(isSelected && !isToday && { boxShadow: 'inset 0 0 0 2px var(--tint)', color: 'var(--tint)', fontWeight: 600 }),
                  ...(isSelected && isToday && { boxShadow: '0 0 0 2px var(--bg-grouped-secondary), 0 0 0 4px var(--tint)' }),
                }}
              >
                {d.getDate()}
              </span>
              <span style={dot(sessionDates[str])} />
            </button>
          );
        })}
      </div>

      <div style={s.legend}>
        <span style={s.legendItem}><span style={dot('completed')} />Completed</span>
        <span style={s.legendItem}><span style={dot('planned')} />Planned</span>
      </div>
    </section>
  );
}

export default WeekStrip;
