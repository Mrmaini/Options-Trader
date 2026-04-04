import NodeCache from 'node-cache';

const cache = new NodeCache({ useClones: false });

const TTL = {
  QUOTE: 30,          // 30 seconds
  CHAIN: 300,         // 5 minutes
  MARKET: 60,         // 1 minute
  EARNINGS: 86400,    // 24 hours
};

export function getCache<T>(key: string): T | undefined {
  return cache.get<T>(key);
}

export function setCache<T>(key: string, value: T, ttl: number): void {
  cache.set(key, value, ttl);
}

export function getCacheOrFetch<T>(
  key: string,
  ttl: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const cached = cache.get<T>(key);
  if (cached !== undefined) return Promise.resolve(cached);
  return fetcher().then((data) => {
    cache.set(key, data, ttl);
    return data;
  });
}

export { TTL };
