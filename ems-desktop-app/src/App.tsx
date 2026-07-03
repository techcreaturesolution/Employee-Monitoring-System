import { useState, useEffect } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import './index.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return !!localStorage.getItem('token');
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    const agentKey = localStorage.getItem('agentKey');
    if (token) {
      if ((window as any).electronAPI && agentKey) {
        (window as any).electronAPI.setToken(token, agentKey, API_URL);
      }
    }
  }, []);

  useEffect(() => {
    if ((window as any).electronAPI) {
      if (isAuthenticated) {
        (window as any).electronAPI.resizeWindow(600, 800);
      } else {
        (window as any).electronAPI.resizeWindow(400, 550);
      }
    }
  }, [isAuthenticated]);

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
