import { useMemo } from 'react';
import { SessionStatus } from '../types';
import { toDateString } from '../utils/format';

interface CalendarProps {
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  selectedDate: string | null;
  onDateSelect: (date: string | null) => void;
  sessionDates: Record<string, SessionStatus>;
}

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function getCalendarDays(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const startOffset = first.getDay();
  const days: Date[] = [];
  for (let i = -startOffset; i < 42; i++) {
    days.push(new Date(year, month, 1 + i));
  }
  // Trim trailing row if entirely outside current month
  while (days.length > 35) {
    const lastRow = days.slice(-7);
    if (lastRow.every((d) => d.getMonth() !== month)) {
      days.splice(-7);
    } else {
      break;
    }
  }
  return days;
}

const s: Record<string, React.CSSProperties> = {
  container: {
    background: 'var(--bg-grouped-secondary)',
    borderRadius: 'var(--radius)',
    padding: '12px 8px 8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.3), 0 4px 12px rgba(0,0,0,0.15)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 8px 10px',
  },
  monthTitle: {
    fontSize: 17,
    fontWeight: 600,
    letterSpacing: -0.2,
  },
  navBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--tint)',
    padding: 8,
    cursor: 'pointer',
    borderRadius: 'var(--radius-xs)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: 2,
    textAlign: 'center' as const,
  },
  dayLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase' as const,
    padding: '4px 0 6px',
  },
  dayCell: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4px 0',
    cursor: 'pointer',
    borderRadius: 'var(--radius-xs)',
    minHeight: 42,
  },
  dayNumber: {
    fontSize: 15,
    fontWeight: 400,
    width: 32,
    height: 32,
    lineHeight: '32px',
    textAlign: 'center' as const,
    borderRadius: '50%',
    transition: 'background 0.15s ease',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    marginTop: 2,
  },
  dotPlaceholder: {
    width: 6,
    height: 6,
    marginTop: 2,
  },
};

function Calendar({ currentMonth, onMonthChange, selectedDate, onDateSelect, sessionDates }: CalendarProps) {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const todayStr = toDateString(new Date());

  const days = useMemo(() => getCalendarDays(year, month), [year, month]);

  const monthLabel = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const goPrev = () => onMonthChange(new Date(year, month - 1, 1));
  const goNext = () => onMonthChange(new Date(year, month + 1, 1));

  const handleDayClick = (dateStr: string) => {
    if (selectedDate === dateStr) {
      onDateSelect(null);
    } else {
      onDateSelect(dateStr);
    }
  };

  return (
    <div style={s.container}>
      <div style={s.header}>
        <button style={s.navBtn} onClick={goPrev} aria-label="Previous month">
          <svg width="10" height="16" viewBox="0 0 10 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="8 2 2 8 8 14" />
          </svg>
        </button>
        <span style={s.monthTitle}>{monthLabel}</span>
        <button style={s.navBtn} onClick={goNext} aria-label="Next month">
          <svg width="10" height="16" viewBox="0 0 10 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="2 2 8 8 2 14" />
          </svg>
        </button>
      </div>

      <div style={s.grid}>
        {DAY_LABELS.map((label, i) => (
          <div key={i} style={s.dayLabel}>{label}</div>
        ))}

        {days.map((day, i) => {
          const dateStr = toDateString(day);
          const isCurrentMonth = day.getMonth() === month;
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedDate;
          const status = sessionDates[dateStr];

          const numberStyle: React.CSSProperties = {
            ...s.dayNumber,
            ...(isToday && {
              background: 'var(--tint)',
              color: '#fff',
              fontWeight: 600,
            }),
            ...(isSelected && !isToday && {
              boxShadow: 'inset 0 0 0 2px var(--tint)',
              color: 'var(--tint)',
              fontWeight: 600,
            }),
            ...(isSelected && isToday && {
              boxShadow: '0 0 0 2px var(--tint)',
            }),
            ...(!isCurrentMonth && {
              color: 'var(--text-tertiary)',
            }),
          };

          return (
            <div
              key={i}
              style={s.dayCell}
              onClick={() => isCurrentMonth && handleDayClick(dateStr)}
            >
              <div style={numberStyle}>{day.getDate()}</div>
              {status && isCurrentMonth ? (
                <div
                  style={{
                    ...s.dot,
                    background: status === 'completed' ? 'var(--green)' : 'var(--orange)',
                  }}
                />
              ) : (
                <div style={s.dotPlaceholder} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Calendar;
