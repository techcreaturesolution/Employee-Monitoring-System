import { useState, useEffect } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import './index.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const agentKey = localStorage.getItem('agentKey');
    if (token) {
      setIsAuthenticated(true);
      if ((window as any).electronAPI && agentKey) {
        (window as any).electronAPI.setToken(token, agentKey);
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
