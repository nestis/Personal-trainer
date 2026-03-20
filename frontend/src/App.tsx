import { Routes, Route } from 'react-router-dom';
import SessionList from './pages/SessionList';
import SessionForm from './pages/SessionForm';
import SessionDetail from './pages/SessionDetail';
import Records from './pages/Records';
import Header from './components/Header';

function App() {
  return (
    <>
      <Header />
      <main className="container" style={{ paddingBottom: '24px', flex: 1 }}>
        <Routes>
          <Route path="/" element={<SessionList />} />
          <Route path="/new" element={<SessionForm />} />
          <Route path="/session/:id" element={<SessionDetail />} />
          <Route path="/session/:id/edit" element={<SessionForm />} />
          <Route path="/records" element={<Records />} />
        </Routes>
      </main>
    </>
  );
}

export default App;
