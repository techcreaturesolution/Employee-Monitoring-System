import { useState, useEffect } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import './index.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const agentKey = localStorage.getItem('agentKey');
    if (token) {
      setIsAuthenticated(true);
      if ((window as any).electronAPI && agentKey) {
        (window as any).electronAPI.setToken(token, agentKey, API_URL);
      }
    }
  }, []);

  return (
    <div className="w-screen h-screen bg-background text-foreground flex flex-col font-sans">
      {isAuthenticated ? (
        <Dashboard onLogout={() => setIsAuthenticated(false)} />
      ) : (
        <Login onLogin={() => setIsAuthenticated(true)} />
      )}
    </div>
  );
}

export default App;
