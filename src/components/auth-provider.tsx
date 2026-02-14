"use client";

import { createContext, useContext } from "react";

const AuthContext = createContext<{ initialAuth: boolean } | null>(null);

export function AuthProvider({
  initialAuth,
  children,
}: {
  initialAuth: boolean;
  children: React.ReactNode;
}) {
  return (
    <AuthContext.Provider value={{ initialAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useInitialAuth(): boolean {
  const ctx = useContext(AuthContext);
  if (ctx == null) {
    return false;
  }
  return ctx.initialAuth;
}
