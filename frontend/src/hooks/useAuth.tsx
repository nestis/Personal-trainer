import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { api } from '../services/api';

interface AuthContextType {
  authenticated: boolean;
  loading: boolean;
  username: string | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, inviteCode: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    const token = api.getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    setAuthenticated(true);
    setUsername(api.getUsername());
    setLoading(false);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    await api.login(username, password);
    setAuthenticated(true);
    setUsername(username.trim().toLowerCase());
  }, []);

  const register = useCallback(async (username: string, password: string, inviteCode: string) => {
    await api.register(username, password, inviteCode);
    setAuthenticated(true);
    setUsername(username.trim().toLowerCase());
  }, []);

  const logout = useCallback(() => {
    api.logout();
    setAuthenticated(false);
    setUsername(null);
  }, []);

  return (
    <AuthContext.Provider value={{ authenticated, loading, username, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
