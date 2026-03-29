"use client";

import { createContext, useContext } from "react";

type UserPrefs = {
  weekStartsOn: 0 | 1;
};

const UserPrefsContext = createContext<UserPrefs>({ weekStartsOn: 1 });

export function UserPrefsProvider({
  weekStartsOn,
  children,
}: {
  weekStartsOn: 0 | 1;
  children: React.ReactNode;
}) {
  return (
    <UserPrefsContext.Provider value={{ weekStartsOn }}>
      {children}
    </UserPrefsContext.Provider>
  );
}

export function useUserPrefs(): UserPrefs {
  return useContext(UserPrefsContext);
}
