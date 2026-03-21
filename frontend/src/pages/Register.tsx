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

function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await register(email, password, displayName);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.page} className="fade-in">
      <div style={s.title}>Create Account</div>
      <div style={s.subtitle}>Start tracking your workouts</div>

      <form style={s.form} onSubmit={handleSubmit}>
        {error && <div style={s.error}>{error}</div>}

        <div>
          <label className="label">Name</label>
          <input
            className="input"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
            autoComplete="name"
            required
          />
        </div>

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
            placeholder="At least 8 characters"
            autoComplete="new-password"
            required
            minLength={8}
          />
        </div>

        <div>
          <label className="label">Confirm Password</label>
          <input
            className="input"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repeat password"
            autoComplete="new-password"
            required
          />
        </div>

        <button
          className="btn btn-primary btn-block"
          type="submit"
          disabled={loading || !displayName || !email || !password || !confirmPassword}
          style={{ marginTop: 8 }}
        >
          {loading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>

      <div style={s.footer}>
        Already have an account? <Link to="/login">Sign in</Link>
      </div>
    </div>
  );
}

export default Register;
