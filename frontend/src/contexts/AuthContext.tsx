"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { fetchMe, type UserMe } from "@/lib/api/users";
import { getToken } from "@/lib/storage";

export class SessionProfileError extends Error {
  constructor() {
    super("session_profile_failed");
    this.name = "SessionProfileError";
  }
}

type AuthContextValue = {
  me: UserMe | null;
  isLoading: boolean;
  refreshMe: () => Promise<UserMe>;
  clearMe: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<UserMe | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshMe = useCallback(async (): Promise<UserMe> => {
    if (!getToken()) {
      setMe(null);
      setIsLoading(false);
      throw new SessionProfileError();
    }
    setIsLoading(true);
    try {
      const data = await fetchMe();
      setMe(data);
      return data;
    } catch {
      setMe(null);
      throw new SessionProfileError();
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearMe = useCallback(() => {
    setMe(null);
  }, []);

  useEffect(() => {
    void refreshMe().catch(() => {
      /* sin token al montar: estado inicial vacío */
    });
  }, [refreshMe]);

  const value = useMemo(
    () => ({ me, isLoading, refreshMe, clearMe }),
    [me, isLoading, refreshMe, clearMe],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }
  return ctx;
}
