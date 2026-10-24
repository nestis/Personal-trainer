import { ReactNode, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import ConfirmDialog from './ConfirmDialog';

const s: Record<string, React.CSSProperties> = {
  bar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 'calc(var(--safe-top) + 8px)',
    minHeight: 52,
    marginBottom: 12,
  },
  title: {
    fontSize: 34,
    fontWeight: 700,
    letterSpacing: -0.7,
    lineHeight: '40px',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    marginRight: -8,
  },
  hit: {
    width: 44,
    height: 44,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'none',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    textDecoration: 'none',
  },
  circle: {
    width: 34,
    height: 34,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};

export function AddButton({ onClick, to, label, subtle }: { onClick?: () => void; to?: string; label: string; subtle?: boolean }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      style={s.hit}
      aria-label={label}
      onClick={() => (to ? navigate(to) : onClick?.())}
    >
      <span style={{ ...s.circle, background: subtle ? 'var(--bg-tertiary)' : 'var(--tint-fill)', color: subtle ? 'var(--text-secondary)' : '#fff' }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M8 2v12M2 8h12" />
        </svg>
      </span>
    </button>
  );
}

function AccountButton() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState(false);

  return (
    <>
      <button type="button" style={s.hit} aria-label="Lock app" onClick={() => setConfirm(true)}>
        <span style={{ ...s.circle, background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </span>
      </button>
      {confirm && (
        <ConfirmDialog
          title="Lock app?"
          message="You will need your password to open the app again."
          confirmLabel="Lock"
          destructive={false}
          onConfirm={() => {
            logout();
            navigate('/login');
          }}
          onCancel={() => setConfirm(false)}
        />
      )}
    </>
  );
}

function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div style={s.bar}>
      <h1 style={s.title}>{title}</h1>
      <div style={s.actions}>
        {children}
        <AccountButton />
      </div>
    </div>
  );
}

export default PageHeader;
