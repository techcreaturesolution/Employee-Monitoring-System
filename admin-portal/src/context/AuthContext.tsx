import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI } from '../services/api';
import { User, Tenant } from '../types';

interface AuthContextType {
  user: User | null;
  tenant: Tenant | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: Record<string, string>) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('ems_token');
    if (token) {
      authAPI
        .getMe()
        .then((res) => {
          setUser(res.data.data.user);
          setTenant(res.data.data.tenant);
        })
        .catch(() => {
          localStorage.removeItem('ems_token');
          localStorage.removeItem('ems_user');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const res = await authAPI.login({ email, password });
    const { user: userData, tenant: tenantData, accessToken } = res.data.data;
    localStorage.setItem('ems_token', accessToken);
    localStorage.setItem('ems_user', JSON.stringify(userData));
    setUser(userData);
    setTenant(tenantData);
  };

  const register = async (data: Record<string, string>) => {
    const res = await authAPI.register(data);
    const { user: userData, tenant: tenantData, accessToken } = res.data.data;
    localStorage.setItem('ems_token', accessToken);
    localStorage.setItem('ems_user', JSON.stringify(userData));
    setUser(userData);
    setTenant(tenantData);
  };

  const logout = () => {
    localStorage.removeItem('ems_token');
    localStorage.removeItem('ems_user');
    setUser(null);
    setTenant(null);
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('ems_user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider value={{ user, tenant, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
