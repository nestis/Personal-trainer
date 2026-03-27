import { Link, useLocation } from 'react-router-dom';

const s: Record<string, React.CSSProperties> = {
  bar: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    background: 'rgba(22, 22, 24, 0.88)',
    backdropFilter: 'saturate(180%) blur(20px)',
    WebkitBackdropFilter: 'saturate(180%) blur(20px)',
    borderTop: '0.5px solid var(--separator)',
    paddingBottom: 'var(--safe-bottom)',
  },
  inner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: 'var(--tab-bar-height)',
    maxWidth: 560,
    margin: '0 auto',
  },
  tab: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    textDecoration: 'none',
    padding: '4px 16px',
    minWidth: 64,
    WebkitTapHighlightColor: 'transparent',
    transition: 'opacity 0.15s',
  },
  label: {
    fontSize: 10,
    fontWeight: 500,
    letterSpacing: 0.1,
  },
};

const WorkoutsIcon = ({ active }: { active: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--tint)' : 'var(--text-tertiary)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="10" rx="2" />
    <line x1="12" y1="3" x2="12" y2="7" />
    <line x1="12" y1="17" x2="12" y2="21" />
    <line x1="7" y1="7" x2="7" y2="17" />
    <line x1="17" y1="7" x2="17" y2="17" />
  </svg>
);

const RecordsIcon = ({ active }: { active: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--tint)' : 'var(--text-tertiary)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

const HrvIcon = ({ active }: { active: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--tint)' : 'var(--text-tertiary)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

function BottomTabBar() {
  const location = useLocation();
  const path = location.pathname;

  const isWorkouts = path === '/' || path === '/new' || path.startsWith('/session');
  const isRecords = path === '/records';
  const isHrv = path === '/hrv';

  const tabs = [
    { to: '/', label: 'Workouts', icon: WorkoutsIcon, active: isWorkouts },
    { to: '/records', label: 'Records', icon: RecordsIcon, active: isRecords },
    { to: '/hrv', label: 'HRV', icon: HrvIcon, active: isHrv },
  ];

  return (
    <nav style={s.bar}>
      <div style={s.inner}>
        {tabs.map((tab) => (
          <Link
            key={tab.to}
            to={tab.to}
            style={{
              ...s.tab,
              opacity: tab.active ? 1 : 0.6,
            }}
          >
            <tab.icon active={tab.active} />
            <span style={{
              ...s.label,
              color: tab.active ? 'var(--tint)' : 'var(--text-tertiary)',
              fontWeight: tab.active ? 600 : 500,
            }}>
              {tab.label}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
}

export default BottomTabBar;
