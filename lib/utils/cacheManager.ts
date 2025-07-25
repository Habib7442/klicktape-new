interface CacheItem {
  data: any;
  timestamp: number;
}

const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
const cache: Record<string, CacheItem> = {};

// Enable debug logging for cache operations
const DEBUG_CACHE = __DEV__ || false;

const logCache = (operation: string, key: string, details?: any) => {
  if (DEBUG_CACHE) {
    console.log(`[CACHE ${operation.toUpperCase()}]`, key, details || '');
  }
};

export const cacheManager = {
  set(key: string, data: any) {
    cache[key] = {
      data,
      timestamp: Date.now()
    };
    logCache('SET', key, { dataSize: JSON.stringify(data).length });
  },

  get(key: string) {
    const item = cache[key];
    if (!item) {
      logCache('MISS', key, 'Item not found');
      return null;
    }

    const age = Date.now() - item.timestamp;
    if (age > CACHE_DURATION) {
      delete cache[key];
      logCache('EXPIRED', key, { age: Math.round(age / 1000) + 's' });
      return null;
    }

    logCache('HIT', key, { age: Math.round(age / 1000) + 's' });
    return item.data;
  },

  // Get cache status for debugging
  getStatus(key: string) {
    const item = cache[key];
    if (!item) {
      return { exists: false, expired: false, age: 0 };
    }

    const age = Date.now() - item.timestamp;
    const expired = age > CACHE_DURATION;

    return {
      exists: true,
      expired,
      age: Math.round(age / 1000), // in seconds
      expiresIn: Math.round((CACHE_DURATION - age) / 1000), // in seconds
      dataSize: JSON.stringify(item.data).length
    };
  },

  // Get all cache keys and their status
  getAllStatus() {
    const status: Record<string, any> = {};
    Object.keys(cache).forEach(key => {
      status[key] = this.getStatus(key);
    });
    return status;
  },

  // Check if cache is being used effectively
  getCacheStats() {
    const keys = Object.keys(cache);
    const now = Date.now();
    let validItems = 0;
    let expiredItems = 0;
    let totalSize = 0;

    keys.forEach(key => {
      const item = cache[key];
      const age = now - item.timestamp;
      if (age > CACHE_DURATION) {
        expiredItems++;
      } else {
        validItems++;
        totalSize += JSON.stringify(item.data).length;
      }
    });

    return {
      totalKeys: keys.length,
      validItems,
      expiredItems,
      totalSizeBytes: totalSize,
      cacheDurationMs: CACHE_DURATION
    };
  },

  clear() {
    const keyCount = Object.keys(cache).length;
    Object.keys(cache).forEach(key => delete cache[key]);
    logCache('CLEAR', 'all', { clearedKeys: keyCount });
  },

  // Remove specific key
  remove(key: string) {
    if (cache[key]) {
      delete cache[key];
      logCache('REMOVE', key);
      return true;
    }
    return false;
  }
};