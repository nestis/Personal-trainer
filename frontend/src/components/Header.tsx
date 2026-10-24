import { useLocation, useNavigate } from 'react-router-dom';

const s: Record<string, React.CSSProperties> = {
  header: {
    position: 'sticky',
    top: 0,
    zIndex: 100,
    background: 'rgba(0, 0, 0, 0.72)',
    backdropFilter: 'saturate(180%) blur(20px)',
    WebkitBackdropFilter: 'saturate(180%) blur(20px)',
    borderBottom: '0.5px solid var(--separator)',
    paddingTop: 'var(--safe-top)',
  },
  inner: {
    position: 'relative',
    maxWidth: 560,
    margin: '0 auto',
    padding: '0 12px',
    display: 'flex',
    alignItems: 'center',
    minHeight: 44,
  },
  centerTitle: {
    position: 'absolute' as const,
    left: '50%',
    transform: 'translateX(-50%)',
    fontSize: 17,
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  backBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--tint)',
    fontSize: 17,
    cursor: 'pointer',
    padding: '0 8px',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    minWidth: 44,
  },
};

/**
 * Navigation bar for session detail only. Tab screens have their own large
 * title (PageHeader) and the form / logger screens render their own bars.
 */
function Header() {
  const location = useLocation();
  const navigate = useNavigate();

  const isDetail = /^\/session\/[^/]+$/.test(location.pathname);
  if (!isDetail) return null;

  return (
    <header style={s.header}>
      <div style={s.inner}>
        <button style={s.backBtn} onClick={() => navigate('/')}>
          <svg width="10" height="16" viewBox="0 0 10 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="8 2 2 8 8 14" />
          </svg>
          Workouts
        </button>
        <span style={s.centerTitle}>Session</span>
      </div>
    </header>
  );
}

export default Header;
