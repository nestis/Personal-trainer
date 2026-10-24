import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

// iOS 26 style: a floating Liquid Glass capsule. Scrolling down shrinks it to
// the current tab; scrolling up (or tapping it) brings the full bar back.
const s: Record<string, React.CSSProperties> = {
  wrap: {
    position: 'fixed',
    left: 0,
    right: 0,
    bottom: 'calc(var(--safe-bottom) + 10px)',
    zIndex: 100,
    display: 'flex',
    justifyContent: 'center',
    padding: '0 20px',
    pointerEvents: 'none',
  },
  bar: {
    pointerEvents: 'auto',
    display: 'flex',
    alignItems: 'center',
    height: 62,
    padding: 4,
    borderRadius: 999,
    transition: 'width 0.45s var(--spring), padding 0.3s ease',
    overflow: 'hidden',
  },
  tab: {
    position: 'relative',
    zIndex: 1,
    flex: 1,
    height: 54,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRadius: 999,
    textDecoration: 'none',
    WebkitTapHighlightColor: 'transparent',
    transition: 'color 0.2s ease',
  },
  label: {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: 0.1,
  },
  lens: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    left: 4,
    borderRadius: 999,
    background: 'rgba(255, 255, 255, 0.14)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18)',
    transition: 'transform 0.45s var(--spring)',
  },
};

const WorkoutsIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2" y="7" width="20" height="10" rx="2" />
    <line x1="12" y1="3" x2="12" y2="7" />
    <line x1="12" y1="17" x2="12" y2="21" />
    <line x1="7" y1="7" x2="7" y2="17" />
    <line x1="17" y1="7" x2="17" y2="17" />
  </svg>
);

const RecordsIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

const HrvIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const FULL_WIDTH = 320;
const COMPACT_WIDTH = 62;

function BottomTabBar() {
  const location = useLocation();
  const path = location.pathname;
  const [compact, setCompact] = useState(false);
  const lastY = useRef(0);

  const tabs = [
    { to: '/', label: 'Workouts', icon: WorkoutsIcon, active: path === '/' || path.startsWith('/session') },
    { to: '/records', label: 'Records', icon: RecordsIcon, active: path === '/records' },
    { to: '/hrv', label: 'HRV', icon: HrvIcon, active: path === '/hrv' },
  ];
  const activeIndex = Math.max(0, tabs.findIndex((t) => t.active));

  useEffect(() => {
    setCompact(false);
    lastY.current = window.scrollY;
  }, [path]);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const dy = y - lastY.current;
      if (y < 60 || dy < -6) setCompact(false);
      else if (dy > 6) setCompact(true);
      if (Math.abs(dy) > 6) lastY.current = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const shown = compact ? [tabs[activeIndex]] : tabs;
  const lensWidth = `calc((100% - 8px) / ${shown.length})`;

  return (
    <div style={s.wrap}>
      <nav
        className="glass"
        aria-label="Main"
        style={{ ...s.bar, width: compact ? COMPACT_WIDTH : `min(${FULL_WIDTH}px, 100%)` }}
        onClick={compact ? () => setCompact(false) : undefined}
      >
        <span
          aria-hidden="true"
          style={{ ...s.lens, width: lensWidth, transform: `translateX(${compact ? 0 : activeIndex * 100}%)` }}
        />
        {shown.map((tab) => (
          <Link
            key={tab.to}
            to={tab.to}
            aria-current={tab.active ? 'page' : undefined}
            aria-label={compact ? `${tab.label} (show all tabs)` : undefined}
            onClick={compact ? (e) => e.preventDefault() : undefined}
            style={{ ...s.tab, color: tab.active ? 'var(--tint)' : 'var(--text-primary)' }}
          >
            <tab.icon />
            {!compact && <span style={s.label}>{tab.label}</span>}
          </Link>
        ))}
      </nav>
    </div>
  );
}

export default BottomTabBar;
