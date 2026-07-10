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
    // Check if user is already authenticated
    // Cookie is sent automatically by browser
    authAPI
      .getMe()
      .then(async (res) => {
        const userData = res.data.data.user;
        setUser(userData);
        setTenant(res.data.data.tenant);
        localStorage.setItem('ems_user', JSON.stringify(userData));

        // Automatically fetch and populate accessToken in localStorage via refresh-token endpoint
        try {
          const refreshRes = await authAPI.refreshToken();
          const { accessToken } = refreshRes.data.data;
          if (accessToken) {
            localStorage.setItem('ems_token', accessToken);
          }
        } catch (refreshErr) {
          console.warn('Auto refresh-token failed on mount:', refreshErr);
        }
      })
      .catch(() => {
        // User not authenticated, no action needed
        // Cookie will be cleared by server on 401
        localStorage.removeItem('ems_user');
        localStorage.removeItem('ems_token');
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const res = await authAPI.login({ email, password });
    const { user: userData, tenant: tenantData, accessToken } = res.data.data;
    // Cookie is set automatically by server!
    setUser(userData);
    setTenant(tenantData);
    localStorage.setItem('ems_user', JSON.stringify(userData));
    if (accessToken) {
      localStorage.setItem('ems_token', accessToken);
    }
  };

  const register = async (data: Record<string, string>) => {
    const res = await authAPI.register(data);
    const { user: userData, tenant: tenantData, accessToken } = res.data.data;
    // Cookie is set automatically by server!
    setUser(userData);
    setTenant(tenantData);
    localStorage.setItem('ems_user', JSON.stringify(userData));
    if (accessToken) {
      localStorage.setItem('ems_token', accessToken);
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout(); 
    } catch (err) {
      // Ignore errors
    }
    setUser(null);
    setTenant(null);
    localStorage.removeItem('ems_user');
    localStorage.removeItem('ems_token');
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
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
