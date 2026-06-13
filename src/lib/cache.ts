
interface CacheItem<T> {
  value: T;
  expiry: number;
}

/**
 * A simple cache utility using localStorage with expiration logic.
 */
export const cache = {
  /**
   * Set a value in the cache with a Time To Live (TTL) in milliseconds.
   * @param key The key to store the data under
   * @param value The value to store
   * @param ttl Duration in milliseconds (default: 1 hour)
   */
  set: <T>(key: string, value: T, ttl: number = 3600000): void => {
    const now = new Date();
    const item: CacheItem<T> = {
      value,
      expiry: now.getTime() + ttl,
    };
    try {
      localStorage.setItem(`gg_cache_${key}`, JSON.stringify(item));
    } catch (e) {
      console.error('Cache set error:', e);
    }
  },

  /**
   * Get a value from the cache. Returns null if expired or not found.
   */
  get: <T>(key: string): T | null => {
    const itemStr = localStorage.getItem(`gg_cache_${key}`);
    if (!itemStr) return null;

    try {
      const item: CacheItem<T> = JSON.parse(itemStr);
      const now = new Date();
      
      if (now.getTime() > item.expiry) {
        localStorage.removeItem(`gg_cache_${key}`);
        return null;
      }
      return item.value;
    } catch (e) {
      console.error('Cache get error:', e);
      return null;
    }
  },

  /**
   * Remove a specific item from the cache.
   */
  remove: (key: string): void => {
    localStorage.removeItem(`gg_cache_${key}`);
  },

  /**
   * Clear all cache items managed by this utility.
   */
  clear: (): void => {
    Object.keys(localStorage)
      .filter(key => key.startsWith('gg_cache_'))
      .forEach(key => localStorage.removeItem(key));
  }
};
