const hits = new Map<string, number[]>();

/**
 * Sliding-window in-memory rate limiter.
 * Returns true if the request is allowed, false if rate-limited.
 */
export function rateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const timestamps = hits.get(key) ?? [];

  // Drop entries outside the window
  const valid = timestamps.filter((t) => now - t < windowMs);

  if (valid.length >= maxRequests) {
    hits.set(key, valid);
    return false;
  }

  valid.push(now);
  hits.set(key, valid);
  return true;
}
