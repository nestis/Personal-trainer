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
};

function Header() {
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <header style={styles.header}>
      <div style={styles.inner}>
        <Link to="/" style={{ textDecoration: 'none' }}>
          <span style={styles.title}>Workout Tracker</span>
        </Link>
        {isHome && (
          <Link to="/new" style={styles.addBtn}>
            +
          </Link>
        )}
      </div>
    </header>
  );
}

export default Header;
