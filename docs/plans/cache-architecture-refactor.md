# Cache Architecture Refactor

Restructure the client-side data layer to follow the same layered pattern as the backend (Routes → Modules → Services → Integrations). Extract browser-native adapters as reusable integrations, move cache logic into a testable service, and keep the React provider as a thin controller.

## Current State

`src/components/log-cache-provider.tsx` is a ~200 line file that handles:
- localStorage persistence
- API fetching
- Optimistic writes with rollback
- Cache invalidation
- React context/state management

This works but doesn't scale. Adding BroadcastChannel (multi-tab sync) and connectivity checking (health checks) would push it past 300 lines doing 7 different things.

## Target Architecture

```
src/app/lib/
├── integrations/
│   ├── supabase/                ← existing (server-side)
│   └── client/                  ← NEW: browser-native adapters
│       ├── storage.ts           ← localStorage read/write
│       ├── broadcast.ts         ← BroadcastChannel wrapper
│       └── connectivity.ts     ← online/offline + API health check
│
├── services/
│   ├── logs/logs.service.ts     ← existing (server-side)
│   └── logs/log-cache.service.ts ← NEW: cache logic (pure TS, no React)
│
src/components/
├── log-cache-provider.tsx       ← thin React wrapper, delegates to service
```

## Step 1: Client Integrations

### `src/app/lib/integrations/client/storage.ts`

Generic typed localStorage adapter.

```ts
export function readJSON<T>(key: string, fallback: T): T
export function writeJSON<T>(key: string, data: T): void
export function remove(key: string): void
```

Used by: log cache (log data), theme system (selected theme), any future persisted preferences.

### `src/app/lib/integrations/client/broadcast.ts`

BroadcastChannel wrapper for cross-tab communication.

```ts
export function createChannel<T>(name: string): {
  post: (message: T) => void;
  subscribe: (cb: (message: T) => void) => void;
  close: () => void;
}
```

Message types for logs:
- `{ type: "log_saved", log: LogEntry }` — a log was saved in another tab
- `{ type: "cache_refreshed" }` — full cache was re-synced from API

Used by: log cache (multi-tab sync), theme system (sync theme changes across tabs).

### `src/app/lib/integrations/client/connectivity.ts`

Connectivity awareness.

```ts
export function checkHealth(): Promise<{ online: boolean; apiOk: boolean }>
export function onConnectivityChange(cb: (online: boolean) => void): () => void
```

- Uses `navigator.onLine` for instant checks
- Pings `/api/health` (new endpoint) for deeper verification
- Fires callback on `online`/`offline` browser events

### New: `src/app/api/health/route.ts`

Lightweight health check endpoint.

```ts
// Verifies Supabase connectivity with a minimal query
export async function GET() {
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").select("id").limit(1);
  return NextResponse.json({ ok: !error, ts: Date.now() });
}
```

## Step 2: Log Cache Service

### `src/app/lib/services/logs/log-cache.service.ts`

Pure TypeScript class — no React, no hooks, no JSX. Takes integrations as constructor arguments.

```ts
class LogCacheService {
  private logs: Map<string, LogEntry>;
  private listeners: Set<(logs: LogEntry[]) => void>;

  constructor(
    private storage: StorageAdapter,
    private broadcast: BroadcastAdapter,
    private connectivity: ConnectivityAdapter,
  ) {}

  // Reads
  getAll(): LogEntry[]
  getLog(date: string): LogEntry | undefined
  getByRange(from: string, to: string): LogEntry[]

  // Writes (optimistic)
  async saveLog(entry: SaveLogPayload): Promise<Result>

  // Sync
  async syncFromApi(): Promise<void>

  // Lifecycle
  subscribe(cb: (logs: LogEntry[]) => void): () => void
  dispose(): void

  // Status
  get initialized(): boolean
  get syncing(): boolean
  get online(): boolean
}
```

Key behaviors:
- On construction: reads from storage, subscribes to broadcast channel
- `saveLog()`: updates Map + notifies listeners + writes storage + broadcasts + POSTs to API
- Broadcast listener: merges incoming changes from other tabs
- Connectivity listener: queues saves when offline, flushes when back online (future)

**Testable without React:** Unit tests can instantiate with mock adapters.

## Step 3: Thin React Provider

### `src/components/log-cache-provider.tsx` (refactored)

Becomes ~50 lines. Creates the service instance, wires it to React state via `useSyncExternalStore`, exposes via context.

```tsx
export function LogCacheProvider({ children }) {
  const service = useRef(new LogCacheService(storage, broadcast, connectivity));
  const logs = useSyncExternalStore(
    service.current.subscribe,
    service.current.getAll,
  );
  // ... expose via context
}
```

## Step 4: Wire Up Consumers

No changes to page components — they already use `useLogCache()` which returns the same interface. The hook's implementation changes internally (delegates to service) but the public API stays identical.

## Migration Order

1. Create client integration adapters (storage, broadcast, connectivity)
2. Create health check endpoint
3. Extract `LogCacheService` from current provider
4. Refactor provider to use service + `useSyncExternalStore`
5. Add BroadcastChannel sync to service
6. Add connectivity awareness to service
7. Verify all consumers still work

## Files

| File | Action |
|------|--------|
| `src/app/lib/integrations/client/storage.ts` | New |
| `src/app/lib/integrations/client/broadcast.ts` | New |
| `src/app/lib/integrations/client/connectivity.ts` | New |
| `src/app/api/health/route.ts` | New |
| `src/app/lib/services/logs/log-cache.service.ts` | New |
| `src/components/log-cache-provider.tsx` | Refactor (thin wrapper) |

## Out of Scope

- Offline queue (save when offline, flush when back) — future enhancement
- Profile/preferences cache — same pattern, separate service
- Supabase Realtime (multi-device sync) — only if needed beyond BroadcastChannel
