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
  title: {
    fontSize: 20,
    fontWeight: 700,
    color: 'var(--text-primary)',
    letterSpacing: -0.4,
  },
  centerTitle: {
    position: 'absolute' as const,
    left: '50%',
    transform: 'translateX(-50%)',
    fontSize: 17,
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  nav: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  navLink: {
    fontSize: 15,
    fontWeight: 500,
    color: 'var(--tint)',
    textDecoration: 'none',
    padding: '6px 12px',
    borderRadius: 'var(--radius-xs)',
    transition: 'background 0.15s ease',
  },
  navLinkActive: {
    fontSize: 15,
    fontWeight: 600,
    color: 'var(--tint)',
    textDecoration: 'none',
    padding: '6px 12px',
    borderRadius: 'var(--radius-xs)',
    background: 'rgba(10, 132, 255, 0.12)',
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
  backBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--tint)',
    fontSize: 15,
    fontWeight: 500,
    cursor: 'pointer',
    padding: '6px 0',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  logoutBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-secondary)',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    padding: '6px 8px',
    borderRadius: 'var(--radius-xs)',
    transition: 'background 0.15s ease',
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
  const isSubPage = !isHome && !isRecords;
  const pageTitle = getPageTitle(location.pathname);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header style={s.header}>
      <div style={{ ...s.inner, position: 'relative' }}>
        {isSubPage ? (
          <button style={s.backBtn} onClick={() => navigate(-1)}>
            <svg width="10" height="16" viewBox="0 0 10 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="8 2 2 8 8 14" />
            </svg>
            Back
          </button>
        ) : (
          <Link to="/" style={{ textDecoration: 'none' }}>
            <span style={s.title}>Workouts</span>
          </Link>
        )}

        {pageTitle && <span style={s.centerTitle}>{pageTitle}</span>}

        <div style={s.nav}>
          {!isSubPage && (
            <Link to="/records" style={isRecords ? s.navLinkActive : s.navLink}>
              Records
            </Link>
          )}
          {isHome && (
            <Link to="/new" style={s.addBtn}>
              +
            </Link>
          )}
          <button
            style={s.logoutBtn}
            onClick={handleLogout}
            title="Lock app"
          >
            Lock
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;
