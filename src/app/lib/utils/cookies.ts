/**
 * Client-side cookie helpers for non-sensitive UX preferences (e.g. last log date).
 * Do not store auth tokens or secrets here.
 */

const COOKIE_OPTS = "path=/; max-age=31536000; SameSite=Lax";

/** Cookie key for cached logs payload (range + logs). Invalidated on log POST. */
export const LOGS_CACHE_COOKIE = "logs_cache";

/** Max cookie value size (~4KB limit); stay under to avoid truncation. */
const LOGS_CACHE_MAX_BYTES = 3500;

export function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function setCookie(name: string, value: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)}; ${COOKIE_OPTS}`;
}

/**
 * Sets the logs cache cookie only if the payload fits (logs only change on self-edit; we invalidate on POST).
 * Call clearLogsCacheCookie() after creating/updating a log.
 */
export function setLogsCacheCookie(payload: {
  from: string;
  to: string;
  logs: unknown[];
}): void {
  if (typeof document === "undefined") return;
  const raw = JSON.stringify(payload);
  if (raw.length > LOGS_CACHE_MAX_BYTES) return;
  document.cookie = `${LOGS_CACHE_COOKIE}=${encodeURIComponent(raw)}; ${COOKIE_OPTS}`;
}

/** Clears the logs cache so the next fetch is fresh. Call after POST /api/logs. */
export function clearLogsCacheCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${LOGS_CACHE_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}
