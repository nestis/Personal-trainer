import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

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
    maxWidth: 560,
    margin: '0 auto',
    padding: '10px 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    fontWeight: 400,
    cursor: 'pointer',
    padding: '6px 0',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    minHeight: 44,
    minWidth: 44,
  },
  rightActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    background: 'var(--tint)',
    color: '#fff',
    border: 'none',
    fontSize: 20,
    fontWeight: 300,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    textDecoration: 'none',
    lineHeight: 1,
    transition: 'opacity 0.15s ease',
  },
  lockBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-tertiary)',
    cursor: 'pointer',
    padding: 6,
    borderRadius: 'var(--radius-xs)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 44,
  },
};

function getPageTitle(pathname: string): string | null {
  if (pathname === '/new') return 'New Session';
  if (pathname.endsWith('/edit')) return 'Edit Session';
  if (pathname.startsWith('/session/')) return 'Session';
  return null;
}

function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const isHome = location.pathname === '/';
  const isRecords = location.pathname === '/records';
  const isHrv = location.pathname === '/hrv';
  const isTopNav = isHome || isRecords || isHrv;
  const pageTitle = getPageTitle(location.pathname);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (isTopNav) {
    // Top-level pages: just a slim bar with lock icon on right
    return (
      <header style={s.header}>
        <div style={s.inner}>
          <div />
          <div style={s.rightActions}>
            {isHome && (
              <Link to="/new" style={s.addBtn}>+</Link>
            )}
            <button style={s.lockBtn} onClick={handleLogout} title="Lock app">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </button>
          </div>
        </div>
      </header>
    );
  }

  // Sub-pages: back button + center title
  return (
    <header style={s.header}>
      <div style={{ ...s.inner, position: 'relative' }}>
        <button style={s.backBtn} onClick={() => navigate(-1)}>
          <svg width="10" height="16" viewBox="0 0 10 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="8 2 2 8 8 14" />
          </svg>
          Back
        </button>
        {pageTitle && <span style={s.centerTitle}>{pageTitle}</span>}
        <div style={{ minWidth: 44 }} />
      </div>
    </header>
  );
}

export default Header;
