import React from 'react';
import { Globe } from 'lucide-react';
import SuperAdminPage from './SuperAdminPage';
const GlobalSettingsPage: React.FC = () => (
  <SuperAdminPage title="Global Settings" subtitle="Platform-wide configuration and preferences" icon={Globe} accentColor="text-slate-400" />
);
export default GlobalSettingsPage;
