import React from 'react';
import { Users } from 'lucide-react';
import SuperAdminPage from './SuperAdminPage';
const UsersAdminsPage: React.FC = () => (
  <SuperAdminPage title="Users & Admins" subtitle="Manage all users and admin accounts" icon={Users} accentColor="text-blue-400" />
);
export default UsersAdminsPage;
