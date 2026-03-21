import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { formatDate } from '../utils/format';
import { useSessionCalendar } from '../hooks/useSessionCalendar';
import Calendar from '../components/Calendar';
import Spinner from '../components/Spinner';

const s: Record<string, React.CSSProperties> = {
  page: {
    paddingTop: 20,
    paddingBottom: 32,
  },
  listHeader: {
    fontSize: 13,
    fontWeight: 400,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    padding: '16px 4px 8px',
  },
  link: {
    display: 'block',
    textDecoration: 'none',
    color: 'inherit',
  },
  list: {
    background: 'var(--bg-grouped-secondary)',
    borderRadius: 'var(--radius)',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.3), 0 4px 12px rgba(0,0,0,0.15)',
  },
  item: {
    padding: '14px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  itemContent: {
    flex: 1,
    minWidth: 0,
  },
  dateRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  date: {
    fontSize: 17,
    fontWeight: 600,
    letterSpacing: -0.2,
  },
  exercises: {
    fontSize: 15,
    color: 'var(--text-secondary)',
    lineHeight: 1.4,
  },
  wodHint: {
    fontSize: 14,
    color: 'var(--text-tertiary)',
    marginTop: 4,
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  chevron: {
    color: 'var(--text-secondary)',
    flexShrink: 0,
    opacity: 0.6,
  },
  separator: {
    height: '0.5px',
    background: 'var(--separator)',
    marginLeft: 16,
  },
  empty: {
    textAlign: 'center' as const,
    padding: '40px 20px',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
    opacity: 0.6,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 600,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  emptySubtitle: {
    fontSize: 15,
    color: 'var(--text-secondary)',
    marginBottom: 28,
  },
};

const ChevronIcon = () => (
  <svg style={s.chevron} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

function SessionList() {
  const {
    currentMonth,
    setCurrentMonth,
    selectedDate,
    setSelectedDate,
    displaySessions,
    sessionDates,
    loading,
    error,
    retry,
  } = useSessionCalendar();

  useEffect(() => {
    document.title = 'Workouts - Workout Tracker';
  }, []);

  const listLabel = selectedDate
    ? formatDate(selectedDate)
    : 'All Sessions';

  return (
    <div style={s.page} className="fade-in">
      <Calendar
        currentMonth={currentMonth}
        onMonthChange={setCurrentMonth}
        selectedDate={selectedDate}
        onDateSelect={setSelectedDate}
        sessionDates={sessionDates}
      />

      {error ? (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div className="card" style={{ background: 'rgba(255,69,58,0.12)', color: 'var(--red)' }}>
            {error}
          </div>
          <button className="btn btn-primary" onClick={retry} style={{ marginTop: 16 }}>
            Retry
          </button>
        </div>
      ) : loading ? (
        <Spinner />
      ) : displaySessions.length === 0 ? (
        <div style={s.empty}>
          {selectedDate ? (
            <>
              <div style={s.emptyTitle}>No Sessions</div>
              <div style={s.emptySubtitle}>Nothing on {formatDate(selectedDate)}.</div>
              <button className="btn btn-secondary" onClick={() => setSelectedDate(null)}>
                Show All
              </button>
            </>
          ) : (
            <>
              <div style={s.emptyIcon}>&#x1F3CB;&#xFE0F;</div>
              <div style={s.emptyTitle}>No Sessions Yet</div>
              <div style={s.emptySubtitle}>Plan your first workout to get started.</div>
              <Link to="/new" className="btn btn-primary" style={{ animation: 'pulse 2s ease-in-out infinite' }}>
                New Session
              </Link>
            </>
          )}
        </div>
      ) : (
        <>
          <div style={s.listHeader}>{listLabel}</div>
          <div style={s.list}>
            {displaySessions.map((session, i) => (
              <div key={session.id} className="fade-in-stagger" style={{ '--delay': `${i * 0.04}s` } as React.CSSProperties}>
                {i > 0 && <div style={s.separator} />}
                <Link to={`/session/${session.id}`} style={s.link}>
                  <div className="list-item" style={s.item}>
                    <div style={s.itemContent}>
                      <div style={s.dateRow}>
                        <span style={s.date}>{formatDate(session.date)}</span>
                        <span className={`badge badge-${session.status}`}>
                          {session.status}
                        </span>
                      </div>
                      <div style={s.exercises}>
                        {session.strength
                          .map((ex) =>
                            ex.name
                              ? `${ex.name} ${ex.sets.length}x${ex.sets[0]?.reps || 0}`
                              : null
                          )
                          .filter(Boolean)
                          .join(' / ') || 'No exercises'}
                      </div>
                      {session.wod.description && (
                        <div style={s.wodHint}>
                          {session.wod.name || 'WOD'}: {session.wod.description}
                        </div>
                      )}
                    </div>
                    <ChevronIcon />
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default SessionList;
