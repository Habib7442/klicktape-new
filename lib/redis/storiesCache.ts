/**
 * Klicktape Stories Redis Caching Implementation
 * Reduces Supabase costs and improves performance
 * Based on: https://supabase.com/docs/guides/functions/examples/upstash-redis
 */

import { Redis } from '@upstash/redis';

// Initialize Redis client
const redis = new Redis({
  url: process.env.EXPO_PUBLIC_UPSTASH_REDIS_REST_URL!,
  token: process.env.EXPO_PUBLIC_UPSTASH_REDIS_REST_TOKEN!,
});

// Cache key prefixes
const CACHE_KEYS = {
  STORIES_FEED: 'stories:feed',
  USER_STORIES: 'stories:user:',
  STORY_VIEWS: 'stories:views:',
  STORY_INTERACTIONS: 'stories:interactions:',
  ACTIVE_STORIES: 'stories:active',
  STORY_ANALYTICS: 'stories:analytics:',
} as const;

// Cache TTL (Time To Live) in seconds
const CACHE_TTL = {
  STORIES_FEED: 300, // 5 minutes
  USER_STORIES: 600, // 10 minutes
  STORY_VIEWS: 3600, // 1 hour
  STORY_INTERACTIONS: 1800, // 30 minutes
  ACTIVE_STORIES: 180, // 3 minutes
  STORY_ANALYTICS: 7200, // 2 hours
} as const;

// Types
interface CachedStory {
  id: string;
  user_id: string;
  username: string;
  avatar_url: string;
  image_url: string;
  caption?: string;
  created_at: string;
  expires_at: string;
  story_order: number;
  duration: number;
  story_type: string;
  view_count: number;
  is_viewed: boolean;
}

interface StoriesFeed {
  user_id: string;
  username: string;
  avatar_url: string;
  story_count: number;
  latest_story_time: string;
  has_unviewed: boolean;
  stories: CachedStory[];
}

interface StoryAnalytics {
  total_views: number;
  unique_viewers: number;
  completion_rate: number;
  avg_view_duration: number;
  last_updated: string;
}

export class StoriesCache {
  /**
   * Get stories feed from cache or fallback to database
   */
  static async getStoriesFeed(
    limit: number = 50,
    fallbackFn?: () => Promise<StoriesFeed[]>
  ): Promise<StoriesFeed[]> {
    try {
      const cacheKey = `${CACHE_KEYS.STORIES_FEED}:${limit}`;
      
      // Try to get from cache first
      const cached = await redis.get<StoriesFeed[]>(cacheKey);
      
      if (cached) {
        console.log('📱 Stories feed served from cache');
        return cached;
      }
      
      // If not in cache and fallback provided, fetch from database
      if (fallbackFn) {
        console.log('🔄 Stories feed cache miss, fetching from database');
        const freshData = await fallbackFn();
        
        // Cache the fresh data
        await this.setStoriesFeed(freshData, limit);
        
        return freshData;
      }
      
      return [];
    } catch (error) {
      console.error('❌ Error getting stories feed from cache:', error);
      // Return fallback data if available
      return fallbackFn ? await fallbackFn() : [];
    }
  }

  /**
   * Cache stories feed data
   */
  static async setStoriesFeed(data: StoriesFeed[], limit: number = 50): Promise<void> {
    try {
      const cacheKey = `${CACHE_KEYS.STORIES_FEED}:${limit}`;
      await redis.setex(cacheKey, CACHE_TTL.STORIES_FEED, data);
      console.log('✅ Stories feed cached successfully');
    } catch (error) {
      console.error('❌ Error caching stories feed:', error);
    }
  }

