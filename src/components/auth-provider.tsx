"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type AuthContextValue = {
  /** True once the client has confirmed auth (e.g. via /api/profile). */
  authResolved: boolean;
  /** True when the user is authenticated. */
  isAuthenticated: boolean;
  /** Update auth state (e.g. after sign-in or sign-out) without refetching. */
  setAuth: (authenticated: boolean) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  initialAuth,
  children,
}: {
  initialAuth: boolean;
  children: React.ReactNode;
}) {
  const [isAuthenticated, setIsAuthenticated] = useState(initialAuth);
  const [authResolved, setAuthResolved] = useState(false);

  useEffect(() => {
    fetch("/api/profile", { credentials: "include" })
      .then((r) => {
        setIsAuthenticated(r.ok);
        setAuthResolved(true);
      })
      .catch(() => {
        setIsAuthenticated(false);
        setAuthResolved(true);
      });
  }, []);

  const setAuth = useCallback((authenticated: boolean) => {
    setIsAuthenticated(authenticated);
    setAuthResolved(true);
  }, []);

  return (
    <AuthContext.Provider
      value={{ authResolved, isAuthenticated, setAuth }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/** Auth state and setter from context. Use this so "You need to sign in" only shows after auth is resolved. */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx == null) {
    return {
      authResolved: false,
      isAuthenticated: false,
      setAuth: () => {},
    };
  }
  return ctx;
}

/**
 * Shared skeleton shown while auth is resolving. Use when !authResolved to avoid flashing "You need to sign in".
 */
export function AuthLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <Card className="max-w-sm">
        <CardHeader className="space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * @deprecated Use useAuth() instead. Kept for compatibility during migration.
 */
export function useInitialAuth(): boolean {
  return useAuth().isAuthenticated;
}
