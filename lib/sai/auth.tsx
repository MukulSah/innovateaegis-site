"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { employees } from "./data";

export type Role = "owner" | "employee";

export type SaiUser = {
  username: string;
  name: string;
  role: Role;
  title: string;
  employeeSlug?: string;
};

type Credential = {
  username: string;
  password: string;
  user: SaiUser;
};

const credentials: Credential[] = [
  {
    username: "admin",
    password: "admin",
    user: { username: "admin", name: "Owner", role: "owner", title: "Founder & Owner" },
  },
  // Employee demo logins: username is first name (lowercase), password is "demo".
  ...employees.map((e) => ({
    username: e.name.split(" ")[0].toLowerCase(),
    password: "demo",
    user: {
      username: e.name.split(" ")[0].toLowerCase(),
      name: e.name,
      role: "employee" as Role,
      title: e.role,
      employeeSlug: e.slug,
    },
  })),
];

const STORAGE_KEY = "sai-company-session";

type AuthContextValue = {
  user: SaiUser | null;
  ready: boolean;
  login: (username: string, password: string) => boolean;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SaiUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Restore the session from localStorage after mount. This runs once and is
    // intentionally a client-only hydration step, so the synchronous setState
    // is expected here.
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setUser(JSON.parse(raw) as SaiUser);
    } catch {
      // ignore malformed session
    }
    setReady(true);
  }, []);

  const login = useCallback((username: string, password: string) => {
    const match = credentials.find(
      (c) =>
        c.username === username.trim().toLowerCase() && c.password === password,
    );
    if (!match) return false;
    setUser(match.user);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(match.user));
    } catch {
      // ignore storage errors
    }
    return true;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore storage errors
    }
  }, []);

  const value = useMemo(
    () => ({ user, ready, login, logout }),
    [user, ready, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
