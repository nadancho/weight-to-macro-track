"use client";

import { createContext, useCallback, useContext, useRef } from "react";

type CacheEntry = {
  data: unknown;
  fetchedAt: number;
};

type DataCacheContextValue = {
  /** Fetch with in-memory caching. Returns cached data on subsequent calls for the same URL. */
  cachedFetch: <T>(url: string, opts?: RequestInit) => Promise<T>;
  /** Invalidate cached entries matching a URL prefix. Call after mutations. */
  invalidate: (urlPrefix?: string) => void;
};

const DataCacheContext = createContext<DataCacheContextValue | null>(null);

export function DataCacheProvider({ children }: { children: React.ReactNode }) {
  const cache = useRef<Map<string, CacheEntry>>(new Map());
  const inflight = useRef<Map<string, Promise<unknown>>>(new Map());

  const cachedFetch = useCallback(async <T,>(url: string, opts?: RequestInit): Promise<T> => {
    const key = url;

    // Return cached data if available
    const entry = cache.current.get(key);
    if (entry) return entry.data as T;

    // Deduplicate in-flight requests for the same URL
    const existing = inflight.current.get(key);
    if (existing) return existing as Promise<T>;

    const promise = fetch(url, { credentials: "include", ...opts })
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => {
        cache.current.set(key, { data, fetchedAt: Date.now() });
        inflight.current.delete(key);
        return data as T;
      })
      .catch((err) => {
        inflight.current.delete(key);
        throw err;
      });

    inflight.current.set(key, promise);
    return promise;
  }, []);

  const invalidate = useCallback((urlPrefix?: string) => {
    if (!urlPrefix) {
      cache.current.clear();
      return;
    }
    Array.from(cache.current.keys()).forEach((key) => {
      if (key.startsWith(urlPrefix)) {
        cache.current.delete(key);
      }
    });
  }, []);

  return (
    <DataCacheContext.Provider value={{ cachedFetch, invalidate }}>
      {children}
    </DataCacheContext.Provider>
  );
}

export function useDataCache() {
  const ctx = useContext(DataCacheContext);
  if (!ctx) throw new Error("useDataCache must be used within DataCacheProvider");
  return ctx;
}
