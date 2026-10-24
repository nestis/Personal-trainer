import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Exercise, Session } from '../types';
import { addDays, formatDayLabel, formatTime, startOfWeek, toDateString } from '../utils/format';
import { useSessionCalendar } from '../hooks/useSessionCalendar';
import Calendar from '../components/Calendar';
import WeekStrip from '../components/WeekStrip';
import PageHeader, { AddButton } from '../components/PageHeader';
import Spinner from '../components/Spinner';

const s: Record<string, React.CSSProperties> = {
  page: {
    paddingBottom: 'calc(var(--tab-bar-height) + var(--safe-bottom) + 24px)',
  },
  stack: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  nextCard: {
    background: 'var(--bg-grouped-secondary)',
    borderRadius: 'var(--radius-card)',
    padding: 16,
  },
  nextLabel: {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 0.7,
    color: 'var(--orange)',
    textTransform: 'uppercase' as const,
  },
  nextTitle: {
    fontSize: 22,
    lineHeight: '28px',
    fontWeight: 700,
    letterSpacing: -0.3,
    marginTop: 6,
  },
  planList: {
    marginTop: 10,
  },
  planRow: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
    padding: '6px 0',
    borderTop: '0.5px solid var(--separator)',
    fontSize: 17,
  },
  planName: {
    minWidth: 0,
  },
  planSets: {
    color: 'var(--text-secondary)',
    fontVariantNumeric: 'tabular-nums',
    whiteSpace: 'nowrap' as const,
    fontSize: 15,
  },
  nextMeta: {
    fontSize: 15,
    color: 'var(--text-secondary)',
    marginTop: 4,
  },
  startBtn: {
    marginTop: 16,
    height: 50,
    fontSize: 17,
  },
  listHeader: {
    fontSize: 13,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    padding: '0 4px 8px',
  },
  list: {
    background: 'var(--bg-grouped-secondary)',
    borderRadius: 'var(--radius-card)',
    overflow: 'hidden',
  },
  link: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    minHeight: 64,
    padding: '10px 16px',
    color: 'inherit',
    textDecoration: 'none',
  },
  itemContent: {
    flex: 1,
    minWidth: 0,
  },
  itemTitle: {
    fontSize: 17,
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  itemMeta: {
    fontSize: 13,
    color: 'var(--text-secondary)',
    marginTop: 2,
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  separator: {
    height: '0.5px',
    background: 'var(--separator)',
    marginLeft: 52,
  },
  chevron: {
    color: 'var(--text-muted)',
    flexShrink: 0,
  },
  empty: {
    textAlign: 'center' as const,
    padding: '48px 20px',
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
    lineHeight: 1.4,
  },
};

const ChevronIcon = () => (
  <svg style={s.chevron} width="8" height="14" viewBox="0 0 8 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M1 1l6 6-6 6" />
  </svg>
);

const StatusIcon = ({ status }: { status: Session['status'] }) =>
  status === 'not_completed' ? (
    <span style={{ width: 24, height: 24, borderRadius: '50%', boxSizing: 'border-box', border: '2px solid var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }} aria-label="Not completed">
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="var(--red)" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <path d="M2 2l6 6M8 2l-6 6" />
      </svg>
    </span>
  ) : status === 'completed' ? (
    <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }} aria-label="Completed">
      <svg width="12" height="10" viewBox="0 0 12 10" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M1 5l3.5 3.5L11 1.5" />
      </svg>
    </span>
  ) : (
    <span style={{ width: 24, height: 24, borderRadius: '50%', boxSizing: 'border-box', border: '2px solid var(--orange)', flexShrink: 0 }} aria-label="Planned" />
  );

function exerciseTitle(session: Session): string {
  const names = session.strength.map((ex) => ex.name).filter(Boolean);
  if (names.length === 0) return session.wod.name || (session.wod.description ? 'WOD' : 'Session');
  if (names.length <= 2) return names.join(', ');
  return `${names[0]}, ${names[1]} +${names.length - 2}`;
}

function planSummary(ex: Exercise): string {
  const first = ex.sets[0];
  if (!first) return '';
  const same = ex.sets.every((st) => st.reps === first.reps && st.kilos === first.kilos);
  return same ? `${ex.sets.length} × ${first.reps} @ ${first.kilos} kg` : `${ex.sets.length} sets`;
}

function sessionMeta(session: Session): string {
  const sets = session.strength.reduce((n, ex) => n + ex.sets.length, 0);
  const parts: string[] = [formatDayLabel(session.date)];
  if (sets) parts.push(`${sets} set${sets === 1 ? '' : 's'}`);
  if (session.wod.name || session.wod.description) parts.push(session.wod.name || 'WOD');
  return parts.join(' · ');
}

function SessionRows({ sessions }: { sessions: Session[] }) {
  return (
    <div style={s.list}>
      {sessions.map((session, i) => (
        <div key={session.id}>
          {i > 0 && <div style={s.separator} />}
          <Link to={`/session/${session.id}`} style={s.link} className="list-item">
            <StatusIcon status={session.status} />
            <div style={s.itemContent}>
              <div style={s.itemTitle}>{exerciseTitle(session)}</div>
              <div style={s.itemMeta}>{sessionMeta(session)}</div>
            </div>
            <ChevronIcon />
          </Link>
        </div>
      ))}
    </div>
  );
}

function SessionList() {
  const navigate = useNavigate();
  const {
    currentMonth,
    setCurrentMonth,
    ensureMonth,
    selectedDate,
    setSelectedDate,
    allSessions,
    sessionDates,
    loading,
    error,
    retry,
  } = useSessionCalendar();

  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    document.title = 'Workouts - Workout Tracker';
  }, []);

  const changeWeek = (ws: Date) => {
    setWeekStart(ws);
    setSelectedDate(null);
    setCurrentMonth(addDays(ws, 3));
    if (!loading) {
      ensureMonth(ws);
      ensureMonth(addDays(ws, 6));
    }
  };

  const selectDate = (date: string | null) => {
    setSelectedDate(date);
    if (date) setWeekStart(startOfWeek(new Date(date + 'T00:00:00')));
  };

  const todayStr = toDateString(new Date());

  const nextUp = useMemo(() => {
    const upcoming = allSessions.filter((s) => s.status === 'planned' && s.date >= todayStr);
    return upcoming.length ? upcoming.reduce((a, b) => (a.date <= b.date ? a : b)) : null;
  }, [allSessions, todayStr]);

  const recent = useMemo(
    () => allSessions.filter((s) => s.id !== nextUp?.id && (s.status !== 'planned' || s.date < todayStr)).slice(0, 10),
    [allSessions, nextUp, todayStr]
  );

  const daySessions = selectedDate ? allSessions.filter((s) => s.date === selectedDate) : [];

  const nextSets = nextUp ? nextUp.strength.reduce((n, ex) => n + ex.sets.length, 0) : 0;

  return (
    <div style={s.page} className="fade-in">
      <PageHeader title="Workouts">
        <AddButton to="/new" label="New session" subtle />
      </PageHeader>

      {error ? (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div className="card" style={{ background: 'rgba(255,69,58,0.12)', color: 'var(--red)' }}>
            {error}
          </div>
          <button className="btn btn-primary" onClick={retry} style={{ marginTop: 16 }}>
            Retry
          </button>
        </div>
      ) : (
        <div style={s.stack}>
          {expanded ? (
            <div>
              <Calendar
                currentMonth={currentMonth}
                onMonthChange={setCurrentMonth}
                selectedDate={selectedDate}
                onDateSelect={selectDate}
                sessionDates={sessionDates}
              />
              <button
                type="button"
                className="btn btn-secondary btn-sm btn-block"
                style={{ marginTop: 8 }}
                onClick={() => setExpanded(false)}
              >
                Show week
              </button>
            </div>
          ) : (
            <WeekStrip
              weekStart={weekStart}
              onWeekChange={changeWeek}
              selectedDate={selectedDate}
              onDateSelect={selectDate}
              sessionDates={sessionDates}
              onExpand={() => setExpanded(true)}
            />
          )}

          {loading && allSessions.length === 0 ? (
            <Spinner />
          ) : selectedDate ? (
            daySessions.length === 0 ? (
              <div style={s.empty}>
                <div style={s.emptyTitle}>Nothing on {formatDayLabel(selectedDate)}</div>
                <div style={s.emptySubtitle}>Plan a session for this day.</div>
                <Link to="/new" className="btn btn-primary">
                  New Session
                </Link>
              </div>
            ) : (
              <section>
                <div style={s.listHeader}>{formatDayLabel(selectedDate)}</div>
                <SessionRows sessions={daySessions} />
              </section>
            )
          ) : allSessions.length === 0 ? (
            <div style={s.empty}>
              <div style={s.emptyTitle}>No Sessions Yet</div>
              <div style={s.emptySubtitle}>Plan your first workout to get started.</div>
              <Link to="/new" className="btn btn-primary">
                New Session
              </Link>
            </div>
          ) : (
            <>
              {nextUp && (
                <section style={s.nextCard} aria-label="Next up">
                  <div style={s.nextLabel}>
                    Next up · {formatDayLabel(nextUp.date)}
                  </div>
                  <div style={s.nextTitle}>{exerciseTitle(nextUp)}</div>
                  <div style={s.planList}>
                    {nextUp.strength.map((ex) => (
                      <div key={ex.id} style={s.planRow}>
                        <span style={s.planName}>{ex.name}</span>
                        <span style={s.planSets}>{planSummary(ex)}</span>
                      </div>
                    ))}
                    {(nextUp.wod.name || nextUp.wod.description) && (
                      <div style={s.planRow}>
                        <span style={s.planName}>WOD{nextUp.wod.name ? ` · ${nextUp.wod.name}` : ''}</span>
                        <span style={s.planSets}>{nextUp.wod.timeSeconds ? formatTime(nextUp.wod.timeSeconds) : ''}</span>
                      </div>
                    )}
                  </div>
                  <div style={s.nextMeta}>{nextSets} sets in total</div>
                  <button
                    type="button"
                    className="btn btn-primary btn-block"
                    style={s.startBtn}
                    onClick={() => navigate(`/session/${nextUp.id}`)}
                  >
                    {nextUp.date === todayStr ? 'Open workout' : 'Open session'}
                  </button>
                </section>
              )}
              {recent.length > 0 && (
                <section>
                  <div style={s.listHeader}>Recent</div>
                  <SessionRows sessions={recent} />
                </section>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default SessionList;
