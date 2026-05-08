import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import SessionList from './pages/SessionList';
import SessionForm from './pages/SessionForm';
import SessionDetail from './pages/SessionDetail';
import Records from './pages/Records';
import Hrv from './pages/Hrv';
import Login from './pages/Login';
import Register from './pages/Register';
import Header from './components/Header';
import BottomTabBar from './components/BottomTabBar';
import Spinner from './components/Spinner';
import { AuthProvider, useAuth } from './hooks/useAuth';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { authenticated, loading } = useAuth();

  if (loading) return <Spinner />;
  if (!authenticated) return <Navigate to="/login" replace />;

  return <>{children}</>;
}

function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { authenticated, loading } = useAuth();

  if (loading) return <Spinner />;
  if (authenticated) return <Navigate to="/" replace />;

  return <>{children}</>;
}

function AppRoutes() {
  const location = useLocation();
  const { authenticated } = useAuth();

  return (
    <>
      {authenticated && <Header />}
      <main className="container" style={{ paddingBottom: '24px', flex: 1 }}>
        <div key={location.pathname} className="fade-in">
          <Routes location={location}>
            <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
            <Route path="/register" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />
            <Route path="/" element={<ProtectedRoute><SessionList /></ProtectedRoute>} />
            <Route path="/new" element={<ProtectedRoute><SessionForm /></ProtectedRoute>} />
            <Route path="/session/:id" element={<ProtectedRoute><SessionDetail /></ProtectedRoute>} />
            <Route path="/session/:id/edit" element={<ProtectedRoute><SessionForm /></ProtectedRoute>} />
            <Route path="/records" element={<ProtectedRoute><Records /></ProtectedRoute>} />
            <Route path="/hrv" element={<ProtectedRoute><Hrv /></ProtectedRoute>} />
          </Routes>
        </div>
      </main>
      {authenticated && <BottomTabBar />}
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