  /**
   * Get user stories from cache
   */
  static async getUserStories(
    userId: string,
    fallbackFn?: () => Promise<CachedStory[]>
  ): Promise<CachedStory[]> {
    try {
      const cacheKey = `${CACHE_KEYS.USER_STORIES}${userId}`;
      
      const cached = await redis.get<CachedStory[]>(cacheKey);
      
      if (cached) {
        console.log(`📱 User stories for ${userId} served from cache`);
        return cached;
      }
      
      if (fallbackFn) {
        console.log(`🔄 User stories cache miss for ${userId}, fetching from database`);
        const freshData = await fallbackFn();
        
        // Cache the fresh data
        await this.setUserStories(userId, freshData);
        
        return freshData;
      }
      
      return [];
    } catch (error) {
      console.error(`❌ Error getting user stories from cache for ${userId}:`, error);
      return fallbackFn ? await fallbackFn() : [];
    }
  }

  /**
   * Cache user stories data
   */
  static async setUserStories(userId: string, stories: CachedStory[]): Promise<void> {
    try {
      const cacheKey = `${CACHE_KEYS.USER_STORIES}${userId}`;
      await redis.setex(cacheKey, CACHE_TTL.USER_STORIES, stories);
      console.log(`✅ User stories cached for ${userId}`);
    } catch (error) {
      console.error(`❌ Error caching user stories for ${userId}:`, error);
    }
  }

  /**
   * Track story view in cache (for analytics)
   */
  static async trackStoryView(
    storyId: string,
    viewerId: string,
    viewDuration: number = 0
  ): Promise<void> {
    try {
      const viewKey = `${CACHE_KEYS.STORY_VIEWS}${storyId}`;
      const analyticsKey = `${CACHE_KEYS.STORY_ANALYTICS}${storyId}`;
      
      // Track individual view
      const viewData = {
        viewer_id: viewerId,
        viewed_at: new Date().toISOString(),
        view_duration: viewDuration,
        completed: viewDuration >= 3000,
      };
      
      await redis.hset(viewKey, viewerId, viewData);
      await redis.expire(viewKey, CACHE_TTL.STORY_VIEWS);
      
      // Update analytics
      const currentAnalytics = await redis.get<StoryAnalytics>(analyticsKey) || {
        total_views: 0,
        unique_viewers: 0,
        completion_rate: 0,
        avg_view_duration: 0,
        last_updated: new Date().toISOString(),
      };
      
      // Get all views for this story
      const allViews = await redis.hgetall(viewKey);
      const viewsArray = Object.values(allViews) as any[];
      
      const updatedAnalytics: StoryAnalytics = {
        total_views: viewsArray.length,
        unique_viewers: new Set(viewsArray.map(v => v.viewer_id)).size,
        completion_rate: viewsArray.filter(v => v.completed).length / viewsArray.length,
        avg_view_duration: viewsArray.reduce((sum, v) => sum + v.view_duration, 0) / viewsArray.length,
        last_updated: new Date().toISOString(),
      };
      
      await redis.setex(analyticsKey, CACHE_TTL.STORY_ANALYTICS, updatedAnalytics);
      
      console.log(`✅ Story view tracked for ${storyId}`);
    } catch (error) {
      console.error(`❌ Error tracking story view for ${storyId}:`, error);
    }
  }

  /**
   * Get story analytics from cache
   */
  static async getStoryAnalytics(storyId: string): Promise<StoryAnalytics | null> {
    try {
      const analyticsKey = `${CACHE_KEYS.STORY_ANALYTICS}${storyId}`;
      const analytics = await redis.get<StoryAnalytics>(analyticsKey);
      
      if (analytics) {
        console.log(`📊 Story analytics for ${storyId} served from cache`);
      }
      
      return analytics;
    } catch (error) {
      console.error(`❌ Error getting story analytics for ${storyId}:`, error);
      return null;
    }
  }

