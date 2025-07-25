/**
 * Redis Configuration for Klicktape Stories
 * Environment setup and connection management
 */

// Environment variables for Upstash Redis
export const REDIS_CONFIG = {
  url: process.env.EXPO_PUBLIC_UPSTASH_REDIS_REST_URL || '',
  token: process.env.EXPO_PUBLIC_UPSTASH_REDIS_REST_TOKEN || '',
  enabled: !!(process.env.EXPO_PUBLIC_UPSTASH_REDIS_REST_URL && process.env.EXPO_PUBLIC_UPSTASH_REDIS_REST_TOKEN),
};

// Cache configuration
export const CACHE_CONFIG = {
  // TTL values in seconds
  TTL: {
    STORIES_FEED: 300, // 5 minutes
    USER_STORIES: 600, // 10 minutes
    STORY_VIEWS: 3600, // 1 hour
    STORY_INTERACTIONS: 1800, // 30 minutes
    ACTIVE_STORIES: 180, // 3 minutes
    STORY_ANALYTICS: 7200, // 2 hours
  },
  
  // Cache key prefixes
  KEYS: {
    STORIES_FEED: 'stories:feed',
    USER_STORIES: 'stories:user:',
    STORY_VIEWS: 'stories:views:',
    STORY_INTERACTIONS: 'stories:interactions:',
    ACTIVE_STORIES: 'stories:active',
    STORY_ANALYTICS: 'stories:analytics:',
  },
  
  // Performance settings
  BATCH_SIZE: 50,
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // milliseconds
};

// Validate Redis configuration
export const validateRedisConfig = (): boolean => {
  if (!REDIS_CONFIG.enabled) {
    console.warn('⚠️ Redis is not configured. Add EXPO_PUBLIC_UPSTASH_REDIS_REST_URL and EXPO_PUBLIC_UPSTASH_REDIS_REST_TOKEN to your environment variables.');
    return false;
  }
  
  if (!REDIS_CONFIG.url || !REDIS_CONFIG.token) {
    console.error('❌ Redis configuration is incomplete');
    return false;
  }
  
  console.log('✅ Redis configuration is valid');
  return true;
};

export default REDIS_CONFIG;
