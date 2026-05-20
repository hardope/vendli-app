const cache = new Map();

const DEFAULT_TTL = 60_000; // 1 minute

export function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > entry.ttl) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

export function setCached(key, data, ttl = DEFAULT_TTL) {
  cache.set(key, { data, ts: Date.now(), ttl });
}

export function invalidatePrefix(prefix) {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}

export function invalidateAll() {
  cache.clear();
}