  /**
   * Invalidate cache when stories are updated
   */
  static async invalidateStoriesCache(userId?: string): Promise<void> {
    try {
      const keysToDelete: string[] = [];
      
      // Always invalidate feed cache
      const feedKeys = await redis.keys(`${CACHE_KEYS.STORIES_FEED}:*`);
      keysToDelete.push(...feedKeys);
      
      // Invalidate active stories cache
      keysToDelete.push(CACHE_KEYS.ACTIVE_STORIES);
      
      // If specific user, invalidate their stories
      if (userId) {
        keysToDelete.push(`${CACHE_KEYS.USER_STORIES}${userId}`);
      } else {
        // Invalidate all user stories
        const userStoryKeys = await redis.keys(`${CACHE_KEYS.USER_STORIES}*`);
        keysToDelete.push(...userStoryKeys);
      }
      
      // Delete all keys
      if (keysToDelete.length > 0) {
        await redis.del(...keysToDelete);
        console.log(`🗑️ Invalidated ${keysToDelete.length} cache keys`);
      }
    } catch (error) {
      console.error('❌ Error invalidating stories cache:', error);
    }
  }

  /**
   * Cache active stories list for quick access
   */
  static async setActiveStories(storyIds: string[]): Promise<void> {
    try {
      await redis.setex(CACHE_KEYS.ACTIVE_STORIES, CACHE_TTL.ACTIVE_STORIES, storyIds);
      console.log(`✅ Active stories list cached (${storyIds.length} stories)`);
    } catch (error) {
      console.error('❌ Error caching active stories:', error);
    }
  }

  /**
   * Get active stories list from cache
   */
  static async getActiveStories(): Promise<string[]> {
    try {
      const cached = await redis.get<string[]>(CACHE_KEYS.ACTIVE_STORIES);
      
      if (cached) {
        console.log('📱 Active stories list served from cache');
        return cached;
      }
      
      return [];
    } catch (error) {
      console.error('❌ Error getting active stories from cache:', error);
      return [];
    }
  }

  /**
   * Batch update multiple cache entries
   */
  static async batchUpdate(operations: Array<{
    key: string;
    data: any;
    ttl: number;
  }>): Promise<void> {
    try {
      const pipeline = redis.pipeline();
      
      operations.forEach(({ key, data, ttl }) => {
        pipeline.setex(key, ttl, data);
      });
      
      await pipeline.exec();
      console.log(`✅ Batch updated ${operations.length} cache entries`);
    } catch (error) {
      console.error('❌ Error in batch cache update:', error);
    }
  }

  /**
   * Get cache statistics
   */
  static async getCacheStats(): Promise<{
    total_keys: number;
    stories_feed_keys: number;
    user_stories_keys: number;
    analytics_keys: number;
  }> {
    try {
      const [
        allKeys,
        feedKeys,
        userStoryKeys,
        analyticsKeys,
      ] = await Promise.all([
        redis.keys('stories:*'),
        redis.keys(`${CACHE_KEYS.STORIES_FEED}:*`),
        redis.keys(`${CACHE_KEYS.USER_STORIES}*`),
        redis.keys(`${CACHE_KEYS.STORY_ANALYTICS}*`),
      ]);
      
      return {
        total_keys: allKeys.length,
        stories_feed_keys: feedKeys.length,
        user_stories_keys: userStoryKeys.length,
        analytics_keys: analyticsKeys.length,
      };
    } catch (error) {
      console.error('❌ Error getting cache stats:', error);
      return {
        total_keys: 0,
        stories_feed_keys: 0,
        user_stories_keys: 0,
        analytics_keys: 0,
      };
    }
  }

  /**
   * Clear all stories cache (use with caution)
   */
  static async clearAllCache(): Promise<void> {
    try {
      const allKeys = await redis.keys('stories:*');
      
      if (allKeys.length > 0) {
        await redis.del(...allKeys);
        console.log(`🗑️ Cleared all stories cache (${allKeys.length} keys)`);
      }
    } catch (error) {
      console.error('❌ Error clearing all cache:', error);
    }
  }
}

export default StoriesCache;
