import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Clock, MapPin, Monitor, CheckSquare, CalendarCheck,
  Download, Shield, Layers, Activity, Check, ChevronRight,
  Users, Bell, Navigation, Lock, Globe, FileText, Smartphone,
  Laptop, Chrome, Plus, Minus, Star, ArrowRight, Zap, Eye,
  TrendingUp, BarChart2, Award, RefreshCw, Play, Sun, Moon
} from 'lucide-react';

/* â”€â”€â”€ Animated Counter Hook â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function useCountUp(target: number, duration = 1800, start = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime: number | null = null;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, start]);
  return count;
}

/* â”€â”€â”€ Intersection Observer Hook â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function useInView(threshold = 0.2) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); observer.disconnect(); } },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);
  return { ref, inView };
}

/* â”€â”€â”€ Floating Orbs Background â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const FloatingOrbs = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-blue-600/10 blur-[120px] animate-pulse" style={{ animationDuration: '6s' }} />
    <div className="absolute top-[10%] right-[-15%] w-[500px] h-[500px] rounded-full bg-purple-600/8 blur-[100px] animate-pulse" style={{ animationDuration: '8s', animationDelay: '2s' }} />
    <div className="absolute bottom-[-10%] left-[30%] w-[400px] h-[400px] rounded-full bg-cyan-500/8 blur-[100px] animate-pulse" style={{ animationDuration: '7s', animationDelay: '1s' }} />
  </div>
);

/* â”€â”€â”€ Grid Overlay â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const GridOverlay = () => (
  <div className="absolute inset-0 pointer-events-none" style={{
    backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
    backgroundSize: '60px 60px'
  }} />
);

const LandingPage: React.FC = () => {
  const { user } = useAuth();
  const [timeStr, setTimeStr] = useState('');
  const [activeRole, setActiveRole] = useState<'super' | 'company' | 'manager' | 'hr' | 'employee'>('super');
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [scrollY, setScrollY] = useState(0);
  const [headerScrolled, setHeaderScrolled] = useState(false);
  const [isDark, setIsDark] = useState<boolean>(() => {
    try { return localStorage.getItem('ems-theme') !== 'light'; } catch { return true; }
  });

  const toggleTheme = () => {
    setIsDark(prev => {
      const next = !prev;
      try { localStorage.setItem('ems-theme', next ? 'dark' : 'light'); } catch {}
      return next;
    });
  };

  const { ref: statsRef, inView: statsInView } = useInView();
  const users500 = useCountUp(500, 2000, statsInView);
  const companies120 = useCountUp(120, 2000, statsInView);
  const uptime = useCountUp(99, 1500, statsInView);
  const modules = useCountUp(20, 1800, statsInView);

  useEffect(() => {
    const tzFmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    const tick = () => setTimeStr(tzFmt.format(new Date()) + ' IST');
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
      setHeaderScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const roster = [
    { name: 'Aarav Shah', role: 'Backend Dev', status: 'onsite', label: 'At Office', time: '09:02', avatar: 'AS' },
    { name: 'Priya Nair', role: 'UI Designer', status: 'remote', label: 'Remote', time: '08:47', avatar: 'PN' },
    { name: 'Rohit Verma', role: 'Field Sales', status: 'onsite', label: 'At Office', time: '09:15', avatar: 'RV' },
    { name: 'Sana Sheikh', role: 'HR Lead', status: 'away', label: 'On Leave', time: 'â€”', avatar: 'SS' },
    { name: 'Karan Mehta', role: 'QA Engineer', status: 'remote', label: 'Remote', time: '09:31', avatar: 'KM' },
  ];

  const testimonials = [
    { name: 'Ravi Patel', role: 'CEO, TechnoSync India', text: 'EMS transformed how we manage 200+ employees across 4 cities. The real-time location and attendance data alone saved us 15 hours of admin work per week.', stars: 5, avatar: 'RP' },
    { name: 'Meera Iyer', role: 'HR Manager, CloudWave Solutions', text: 'The role-based dashboards are genius. My team sees what they need, managers see what matters to them. No confusion, no data leaks. Finally.', stars: 5, avatar: 'MI' },
    { name: 'Arjun Bose', role: 'Operations Head, Flexstaff', text: 'We have field agents, remote workers, and office staff. EMS handles all three in one place with zero friction. Setup took 20 minutes.', stars: 5, avatar: 'AB' },
  ];

  const faqs = [
    { q: 'Does this track employees who work from home?', a: 'Yes. Remote punches are geo-tagged with the actual address instead of "At Office" â€” nothing is blocked, it\'s just labeled honestly so managers see office vs. remote vs. field at a glance.' },
    { q: 'What\'s the difference between the desktop agent and just using the website?', a: 'The web dashboard covers punch-in/out, leave, and tasks from any browser. The desktop agent additionally captures idle time, keyboard/mouse activity, and periodic screenshots in the background â€” install it when you need productivity data, skip it when you don\'t.' },
    { q: 'Can one employee see another employee\'s screenshots or location?', a: 'No. Every request is checked against RBAC â€” employees see only their own activity; managers see only their assigned team; company admins see their own tenant. Data never crosses tenants.' },
    { q: 'What happens to our data if we cancel?', a: 'Your records stay under your tenant and stay exportable (Excel/PDF) for as long as your account is active. Talk to us before cancelling if you need a full export.' },
    { q: 'Is there a mobile app for field employees?', a: 'Yes â€” punch-in/out, work-mode switching, and location tracking all run through a dedicated mobile API, built for teams that are rarely at a desk.' },
    { q: 'How quickly can we get our team onboarded?', a: 'Most companies go live in under 30 minutes. Register â†’ add employees â†’ configure your office location â†’ done. Employees receive an email invite and can log in immediately.' },
  ];

  return (
    <div data-theme={isDark ? 'dark' : 'light'} className="ems-landing min-h-screen font-sans selection:bg-blue-500/30 overflow-x-hidden">

      {/* â”€â”€ HEADER â”€â”€ */}
      <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        headerScrolled
          ? 'ems-header-scrolled backdrop-blur-xl'
          : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="relative w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.5)] group-hover:shadow-[0_0_30px_rgba(59,130,246,0.7)] transition-all duration-300">
              <div className="w-3 h-3 bg-white rounded-full opacity-90" />
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-cyan-400 rounded-full border-2 border-[#080c14]" />
            </div>
            <span className="ems-logo-text font-bold text-lg tracking-tight">EMS<span className="text-blue-400">.</span></span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {[['Features', '#features'], ['How it works', '#how-it-works'], ['Roles', '#roles'], ['Pricing', '#pricing'], ['FAQ', '#faq']].map(([item, href]) => (
              <a key={item} href={href} className="ems-nav-link px-4 py-2 text-sm rounded-lg transition-all duration-200">{item}</a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="ems-theme-btn relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 overflow-hidden group"
            >
              <span className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${isDark ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
                <Sun className="w-5 h-5 text-amber-400" />
              </span>
              <span className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${isDark ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
                <Moon className="w-5 h-5 text-blue-600" />
              </span>
            </button>

            {user ? (
              <Link to="/dashboard" className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-cyan-500 text-white text-sm font-semibold py-2 px-5 rounded-xl transition-all duration-300 shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)]">
                Dashboard <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link to="/login" className="ems-login-link hidden sm:flex text-sm font-medium py-2 px-4 rounded-lg transition-all duration-200">Log in</Link>
                <Link to="/register" className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-cyan-500 text-white text-sm font-semibold py-2 px-5 rounded-xl transition-all duration-300 shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)]">
                  Start free <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* â”€â”€ HERO â”€â”€ */}
        <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">
          <FloatingOrbs />
          <GridOverlay />
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(59,130,246,0.12) 0%, transparent 70%)' }} />

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 w-full">
            <div className="flex flex-col lg:flex-row items-center gap-16">

              {/* Left: Copy */}
              <div className="flex-1 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-8 backdrop-blur-sm">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                  </span>
                  Trusted by 120+ companies across India
                </div>

                <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-white tracking-tight mb-6 leading-[1.05]">
                  Workforce clarity{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400" style={{ backgroundSize: '200% auto', animation: 'gradient-x 3s ease infinite' }}>
                    without
                  </span>
                  <br />the guesswork.
                </h1>

                <p className="text-lg sm:text-xl text-slate-400 mb-10 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                  EMS gives you real-time attendance, activity, and location for every employee â€”
                  whether they're at the office, WFH, or in the field.
                  <span className="text-slate-300"> One dashboard. Every role. Zero blind spots.</span>
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 mb-8">
                  {user ? (
                    <Link to="/dashboard" className="group w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-cyan-500 text-white font-bold py-4 px-8 rounded-2xl transition-all duration-300 shadow-[0_0_30px_rgba(59,130,246,0.4)] text-base">
                      Go to Dashboard <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  ) : (
                    <>
                      <Link to="/register" className="group w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-cyan-500 text-white font-bold py-4 px-8 rounded-2xl transition-all duration-300 shadow-[0_0_30px_rgba(59,130,246,0.4)] hover:shadow-[0_0_50px_rgba(59,130,246,0.6)] text-base">
                        Start free trial <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </Link>
                      <a href="#how-it-works" className="group w-full sm:w-auto flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white font-semibold py-4 px-8 rounded-2xl transition-all duration-300 text-base">
                        <Play className="w-4 h-4 text-blue-400" /> See how it works
                      </a>
                    </>
                  )}
                </div>

                <div className="flex items-center justify-center lg:justify-start gap-6 text-sm text-slate-500">
                  <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-500" /> Free 14-day trial</span>
                  <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-500" /> No credit card</span>
                  <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-500" /> Setup in 10 min</span>
                </div>
              </div>

              {/* Right: Live Dashboard Card */}
              <div className="flex-1 w-full max-w-lg lg:max-w-none relative" style={{ transform: `translateY(${scrollY * 0.04}px)` }}>
                <div className="absolute inset-0 bg-blue-500/10 blur-3xl rounded-3xl scale-110" />

                <div className="relative bg-[#0d1321]/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_40px_80px_rgba(0,0,0,0.6)] overflow-hidden">
                  <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />

                  {/* macOS window chrome */}
                  <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-500/70" />
                        <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                        <div className="w-3 h-3 rounded-full bg-green-500/70" />
                      </div>
                      <span className="ml-2 text-xs text-slate-500 font-mono">live-dashboard.ems</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">{timeStr}</span>
                    </div>
                  </div>

                  {/* Header row */}
                  <div className="px-5 pt-4 pb-3 flex items-center justify-between">
                    <div>
                      <div className="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-0.5">Live Roster</div>
                      <div className="text-lg font-bold text-white">Team Status</div>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span className="text-[11px] font-semibold text-emerald-400">4 Active</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-slate-500/10 border border-slate-500/20 px-3 py-1.5 rounded-lg">
                        <span className="text-[11px] font-semibold text-slate-400">1 Away</span>
                      </div>
                    </div>
                  </div>

                  {/* Roster list */}
                  <div className="px-4 pb-4 space-y-2">
                    {roster.map((r, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/10 transition-all cursor-default">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border ${
                            r.status === 'onsite' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                            r.status === 'remote' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
                            'bg-slate-500/10 border-slate-500/20 text-slate-400'
                          }`}>{r.avatar}</div>
                          <div>
                            <div className="text-sm font-semibold text-white">{r.name}</div>
                            <div className="text-[11px] text-slate-500">{r.role}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-lg border ${
                            r.status === 'onsite' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                            r.status === 'remote' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                            'bg-slate-500/10 text-slate-400 border-slate-500/20'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${r.status === 'onsite' ? 'bg-emerald-500 animate-pulse' : r.status === 'remote' ? 'bg-blue-500' : 'bg-slate-500'}`} />
                            {r.label}
                          </span>
                          <span className="text-xs text-slate-500 font-mono w-10 text-right">{r.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="px-5 py-3 border-t border-white/5 bg-white/[0.01] flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <RefreshCw className="w-3 h-3" /> <span>Auto-syncs with every punch</span>
                    </div>
                    <div className="text-[10px] font-mono text-blue-400/60">LIVE</div>
                  </div>
                </div>

                {/* Floating mini-cards */}
                <div className="absolute -left-4 top-1/4 bg-[#0d1321]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-3.5 shadow-xl hidden lg:block">
                  <div className="text-[11px] text-slate-500 mb-1">Today's Check-ins</div>
                  <div className="text-2xl font-extrabold text-white">847</div>
                  <div className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5"><TrendingUp className="w-3 h-3" /> +12% vs yesterday</div>
                </div>

                <div className="absolute -right-4 bottom-1/4 bg-[#0d1321]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-3.5 shadow-xl hidden lg:block">
                  <div className="text-[11px] text-slate-500 mb-1">Attendance Rate</div>
                  <div className="text-2xl font-extrabold text-white">96.4<span className="text-sm text-slate-400">%</span></div>
                  <div className="h-1.5 bg-white/5 rounded-full mt-2 w-24">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full" style={{ width: '96.4%' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* â”€â”€ LOGOS / TRUST STRIP â”€â”€ */}
        <div className="border-y border-white/5 bg-white/[0.01] py-8">
          <div className="max-w-7xl mx-auto px-4">
            <p className="text-center text-xs text-slate-600 uppercase tracking-widest font-semibold mb-6">Trusted by fast-growing companies</p>
            <div className="flex items-center justify-center gap-10 flex-wrap">
              {['TechnoSync', 'CloudWave', 'Flexstaff', 'DataPulse', 'InnovateCo', 'NexaHR'].map((name) => (
                <span key={name} className="text-slate-600 font-bold text-sm tracking-wide hover:text-slate-400 transition-colors cursor-default">{name}</span>
              ))}
            </div>
          </div>
        </div>

        {/* â”€â”€ STAT STRIP â”€â”€ */}
        <div ref={statsRef} className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: users500, suffix: '+', label: 'Employees tracked', color: 'from-blue-400 to-cyan-400' },
              { value: companies120, suffix: '+', label: 'Companies onboarded', color: 'from-purple-400 to-pink-400' },
              { value: uptime, suffix: '.9%', label: 'Platform uptime', color: 'from-emerald-400 to-teal-400' },
              { value: modules, suffix: '+', label: 'Feature modules', color: 'from-amber-400 to-orange-400' },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className={`text-4xl lg:text-5xl font-extrabold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent mb-2`}>
                  {stat.value}{stat.suffix}
                </div>
                <div className="text-sm text-slate-500 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* â”€â”€ FEATURES (BENTO GRID) â”€â”€ */}
        <section id="features" className="py-24 relative">
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(59,130,246,0.06) 0%, transparent 70%)' }} />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider mb-4">
                <Zap className="w-3.5 h-3.5" /> What's inside
              </div>
              <h2 className="text-4xl lg:text-5xl font-extrabold text-white mb-5 leading-tight">
                Everything a distributed team's<br />admin actually needs.
              </h2>
              <p className="text-slate-400 text-lg leading-relaxed">
                Not a stack of disconnected tools â€” one platform where attendance, tasks,<br className="hidden lg:block" /> and reporting already know about each other.
              </p>
            </div>

            {/* Bento Grid */}
            <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-4">

              {/* Big card 1: Attendance */}
              <div className="md:col-span-4 lg:col-span-5 bg-gradient-to-br from-[#0d1321] to-[#111827] border border-white/8 rounded-2xl p-8 group hover:border-blue-500/30 transition-all duration-300 hover:shadow-[0_0_40px_rgba(59,130,246,0.08)] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/5 rounded-full blur-3xl" />
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                    <Clock className="w-6 h-6 text-blue-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">Attendance & Punch Tracking</h3>
                  <p className="text-slate-400 text-sm leading-relaxed mb-6">Punch in, take breaks, punch out â€” with a full history and reports your payroll team can actually use.</p>
                  <div className="bg-[#080c14]/60 border border-white/5 rounded-xl p-3 space-y-2">
                    {[{ label: 'Clock In', time: '09:02 AM', color: 'text-emerald-400' }, { label: 'Break Start', time: '01:15 PM', color: 'text-amber-400' }, { label: 'Break End', time: '02:00 PM', color: 'text-blue-400' }].map((row, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">{row.label}</span>
                        <span className={`font-mono font-bold ${row.color}`}>{row.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Big card 2: Location */}
              <div className="md:col-span-2 lg:col-span-4 bg-gradient-to-br from-[#0d1321] to-[#111827] border border-white/8 rounded-2xl p-8 group hover:border-emerald-500/30 transition-all duration-300 hover:shadow-[0_0_40px_rgba(16,185,129,0.08)] relative overflow-hidden">
                <div className="absolute bottom-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl" />
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                    <MapPin className="w-6 h-6 text-emerald-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">Geo-Fenced Location</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">Set your office coordinates once. "At Office" shows automatically â€” or a real address for remote.</p>
                  <div className="mt-5 flex gap-2 flex-wrap">
                    <span className="text-[11px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-lg font-semibold">ðŸ“ At Office</span>
                    <span className="text-[11px] bg-blue-500/10 border border-blue-500/20 text-blue-400 px-2.5 py-1 rounded-lg font-semibold">ðŸ  Remote</span>
                    <span className="text-[11px] bg-orange-500/10 border border-orange-500/20 text-orange-400 px-2.5 py-1 rounded-lg font-semibold">ðŸš— Field</span>
                  </div>
                </div>
              </div>

              {/* Card: Activity & Screenshots */}
              <div className="md:col-span-2 lg:col-span-3 bg-gradient-to-br from-[#0d1321] to-[#111827] border border-white/8 rounded-2xl p-8 group hover:border-purple-500/30 transition-all duration-300 hover:shadow-[0_0_40px_rgba(168,85,247,0.08)] relative overflow-hidden">
                <div className="absolute top-0 left-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl" />
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                    <Monitor className="w-6 h-6 text-purple-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-3">Activity & Screenshots</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">Idle time, keyboard/mouse activity, and periodic screenshots â€” productivity data observed, not guessed.</p>
                </div>
              </div>

              {/* Remaining feature cards */}
              {[
                { icon: CheckSquare, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', hover: 'hover:border-amber-500/30', glow: 'bg-amber-500/5', title: 'Tasks & Projects', desc: 'Assign work, track time against it, and see project progress without leaving the dashboard.' },
                { icon: CalendarCheck, color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20', hover: 'hover:border-rose-500/30', glow: 'bg-rose-500/5', title: 'Leave & WFH', desc: 'Employees apply, managers approve â€” policy limits enforced automatically.' },
                { icon: Download, color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20', hover: 'hover:border-cyan-500/30', glow: 'bg-cyan-500/5', title: 'Excel & PDF Reports', desc: 'Attendance, productivity, and project reports pulled straight to Excel or PDF.' },
                { icon: Bell, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20', hover: 'hover:border-yellow-500/30', glow: 'bg-yellow-500/5', title: 'Real-time Alerts', desc: 'Instant notifications for leave applications, task deadlines, and live system events.' },
                { icon: Lock, color: 'text-pink-400', bg: 'bg-pink-500/10 border-pink-500/20', hover: 'hover:border-pink-500/30', glow: 'bg-pink-500/5', title: 'RBAC Permissions', desc: 'Granular Role-Based Access Control â€” precisely define what each role can view and edit.' },
                { icon: Globe, color: 'text-teal-400', bg: 'bg-teal-500/10 border-teal-500/20', hover: 'hover:border-teal-500/30', glow: 'bg-teal-500/5', title: 'Multi-Tenant SaaS', desc: 'Manage multiple companies, subscriptions, and billing from one central hub.' },
                { icon: Navigation, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20', hover: 'hover:border-orange-500/30', glow: 'bg-orange-500/5', title: 'Live Location Trails', desc: 'Historical location paths and employee route maps throughout the workday.' },
                { icon: FileText, color: 'text-fuchsia-400', bg: 'bg-fuchsia-500/10 border-fuchsia-500/20', hover: 'hover:border-fuchsia-500/30', glow: 'bg-fuchsia-500/5', title: 'Audit Logs', desc: 'Complete transparency with detailed audit trails for all sensitive actions.' },
                { icon: Users, color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20', hover: 'hover:border-indigo-500/30', glow: 'bg-indigo-500/5', title: 'Team Hierarchy', desc: 'Organize employees by departments and assign managers to specific groups.' },
              ].map((f, i) => (
                <div key={i} className={`md:col-span-2 lg:col-span-3 bg-gradient-to-br from-[#0d1321] to-[#111827] border border-white/8 rounded-2xl p-6 group ${f.hover} transition-all duration-300 relative overflow-hidden`}>
                  <div className={`absolute bottom-0 right-0 w-32 h-32 ${f.glow} rounded-full blur-3xl`} />
                  <div className="relative z-10">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center border mb-5 ${f.bg} group-hover:scale-110 transition-transform duration-300`}>
                      <f.icon className={`w-5 h-5 ${f.color}`} />
                    </div>
                    <h4 className="text-base font-bold text-white mb-2">{f.title}</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* â”€â”€ HOW IT WORKS â”€â”€ */}
        <section id="how-it-works" className="py-24 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 50%, rgba(16,185,129,0.04) 0%, transparent 70%)' }} />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-20">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-4">
                <Activity className="w-3.5 h-3.5" /> Getting started
              </div>
              <h2 className="text-4xl font-extrabold text-white mb-4">Set up once. It runs itself from there.</h2>
              <p className="text-slate-400">From zero to a live dashboard in under 30 minutes â€” no IT team required.</p>
            </div>

            <div className="relative">
              <div className="hidden lg:block absolute top-12 left-[14%] right-[14%] h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                {[
                  { step: '01', title: 'Register your company', desc: 'Create your workspace and admin account in a couple of minutes.', icon: Globe },
                  { step: '02', title: 'Add your team', desc: 'Invite employees, assign departments and managers, set your office location.', icon: Users },
                  { step: '03', title: 'Employees clock in', desc: 'From the office, the field, or home â€” via desktop agent or mobile.', icon: Clock },
                  { step: '04', title: 'You get visibility', desc: 'Live status, reports, and alerts land in the dashboard matching your role.', icon: Eye },
                ].map((s, i) => (
                  <div key={i} className="relative flex flex-col items-center text-center group">
                    <div className="relative mb-6">
                      <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[#0d1321] to-[#111827] border border-emerald-500/20 flex items-center justify-center group-hover:border-emerald-500/50 group-hover:shadow-[0_0_30px_rgba(16,185,129,0.15)] transition-all duration-300">
                        <s.icon className="w-8 h-8 text-emerald-400" />
                      </div>
                      <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center text-[11px] font-black text-white shadow-[0_0_15px_rgba(16,185,129,0.5)]">
                        {i + 1}
                      </div>
                    </div>
                    <h4 className="text-lg font-bold text-white mb-2">{s.title}</h4>
                    <p className="text-sm text-slate-400 leading-relaxed">{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* â”€â”€ ROLES â”€â”€ */}
        <section id="roles" className="py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold uppercase tracking-wider mb-4">
                <Users className="w-3.5 h-3.5" /> Built for the whole org chart
              </div>
              <h2 className="text-4xl font-extrabold text-white mb-4">A different view for every seat.</h2>
              <p className="text-slate-400 text-lg">Nobody sees more than their role needs. Nobody digs through someone else's dashboard to find their own numbers.</p>
            </div>

            <div className="bg-[#0d1321]/60 border border-white/8 rounded-2xl overflow-hidden flex flex-col lg:flex-row backdrop-blur-sm">
              <div className="lg:w-72 bg-[#080c14]/40 border-b lg:border-b-0 lg:border-r border-white/5 p-4 flex flex-row lg:flex-col gap-2 overflow-x-auto">
                {[
                  { id: 'super', label: 'Super Admin', icon: Shield, desc: 'Platform-wide' },
                  { id: 'company', label: 'Company Admin', icon: Globe, desc: 'Company-wide' },
                  { id: 'manager', label: 'Manager', icon: Users, desc: 'Team-focused' },
                  { id: 'hr', label: 'HR', icon: FileText, desc: 'People ops' },
                  { id: 'employee', label: 'Employee', icon: Award, desc: 'Personal view' },
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => setActiveRole(t.id as any)}
                    className={`flex items-center gap-3 text-left px-4 py-3.5 rounded-xl text-sm transition-all duration-200 whitespace-nowrap shrink-0 lg:shrink border ${
                      activeRole === t.id
                        ? 'bg-purple-500/10 text-white border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.1)]'
                        : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <t.icon className={`w-4 h-4 shrink-0 ${activeRole === t.id ? 'text-purple-400' : 'text-slate-500'}`} />
                    <div>
                      <div className="font-semibold">{t.label}</div>
                      <div className="text-[10px] text-slate-500">{t.desc}</div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex-1 p-10 flex items-center">
                {[
                  { id: 'super', title: 'Super Admin', subtitle: 'Platform-wide oversight across every company on EMS.', color: 'text-purple-400', borderColor: 'border-purple-500/30', bg: 'bg-purple-500/15', items: ['All tenants, plans, and subscription status in one place', 'Platform health and usage trends across every company', 'Full audit trail of platform-level actions', 'Global billing and account management'] },
                  { id: 'company', title: 'Company Admin', subtitle: 'Everything about your own company, nothing about anyone else\'s.', color: 'text-blue-400', borderColor: 'border-blue-500/30', bg: 'bg-blue-500/15', items: ['Employee, department, and manager management', 'Company-wide attendance, activity, and productivity view', 'Billing, plan, and office/geofence configuration', 'Custom leave policies and working hour rules'] },
                  { id: 'manager', title: 'Manager', subtitle: 'A focused view of the people who actually report to you.', color: 'text-emerald-400', borderColor: 'border-emerald-500/30', bg: 'bg-emerald-500/15', items: ['Your team\'s live status, tasks, and attendance', 'Approve leave and WFH requests directly', 'Assign and track project work across your team', 'Team productivity reports and timesheets'] },
                  { id: 'hr', title: 'HR', subtitle: 'The people-operations view â€” leave, attendance, and headcount.', color: 'text-rose-400', borderColor: 'border-rose-500/30', bg: 'bg-rose-500/15', items: ['Company-wide leave and WFH tracking', 'Attendance reports ready to export for payroll', 'Department structure and employee records', 'Compliance and audit trail access'] },
                  { id: 'employee', title: 'Employee', subtitle: 'Just what you need to get your day started and tracked fairly.', color: 'text-cyan-400', borderColor: 'border-cyan-500/30', bg: 'bg-cyan-500/15', items: ['One-tap punch in / punch out', 'Apply for leave or WFH, see approval status live', 'Your own tasks, hours, and activity â€” fully visible to you too', 'Work mode switching (office, remote, field)'] },
                ].map(panel => activeRole === panel.id && (
                  <div key={panel.id} className="animate-in fade-in slide-in-from-bottom-2 duration-300 w-full">
                    <div className={`text-xs font-bold uppercase tracking-widest ${panel.color} mb-3`}>{panel.id.toUpperCase()}</div>
                    <h3 className="text-3xl font-extrabold text-white mb-3">{panel.title}</h3>
                    <p className="text-slate-400 mb-8 text-lg">{panel.subtitle}</p>
                    <ul className="grid sm:grid-cols-2 gap-4">
                      {panel.items.map((item, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 border ${panel.bg} ${panel.borderColor}`}>
                            <Check className={`w-3 h-3 ${panel.color}`} />
                          </div>
                          <span className="text-slate-300 text-sm leading-relaxed">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* â”€â”€ SECURITY â”€â”€ */}
        <section className="py-24 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 40% at 50% 50%, rgba(59,130,246,0.05) 0%, transparent 70%)' }} />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-gradient-to-br from-[#0d1321]/80 to-[#111827]/80 border border-white/8 rounded-3xl p-10 lg:p-16 backdrop-blur-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl" />
              <div className="relative z-10 flex flex-col lg:flex-row gap-16 items-start">
                <div className="lg:w-2/5">
                  <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-8">
                    <Shield className="w-8 h-8 text-blue-400" />
                  </div>
                  <h2 className="text-3xl lg:text-4xl font-extrabold text-white mb-5 leading-tight">Monitoring your team shouldn't mean loose security.</h2>
                  <p className="text-slate-400 text-lg leading-relaxed mb-8">Every account, every request, and every tenant's data is isolated and access-controlled by design â€” not bolted on afterward.</p>
                  <div className="flex flex-wrap gap-3">
                    {['JWT Auth', 'RBAC', 'Tenant Isolation', 'Audit Logs'].map(tag => (
                      <span key={tag} className="text-xs font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-lg">{tag}</span>
                    ))}
                  </div>
                </div>
                <div className="flex-1 grid sm:grid-cols-2 gap-5">
                  {[
                    { icon: Shield, title: 'JWT auth + RBAC', desc: 'Every action is checked against a role, not just a login. Zero privilege escalation.', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
                    { icon: Layers, title: 'Tenant-isolated data', desc: 'Your company\'s records structurally never mix with another tenant\'s data.', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
                    { icon: Activity, title: 'Full audit trail', desc: 'Every sensitive action â€” logins, role changes, deletions â€” is permanently logged.', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
                    { icon: MapPin, title: 'Configured location', desc: 'Geofencing runs off office locations your admin configures â€” not our defaults.', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
                  ].map((s, i) => (
                    <div key={i} className="bg-[#080c14]/40 border border-white/5 rounded-2xl p-6 hover:border-white/10 transition-all duration-200">
                      <div className={`w-10 h-10 rounded-xl border flex items-center justify-center mb-4 ${s.bg}`}>
                        <s.icon className={`w-5 h-5 ${s.color}`} />
                      </div>
                      <h4 className="text-white font-bold mb-2">{s.title}</h4>
                      <p className="text-xs text-slate-400 leading-relaxed">{s.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* â”€â”€ PLATFORMS â”€â”€ */}
        <section id="platforms" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-4">
              <Layers className="w-3.5 h-3.5" /> Wherever work happens
            </div>
            <h2 className="text-4xl font-extrabold text-white mb-4">One account. Three ways to punch in.</h2>
            <p className="text-slate-400 text-lg">Desk-bound, hybrid, and field teams don't use software the same way â€” so EMS doesn't make them.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Chrome, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', hover: 'hover:border-blue-500/30 hover:shadow-[0_0_40px_rgba(59,130,246,0.1)]', title: 'Web Dashboard', tag: 'Any browser', desc: 'Punch in/out, apply for leave, manage tasks, and view every role-based dashboard â€” no install required.' },
              { icon: Laptop, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20', hover: 'hover:border-purple-500/30 hover:shadow-[0_0_40px_rgba(168,85,247,0.1)]', title: 'Desktop Agent', tag: 'Windows Â· macOS Â· Linux', desc: 'A lightweight background agent for real productivity data: idle detection, keyboard/mouse activity, and screenshots.' },
              { icon: Smartphone, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', hover: 'hover:border-emerald-500/30 hover:shadow-[0_0_40px_rgba(16,185,129,0.1)]', title: 'Mobile', tag: 'iOS Â· Android web', desc: 'For field and sales teams â€” punch in, switch work mode, and track location straight from a phone.' },
            ].map((p, i) => (
              <div key={i} className={`bg-gradient-to-br from-[#0d1321] to-[#111827] border border-white/8 rounded-2xl p-8 transition-all duration-300 group ${p.hover}`}>
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border mb-6 ${p.bg} group-hover:scale-110 transition-transform duration-300`}>
                  <p.icon className={`w-7 h-7 ${p.color}`} />
                </div>
                <h4 className="text-xl font-bold text-white mb-1.5">{p.title}</h4>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{p.tag}</span>
                <p className="text-sm text-slate-400 leading-relaxed mt-4">{p.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* â”€â”€ TESTIMONIALS â”€â”€ */}
        <section className="py-24 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 40% at 50% 50%, rgba(168,85,247,0.04) 0%, transparent 70%)' }} />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs font-bold uppercase tracking-wider mb-4">
                <Star className="w-3.5 h-3.5 fill-current" /> Customer stories
              </div>
              <h2 className="text-4xl font-extrabold text-white mb-4">Loved by teams of all sizes.</h2>
              <p className="text-slate-400">Real results from real companies using EMS today.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {testimonials.map((t, i) => (
                <div key={i} className="bg-gradient-to-br from-[#0d1321] to-[#111827] border border-white/8 rounded-2xl p-8 hover:border-white/15 transition-all duration-300 hover:shadow-[0_0_40px_rgba(0,0,0,0.3)]">
                  <div className="flex gap-1 mb-5">
                    {Array(t.stars).fill(0).map((_, j) => (<Star key={j} className="w-4 h-4 text-yellow-400 fill-current" />))}
                  </div>
                  <p className="text-slate-300 text-sm leading-relaxed mb-6 italic">"{t.text}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center text-xs font-bold text-white">{t.avatar}</div>
                    <div>
                      <div className="text-sm font-bold text-white">{t.name}</div>
                      <div className="text-[11px] text-slate-500">{t.role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* â”€â”€ PRICING â”€â”€ */}
        <section id="pricing" className="py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider mb-4">
                <BarChart2 className="w-3.5 h-3.5" /> Pricing
              </div>
              <h2 className="text-4xl font-extrabold text-white mb-4">Plans that grow with your headcount.</h2>
              <p className="text-slate-400 text-lg">Start free. Move up when your team does. No surprise fees.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto items-end">
              {/* Starter */}
              <div className="bg-gradient-to-br from-[#0d1321] to-[#111827] border border-white/8 rounded-2xl p-8 hover:border-white/15 transition-all duration-300">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Starter</div>
                <p className="text-sm text-slate-400 mb-6">For small teams getting off spreadsheets.</p>
                <div className="mb-8">
                  <span className="text-5xl font-black text-white">â‚¹0</span><span className="text-slate-400 ml-1">/month</span>
                  <p className="text-xs text-blue-400 font-semibold mt-2">Up to 10 employees</p>
                </div>
                <ul className="space-y-3 mb-8">
                  {['Attendance tracking', 'Leave requests', 'Basic reports', 'Web dashboard'].map(item => (
                    <li key={item} className="flex items-center gap-3 text-sm text-slate-300"><Check className="w-4 h-4 text-emerald-400 shrink-0" />{item}</li>
                  ))}
                </ul>
                <Link to="/register" className="block w-full text-center border border-white/10 hover:bg-white/5 hover:border-white/20 text-white font-semibold py-3 rounded-xl transition-all duration-200">Get started free</Link>
              </div>

              {/* Business */}
              <div className="relative bg-gradient-to-br from-blue-600/10 via-[#0d1321] to-[#111827] border-2 border-blue-500/50 rounded-2xl p-8 shadow-[0_0_60px_rgba(59,130,246,0.15)] transform md:-translate-y-4">
                <div className="absolute -top-4 inset-x-0 flex justify-center">
                  <span className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-xs font-bold px-5 py-1.5 rounded-full shadow-[0_0_20px_rgba(59,130,246,0.5)]">â­ Most Popular</span>
                </div>
                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-400/50 to-transparent rounded-t-2xl" />
                <div className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-4">Business</div>
                <p className="text-sm text-slate-400 mb-6">For growing teams that work across locations.</p>
                <div className="mb-8">
                  <span className="text-5xl font-black text-white">â‚¹299</span><span className="text-slate-400 ml-1">/user/mo</span>
                  <p className="text-xs text-blue-400 font-semibold mt-2">Unlimited employees</p>
                </div>
                <ul className="space-y-3 mb-8">
                  {['Everything in Starter', 'Geofenced location', 'Activity screenshots', 'Tasks & projects', 'Excel/PDF exports', 'Real-time notifications'].map(item => (
                    <li key={item} className="flex items-center gap-3 text-sm text-slate-300"><Check className="w-4 h-4 text-blue-400 shrink-0" />{item}</li>
                  ))}
                </ul>
                <Link to="/register" className="block w-full text-center bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-cyan-500 text-white font-bold py-3 rounded-xl transition-all duration-300 shadow-[0_0_20px_rgba(59,130,246,0.3)]">Start free trial</Link>
              </div>

              {/* Enterprise */}
              <div className="bg-gradient-to-br from-[#0d1321] to-[#111827] border border-white/8 rounded-2xl p-8 hover:border-white/15 transition-all duration-300">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Enterprise</div>
                <p className="text-sm text-slate-400 mb-6">For companies that need more control.</p>
                <div className="mb-8">
                  <span className="text-5xl font-black text-white">Custom</span>
                  <p className="text-xs text-blue-400 font-semibold mt-2">Volume pricing available</p>
                </div>
                <ul className="space-y-3 mb-8">
                  {['Everything in Business', 'Custom roles & permissions', 'Priority support & SLA', 'Dedicated onboarding'].map(item => (
                    <li key={item} className="flex items-center gap-3 text-sm text-slate-300"><Check className="w-4 h-4 text-slate-400 shrink-0" />{item}</li>
                  ))}
                </ul>
                <Link to="/register" className="block w-full text-center border border-white/10 hover:bg-white/5 hover:border-white/20 text-white font-semibold py-3 rounded-xl transition-all duration-200">Talk to sales</Link>
              </div>
            </div>
          </div>
        </section>

        {/* â”€â”€ FAQ â”€â”€ */}
        <section id="faq" className="py-24 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider mb-4">
              <FileText className="w-3.5 h-3.5" /> FAQ
            </div>
            <h2 className="text-4xl font-extrabold text-white mb-4">Before you ask sales.</h2>
            <p className="text-slate-400">Most common questions â€” answered honestly.</p>
          </div>

          <div className="space-y-3">
            {faqs.map((f, i) => {
              const isOpen = openFaq === i;
              return (
                <div key={i} className={`border rounded-2xl overflow-hidden transition-all duration-300 ${isOpen ? 'bg-[#0d1321]/60 border-blue-500/20' : 'bg-[#0d1321]/30 border-white/5 hover:border-white/10'}`}>
                  <button onClick={() => setOpenFaq(isOpen ? null : i)} className="w-full flex items-center justify-between text-left px-6 py-5 group">
                    <span className="text-sm font-semibold text-white pr-6 leading-relaxed">{f.q}</span>
                    <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center border transition-all duration-300 ${isOpen ? 'bg-blue-500/20 border-blue-500/30' : 'bg-white/5 border-white/10 group-hover:bg-white/10'}`} style={{ transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)' }}>
                      <Plus className={`w-3.5 h-3.5 ${isOpen ? 'text-blue-400' : 'text-slate-400'}`} />
                    </div>
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-5 text-sm text-slate-400 leading-relaxed border-t border-white/5 pt-4 animate-in fade-in duration-200">{f.a}</div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* â”€â”€ CTA â”€â”€ */}
        <section className="py-24 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-3xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/90 via-blue-700/90 to-cyan-600/90" />
            <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
            <div className="absolute top-[-30%] right-[-10%] w-80 h-80 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute bottom-[-30%] left-[-10%] w-80 h-80 bg-cyan-400/20 rounded-full blur-3xl" />

            <div className="relative z-10 py-20 px-8 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 border border-white/20 text-white text-xs font-bold uppercase tracking-wider mb-6">
                <Zap className="w-3.5 h-3.5 fill-current" /> Ready to get started?
              </div>
              <h2 className="text-4xl lg:text-5xl font-extrabold text-white mb-5 leading-tight">
                See your whole team,<br />in one place.
              </h2>
              <p className="text-blue-100 text-lg mb-10 max-w-xl mx-auto leading-relaxed">
                Set up your company and invite your first employees in under 10 minutes. No credit card required.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                {user ? (
                  <Link to="/dashboard" className="w-full sm:w-auto bg-white text-blue-600 hover:bg-blue-50 font-bold py-4 px-10 rounded-2xl transition-all duration-200 text-base shadow-xl">Go to Dashboard</Link>
                ) : (
                  <>
                    <Link to="/register" className="w-full sm:w-auto bg-white text-blue-600 hover:bg-blue-50 font-bold py-4 px-10 rounded-2xl transition-all duration-200 text-base shadow-xl flex items-center justify-center gap-2">
                      Start free trial <ArrowRight className="w-4 h-4" />
                    </Link>
                    <Link to="/register" className="w-full sm:w-auto bg-white/10 hover:bg-white/20 border border-white/25 hover:border-white/40 text-white font-bold py-4 px-10 rounded-2xl transition-all duration-200 text-base">Talk to sales</Link>
                  </>
                )}
              </div>
              <p className="text-white/50 text-sm mt-6">Free 14-day trial Â· No credit card required Â· Cancel anytime</p>
            </div>
          </div>
        </section>
      </main>

      {/* â”€â”€ FOOTER â”€â”€ */}
      <footer className="border-t border-white/5 bg-[#080c14] py-16 text-sm text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
            <div className="col-span-2">
              <Link to="/" className="flex items-center gap-2.5 mb-4">
                <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.4)]">
                  <div className="w-2.5 h-2.5 bg-white rounded-full" />
                </div>
                <span className="font-bold text-white text-base">EMS<span className="text-blue-400">.</span></span>
              </Link>
              <p className="text-slate-500 text-sm leading-relaxed max-w-[200px]">Workforce visibility for teams that don't all sit in the same room.</p>
              <div className="flex gap-3 mt-6">
                {['GDPR', 'SOC2', 'ISO 27001'].map(badge => (
                  <span key={badge} className="text-[10px] font-bold text-slate-500 bg-white/5 border border-white/8 px-2.5 py-1 rounded-lg">{badge}</span>
                ))}
              </div>
            </div>

            {[
              { title: 'Product', links: [['Features', '#features'], ['Dashboards', '#roles'], ['Pricing', '#pricing'], ['Security', '#security']] },
              { title: 'Company', links: [['About', '#'], ['Contact', '#'], ['Support', '#']] },
              { title: 'Legal', links: [['Privacy policy', '#'], ['Terms of service', '#'], ['Cookie policy', '#']] },
            ].map(col => (
              <div key={col.title}>
                <h5 className="font-bold text-white mb-4 uppercase tracking-widest text-xs">{col.title}</h5>
                <ul className="space-y-3">
                  {col.links.map(([label, href]) => (
                    <li key={label}><a href={href} className="hover:text-white transition-colors duration-200">{label}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-t border-white/5 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-slate-600">Â© 2026 EMS. All rights reserved.</span>
            <span className="font-mono text-xs text-slate-700">Built for distributed teams Â· Made in India ðŸ‡®ðŸ‡³</span>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes gradient-x {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        /* ── DARK THEME (default) ─────────────────────────────────────── */
        .ems-landing[data-theme='dark'] {
          background-color: #080c14;
          color: #cbd5e1;
        }
        .ems-landing[data-theme='dark'] .ems-header-scrolled {
          background-color: rgba(8,12,20,0.92);
          border-bottom: 1px solid rgba(255,255,255,0.06);
          box-shadow: 0 1px 0 0 rgba(255,255,255,0.04);
        }
        .ems-landing[data-theme='dark'] .ems-logo-text { color: #ffffff; }
        .ems-landing[data-theme='dark'] .ems-nav-link { color: #94a3b8; }
        .ems-landing[data-theme='dark'] .ems-nav-link:hover { color: #ffffff; background: rgba(255,255,255,0.05); }
        .ems-landing[data-theme='dark'] .ems-login-link { color: #94a3b8; }
        .ems-landing[data-theme='dark'] .ems-login-link:hover { color: #ffffff; background: rgba(255,255,255,0.05); }
        .ems-landing[data-theme='dark'] .ems-theme-btn { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08); }
        .ems-landing[data-theme='dark'] .ems-theme-btn:hover { background: rgba(255,255,255,0.12); }

        /* ── LIGHT THEME ──────────────────────────────────────────────── */
        .ems-landing[data-theme='light'] {
          background-color: #f0f4ff;
          color: #1e293b;
        }

        /* Header */
        .ems-landing[data-theme='light'] .ems-header-scrolled {
          background-color: rgba(255,255,255,0.95);
          border-bottom: 1px solid rgba(59,130,246,0.12);
          box-shadow: 0 1px 20px rgba(59,130,246,0.08);
        }
        .ems-landing[data-theme='light'] .ems-logo-text { color: #0f172a; }
        .ems-landing[data-theme='light'] .ems-nav-link { color: #475569; }
        .ems-landing[data-theme='light'] .ems-nav-link:hover { color: #1e293b; background: rgba(59,130,246,0.06); }
        .ems-landing[data-theme='light'] .ems-login-link { color: #475569; }
        .ems-landing[data-theme='light'] .ems-login-link:hover { color: #1e293b; background: rgba(59,130,246,0.06); }
        .ems-landing[data-theme='light'] .ems-theme-btn { background: rgba(59,130,246,0.08); border: 1px solid rgba(59,130,246,0.15); }
        .ems-landing[data-theme='light'] .ems-theme-btn:hover { background: rgba(59,130,246,0.15); }

        /* Global text overrides */
        .ems-landing[data-theme='light'] .text-white { color: #0f172a !important; }
        .ems-landing[data-theme='light'] .text-slate-300 { color: #334155 !important; }
        .ems-landing[data-theme='light'] .text-slate-400 { color: #475569 !important; }
        .ems-landing[data-theme='light'] .text-slate-500 { color: #64748b !important; }
        .ems-landing[data-theme='light'] .text-slate-600 { color: #64748b !important; }
        .ems-landing[data-theme='light'] .text-slate-700 { color: #334155 !important; }

        /* Page background sections */
        .ems-landing[data-theme='light'] .bg-\[\#080c14\] { background-color: #f0f4ff !important; }
        .ems-landing[data-theme='light'] .bg-\[\#0d1321\] { background-color: #ffffff !important; }
        .ems-landing[data-theme='light'] .bg-\[\#0d1321\]\/60 { background-color: rgba(255,255,255,0.8) !important; }
        .ems-landing[data-theme='light'] .bg-\[\#0d1321\]\/80 { background-color: rgba(255,255,255,0.9) !important; }
        .ems-landing[data-theme='light'] .bg-\[\#0d1321\]\/90 { background-color: rgba(255,255,255,0.95) !important; }
        .ems-landing[data-theme='light'] .bg-\[\#0d1321\]\/30 { background-color: rgba(248,250,252,0.7) !important; }
        .ems-landing[data-theme='light'] .bg-\[\#111827\] { background-color: #f8fafc !important; }
        .ems-landing[data-theme='light'] .bg-\[\#080c14\]\/40 { background-color: rgba(241,245,249,0.8) !important; }
        .ems-landing[data-theme='light'] .bg-\[\#080c14\]\/60 { background-color: rgba(241,245,249,0.9) !important; }
        .ems-landing[data-theme='light'] .bg-\[\#080c14\]\/90 { background-color: rgba(255,255,255,0.95) !important; }

        /* Gradient cards: from-[#0d1321] to-[#111827] */
        .ems-landing[data-theme='light'] .from-\[\#0d1321\] { --tw-gradient-from: #ffffff; }
        .ems-landing[data-theme='light'] .to-\[\#111827\] { --tw-gradient-to: #f1f5f9; }
        .ems-landing[data-theme='light'] .from-\[\#0d1321\]\/80 { --tw-gradient-from: rgba(255,255,255,0.9); }
        .ems-landing[data-theme='light'] .to-\[\#111827\]\/80 { --tw-gradient-to: rgba(241,245,249,0.9); }

        /* Border overrides */
        .ems-landing[data-theme='light'] .border-white\/5 { border-color: rgba(148,163,184,0.2) !important; }
        .ems-landing[data-theme='light'] .border-white\/8 { border-color: rgba(148,163,184,0.25) !important; }
        .ems-landing[data-theme='light'] .border-white\/10 { border-color: rgba(148,163,184,0.3) !important; }
        .ems-landing[data-theme='light'] .border-white\/15 { border-color: rgba(148,163,184,0.35) !important; }
        .ems-landing[data-theme='light'] .border-white\/20 { border-color: rgba(148,163,184,0.4) !important; }
        .ems-landing[data-theme='light'] .border-white\/25 { border-color: rgba(100,116,139,0.35) !important; }

        /* Background white/opacity overrides */
        .ems-landing[data-theme='light'] .bg-white\/5 { background-color: rgba(59,130,246,0.05) !important; }
        .ems-landing[data-theme='light'] .bg-white\/10 { background-color: rgba(59,130,246,0.07) !important; }
        .ems-landing[data-theme='light'] .bg-white\/15 { background-color: rgba(59,130,246,0.09) !important; }
        .ems-landing[data-theme='light'] .bg-white\/20 { background-color: rgba(59,130,246,0.12) !important; }
        .ems-landing[data-theme='light'] .bg-white\/\[0\.01\] { background-color: rgba(248,250,252,0.9) !important; }
        .ems-landing[data-theme='light'] .bg-white\/\[0\.02\] { background-color: rgba(241,245,249,0.8) !important; }
        .ems-landing[data-theme='light'] .bg-white\/\[0\.04\] { background-color: rgba(226,232,240,0.6) !important; }

        /* Hover overrides */
        .ems-landing[data-theme='light'] .hover\:bg-white\/5:hover { background-color: rgba(59,130,246,0.06) !important; }
        .ems-landing[data-theme='light'] .hover\:bg-white\/10:hover { background-color: rgba(59,130,246,0.09) !important; }
        .ems-landing[data-theme='light'] .hover\:bg-white\/20:hover { background-color: rgba(59,130,246,0.13) !important; }
        .ems-landing[data-theme='light'] .hover\:border-white\/10:hover { border-color: rgba(59,130,246,0.25) !important; }
        .ems-landing[data-theme='light'] .hover\:border-white\/15:hover { border-color: rgba(59,130,246,0.3) !important; }
        .ems-landing[data-theme='light'] .hover\:border-white\/20:hover { border-color: rgba(59,130,246,0.35) !important; }
        .ems-landing[data-theme='light'] .hover\:text-white:hover { color: #0f172a !important; }

        /* Trust strip / logos section */
        .ems-landing[data-theme='light'] .bg-white\/\[0\.01\] { background-color: rgba(255,255,255,0.7) !important; }
        .ems-landing[data-theme='light'] .border-y.border-white\/5 { border-color: rgba(148,163,184,0.2) !important; }

        /* Hero background orbs — toned down for light */
        .ems-landing[data-theme='light'] .bg-blue-600\/10 { background-color: rgba(59,130,246,0.08) !important; }
        .ems-landing[data-theme='light'] .bg-purple-600\/8 { background-color: rgba(147,51,234,0.05) !important; }
        .ems-landing[data-theme='light'] .bg-cyan-500\/8 { background-color: rgba(6,182,212,0.05) !important; }
        .ems-landing[data-theme='light'] .bg-blue-500\/10 { background-color: rgba(59,130,246,0.1) !important; }
        .ems-landing[data-theme='light'] .bg-blue-500\/5 { background-color: rgba(59,130,246,0.06) !important; }

        /* Grid overlay — lighter in light mode */
        .ems-landing[data-theme='light'] .absolute.inset-0.pointer-events-none[style*='backgroundImage'] {
          opacity: 0.4;
        }

        /* Roster/card dark backgrounds */
        .ems-landing[data-theme='light'] .bg-blue-500\/10 { background-color: rgba(59,130,246,0.08) !important; }
        .ems-landing[data-theme='light'] .bg-emerald-500\/10 { background-color: rgba(16,185,129,0.08) !important; }
        .ems-landing[data-theme='light'] .bg-slate-500\/10 { background-color: rgba(100,116,139,0.08) !important; }
        .ems-landing[data-theme='light'] .bg-purple-500\/10 { background-color: rgba(168,85,247,0.08) !important; }

        /* Border-2 for Business pricing card stays */
        .ems-landing[data-theme='light'] .border-2.border-blue-500\/50 { border-color: rgba(59,130,246,0.5) !important; }

        /* FAQ accordion */
        .ems-landing[data-theme='light'] .bg-\[\#0d1321\]\/60.border-blue-500\/20 { background-color: rgba(239,246,255,0.9) !important; }

        /* Footer */
        .ems-landing[data-theme='light'] footer { background-color: #e8eef8 !important; border-top-color: rgba(148,163,184,0.2) !important; }

        /* CTA gradient section — keep it vibrant in both modes */
        .ems-landing[data-theme='light'] .from-blue-600\/90 { --tw-gradient-from: rgba(37,99,235,0.97); }
        .ems-landing[data-theme='light'] .to-cyan-600\/90  { --tw-gradient-to:   rgba(8,145,178,0.97); }

        /* Smooth global transition when toggling */
        .ems-landing, .ems-landing * {
          transition-property: background-color, border-color, color;
          transition-duration: 250ms;
          transition-timing-function: ease;
        }
        /* But don't override animation transitions */
        .ems-landing [class*='animate-'],
        .ems-landing [class*='group-hover'],
        .ems-landing button,
        .ems-landing a {
          transition-property: all;
        }
      `}</style>
    </div>
  );
};

export default LandingPage;
