import React from 'react';
import { LucideIcon } from 'lucide-react';

interface SuperAdminPageProps {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  accentColor?: string;
  children?: React.ReactNode;
}

const SuperAdminPage: React.FC<SuperAdminPageProps> = ({
  title,
  subtitle,
  icon: Icon,
  accentColor = 'text-blue-400',
  children,
}) => (
  <div className="min-h-full bg-[#0d1117] text-white">
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-9 h-9 rounded-xl bg-[#161b22] border border-[#30363d] flex items-center justify-center">
          <Icon className={`w-4.5 h-4.5 w-[18px] h-[18px] ${accentColor}`} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">{title}</h1>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
      </div>
    </div>
    {children ?? (
      <div className="flex flex-col items-center justify-center bg-[#161b22] border border-[#30363d] rounded-2xl p-20 text-center">
        <Icon className={`w-14 h-14 ${accentColor} mb-4 opacity-40`} />
        <p className="text-lg font-semibold text-white mb-1">{title}</p>
        <p className="text-sm text-slate-500">This module is under development.</p>
      </div>
    )}
  </div>
);

export default SuperAdminPage;
