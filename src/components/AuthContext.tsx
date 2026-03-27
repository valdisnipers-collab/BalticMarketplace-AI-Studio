import React, { createContext, useContext, useEffect, useState } from 'react';

interface User {
  id: number;
  email: string | null;
  name: string;
  role: string;
  phone: string;
  is_verified: boolean;
  user_type: 'c2c' | 'b2b';
  points: number;
  early_access_until: string | null;
  company_name?: string;
  company_reg_number?: string;
  company_vat?: string;
  company_address?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  token: string | null;
  signIn: (token: string, userData: User) => void;
  signOut: () => void;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('auth_token');

  useEffect(() => {
    if (token) {
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setUser(data.user);
        } else {
          localStorage.removeItem('auth_token');
        }
      })
      .catch(() => localStorage.removeItem('auth_token'))
      .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const signIn = (token: string, userData: User) => {
    localStorage.setItem('auth_token', token);
    setUser(userData);
  };

  const signOut = () => {
    localStorage.removeItem('auth_token');
    setUser(null);
  };

  const updateUser = (updates: Partial<User>) => {
    setUser(prev => prev ? { ...prev, ...updates } : null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, token, signIn, signOut, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

