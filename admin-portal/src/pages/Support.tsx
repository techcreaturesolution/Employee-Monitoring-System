import React from 'react';
import { HeadphonesIcon } from 'lucide-react';
import SuperAdminPage from './SuperAdminPage';
const SupportPage: React.FC = () => (
  <SuperAdminPage title="Support Tickets" subtitle="Manage and respond to customer support tickets" icon={HeadphonesIcon} accentColor="text-pink-400" />
);
export default SupportPage;
