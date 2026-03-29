"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "@/components/auth-provider";

// Canonical log entry type — shared across all consumers
export type LogEntry = {
  id: string;
  date: string;
  weight: number | null;
  carbs_g: number | null;
  protein_g: number | null;
  fat_g: number | null;
};

export type SaveLogPayload = {
  date: string;
  weight?: number | null;
  carbs_g?: number | null;
  protein_g?: number | null;
  fat_g?: number | null;
};

const LS_LOGS_KEY = "wt_logs";
const LS_SYNCED_KEY = "wt_logs_synced";

// ---------- localStorage helpers ----------

function readLogsFromStorage(): LogEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_LOGS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLogsToStorage(logs: LogEntry[]): void {
  try {
    localStorage.setItem(LS_LOGS_KEY, JSON.stringify(logs));
    localStorage.setItem(LS_SYNCED_KEY, new Date().toISOString());
  } catch {
    // localStorage full or unavailable — degrade gracefully
  }
}

function logsToMap(logs: LogEntry[]): Map<string, LogEntry> {
  const map = new Map<string, LogEntry>();
  for (const log of logs) map.set(log.date, log);
  return map;
}

function mapToSortedArray(map: Map<string, LogEntry>): LogEntry[] {
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

// ---------- Context ----------

type LogCacheContextValue = {
  logs: LogEntry[];
  getLog: (date: string) => LogEntry | undefined;
  getLogsByRange: (from: string, to: string) => LogEntry[];
  saveLog: (entry: SaveLogPayload) => Promise<{ ok: boolean; error?: string }>;
  syncing: boolean;
  initialized: boolean;
  refresh: () => Promise<void>;
};

const LogCacheContext = createContext<LogCacheContextValue | null>(null);

export function LogCacheProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [logMap, setLogMap] = useState<Map<string, LogEntry>>(() => logsToMap(readLogsFromStorage()));
  const [initialized, setInitialized] = useState(() => readLogsFromStorage().length > 0);
  const [syncing, setSyncing] = useState(false);
  const syncRef = useRef(false);

  // Sorted array derived from map
  const logs = useMemo(() => mapToSortedArray(logMap), [logMap]);

  // ---------- Sync from API ----------

  const syncFromApi = useCallback(async () => {
    if (syncRef.current) return;
    syncRef.current = true;
    setSyncing(true);
    try {
      const to = new Date().toISOString().slice(0, 10);
      const from = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const res = await fetch(`/api/logs?from=${from}&to=${to}`, { credentials: "include" });
      if (!res.ok) return;
      const data: LogEntry[] = await res.json();
      const newMap = logsToMap(data);
      setLogMap(newMap);
      setInitialized(true);
      writeLogsToStorage(data);
    } finally {
      setSyncing(false);
      syncRef.current = false;
    }
  }, []);

  // Sync on auth
  useEffect(() => {
    if (!isAuthenticated) return;
    // If we have cached data, mark initialized immediately
    const cached = readLogsFromStorage();
    if (cached.length > 0) {
      setLogMap(logsToMap(cached));
      setInitialized(true);
    }
    // Background sync regardless
    syncFromApi();
  }, [isAuthenticated, syncFromApi]);

  // Clear cache on sign-out
  useEffect(() => {
    if (!isAuthenticated) {
      setLogMap(new Map());
      setInitialized(false);
    }
  }, [isAuthenticated]);

  // ---------- Reads ----------

  const getLog = useCallback(
    (date: string) => logMap.get(date),
    [logMap]
  );

  const getLogsByRange = useCallback(
    (from: string, to: string) =>
      logs.filter((l) => l.date >= from && l.date <= to),
    [logs]
  );

  // ---------- Optimistic write ----------

  const pendingSaves = useRef<Map<string, Promise<{ ok: boolean; error?: string }>>>(new Map());

  const saveLog = useCallback(
    async (entry: SaveLogPayload): Promise<{ ok: boolean; error?: string }> => {
      // Deduplicate: if a save for this date is already in-flight, return it
      const existing = pendingSaves.current.get(entry.date);
      if (existing) return existing;
      const tempId = `temp_${entry.date}`;
      const optimistic: LogEntry = {
        id: logMap.get(entry.date)?.id ?? tempId,
        date: entry.date,
        weight: entry.weight ?? null,
        carbs_g: entry.carbs_g ?? null,
        protein_g: entry.protein_g ?? null,
        fat_g: entry.fat_g ?? null,
      };

      // Snapshot for rollback
      const prev = logMap.get(entry.date) ?? null;

      // Optimistic update
      setLogMap((m) => {
        const next = new Map(m);
        next.set(entry.date, optimistic);
        return next;
      });

      const promise = (async (): Promise<{ ok: boolean; error?: string }> => {
        try {
          const res = await fetch("/api/logs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(entry),
          });

          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            setLogMap((m) => {
              const next = new Map(m);
              if (prev) next.set(entry.date, prev);
              else next.delete(entry.date);
              return next;
            });
            return { ok: false, error: data.error ?? "Failed to save" };
          }

          const saved: LogEntry = await res.json();
          setLogMap((m) => {
            const next = new Map(m);
            next.set(saved.date, saved);
            writeLogsToStorage(mapToSortedArray(next));
            return next;
          });

          return { ok: true };
        } catch {
          setLogMap((m) => {
            const next = new Map(m);
            if (prev) next.set(entry.date, prev);
            else next.delete(entry.date);
            return next;
          });
          return { ok: false, error: "Network error" };
        }
      })();

      pendingSaves.current.set(entry.date, promise);
      promise.finally(() => pendingSaves.current.delete(entry.date));
      return promise;
    },
    [logMap]
  );

  const value = useMemo(
    () => ({ logs, getLog, getLogsByRange, saveLog, syncing, initialized, refresh: syncFromApi }),
    [logs, getLog, getLogsByRange, saveLog, syncing, initialized, syncFromApi]
  );

  return (
    <LogCacheContext.Provider value={value}>
      {children}
    </LogCacheContext.Provider>
  );
}

export function useLogCache() {
  const ctx = useContext(LogCacheContext);
  if (!ctx) throw new Error("useLogCache must be used within LogCacheProvider");
  return ctx;
}
