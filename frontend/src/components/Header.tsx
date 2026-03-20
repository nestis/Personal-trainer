import { Link, useLocation } from 'react-router-dom';

const styles: Record<string, React.CSSProperties> = {
  header: {
    background: 'var(--bg-secondary)',
    borderBottom: '1px solid var(--border)',
    padding: '12px 0',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  inner: {
    maxWidth: 600,
    margin: '0 auto',
    padding: '0 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: '1.2rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    background: 'var(--accent)',
    color: 'white',
    border: 'none',
    fontSize: '1.5rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    textDecoration: 'none',
  },
  nav: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  navLink: {
    fontSize: '0.85rem',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    textDecoration: 'none',
    padding: '6px 12px',
    borderRadius: 'var(--radius-sm)',
    transition: 'all 0.2s',
  },
  navLinkActive: {
    fontSize: '0.85rem',
    fontWeight: 600,
    color: 'var(--accent)',
    textDecoration: 'none',
    padding: '6px 12px',
    borderRadius: 'var(--radius-sm)',
    background: 'rgba(233, 69, 96, 0.1)',
  },
};

function Header() {
  const location = useLocation();
  const isHome = location.pathname === '/';
  const isRecords = location.pathname === '/records';

  return (
    <header style={styles.header}>
      <div style={styles.inner}>
        <Link to="/" style={{ textDecoration: 'none' }}>
          <span style={styles.title}>Workout Tracker</span>
        </Link>
        <div style={styles.nav}>
          <Link
            to="/records"
            style={isRecords ? styles.navLinkActive : styles.navLink}
          >
            PRs
          </Link>
          {isHome && (
            <Link to="/new" style={styles.addBtn}>
              +
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
