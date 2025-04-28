interface CacheItem {
  data: any;
  timestamp: number;
}

const CACHE_DURATION = 10 * 60 * 1000; // Increase to 10 minutes
const cache: Record<string, CacheItem> = {};

export const cacheManager = {
  set(key: string, data: any) {
    cache[key] = {
      data,
      timestamp: Date.now()
    };
  },

  get(key: string) {
    const item = cache[key];
    if (!item) return null;
    
    if (Date.now() - item.timestamp > CACHE_DURATION) {
      delete cache[key];
      return null;
    }
    
    return item.data;
  },

  

  clear() {
    Object.keys(cache).forEach(key => delete cache[key]);
  }
};