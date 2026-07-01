import { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ─── Shared Dynamic AppLogo Component ───────────────────────────────────────
function AppLogo({ appName, windowTitle = '', className = 'w-6 h-6' }: { appName: string; windowTitle?: string; className?: string }) {
  const app = appName.toLowerCase();
  const title = windowTitle.toLowerCase();

  // 1. Detect browser & resolve domain
  let domain = '';
  const browsers = ['chrome', 'brave', 'firefox', 'edge', 'safari', 'browser', 'internet explorer'];
  const isBrowser = browsers.some(b => app.includes(b));

  if (isBrowser) {
    const commonWebsites = [
      'github.com', 'github',
      'stackoverflow.com', 'stackoverflow',
      'notion.so', 'notion',
      'figma.com', 'figma',
      'gmail.com', 'gmail', 'mail.google',
      'youtube.com', 'youtube',
      'facebook.com', 'facebook',
      'twitter.com', 'twitter', 'x.com',
      'linkedin.com', 'linkedin',
      'slack.com', 'slack',
      'meet.google', 'google meet',
      'zoom', 'zoom.us',
      'trello.com', 'trello',
      'jira', 'atlassian',
      'reddit.com', 'reddit',
      'netflix.com', 'netflix',
    ];
    for (const site of commonWebsites) {
      if (title.includes(site) || app.includes(site)) {
        if (site.includes('.')) {
          domain = site;
        } else {
          if (site === 'github') domain = 'github.com';
          else if (site === 'stackoverflow') domain = 'stackoverflow.com';
          else if (site === 'notion') domain = 'notion.so';
          else if (site === 'figma') domain = 'figma.com';
          else if (site === 'gmail' || site === 'mail.google') domain = 'mail.google.com';
          else if (site === 'youtube') domain = 'youtube.com';
          else if (site === 'facebook') domain = 'facebook.com';
          else if (site === 'twitter' || site === 'x.com') domain = 'twitter.com';
          else if (site === 'linkedin') domain = 'linkedin.com';
          else if (site === 'slack') domain = 'slack.com';
          else if (site === 'google meet' || site === 'meet.google') domain = 'meet.google.com';
          else if (site === 'zoom' || site === 'zoom.us') domain = 'zoom.us';
          else if (site === 'trello') domain = 'trello.com';
          else if (site === 'jira' || site === 'atlassian') domain = 'jira.com';
          else if (site === 'reddit') domain = 'reddit.com';
          else if (site === 'netflix') domain = 'netflix.com';
        }
        break;
      }
    }
  }

  // Favicon loading
  if (domain) {
    return (
      <img
        src={`https://www.google.com/s2/favicons?sz=64&domain=${domain}`}
        alt={domain}
        className={`${className} rounded object-contain bg-white/10 p-0.5 flex-shrink-0`}
        onError={(e) => {
          (e.target as HTMLElement).style.display = 'none';
        }}
      />
    );
  }

  // Desktop App Logo Mapping
  const appMappings: Record<string, string> = {
    'visual studio code': 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/vscode/vscode-original.svg',
    'vscode': 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/vscode/vscode-original.svg',
    'slack': 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/slack/slack-original.svg',
    'discord': 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/discordjs/discordjs-original.svg',
    'figma': 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/figma/figma-original.svg',
    'git': 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/git/git-original.svg',
    'github': 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/github/github-original.svg',
    'docker': 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/docker/docker-original.svg',
    'postman': 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/postman/postman-original.svg',
    'teams': 'https://img.icons8.com/color/48/microsoft-teams.png',
    'zoom': 'https://img.icons8.com/color/48/zoom.png',
    'excel': 'https://img.icons8.com/color/48/microsoft-excel-2019.png',
    'word': 'https://img.icons8.com/color/48/microsoft-word-2019.png',
    'powerpoint': 'https://img.icons8.com/color/48/microsoft-powerpoint-2019.png',
    'terminal': 'https://img.icons8.com/color/48/console.png',
    'powershell': 'https://img.icons8.com/color/48/powershell.png',
    'cmd': 'https://img.icons8.com/color/48/command-line.png',
    'windows explorer': 'https://img.icons8.com/color/48/windows-explorer.png',
    'file explorer': 'https://img.icons8.com/color/48/windows-explorer.png',
    'explorer': 'https://img.icons8.com/color/48/windows-explorer.png',
    'finder': 'https://img.icons8.com/color/48/finder.png',
  };

  for (const [key, iconUrl] of Object.entries(appMappings)) {
    if (app.includes(key)) {
      return (
        <img
          src={iconUrl}
          alt={appName}
          className={`${className} rounded object-contain flex-shrink-0`}
        />
      );
    }
  }

  // Consistent hash circle placeholder
  const initials = appName.substring(0, 2).toUpperCase();
  let hash = 0;
  for (let i = 0; i < appName.length; i++) {
    hash = appName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    'from-blue-600 to-cyan-500',
    'from-purple-600 to-indigo-500',
    'from-green-600 to-emerald-500',
    'from-orange-600 to-amber-500',
    'from-pink-600 to-rose-500',
    'from-teal-600 to-cyan-500',
  ];
  const colorIndex = Math.abs(hash) % colors.length;
  const gradient = colors[colorIndex];

  return (
    <div className={`${className} rounded bg-gradient-to-br ${gradient} flex items-center justify-center text-[10px] font-bold text-white shadow-sm flex-shrink-0 uppercase`}>
      {initials}
    </div>
  );
}
const WORK_HOURS = 8;
const VERSION = 'v1.2.0';

// ─── Helpers ────────────────────────────────────────────────────────────────
const pad = (n: number) => String(Math.floor(n)).padStart(2, '0');

const formatTimer = (sec: number) =>
  `${pad(sec / 3600)}:${pad((sec % 3600) / 60)}:${pad(sec % 60)}`;

const formatHM = (sec: number) => {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h === 0) return `${m} m`;
  return m === 0 ? `${h} h` : `${h} h ${m} m`;
};

