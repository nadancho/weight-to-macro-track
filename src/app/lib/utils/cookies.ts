/**
 * Client-side cookie helpers for non-sensitive UX preferences (e.g. last log date).
 * Do not store auth tokens or secrets here.
 */

const COOKIE_OPTS = "path=/; max-age=31536000; SameSite=Lax";

export function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function setCookie(name: string, value: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)}; ${COOKIE_OPTS}`;
}
