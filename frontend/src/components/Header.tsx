import { Link, useLocation } from 'react-router-dom';

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
};

function Header() {
  const location = useLocation();
  const isHome = location.pathname === '/';
  const isRecords = location.pathname === '/records';

  return (
    <header style={s.header}>
      <div style={s.inner}>
        <Link to="/" style={{ textDecoration: 'none' }}>
          <span style={s.title}>Workouts</span>
        </Link>
        <div style={s.nav}>
          <Link to="/records" style={isRecords ? s.navLinkActive : s.navLink}>
            Records
          </Link>
          {isHome && (
            <Link to="/new" style={s.addBtn}>
              +
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
