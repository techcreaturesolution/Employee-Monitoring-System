import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import Attendance from './pages/Attendance';
import Screenshots from './pages/Screenshots';
import ActivityPage from './pages/ActivityPage';
import Projects from './pages/Projects';
import SettingsPage from './pages/SettingsPage';
import Tenants from './pages/Tenants';
import LocationTracker from './pages/LocationTracker';
import ProfilePage from './pages/ProfilePage';
import Managers from './pages/Managers';
import Tasks from './pages/Tasks';
import ReportsPage from './pages/ReportsPage';
import Leaves from './pages/Leaves';

/* ── Super Admin pages ── */
import Subscriptions from './pages/Subscriptions';
import UsersAdmins from './pages/UsersAdmins';
import Analytics from './pages/Analytics';
import SystemMonitor from './pages/SystemMonitor';
import Notifications from './pages/Notifications';
import PlansBilling from './pages/PlansBilling';
import GlobalSettings from './pages/GlobalSettings';
import AuditLogs from './pages/AuditLogs';
import Support from './pages/Support';

const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: string[] }> = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0d1117]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto" />
          <p className="mt-4 text-slate-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" />;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Layout>{children}</Layout>;
};

const App: React.FC = () => {
  const { user, loading } = useAuth();

  React.useEffect(() => {
    const savedTheme = (localStorage.getItem('ems_theme') as 'light' | 'dark') || 'dark';
    const root = document.documentElement;
    const body = document.body;
    if (savedTheme === 'light') {
      root.classList.add('light-theme');
      body.classList.add('light-theme');
    } else {
      root.classList.remove('light-theme');
      body.classList.remove('light-theme');
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0d1117]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto" />
          <p className="mt-4 text-slate-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  const allRoles = ['super_admin', 'company_admin', 'manager', 'employee'];
  const adminManagerSuper = ['super_admin', 'company_admin', 'manager'];
  const adminSuper = ['super_admin', 'company_admin'];
  const superOnly = ['super_admin'];

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: '#161b22', color: '#e2e8f0', border: '1px solid #30363d' },
        }}
      />
      <Routes>
        <Route path="/login"    element={user ? <Navigate to="/dashboard" /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <Register />} />

        {/* ── Common routes with Role Guards ── */}
        <Route path="/dashboard"   element={<ProtectedRoute allowedRoles={allRoles}><Dashboard /></ProtectedRoute>} />
        <Route path="/employees"   element={<ProtectedRoute allowedRoles={adminManagerSuper}><Employees /></ProtectedRoute>} />
        <Route path="/attendance"  element={<ProtectedRoute allowedRoles={allRoles}><Attendance /></ProtectedRoute>} />
        <Route path="/screenshots" element={<ProtectedRoute allowedRoles={allRoles}><Screenshots /></ProtectedRoute>} />
        <Route path="/activity"    element={<ProtectedRoute allowedRoles={allRoles}><ActivityPage /></ProtectedRoute>} />
        <Route path="/projects"    element={<ProtectedRoute allowedRoles={allRoles}><Projects /></ProtectedRoute>} />
        <Route path="/settings"    element={<ProtectedRoute allowedRoles={allRoles}><SettingsPage /></ProtectedRoute>} />
        <Route path="/tenants"     element={<ProtectedRoute allowedRoles={superOnly}><Tenants /></ProtectedRoute>} />
        <Route path="/location"    element={<ProtectedRoute allowedRoles={allRoles}><LocationTracker /></ProtectedRoute>} />
        <Route path="/profile"     element={<ProtectedRoute allowedRoles={allRoles}><ProfilePage /></ProtectedRoute>} />
        <Route path="/managers"    element={<ProtectedRoute allowedRoles={adminSuper}><Managers /></ProtectedRoute>} />
        <Route path="/tasks"       element={<ProtectedRoute allowedRoles={allRoles}><Tasks /></ProtectedRoute>} />
        <Route path="/reports"     element={<ProtectedRoute allowedRoles={allRoles}><ReportsPage /></ProtectedRoute>} />
        <Route path="/leaves"      element={<ProtectedRoute allowedRoles={allRoles}><Leaves /></ProtectedRoute>} />

        {/* ── Super Admin routes ── */}
        <Route path="/subscriptions"   element={<ProtectedRoute allowedRoles={superOnly}><Subscriptions /></ProtectedRoute>} />
        <Route path="/users-admins"    element={<ProtectedRoute allowedRoles={superOnly}><UsersAdmins /></ProtectedRoute>} />
        <Route path="/analytics"       element={<ProtectedRoute allowedRoles={superOnly}><Analytics /></ProtectedRoute>} />
        <Route path="/system-monitor"  element={<ProtectedRoute allowedRoles={superOnly}><SystemMonitor /></ProtectedRoute>} />
        <Route path="/notifications"   element={<ProtectedRoute allowedRoles={allRoles}><Notifications /></ProtectedRoute>} />
        <Route path="/plans-billing"   element={<ProtectedRoute allowedRoles={superOnly}><PlansBilling /></ProtectedRoute>} />
        <Route path="/global-settings" element={<ProtectedRoute allowedRoles={superOnly}><GlobalSettings /></ProtectedRoute>} />
        <Route path="/audit-logs"      element={<ProtectedRoute allowedRoles={superOnly}><AuditLogs /></ProtectedRoute>} />
        <Route path="/support"         element={<ProtectedRoute allowedRoles={superOnly}><Support /></ProtectedRoute>} />

        <Route path="/"  element={<Navigate to="/dashboard" />} />
        <Route path="*"  element={<Navigate to="/dashboard" />} />
      </Routes>
    </>
  );
};

export default App;
