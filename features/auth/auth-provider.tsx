"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { authService, onSessionExpired, type AppUser } from "@gestionresidencial/auth-client";

type AuthContextValue = {
  user: AppUser | null;
  loading: boolean;
  sessionError: boolean;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState(false);

  useEffect(() => {
    let active = true;

    authService
      .getSession()
      .then((profile) => {
        if (active) setUser(profile);
      })
      .catch(() => {
        if (active) setSessionError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => onSessionExpired(() => setUser(null)), []);

  async function logout() {
    await authService.logout();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, sessionError, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth requires AuthProvider");
  return context;
}
