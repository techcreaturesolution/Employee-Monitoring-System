import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { mobileAPI, setAuthToken } from '../services/api';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  tenantId: string;
  department: string;
  designation: string;
  workMode: 'office' | 'wfh' | 'field';
  avatar: string;
  phone: string;
}

interface TenantConfig {
  id: string;
  name: string;
  plan: string;
  settings: {
    enableGeofencing: boolean;
    officeLocations: Array<{
      name: string;
      latitude: number;
      longitude: number;
      radiusMeters: number;
    }>;
    mobileLocationInterval: number;
    requireLocationForPunch: boolean;
    workStartTime: string;
    workEndTime: string;
  };
}

interface AuthContextType {
  user: User | null;
  tenant: TenantConfig | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateWorkMode: (mode: 'office' | 'wfh' | 'field') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [tenant, setTenant] = useState<TenantConfig | null>(null);
  const [loading, setLoading] = useState(false);

  const login = async (email: string, password: string) => {
    const res = await mobileAPI.login({ email, password });
    const { user: userData, tenant: tenantData, accessToken } = res.data.data;
    setAuthToken(accessToken);
    setUser(userData);
    setTenant(tenantData);
  };

  const logout = () => {
    setAuthToken(null);
    setUser(null);
    setTenant(null);
  };

  const updateWorkMode = async (mode: 'office' | 'wfh' | 'field') => {
    await mobileAPI.updateWorkMode(mode);
    if (user) {
      setUser({ ...user, workMode: mode });
    }
  };

  return (
    <AuthContext.Provider value={{ user, tenant, loading, login, logout, updateWorkMode }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
