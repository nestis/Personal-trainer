import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const s: Record<string, React.CSSProperties> = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    minHeight: 'calc(100dvh - 80px)',
    padding: '40px 0',
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 20,
    background: 'var(--gradient-blue)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    boxShadow: '0 4px 20px rgba(10, 132, 255, 0.3)',
  },
  title: {
    fontSize: 34,
    fontWeight: 700,
    letterSpacing: -0.7,
    marginBottom: 6,
    lineHeight: 1.1,
  },
  subtitle: {
    fontSize: 17,
    color: 'var(--text-secondary)',
    marginBottom: 36,
    lineHeight: 1.3,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  error: {
    fontSize: 15,
    color: 'var(--red)',
    padding: '12px 16px',
    background: 'rgba(255, 69, 58, 0.12)',
    borderRadius: 'var(--radius-sm)',
  },
};

function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(password);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.page} className="fade-in">
      <div style={s.iconWrap}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="7" width="20" height="10" rx="2" />
          <line x1="12" y1="3" x2="12" y2="7" />
          <line x1="12" y1="17" x2="12" y2="21" />
          <line x1="7" y1="7" x2="7" y2="17" />
          <line x1="17" y1="7" x2="17" y2="17" />
        </svg>
      </div>
      <div style={s.title}>Workout Tracker</div>
      <div style={s.subtitle}>Enter your password to continue</div>

      <form style={s.form} onSubmit={handleSubmit}>
        {error && <div style={s.error}>{error}</div>}

        <div>
          <label className="label">Password</label>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
            autoComplete="current-password"
            autoFocus
            required
          />
        </div>

        <button
          className="btn btn-primary btn-block"
          type="submit"
          disabled={loading || !password}
          style={{ marginTop: 8 }}
        >
          {loading ? 'Unlocking...' : 'Unlock'}
        </button>
      </form>
    </div>
  );
}

export default Login;
