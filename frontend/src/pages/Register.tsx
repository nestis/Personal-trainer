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
  loginLink: {
    textAlign: 'center' as const,
    marginTop: 20,
    fontSize: 15,
    color: 'var(--text-secondary)',
  },
  link: {
    color: 'var(--tint)',
    textDecoration: 'none',
    fontWeight: 500,
  },
};

function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(username, password, inviteCode);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
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
      <div style={s.title}>Create Account</div>
      <div style={s.subtitle}>Join the workout tracker</div>

      <form style={s.form} onSubmit={handleSubmit}>
        {error && <div style={s.error}>{error}</div>}

        <div>
          <label className="label">Username</label>
          <input
            className="input"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Choose a username"
            autoComplete="username"
            autoFocus
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
            placeholder="Choose a password (6+ characters)"
            autoComplete="new-password"
            required
          />
        </div>

        <div>
          <label className="label">Invite Code</label>
          <input
            className="input"
            type="text"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            placeholder="Enter your invite code"
            required
          />
        </div>

        <button
          className="btn btn-primary btn-block"
          type="submit"
          disabled={loading || !username || !password || !inviteCode}
          style={{ marginTop: 8 }}
        >
          {loading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>

      <div style={s.loginLink}>
        Already have an account?{' '}
        <Link to="/login" style={s.link}>Sign in</Link>
      </div>
    </div>
  );
}

export default Register;
