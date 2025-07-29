/**
 * Redis Configuration for Klicktape Stories
 * Environment setup and connection management
 *
 * SECURITY NOTE: Redis token is now handled securely via EAS Environment Variables
 * and is NOT exposed in the client bundle.
 */

import { getRedisConfig, warnAboutDevelopmentSecurity } from './environment';

// Warn about development security issues
warnAboutDevelopmentSecurity();

// Get Redis configuration with proper security
export const REDIS_CONFIG = getRedisConfig();

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
    REELS_FEED: 300, // 5 minutes
    USER_REELS: 600, // 10 minutes
    REEL_DETAILS: 900, // 15 minutes
    REEL_LIKES: 180, // 3 minutes
    REEL_BOOKMARKS: 300, // 5 minutes
    TRENDING_REELS: 1800, // 30 minutes
    REEL_ANALYTICS: 3600, // 1 hour
    REEL_VIEWS: 1800, // 30 minutes
    REEL_INTERACTIONS: 600, // 10 minutes
    EXPLORE_REELS: 900, // 15 minutes
  },
  
  // Cache key prefixes
  KEYS: {
    STORIES_FEED: 'stories:feed',
    USER_STORIES: 'stories:user:',
    STORY_VIEWS: 'stories:views:',
    STORY_INTERACTIONS: 'stories:interactions:',
    ACTIVE_STORIES: 'stories:active',
    STORY_ANALYTICS: 'stories:analytics:',
    REELS_FEED: 'reels:feed',
    USER_REELS: 'reels:user:',
    REEL_DETAILS: 'reels:detail:',
    REEL_LIKES: 'reels:likes:',
    REEL_BOOKMARKS: 'reels:bookmarks:',
    TRENDING_REELS: 'reels:trending',
    REEL_ANALYTICS: 'reels:analytics:',
    REEL_VIEWS: 'reels:views:',
    REEL_INTERACTIONS: 'reels:interactions:',
    EXPLORE_REELS: 'reels:explore',
  },
  
  // Performance settings
  BATCH_SIZE: 50,
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // milliseconds
};

// Validate Redis configuration
export const validateRedisConfig = (): boolean => {
  if (!REDIS_CONFIG.enabled) {
    console.warn('⚠️ Redis is not configured. Check your environment variables for Redis URL and token.');
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
