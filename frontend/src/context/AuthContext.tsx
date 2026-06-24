import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { get, post } from '../api/client';
import { AuthContextType, User, Organization, LoginResponse, MeResponse } from '../types';

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('accessToken'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const isAuthenticated = !!token && !!user;

  const persistTokens = useCallback((accessToken: string, refreshToken: string): void => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    setToken(accessToken);
  }, []);

  const clearSession = useCallback((): void => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setToken(null);
    setUser(null);
    setOrganization(null);
  }, []);

  const fetchMe = useCallback(async (): Promise<MeResponse | null> => {
    try {
      const data = await get<MeResponse>('/auth/me');
      setUser(data.user);
      setOrganization(data.organization);
      return data;
    } catch {
      clearSession();
      return null;
    }
  }, [clearSession]);

  useEffect(() => {
    const initAuth = async (): Promise<void> => {
      const storedToken = localStorage.getItem('accessToken');
      if (storedToken) {
        setToken(storedToken);
        await fetchMe();
      }
      setIsLoading(false);
    };
    void initAuth();
  }, [fetchMe]);

  const login = async (email: string, password: string): Promise<void> => {
    const data = await post<LoginResponse>('/auth/login', { email, password });
    persistTokens(data.accessToken, data.refreshToken);
    setUser(data.user);
    setOrganization(data.organization);
  };

  const register = async (
    orgName: string,
    name: string,
    email: string,
    password: string
  ): Promise<void> => {
    const data = await post<LoginResponse>('/auth/register', { orgName, name, email, password });
    persistTokens(data.accessToken, data.refreshToken);
    setUser(data.user);
    setOrganization(data.organization);
  };

  const logout = async (): Promise<void> => {
    const refreshToken = localStorage.getItem('refreshToken');
    try {
      if (refreshToken) {
        await post('/auth/logout', { refreshToken });
      }
    } catch {
      // ignore logout errors
    }
    clearSession();
  };

  const refreshTokenFn = async (): Promise<string> => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) throw new Error('No refresh token');
    const data = await post<{ accessToken: string }>('/auth/refresh', { refreshToken });
    localStorage.setItem('accessToken', data.accessToken);
    setToken(data.accessToken);
    return data.accessToken;
  };

  const value: AuthContextType = {
    user,
    organization,
    token,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    refreshToken: refreshTokenFn,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
