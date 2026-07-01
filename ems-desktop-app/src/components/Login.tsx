import { useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const VERSION = 'v1.2.0';

const eAPI = () => (window as any).electronAPI;


export default function Login({ onLogin }: { onLogin: () => void }) {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const getDeviceId = () => {
    let id = localStorage.getItem('deviceId');
    if (!id) {
      id = `device_${Date.now()}_${Math.random().toString(36).substring(2)}`;
      localStorage.setItem('deviceId', id);
    }
    return id;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res  = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, deviceId: getDeviceId() }),
      });
      const data = await res.json();
      if (data.success) {
        if (eAPI()) await eAPI().setToken(data.data.accessToken, data.data.user.agentKey, API_URL);
        localStorage.setItem('token',    data.data.accessToken);
        localStorage.setItem('agentKey', data.data.user.agentKey);
        localStorage.setItem('user',     JSON.stringify(data.data.user));
        onLogin();
      } else {
        setError(data.message || 'Invalid credentials.');
      }
    } catch {
      setError('Cannot reach the server. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#0d1117] text-white select-none overflow-hidden">

      {/* Custom title bar */}
      <header
        className="flex items-center justify-between px-4 py-2.5 border-b border-[#21262d] flex-shrink-0"
        style={{ WebkitAppRegion: 'drag' } as any}
      >
        <div>
            <p className="text-xs font-bold text-white leading-none tracking-wide">EMS AGENT</p>
            <p className="text-[10px] text-slate-500 leading-none mt-0.5">{VERSION}</p>
          </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-[360px]">

          <div className="text-center mb-8">
            <h1 className="text-lg font-bold text-white">Welcome back</h1>
            <p className="text-xs text-slate-500 mt-1">Sign in to start your work session</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 text-xs text-red-400 bg-red-950/60 border border-red-800/40 rounded-lg px-3 py-2.5">
              ⚠ {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="you@company.com"
                className="w-full px-3 py-2.5 text-sm bg-[#161b22] border border-[#30363d] rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 transition-colors"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full px-3 py-2.5 text-sm bg-[#161b22] border border-[#30363d] rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-1 py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>

      {/* Footer */}
      <footer className="flex items-center justify-center gap-2 px-4 py-2 border-t border-[#21262d] flex-shrink-0">
        <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
        <span className="text-[10px] text-slate-600">System ready · {VERSION}</span>
      </footer>
    </div>
  );
}
