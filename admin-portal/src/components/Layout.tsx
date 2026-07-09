import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  Clock,
  Camera,
  Activity,
  FolderOpen,
  Settings,
  LogOut,
  Menu,
  X,
  Monitor,
  Bell,
  Building2,
  MapPin,
  CreditCard,
  BarChart3,
  ServerCog,
  Globe,
  FileText,
  HeadphonesIcon,
  UserCircle,
  ChevronDown,
  Shield,
  Layers,
  Sun,
  Moon,
  Calendar,
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, tenant, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('ems_theme') as 'light' | 'dark') || 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    if (theme === 'light') {
      root.classList.add('light-theme');
      body.classList.add('light-theme');
    } else {
      root.classList.remove('light-theme');
      body.classList.remove('light-theme');
    }
    localStorage.setItem('ems_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isAdmin      = user?.role === 'company_admin' || user?.role === 'super_admin';
  const isSuperAdmin = user?.role === 'super_admin';
  const isManager    = user?.role === 'manager';

  // Toggle state for manager collapsible sub-menus
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    'My Team': true,
    'Tasks': false,
    'Projects': false,
    'Attendance': false,
    'Activity Monitoring': false,
    'Screenshots': false,
    'Reports': false,
  });

  const toggleMenu = (menuLabel: string) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuLabel]: !prev[menuLabel]
    }));
  };

  /* ── Nav items for Company Admin ── */
  const adminNavItems = [
    { path: '/dashboard',     label: 'Dashboard',          icon: LayoutDashboard },
    { path: '/employees',     label: 'Employees',          icon: Users },
    { path: '/attendance',    label: 'Attendance',         icon: Clock },
    { path: '/leaves',        label: 'Leave Management',   icon: Calendar },
    { path: '/projects',      label: 'Projects',           icon: FolderOpen },
    { path: '/tasks',         label: 'Tasks',              icon: FileText },
    { path: '/activity',      label: 'Activity Monitoring', icon: Activity },
    { path: '/screenshots',   label: 'Screenshots',        icon: Camera },
    { path: '/location',      label: 'Location Tracking',  icon: MapPin },
    { path: '/reports',       label: 'Reports',            icon: BarChart3 },
    { path: '/notifications', label: 'Notifications',      icon: Bell },
    { path: '/settings',      label: 'Company Settings',   icon: Settings },
  ];

  /* ── Nav items for Employee ── */
  const employeeNavItems = [
    { path: '/dashboard',     label: 'Dashboard',          icon: LayoutDashboard },
    { path: '/attendance',    label: 'My Attendance',      icon: Clock },
    { path: '/tasks',         label: 'My Tasks',           icon: FileText },
    { path: '/leaves',        label: 'My Leaves',          icon: Calendar },
    { path: '/screenshots',   label: 'My Screenshots',     icon: Camera },
    { path: '/activity',      label: 'Activity History',   icon: Activity },
    { path: '/location',      label: 'Location Tracking',  icon: MapPin },
    { path: '/reports',       label: 'My Reports',         icon: BarChart3 },
    { path: '/notifications', label: 'Notifications',      icon: Bell },
    { path: '/settings',      label: 'Settings',           icon: Settings },
  ];

  /* ── Manager nav with nested sections ── */
  const managerSections = [
    {
      label: 'My Team',
      icon: Users,
      items: [
        { path: '/employees', label: 'Team Members' },
        { path: '/attendance', label: 'Team Attendance' },
        { path: '/activity', label: 'Team Activity' },
        { path: '/reports?tab=productivity', label: 'Team Performance' },
      ],
    },
    {
      label: 'Tasks',
      icon: FileText,
      items: [
        { path: '/tasks?tab=list', label: 'My Tasks' },
        { path: '/tasks?tab=list', label: 'Team Tasks' },
        { path: '/tasks?tab=create', label: 'Create Task' },
        { path: '/tasks?tab=list', label: 'Task Status' },
      ],
    },
    {
      label: 'Projects',
      icon: FolderOpen,
      items: [
        { path: '/projects', label: 'My Projects' },
        { path: '/projects', label: 'Team Projects' },
        { path: '/projects', label: 'Deadlines' },
      ],
    },
    {
      label: 'Attendance',
      icon: Clock,
      items: [
        { path: '/attendance', label: 'Today\'s Attendance' },
        { path: '/reports?tab=attendance', label: 'Monthly Attendance' },
        { path: '/leaves', label: 'Leave Requests' },
      ],
    },
    {
      label: 'Activity Monitoring',
      icon: Activity,
      items: [
        { path: '/activity', label: 'Live Activity' },
        { path: '/activity', label: 'App Usage' },
        { path: '/activity', label: 'Website Usage' },
        { path: '/activity', label: 'Productivity' },
        { path: '/activity', label: 'Idle Time' },
      ],
    },
    {
      label: 'Screenshots',
      icon: Camera,
      items: [
        { path: '/screenshots', label: 'Live Screenshots' },
        { path: '/screenshots', label: 'Timeline' },
        { path: '/screenshots', label: 'Employee Filter' },
      ],
    },
    {
      label: 'Reports',
      icon: BarChart3,
      items: [
        { path: '/reports?tab=productivity', label: 'Team Productivity' },
        { path: '/reports?tab=attendance', label: 'Attendance Report' },
        { path: '/tasks?tab=reports', label: 'Task Report' },
      ],
    },
  ];

  /* ── Super Admin nav — grouped sections ── */
  const superAdminSections = [
    {
      label: 'Overview',
      items: [
        { path: '/dashboard',   label: 'Dashboard',         icon: LayoutDashboard },
      ],
    },
    {
      label: 'Management',
      items: [
        { path: '/tenants',        label: 'Tenants (Companies)', icon: Building2      },
        { path: '/subscriptions',  label: 'Subscriptions',       icon: Layers         },
        { path: '/users-admins',   label: 'Users & Admins',      icon: Users          },
      ],
    },
    {
      label: 'Insights',
      items: [
        { path: '/analytics',      label: 'Analytics',           icon: BarChart3      },
        { path: '/system-monitor', label: 'System Monitoring',   icon: ServerCog      },
        { path: '/notifications',  label: 'Notifications',       icon: Bell           },
      ],
    },
    {
      label: 'Configuration',
      items: [
        { path: '/plans-billing',  label: 'Plans & Billing',     icon: CreditCard     },
        { path: '/global-settings',label: 'Global Settings',     icon: Globe          },
        { path: '/audit-logs',     label: 'Audit Logs',          icon: FileText       },
      ],
    },
    {
      label: 'Support',
      items: [
        { path: '/support',        label: 'Support Tickets',     icon: HeadphonesIcon },
      ],
    },
  ];

  const isActive = (path: string) => location.pathname === path;

  const isSubActive = (path: string) => {
    const [pathName, queryStr] = path.split('?');
    if (location.pathname !== pathName) return false;
    if (!queryStr) return true;
    const searchParams = new URLSearchParams(location.search);
    const queryParams = new URLSearchParams(queryStr);
    for (const [key, value] of queryParams.entries()) {
      if (searchParams.get(key) !== value) return false;
    }
    return true;
  };

  return (
    <div className="flex h-screen bg-slate-950">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ════════ SIDEBAR ════════ */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 flex flex-col bg-[#0d1117] border-r border-[#21262d] transform transition-transform lg:translate-x-0 ${
          isSuperAdmin ? 'w-60' : 'w-56'
        } ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* ── Logo ── */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-[#21262d] shrink-0">
          <Link to="/dashboard" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg">
              <Monitor className="w-4.5 h-4.5 text-white w-[18px] h-[18px]" />
            </div>
            <div>
              <span className="text-sm font-bold text-white">EMS Agent</span>
              <p className="text-[9px] text-slate-500 leading-none">
                {isSuperAdmin ? 'Super Admin' : isManager ? 'Manager Portal' : 'Admin Portal'}
              </p>
            </div>
          </Link>
          <button className="lg:hidden text-slate-400 hover:text-white" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Role badge ── */}
        {isSuperAdmin ? (
          <div className="px-3 py-2.5 border-b border-[#21262d] shrink-0">
            <div className="flex items-center gap-2 px-2 py-1.5 bg-amber-500/10 border border-amber-500/25 rounded-lg">
              <Shield className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-amber-400 truncate">{user?.name}</p>
                <p className="text-[9px] text-amber-500/70 leading-none">Super Administrator</p>
              </div>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0 ml-auto" />
            </div>
          </div>
        ) : (
          <div className="px-4 py-3 border-b border-[#21262d] shrink-0">
            <p className="text-xs font-medium text-white truncate">{tenant?.name || 'Employee Monitor'}</p>
            <p className="text-[10px] text-slate-400 capitalize">{tenant?.plan || 'free'} plan</p>
          </div>
        )}

        {/* ── Nav ── */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5
          [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent
          [&::-webkit-scrollbar-thumb]:bg-[#30363d] [&::-webkit-scrollbar-thumb]:rounded-full">

          {isSuperAdmin ? (
            /* Super Admin — grouped */
            superAdminSections.map((section) => (
              <div key={section.label} className="mb-2">
                <p className="px-3 mb-1 text-[9px] font-semibold uppercase tracking-widest text-slate-600">
                  {section.label}
                </p>
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all mb-0.5 ${
                        active
                          ? 'bg-blue-600/90 text-white shadow-sm shadow-blue-900/40'
                          : 'text-slate-400 hover:bg-[#161b22] hover:text-white'
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-slate-500'}`} />
                      <span className="truncate">{item.label}</span>
                      {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/50" />}
                    </Link>
                  );
                })}
              </div>
            ))
          ) : isManager ? (
            /* Manager — collapsible hierarchy */
            <div className="space-y-1.5">
              {/* Dashboard Link */}
              <Link
                to="/dashboard"
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all ${
                  isActive('/dashboard')
                    ? 'bg-blue-600/90 text-white shadow-sm shadow-blue-900/40'
                    : 'text-slate-400 hover:bg-[#161b22] hover:text-white'
                }`}
              >
                <LayoutDashboard className={`w-4 h-4 shrink-0 ${isActive('/dashboard') ? 'text-white' : 'text-slate-500'}`} />
                <span className="truncate">Dashboard</span>
              </Link>

              {/* Collapsible Sections */}
              {managerSections.map((section) => {
                const Icon = section.icon;
                const isExpanded = expandedMenus[section.label];
                const hasActiveChild = section.items.some(item => isSubActive(item.path));

                return (
                  <div key={section.label} className="space-y-0.5">
                    <button
                      onClick={() => toggleMenu(section.label)}
                      className={`flex items-center justify-between w-full px-3 py-2 rounded-lg text-[13px] font-medium transition-all cursor-pointer ${
                        hasActiveChild
                          ? 'text-white bg-[#161b22]/50'
                          : 'text-slate-400 hover:bg-[#161b22] hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-4 h-4 shrink-0 ${hasActiveChild ? 'text-blue-500' : 'text-slate-500'}`} />
                        <span className="truncate">{section.label}</span>
                      </div>
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${
                          isExpanded ? 'rotate-180 text-white' : ''
                        }`}
                      />
                    </button>

                    {/* Submenu items */}
                    {isExpanded && (
                      <div className="pl-6 border-l border-[#21262d] ml-5 py-1 space-y-0.5 transition-all duration-300">
                        {section.items.map((item) => {
                          const active = isSubActive(item.path);
                          return (
                            <Link
                              key={item.label + item.path}
                              to={item.path}
                              onClick={() => setSidebarOpen(false)}
                              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all relative ${
                                active
                                  ? 'text-blue-400 font-bold bg-[#161b22]'
                                  : 'text-slate-500 hover:text-slate-200 hover:bg-[#161b22]/30'
                              }`}
                            >
                              {active && (
                                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-3.5 rounded-r bg-blue-500" />
                              )}
                              <span className="truncate">{item.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Notifications Link */}
              <Link
                to="/notifications"
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all ${
                  isActive('/notifications')
                    ? 'bg-blue-600/90 text-white shadow-sm shadow-blue-900/40'
                    : 'text-slate-400 hover:bg-[#161b22] hover:text-white'
                }`}
              >
                <Bell className={`w-4 h-4 shrink-0 ${isActive('/notifications') ? 'text-white' : 'text-slate-500'}`} />
                <span className="truncate">Notifications</span>
              </Link>
            </div>
          ) : (
            /* Company Admin / Employee — flat links */
            (isAdmin ? adminNavItems : employeeNavItems).map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all ${
                    active
                      ? 'bg-blue-600/90 text-white shadow-sm shadow-blue-900/40'
                      : 'text-slate-400 hover:bg-[#161b22] hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-slate-500'}`} />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })
          )}
        </nav>

        {/* ── Bottom: Profile + Logout ── */}
        <div className="shrink-0 border-t border-[#21262d] p-3 space-y-1">
          {/* Profile */}
          <Link
            to="/profile"
            onClick={() => setSidebarOpen(false)}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-all ${
              isActive('/profile')
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:bg-[#161b22] hover:text-white'
            }`}
          >
            <UserCircle className={`w-4 h-4 shrink-0 ${isActive('/profile') ? 'text-white' : 'text-slate-500'}`} />
            <span>Profile</span>
          </Link>

          {/* User info row */}
          <div className="flex items-center gap-2 px-2 py-1.5 mt-1">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
              isSuperAdmin ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-blue-600 text-white'
            }`}>
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">{user?.name}</p>
              <p className="text-[9px] text-slate-500 capitalize truncate">
                {user?.role?.replace(/_/g, ' ')}
              </p>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 w-full px-3 py-2 text-[13px] text-slate-400 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-all group"
          >
            <LogOut className="w-4 h-4 shrink-0 group-hover:text-red-400 transition-colors" />
            Logout
          </button>
        </div>
      </aside>

      {/* ════════ MAIN CONTENT ════════ */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 bg-[#0d1117] border-b border-[#21262d] flex items-center justify-between px-4 lg:px-6 shrink-0">
          <button className="lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5 text-slate-400" />
          </button>

          {/* breadcrumb */}
          <div className="hidden lg:flex items-center gap-1.5 text-sm">
            <span className="text-slate-500">
              {isSuperAdmin ? 'Super Admin' : isManager ? `${tenant?.name || 'Company'} (Manager)` : tenant?.name || 'Admin'}
            </span>
            <ChevronDown className="w-3 h-3 text-slate-600 -rotate-90" />
            <span className="text-white font-medium capitalize">
              {location.pathname.replace('/', '').replace(/-/g, ' ') || 'Dashboard'}
            </span>
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 text-slate-400 hover:text-white hover:bg-[#161b22] rounded-lg transition-all"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5 text-yellow-400" />
              ) : (
                <Moon className="w-5 h-5 text-blue-400" />
              )}
            </button>

            {/* Bell */}
            <button className="relative p-2 text-slate-400 hover:text-white hover:bg-[#161b22] rounded-lg transition-all">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
            </button>

            {/* Role badge in header */}
            {isSuperAdmin && (
              <span className="hidden sm:flex items-center gap-1 px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[10px] font-semibold text-amber-400">
                <Shield className="w-3 h-3" />
                Super Admin
              </span>
            )}

            {isManager && (
              <span className="hidden sm:flex items-center gap-1 px-2 py-1 bg-blue-500/10 border border-blue-500/20 rounded-lg text-[10px] font-semibold text-blue-400">
                <Users className="w-3 h-3" />
                Manager
              </span>
            )}

            {/* Avatar */}
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
              isSuperAdmin ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-blue-600 text-white'
            }`}>
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <span className="hidden sm:block text-sm font-medium text-slate-200">{user?.name}</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-5 bg-[#0d1117]">{children}</main>
      </div>
    </div>
  );
};

export default Layout;
