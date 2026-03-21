import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { api } from '../services/api';

interface AuthContextType {
  authenticated: boolean;
  loading: boolean;
  login: (password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const password = api.getPassword();
    if (!password) {
      setLoading(false);
      return;
    }
    api.verifyPassword(password)
      .then(() => setAuthenticated(true))
      .catch(() => api.clearPassword())
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (password: string) => {
    await api.verifyPassword(password);
    setAuthenticated(true);
  }, []);

  const logout = useCallback(() => {
    api.clearPassword();
    setAuthenticated(false);
  }, []);

  return (
    <AuthContext.Provider value={{ authenticated, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
