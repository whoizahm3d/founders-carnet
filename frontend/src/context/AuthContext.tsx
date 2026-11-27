'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, LoginCredentials, RegisterData, BackendUserRead } from '@/types/auth';
import { authStorage, loginApi, registerApi, logoutApi, mapBackendUser } from '@/lib/auth';
import { api, ApiError, AUTH_EXPIRED_EVENT } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<User>;
  register: (data: RegisterData) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => authStorage.getUser());
  const [token, setToken] = useState<string | null>(() => authStorage.getToken());
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    // Only set loading to true initially if there is a session to validate
    return !!authStorage.getToken();
  });

  // Validate session against backend on load
  useEffect(() => {
    let isMounted = true;

    async function validateStoredSession() {
      const storedToken = authStorage.getToken();
      const storedUser = authStorage.getUser();

      if (!storedToken || !storedUser) {
        if (isMounted) setIsLoading(false);
        return;
      }

      try {
        const backendUser = await api.get<BackendUserRead>('/users/me', {
          token: storedToken,
          skipAuthRedirect: true,
        });

        if (isMounted) {
          const freshUser = mapBackendUser(backendUser);
          setUser(freshUser);
          setToken(storedToken);
          authStorage.setSession(storedToken, freshUser, authStorage.isRemembered());
        }
      } catch (err: unknown) {
        if (err instanceof ApiError && err.status === 401) {
          // Explicit 401: clear session
          authStorage.clear();
          if (isMounted) {
            setUser(null);
            setToken(null);
          }
        } else {
          // Network error or other non-401 failure: keep stored session
          if (isMounted) {
            setUser(storedUser);
            setToken(storedToken);
          }
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    validateStoredSession();

    // Listen for global session expiration events from api.ts
    const handleExpired = () => {
      authStorage.clear();
      setUser(null);
      setToken(null);
    };

    window.addEventListener(AUTH_EXPIRED_EVENT, handleExpired);
    return () => {
      isMounted = false;
      window.removeEventListener(AUTH_EXPIRED_EVENT, handleExpired);
    };
  }, []);

  const login = async (credentials: LoginCredentials): Promise<User> => {
    setIsLoading(true);
    try {
      const res = await loginApi(credentials);
      setToken(res.token);
      setUser(res.user);
      return res.user;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterData): Promise<User> => {
    setIsLoading(true);
    try {
      const res = await registerApi(data);
      setToken(res.token);
      setUser(res.user);
      return res.user;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await logoutApi();
    } finally {
      setUser(null);
      setToken(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