const eAPI = () => (window as any).electronAPI;

// ─── Optimized Timer-related Components ─────────────────────────────────────
function TimerDisplay({ startSec, active }: { startSec: number; active: boolean }) {
  const [sec, setSec] = useState(startSec);
  useEffect(() => { setSec(startSec); }, [startSec]);
  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => { setSec(s => s + 1); }, 1000);
    return () => clearInterval(interval);
  }, [active]);
  return <>{formatTimer(sec)}</>;
}

function HMDisplay({ startSec, active, updateInterval = 5000 }: { startSec: number; active: boolean; updateInterval?: number }) {
  const [sec, setSec] = useState(startSec);
  useEffect(() => { setSec(startSec); }, [startSec]);
  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => { setSec(s => s + updateInterval / 1000); }, updateInterval);
    return () => clearInterval(interval);
  }, [active, updateInterval]);
  return <>{formatHM(sec)}</>;
}

function ProgressBar({ startSec, active }: { startSec: number; active: boolean }) {
  const [sec, setSec] = useState(startSec);
  useEffect(() => { setSec(startSec); }, [startSec]);
  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => { setSec(s => s + 1); }, 1000);
    return () => clearInterval(interval);
  }, [active]);
  const pct = Math.min((sec / (WORK_HOURS * 3600)) * 100, 100);
  const overtime = sec > WORK_HOURS * 3600;
  return (
    <div className="h-1.5 bg-[#21262d] rounded-full mb-1 overflow-hidden">
      <div className={`h-full rounded-full ${overtime ? 'bg-amber-400' : 'bg-blue-500'}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ─── Sample Data ────────────────────────────────────────────────────────────
const DEMO_TASKS = [
  { id: 1, title: 'Design dashboard UI',        deadline: '22 May 2025', done: false },
  { id: 2, title: 'Implement idle detection',   deadline: '25 May 2025', done: false },
  { id: 3, title: 'Fix screenshot upload issue',deadline: '28 May 2025', done: false },
  { id: 4, title: 'Setup heartbeat service',    deadline: '18 May 2025', done: true  },
  { id: 5, title: 'Integrate notification center', deadline: '20 May 2025', done: true },
];

const TIMELINE_EVENTS = [
  { time: '09:00 AM', event: 'Punch In', desc: 'Work session started', color: 'bg-green-500' },
  { time: '09:05 AM', event: 'VS Code', desc: 'attendance.controller.ts', color: 'bg-blue-500' },
  { time: '10:15 AM', event: 'Google Chrome', desc: 'docs.google.com', color: 'bg-purple-500' },
  { time: '11:30 AM', event: 'Idle', desc: '5m 20s', color: 'bg-amber-500' },
  { time: '11:35 AM', event: 'VS Code', desc: 'user.service.ts', color: 'bg-blue-500' },
  { time: '01:00 PM', event: 'Lunch Break', desc: '45m', color: 'bg-slate-500' },
];

const SCREENSHOT_TILES = [
  { id: 1, time: '11:30:15 AM', desc: 'VS Code', url: 'https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=300&auto=format&fit=crop&q=60' },
  { id: 2, time: '11:28:15 AM', desc: 'Brave Browser', url: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=300&auto=format&fit=crop&q=60' },
  { id: 3, time: '11:26:15 AM', desc: 'Figma Design', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&auto=format&fit=crop&q=60' },
  { id: 4, time: '11:24:15 AM', desc: 'Slack Workspace', url: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=300&auto=format&fit=crop&q=60' }
];

const SYSTEM_LOGS = [
  { text: 'Screenshot uploaded successfully', time: '11:30 AM', type: 'success' },
  { text: 'Internet connection restored', time: '11:25 AM', type: 'info' },
  { text: 'Sync completed (12 items)', time: '11:24 AM', type: 'purple' },
  { text: 'Punch in successful', time: '09:00 AM', type: 'success' }
];

// ─── Icons (inline SVG) ──────────────────────────────────────────────────────
const Icon = {
  shield:   <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
  calendar: <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  monitor:  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>,
  check:    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><polyline points="20 6 9 17 4 12" /></svg>,
  punchout: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>,
  punchin:  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>,
  tasks:    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
  chevron:  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="6 9 12 15 18 9" /></svg>,
  right:    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="9 18 15 12 9 6" /></svg>,
  layout:   <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>,
};

// ─── Window Controls Bar ─────────────────────────────────────────────────────
function WinControls() {
  const api = eAPI();
  return (
    <div className="flex items-center gap-1.5" style={{ WebkitAppRegion: 'no-drag' } as any}>
      <button onClick={() => api?.minimizeWindow()}
        className="w-3 h-3 rounded-full bg-[#ffbd2e] hover:brightness-90 transition-all" />
      <button onClick={() => api?.maximizeWindow()}
        className="w-3 h-3 rounded-full bg-[#27c93f] hover:brightness-90 transition-all" />
      <button onClick={() => api?.closeWindow()}
        className="w-3 h-3 rounded-full bg-[#ff5f56] hover:brightness-90 transition-all" />
    </div>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────
export default function Dashboard({ onLogout }: { onLogout: () => void }) {
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // View mode switcher: 1 = Compact, 2 = Stats & Details, 3 = Logs & Screenshots
  const [viewMode, setViewMode] = useState<1 | 2 | 3>(1);

  const [punchStatus, setPunchStatus] = useState<'in' | 'out'>('out');
  const [punchInTime, setPunchInTime] = useState<Date | null>(null);
  const [elapsedSec, setElapsedSec]   = useState(0);
  const [totalSec, setTotalSec]       = useState(0);

  // Base productivity values
  const [prodSec, setProdSec]         = useState(0);
  const [neutSec, setNeutSec]         = useState(0);
  const [unprodSec, setUnprodSec]     = useState(0);

  const [_loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [activity, setActivity]       = useState<{ app: string; title: string } | null>(null);
  const [taskFilter, setTaskFilter]   = useState<'All' | 'Remaining' | 'Done'>('Remaining');
  
  // Dynamic data states
  const [tasks, setTasks]             = useState<any[]>(DEMO_TASKS);
  const [timelineEvents, setTimelineEvents] = useState<any[]>(TIMELINE_EVENTS);
  const [screenshotTiles, setScreenshotTiles] = useState<any[]>(SCREENSHOT_TILES);
  const [_projects, setProjects]       = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('Select Project');
  const [diagnostics, setDiagnostics] = useState({ cpuUsage: 18, memUsage: 52, diskUsage: 41 });
  const [unsyncedCount, setUnsyncedCount] = useState(0);
  const [serverConnected, setServerConnected] = useState(true);
  const [autoStart, setAutoStart]     = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [topApps, setTopApps]         = useState<any[]>([]);
  


  // App classification helper
  const classifyApp = (appName: string, windowTitle: string): 'productive' | 'neutral' | 'unproductive' => {
    const app = appName.toLowerCase();
    const title = windowTitle.toLowerCase();

    if (
      app.includes('youtube') || title.includes('youtube') ||
      app.includes('facebook') || title.includes('facebook') ||
      app.includes('twitter') || title.includes('twitter') ||
      app.includes('netflix') || title.includes('netflix') ||
      app.includes('spotify') || title.includes('spotify') ||
      app.includes('game') || title.includes('game') ||
      app.includes('discord') || title.includes('discord') ||
      app.includes('instagram') || title.includes('instagram') ||
      title.includes('song') || title.includes('music')
    ) {
      return 'unproductive';
    }

    if (app.includes('code') || app.includes('figma') || app.includes('git') || app.includes('terminal') || app.includes('cmd') || app.includes('powershell') || app.includes('word') || app.includes('excel') || app.includes('slack') || app.includes('teams') || app.includes('studio')) {
      return 'productive';
    }
    if (app.includes('browser') || app.includes('chrome') || app.includes('brave') || app.includes('safari') || app.includes('edge') || app.includes('firefox')) {
      return 'productive';
    }
    return 'neutral';
  };

  // Auth headers
  const headers = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
    'x-agent-key': localStorage.getItem('agentKey') || '',
  });

  const customFetch = async (url: string, options: RequestInit = {}) => {
    const res = await fetch(url, options);
    if (res.status === 401) {
      handleLogout();
      throw new Error('Unauthorized');
    }
    return res;
  };

  // Dynamic API fetchers
  const fetchTasks = async () => {
    try {
      const res = await customFetch(`${API_URL}/tasks`, { headers: headers() });
      const data = await res.json();
      if (data.success && data.data) {
        setTasks(data.data);
      }
    } catch {
      setTasks(DEMO_TASKS);
    }
  };

  const fetchScreenshots = async () => {
    try {
      const res = await customFetch(`${API_URL}/screenshots?limit=4`, { headers: headers() });
      const data = await res.json();
      if (data.success && data.data?.docs) {
        const host = API_URL.replace('/api', '');
        const tiles = data.data.docs.map((s: any) => ({
          id: s._id,
          time: new Date(s.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          desc: s.activeApp || 'Desktop',
          url: s.thumbnailUrl.startsWith('http') ? s.thumbnailUrl : `${host}${s.thumbnailUrl}`
        }));
        setScreenshotTiles(tiles.length > 0 ? tiles : SCREENSHOT_TILES);
      } else {
        setScreenshotTiles(SCREENSHOT_TILES);
      }
    } catch {
      setScreenshotTiles(SCREENSHOT_TILES);
    }
  };

  const fetchTimelineEvents = async () => {
    try {
      const res = await customFetch(`${API_URL}/activity?limit=6`, { headers: headers() });
      const data = await res.json();
      if (data.success && data.data?.logs) {
        const events = data.data.logs.map((log: any) => {
          let color = 'bg-gray-400';
          if (log.category === 'productive') color = 'bg-green-500';
          if (log.category === 'unproductive') color = 'bg-red-500';
          
          return {
            time: new Date(log.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            event: log.appName,
            desc: log.windowTitle || `${log.durationMinutes}m`,
            color
          };
        });
        setTimelineEvents(events.length > 0 ? events : TIMELINE_EVENTS);
      } else {
        setTimelineEvents(TIMELINE_EVENTS);
      }
    } catch {
      setTimelineEvents(TIMELINE_EVENTS);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await customFetch(`${API_URL}/projects`, { headers: headers() });
      const data = await res.json();
      if (data.success && data.data) {
        setProjects(data.data);
        if (data.data.length > 0 && selectedProject === 'Select Project') {
          setSelectedProject(data.data[0].name);
        }
      }
    } catch {
      setProjects([]);
    }
  };

  const fetchTopApps = async () => {
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const res = await customFetch(`${API_URL}/activity/summary?startDate=${todayStart.toISOString()}`, { headers: headers() });
      const data = await res.json();
      if (data.success && data.data?.topApps) {
        setTopApps(data.data.topApps);
      }
    } catch {
      // ignore
    }
  };

  // Fetch status on mount
  useEffect(() => {
    (async () => {
      try {
        const res  = await customFetch(`${API_URL}/agent/status`, { headers: headers() });
        const data = await res.json();
        if (data.success) {
          setTotalSec((data.data.totalWorkMinutes || 0) * 60);
          if (data.data.isPunchedIn) {
            const pit = new Date(data.data.punchInTime);
            setPunchStatus('in');
            setPunchInTime(pit);
            const serverElapsed = Math.floor((Date.now() - pit.getTime()) / 1000);
            setElapsedSec(serverElapsed);
            const pSec = Math.floor(serverElapsed * 0.75);
            const nSec = Math.floor(serverElapsed * 0.15);
            setProdSec(pSec);
            setNeutSec(nSec);
            setUnprodSec(serverElapsed - pSec - nSec);
            if (eAPI()) eAPI().setTracking(true);
          } else {
            if (eAPI()) eAPI().setTracking(false);
          }
        }
      } catch { /* ignore */ }
    })();

    // Fetch initial dynamic content
    fetchTasks();
    fetchScreenshots();
    fetchTimelineEvents();
    fetchProjects();
    fetchTopApps();

    const api = eAPI();
    if (api) {
      if (api.getAutoStart) {
        api.getAutoStart().then(setAutoStart).catch(() => {});
      }
      if (api.onIdleStatusChanged) {
        api.onIdleStatusChanged((data: any) => {
          if (data.isIdle) {
            new Notification("EMS Monitoring", { body: "You are idle now. Idle tracking started." });
            setLogs(prev => [
              { text: "Idle state detected (inactive for 5 min)", time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), type: 'info' },
              ...prev.slice(0, 19)
            ]);
          } else {
            new Notification("EMS Monitoring", { body: "Active state restored." });
            setLogs(prev => [
              { text: "User is active again", time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), type: 'success' },
              ...prev.slice(0, 19)
            ]);
          }
        });
      }
    }
  }, []);

  // Poll active app and update productivity stats in 5-second steps
  useEffect(() => {
    if (punchStatus !== 'in') return;
    const poll = async () => {
      const api = eAPI();
      if (!api) return;
      
      let appName = 'Unknown';
      let titleStr = '';
      try {
        const win = await api.getCurrentActivity();
        if (win) {
          appName = win.owner?.name || win.title || 'Unknown';
          titleStr = win.title || '';
          if (!['Electron', 'ems-desktop-app'].includes(appName)) {
            setActivity({ app: appName, title: titleStr });
          }
        }
      } catch (err) {
        console.error('Failed to get active activity in dashboard poll:', err);
      }
      
      const cat = classifyApp(appName, titleStr);
      if (cat === 'productive') setProdSec(p => p + 5);
      else if (cat === 'neutral') setNeutSec(n => n + 5);
      else setUnprodSec(u => u + 5);
      setElapsedSec(e => e + 5);
    };
    poll();
    const id = setInterval(poll, 5000);
    return () => clearInterval(id);
  }, [punchStatus]);

  // Poll system diagnostics
  useEffect(() => {
    const pollDiag = async () => {
      const api = eAPI();
      if (api && api.getDiagnostics) {
        try {
          const stats = await api.getDiagnostics();
          if (stats) setDiagnostics(stats);
        } catch {
          // Gracefully fallback
        }
      }
    };
    pollDiag();
    const id = setInterval(pollDiag, 4000);
    return () => clearInterval(id);
  }, []);

  // Diagnostics logs state & Electron capture hooks
  const [logs, setLogs] = useState<any[]>(SYSTEM_LOGS);

  useEffect(() => {
    const api = eAPI();
    if (!api) return;

    const handleScreenshot = () => {
      setLogs(prev => [
        { text: 'Screenshot captured & uploaded successfully', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), type: 'success' },
        ...prev.slice(0, 4)
      ]);
      fetchScreenshots();
    };

    api.onScreenshotCaptured(handleScreenshot);
  }, []);

  // Poll unsynced count & server status
  useEffect(() => {
    const checkStatus = async () => {
      const api = eAPI();
      if (api && api.getQueueCount) {
        try {
          const cnt = await api.getQueueCount();
          setUnsyncedCount(cnt);
        } catch {}
      }
      try {
        const res = await fetch(`${API_URL.replace('/api', '')}/api/health`);
        setServerConnected(res.ok);
      } catch {
        setServerConnected(false);
      }
    };
    checkStatus();
    const id = setInterval(checkStatus, 20000);
    return () => clearInterval(id);
  }, []);

  // Periodic background refresh for dynamic content to prevent rate limit hits
  useEffect(() => {
    const refreshData = () => {
      fetchTasks();
      fetchTimelineEvents();
      fetchProjects();
      fetchTopApps();
    };
    const id = setInterval(refreshData, 30000);
    return () => clearInterval(id);
  }, []);

  const handlePunch = async (type: 'in' | 'out') => {
    setError(''); setLoading(true);
    try {
      const res  = await customFetch(`${API_URL}/agent/punch-${type}`, {
        method: 'POST', headers: headers(),
        body: JSON.stringify({ ip: '127.0.0.1' }),
      });
      const data = await res.json();
      if (data.success) {
        if (type === 'in') {
          const now = new Date();
          setPunchStatus('in'); setPunchInTime(now); setElapsedSec(0);
          setProdSec(0); setNeutSec(0); setUnprodSec(0);
          if (eAPI()) eAPI().setTracking(true);
          new Notification("EMS Monitor", { body: "Punch In successful. Tracking started." });
          setLogs(prev => [
            { text: "Punch in successful", time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), type: 'success' },
            ...prev.slice(0, 19)
          ]);
        } else {
          setTotalSec(elapsedSec);
          setPunchStatus('out'); setPunchInTime(null); setActivity(null);
          if (eAPI()) eAPI().setTracking(false);
          new Notification("EMS Monitor", { body: "Punch Out successful. Tracking paused." });
          setLogs(prev => [
            { text: "Punch out successful", time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), type: 'info' },
            ...prev.slice(0, 19)
          ]);
        }
      } else { setError(data.message || 'Failed'); }
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  };

  const handleLogout = async () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('agentKey');
    if (eAPI()) {
      await eAPI().setTracking(false);
      await eAPI().clearTokens();
    }
    onLogout();
  };

  const handleToggleAutoStart = async () => {
    const next = !autoStart;
    const api = eAPI();
    if (api && api.setAutoStart) {
      const ok = await api.setAutoStart(next);
      if (ok) setAutoStart(next);
    }
  };

  const toggleTask = async (id: string, done: boolean) => {
    try {
      const res = await customFetch(`${API_URL}/tasks/${id}`, {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify({ done: !done })
      });
      const data = await res.json();
      if (data.success) {
        setTasks(ts => ts.map(t => (t._id === id || t.id === id) ? { ...t, done: !done } : t));
      }
    } catch {
      // Local fallback
      setTasks(ts => ts.map(t => (t._id === id || t.id === id) ? { ...t, done: !done } : t));
    }
  };

  const filteredTasks = tasks.filter(t =>
    taskFilter === 'All' ? true : taskFilter === 'Done' ? t.done : !t.done);

  const overtime = elapsedSec > WORK_HOURS * 3600;
  const inAtStr  = punchInTime
    ? punchInTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  // Productivity percentages
  const totalProdSec = prodSec + neutSec + unprodSec;
  const prodPct = totalProdSec > 0 ? Math.round((prodSec / totalProdSec) * 100) : 0;
  const neutPct = totalProdSec > 0 ? Math.round((neutSec / totalProdSec) * 100) : 0;
  const unprodPct = totalProdSec > 0 ? Math.max(0, 100 - prodPct - neutPct) : 0;

  const cycleView = () => {
    setViewMode(prev => (prev === 1 ? 2 : prev === 2 ? 3 : 1));
  };

  return (
    <div className="flex flex-col h-screen bg-[#0d1117] text-white overflow-hidden text-sm select-none">

      {/* ── Custom Title Bar ──────────────────────────────────── */}
      <header
        className="flex items-center justify-between px-4 py-2.5 bg-[#0d1117] border-b border-[#21262d] flex-shrink-0"
        style={{ WebkitAppRegion: 'drag' } as any}
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center text-white flex-shrink-0">
            {Icon.shield}
          </div>
          <div>
            <p className="text-xs font-bold text-white leading-none tracking-wide">EMS AGENT</p>
            <p className="text-[10px] text-slate-500 leading-none mt-0.5">{VERSION}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs font-medium text-green-400">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            {punchStatus === 'in' ? 'Working' : 'Offline'}
          </span>

          {/* ── Page Switcher Icon (Top Right Header) ─────────── */}
          <button
            onClick={cycleView}
            title="Cycle View Layout"
            className="p-1 rounded bg-[#161b22] border border-[#30363d] hover:bg-[#21262d] text-blue-400 transition-colors flex items-center justify-center"
            style={{ WebkitAppRegion: 'no-drag' } as any}
          >
            {Icon.layout}
          </button>

          <button
            onClick={handleLogout}
            className="text-xs text-slate-400 hover:text-white transition-colors px-1"
            style={{ WebkitAppRegion: 'no-drag' } as any}
          >
            Logout
          </button>
          <WinControls />
        </div>
      </header>

      {/* ── Scrollable Body ───────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-3">

        {/* Error banner */}
        {error && (
          <div className="mb-3 text-xs text-red-400 bg-red-950/50 border border-red-800/40 rounded-lg px-3 py-2">
            ⚠ {error}
          </div>
        )}

        {/* VIEW 1: COMPACT GRID (Attendance + Productivity + App + Tasks) */}
        {viewMode === 1 && (
          <div className="grid grid-cols-1 min-[600px]:grid-cols-2 gap-3">
            <div className="space-y-3">
              {/* Attendance */}
              <section className="bg-[#161b22] border border-[#21262d] rounded-xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#21262d]">
                  <span className="text-blue-400">{Icon.calendar}</span>
                  <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-widest">Attendance</span>
                </div>
                <div className="px-4 py-4">
                  {punchStatus === 'in' ? (
                    <>
                      <div className="text-center mb-3">
                        <div className={`text-4xl font-mono font-bold tracking-tight leading-none ${overtime ? 'text-amber-400' : 'text-white'}`}>
                          <TimerDisplay startSec={elapsedSec} active={punchStatus === 'in'} />
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1.5">
                          Goal: {WORK_HOURS} hrs{inAtStr && <span> • In at {inAtStr}</span>}
                        </p>
                      </div>
                      <ProgressBar startSec={elapsedSec} active={punchStatus === 'in'} />
                      <div className="flex justify-between text-[10px] text-slate-600 mb-3.5">
                        <span>0 hr</span>
                        <span><HMDisplay startSec={elapsedSec} active={punchStatus === 'in'} /> / {WORK_HOURS} hr</span>
                        <span>{WORK_HOURS} hr</span>
                      </div>
                      <button onClick={() => handlePunch('out')} className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2">
                        {Icon.punchout} Punch Out
                      </button>
                    </>
                  ) : (
                    <>
                      {totalSec > 0 && (
                        <div className="text-center mb-3 p-3 bg-[#0d1117] rounded-lg border border-[#21262d]">
                          <p className="text-[10px] text-slate-500 mb-0.5">Last Session</p>
                          <p className="text-2xl font-bold">{formatHM(totalSec)}</p>
                        </div>
                      )}
                      <button onClick={() => handlePunch('in')} className="w-full py-2.5 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2">
                        {Icon.punchin} Punch In
                      </button>
                    </>
                  )}
                </div>
              </section>

              {/* Productivity */}
              <section className="bg-[#161b22] border border-[#21262d] rounded-xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#21262d]">
                  <span className="text-blue-400">{Icon.layout}</span>
                  <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-widest">Productivity</span>
                </div>
                <div className="px-4 py-4">
                  <div className="flex h-3 w-full rounded-full overflow-hidden bg-[#21262d] mb-4">
                    <div style={{ width: `${prodPct}%` }} className="bg-green-500" />
                    <div style={{ width: `${neutPct}%` }} className="bg-gray-400" />
                    <div style={{ width: `${unprodPct}%` }} className="bg-red-500" />
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-center">
                    <div>
                      <div className="flex items-center justify-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        <span className="font-semibold text-green-400 text-xs">{prodPct}%</span>
                      </div>
                      <p className="text-[9px] text-slate-500 uppercase mt-0.5 leading-none">Productive</p>
                      <p className="text-[10px] text-slate-400 font-semibold mt-1">{formatHM(prodSec)}</p>
                    </div>
                    <div>
                      <div className="flex items-center justify-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                        <span className="font-semibold text-slate-300 text-xs">{neutPct}%</span>
                      </div>
                      <p className="text-[9px] text-slate-500 uppercase mt-0.5 leading-none">Neutral</p>
                      <p className="text-[10px] text-slate-400 font-semibold mt-1">{formatHM(neutSec)}</p>
                    </div>
                    <div>
                      <div className="flex items-center justify-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        <span className="font-semibold text-red-400 text-xs">{unprodPct}%</span>
                      </div>
                      <p className="text-[9px] text-slate-500 uppercase mt-0.5 leading-none">Unproductive</p>
                      <p className="text-[10px] text-slate-400 font-semibold mt-1">{formatHM(unprodSec)}</p>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <div className="space-y-3">
              {/* Active App */}
              <section className="bg-[#161b22] border border-[#21262d] rounded-xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#21262d]">
                  <span className="text-blue-400">{Icon.monitor}</span>
                  <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-widest">Active App</span>
                </div>
                <div className="px-4 py-3 flex items-center justify-between">
                  {activity ? (
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-2 h-2 bg-green-400 rounded-full flex-shrink-0 animate-pulse" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{activity.app}</p>
                        <p className="text-[11px] text-slate-500 truncate">{activity.title}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-600 italic">No app tracked yet</p>
                  )}
                </div>
              </section>

              {/* Tasks */}
              <section className="bg-[#161b22] border border-[#21262d] rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 border-b border-[#21262d]">
                  <div className="flex items-center gap-2">
                    <span className="text-blue-400">{Icon.tasks}</span>
                    <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-widest">Tasks</span>
                  </div>
                  <select
                    value={taskFilter}
                    onChange={(e) => setTaskFilter(e.target.value as any)}
                    className="bg-[#0d1117] border border-[#30363d] text-[10px] font-semibold text-slate-300 rounded px-2 py-1 outline-none cursor-pointer hover:border-slate-500 transition-colors"
                  >
                    <option value="Remaining">Remaining</option>
                    <option value="Done">Done</option>
                    <option value="All">All</option>
                  </select>
                </div>
                <div className="divide-y divide-[#21262d]">
                  {filteredTasks.map(task => (
                    <div key={task._id || task.id} className="flex items-center justify-between px-4 py-2 hover:bg-[#1c2128] transition-colors cursor-pointer" onClick={() => toggleTask(task._id || task.id, task.done)}>
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${task.done ? 'border-green-500 bg-green-500/20 text-green-400' : 'border-[#30363d] text-transparent'}`}>{task.done && Icon.check}</div>
                        <span className={`text-xs truncate ${task.done ? 'text-slate-500 line-through' : 'text-slate-200'}`}>{task.title}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        )}

        {/* VIEW 2: SCREEN TWO (Attendance timer, current status, current app, today's activity, timeline, diagnostics logs) */}
        {viewMode === 2 && (
          <div className="space-y-3">
            {/* Top row: Status & Statistics */}
            <div className="grid grid-cols-2 min-[600px]:grid-cols-4 gap-2.5">
              {/* Attendance Timer Card */}
              <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-3 flex flex-col justify-between">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Attendance Timer</p>
                  <h2 className="text-xl font-mono font-bold text-white mt-1">
                    {punchStatus === 'in' ? <TimerDisplay startSec={elapsedSec} active={punchStatus === 'in'} /> : '00:00:00'}
                  </h2>
                  <p className="text-[10px] text-slate-400 mt-0.5">Goal: 8h 00m</p>
                </div>
                <div className="mt-2 text-[10px] text-slate-500">
                  <p>Started at: {inAtStr || 'Not started'}</p>
                </div>
              </div>

              {/* Working Status Card */}
              <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-3 flex flex-col justify-between">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Current Status</p>
                  <h2 className={`text-md font-bold mt-1 flex items-center gap-1.5 ${punchStatus === 'in' ? 'text-green-400' : 'text-slate-400'}`}>
                    <span className={`w-2 h-2 rounded-full ${punchStatus === 'in' ? 'bg-green-400 animate-pulse' : 'bg-slate-400'}`} />
                    {punchStatus === 'in' ? 'Working' : 'Punched Out'}
                  </h2>
                </div>
                <div className="mt-2">
                  <p className="text-[10px] text-slate-500">Productive Time</p>
                  <p className="text-sm font-bold text-white mt-0.5">{formatHM(prodSec)} <span className="text-[10px] text-green-400">({prodPct}%)</span></p>
                </div>
              </div>

              {/* Current Activity details */}
              <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-3.5 flex items-center gap-3">
                {activity ? (
                  <AppLogo appName={activity.app} windowTitle={activity.title} className="w-10 h-10 flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 bg-[#0d1117] border border-[#21262d] rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Current App</p>
                  <p className="text-sm font-bold text-white mt-0.5 truncate">{activity ? activity.app : 'None'}</p>
                  <p className="text-[9px] text-slate-400 truncate mt-0.5">{activity ? activity.title : 'No window active'}</p>
                </div>
              </div>

              {/* Today's Activity Details */}
              <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-4 flex flex-col justify-between min-[600px]:col-span-1">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-3">Today's Activity</p>
                  <div className="flex items-center justify-between gap-4">
                    <div className="relative w-20 h-20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                        <path className="text-[#21262d]" strokeWidth="3.5" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        <path className="text-green-500" strokeWidth="3.5" strokeDasharray={`${prodPct}, 100`} strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                      </svg>
                      <div className="absolute flex flex-col items-center justify-center text-center">
                        <span className="text-sm font-bold text-white">{prodPct}%</span>
                        <span className="text-[8px] text-slate-400 font-semibold leading-none">Productive</span>
                      </div>
                    </div>
                    
                    <div className="flex-1 space-y-1.5 text-[11px] text-slate-300">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500" />Productive</span>
                        <span className="font-semibold text-white">{prodPct}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" />Neutral</span>
                        <span className="font-semibold text-white">{neutPct}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" />Unproductive</span>
                        <span className="font-semibold text-white">{unprodPct}%</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-3.5 border-t border-[#21262d] pt-2 text-center">
                  <span className="text-[10px] text-slate-500 font-medium">Total Time: <HMDisplay startSec={elapsedSec} active={punchStatus === 'in'} /></span>
                </div>
              </div>
            </div>



            {/* Diagnostics Logs */}
            <section className="bg-[#161b22] border border-[#21262d] rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#21262d]">
                <span className="text-blue-400">{Icon.tasks}</span>
                <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-widest">Diagnostics Logs</span>
              </div>
              <div className="divide-y divide-[#21262d]">
                {logs.map((log, idx) => (
                  <div key={idx} className="px-4 py-2 flex items-center justify-between text-xs">
                    <span className="text-slate-300 flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${log.type === 'success' ? 'bg-green-500' : 'bg-blue-400'}`} />
                      {log.text}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">{log.time}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* VIEW 3: SCREEN THREE (System diagnostics, productivity summary, top application, quick actions and more) */}
        {viewMode === 3 && (
          <div className="space-y-3">
            {/* Horizontal Status Row (3rd SS) */}
            <div className="grid grid-cols-3 min-[600px]:grid-cols-6 gap-2 bg-[#161b22] border border-[#21262d] rounded-xl p-2.5">
              {/* Internet */}
              <div className="flex items-center gap-1.5 p-1.5 bg-[#0d1117] border border-[#21262d] rounded-lg">
                <span className="text-slate-500">
                  <svg className="w-3.5 h-3.5 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
                </span>
                <div>
                  <p className="text-[8px] text-slate-500 uppercase leading-none font-semibold">Internet</p>
                  <p className={`text-[10px] font-bold mt-0.5 leading-none ${navigator.onLine ? 'text-green-400' : 'text-red-400'}`}>
                    {navigator.onLine ? 'Connected' : 'Offline'}
                  </p>
                </div>
              </div>

              {/* Server */}
              <div className="flex items-center gap-1.5 p-1.5 bg-[#0d1117] border border-[#21262d] rounded-lg">
                <span className="text-slate-500">
                  <svg className="w-3.5 h-3.5 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="2" y="2" width="20" height="8" rx="2" ry="2" /><rect x="2" y="14" width="20" height="8" rx="2" ry="2" /><line x1="6" y1="6" x2="6.01" y2="6" /><line x1="6" y1="18" x2="6.01" y2="18" /></svg>
                </span>
                <div>
                  <p className="text-[8px] text-slate-500 uppercase leading-none font-semibold">Server</p>
                  <p className={`text-[10px] font-bold mt-0.5 leading-none ${serverConnected ? 'text-green-400' : 'text-red-400'}`}>
                    {serverConnected ? 'Connected' : 'Offline'}
                  </p>
                </div>
              </div>

              {/* Heartbeat */}
              <div className="flex items-center gap-1.5 p-1.5 bg-[#0d1117] border border-[#21262d] rounded-lg">
                <span className="text-slate-500">
                  <svg className="w-3.5 h-3.5 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
                </span>
                <div>
                  <p className="text-[8px] text-slate-500 uppercase leading-none font-semibold">Heartbeat</p>
                  <p className={`text-[10px] font-bold mt-0.5 leading-none ${punchStatus === 'in' ? 'text-green-400' : 'text-slate-500'}`}>
                    {punchStatus === 'in' ? 'Running' : 'Stopped'}
                  </p>
                </div>
              </div>

              {/* Screenshots */}
              <div className="flex items-center gap-1.5 p-1.5 bg-[#0d1117] border border-[#21262d] rounded-lg relative">
                <span className="text-slate-500">
                  <svg className="w-3.5 h-3.5 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="text-[8px] text-slate-500 uppercase leading-none font-semibold">Screenshots</p>
                    <span className="text-[7px] bg-blue-500/25 text-blue-400 font-bold px-0.5 rounded">{screenshotTiles.length}</span>
                  </div>
                  <p className={`text-[10px] font-bold mt-0.5 leading-none ${punchStatus === 'in' ? 'text-green-400' : 'text-slate-500'}`}>
                    {punchStatus === 'in' ? 'Running' : 'Stopped'}
                  </p>
                </div>
              </div>

              {/* Activity */}
              <div className="flex items-center gap-1.5 p-1.5 bg-[#0d1117] border border-[#21262d] rounded-lg">
                <span className="text-slate-500">
                  <svg className="w-3.5 h-3.5 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                </span>
                <div>
                  <p className="text-[8px] text-slate-500 uppercase leading-none font-semibold">Activity</p>
                  <p className={`text-[10px] font-bold mt-0.5 leading-none ${punchStatus === 'in' ? 'text-green-400' : 'text-slate-500'}`}>
                    {punchStatus === 'in' ? 'Running' : 'Stopped'}
                  </p>
                </div>
              </div>

              {/* Sync Queue */}
              <div className="flex items-center gap-1.5 p-1.5 bg-[#0d1117] border border-[#21262d] rounded-lg">
                <span className="text-slate-500">
                  <svg className="w-3.5 h-3.5 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" /></svg>
                </span>
                <div>
                  <p className="text-[8px] text-slate-500 uppercase leading-none font-semibold">Sync Queue</p>
                  <p className={`text-[10px] font-bold mt-0.5 leading-none ${unsyncedCount > 0 ? 'text-amber-400 animate-pulse' : 'text-green-400'}`}>
                    {unsyncedCount > 0 ? `${unsyncedCount} Pending` : 'Synced'}
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Actions & System Resources */}
            <div className="grid grid-cols-1 min-[600px]:grid-cols-2 gap-3">
              {/* Resource Usage */}
              <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-4 space-y-3">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">System Diagnostics</p>
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>CPU Usage</span>
                      <span className="font-semibold text-white">{diagnostics.cpuUsage}%</span>
                    </div>
                    <div className="h-1 bg-[#21262d] rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${diagnostics.cpuUsage}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>Memory Usage</span>
                      <span className="font-semibold text-white">{diagnostics.memUsage}%</span>
                    </div>
                    <div className="h-1 bg-[#21262d] rounded-full overflow-hidden">
                      <div className="h-full bg-yellow-500 rounded-full transition-all duration-500" style={{ width: `${diagnostics.memUsage}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>Disk Status</span>
                      <span className="font-semibold text-white">{diagnostics.diskUsage}%</span>
                    </div>
                    <div className="h-1 bg-[#21262d] rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full transition-all duration-500" style={{ width: `${diagnostics.diskUsage}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Productivity Summary Card (4th SS) */}
              <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Productivity Summary</p>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div>
                      <p className="text-[10px] text-slate-500">Productive Time</p>
                      <p className="text-md font-bold text-green-400">{formatHM(prodSec)}</p>
                      <span className="text-[8px] text-green-500">▲ 12% vs yesterday</span>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500">Idle Time</p>
                      <p className="text-md font-bold text-amber-400">{formatHM(neutSec)}</p>
                      <span className="text-[8px] text-amber-500">▼ 8% vs yesterday</span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 border-t border-[#21262d] pt-2">
                  <p className="text-[9px] text-slate-500 uppercase font-semibold">Top Applications</p>
                  <div className="space-y-1 mt-1 text-[11px]">
                    {topApps.length > 0 ? (
                      topApps.slice(0, 3).map((app, idx) => (
                        <div key={idx} className="flex justify-between text-slate-300">
                          <span>{app._id}</span>
                          <span className="font-mono text-slate-400">{formatHM(app.totalMinutes * 60)}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-500 italic">No activity recorded today</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions (4th SS) */}
            <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-4">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-3">Quick Actions</p>
              <div className="grid grid-cols-4 gap-2">
                <button className="flex flex-col items-center gap-1.5 p-2 bg-[#0d1117] border border-[#21262d] hover:border-blue-500/50 rounded-lg text-slate-300 transition-colors">
                  <svg className="w-4 h-4 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" /></svg>
                  <span className="text-[10px]">Start Break</span>
                </button>
                
                <button className="flex flex-col items-center gap-1.5 p-2 bg-[#0d1117] border border-[#21262d] hover:border-blue-500/50 rounded-lg text-slate-300 transition-colors">
                  <svg className="w-4 h-4 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
                  <span className="text-[10px]">Projects</span>
                </button>

                <button onClick={() => { fetchTasks(); fetchTimelineEvents(); }} className="flex flex-col items-center gap-1.5 p-2 bg-[#0d1117] border border-[#21262d] hover:border-blue-500/50 rounded-lg text-slate-300 transition-colors">
                  <svg className="w-4 h-4 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" /></svg>
                  <span className="text-[10px]">Sync Now</span>
                </button>

                <button onClick={() => setShowSettings(true)} className="flex flex-col items-center gap-1.5 p-2 bg-[#0d1117] border border-[#21262d] hover:border-blue-500/50 rounded-lg text-slate-300 transition-colors">
                  <svg className="w-4 h-4 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
                  <span className="text-[10px]">Settings</span>
                </button>
              </div>
            </div>

            {/* Motivational Banner (4th SS) */}
            <div className="bg-gradient-to-r from-blue-600/25 to-purple-600/10 border border-blue-500/20 rounded-xl p-3 flex items-center gap-3">
              <span className="text-xl">{prodPct >= 80 ? '🏆' : '💪'}</span>
              <div>
                <p className="text-xs font-bold text-blue-200">{prodPct >= 80 ? 'You are doing great! 🎉' : 'Keep improving! 👍'}</p>
                <p className="text-[10px] text-slate-400">
                  Your productivity is {prodPct}%, which is {prodPct >= 80 ? 'higher than or equal to' : 'below'} yesterday's target (80%). {prodPct >= 80 ? 'Keep it up!' : 'Focus on key tasks to boost your score!'}
                </p>
              </div>
            </div>
          </div>
        )}

        {showSettings && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-[#161b22] border border-[#21262d] rounded-xl w-full max-w-xs overflow-hidden shadow-2xl">
              <div className="flex justify-between items-center px-4 py-3 border-b border-[#21262d]">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Agent Settings</span>
                <button onClick={() => setShowSettings(false)} className="text-slate-500 hover:text-white text-xs">✕</button>
              </div>
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-200">Start with Windows</p>
                    <p className="text-[9px] text-slate-500">Launch EMS agent automatically at login</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoStart}
                    onChange={handleToggleAutoStart}
                    className="w-4 h-4 accent-blue-600 rounded bg-[#0d1117] border border-[#30363d] cursor-pointer"
                  />
                </div>
              </div>
              <div className="px-4 py-2.5 bg-[#0d1117] border-t border-[#21262d] flex justify-end">
                <button onClick={() => setShowSettings(false)} className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded text-xs transition-colors">
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="flex items-center justify-between px-4 py-2 bg-[#0d1117] border-t border-[#21262d] flex-shrink-0">
        <span className="flex items-center gap-1.5 text-[10px] text-slate-500">
          <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
          System running smoothly
        </span>
        <span className="text-[10px] text-slate-600">
          ID: {user.employeeId || user.email?.split('@')[0]?.toUpperCase() || 'EMP'}
        </span>
        <span className="text-[10px] text-slate-600">{VERSION}</span>
      </footer>
    </div>
  );
}
