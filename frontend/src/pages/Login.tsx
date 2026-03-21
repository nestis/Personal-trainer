import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const s: Record<string, React.CSSProperties> = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    minHeight: 'calc(100dvh - 80px)',
    padding: '40px 0',
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    letterSpacing: -0.6,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: 'var(--text-secondary)',
    marginBottom: 32,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  error: {
    fontSize: 14,
    color: 'var(--red)',
    padding: '10px 14px',
    background: 'rgba(255, 69, 58, 0.12)',
    borderRadius: 'var(--radius-xs)',
  },
  footer: {
    textAlign: 'center' as const,
    marginTop: 24,
    fontSize: 15,
    color: 'var(--text-secondary)',
  },
};

function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.page} className="fade-in">
      <div style={s.title}>Welcome Back</div>
      <div style={s.subtitle}>Sign in to your workout tracker</div>

      <form style={s.form} onSubmit={handleSubmit}>
        {error && <div style={s.error}>{error}</div>}

        <div>
          <label className="label">Email</label>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
        </div>

        <div>
          <label className="label">Password</label>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
            autoComplete="current-password"
            required
          />
        </div>

        <button
          className="btn btn-primary btn-block"
          type="submit"
          disabled={loading || !email || !password}
          style={{ marginTop: 8 }}
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <div style={s.footer}>
        Don't have an account? <Link to="/register">Create one</Link>
      </div>
    </div>
  );
}

export default Login;
