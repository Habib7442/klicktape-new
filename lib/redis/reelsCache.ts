/**
 * Klicktape Reels/Tapes Redis Caching Implementation
 * Reduces Supabase costs and improves performance
 * Based on posts and stories caching patterns
 */

import { Redis } from '@upstash/redis';
import { getRedisConfig } from '@/lib/config/environment';

// Initialize Redis client with secure configuration
const redisConfig = getRedisConfig();
const redis = new Redis({
  url: redisConfig.url,
  token: redisConfig.token,
});

// Cache key prefixes
const CACHE_KEYS = {
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
} as const;

// Cache TTL (Time To Live) in seconds
const CACHE_TTL = {
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
} as const;

// Types
interface CachedReel {
  id: string;
  user_id: string;
  username: string;
  avatar_url: string;
  caption?: string;
  video_url: string;
  thumbnail_url?: string;
  music?: string;
  hashtags?: string[];
  created_at: string;
  likes_count: number;
  comments_count: number;
  views_count: number;
  bookmarks_count: number;
  is_liked: boolean;
  is_bookmarked: boolean;
  is_viewed: boolean;
}

interface ReelsFeed {
  reels: CachedReel[];
  total_count: number;
  has_more: boolean;
  next_page?: number;
}

interface ReelAnalytics {
  reel_id: string;
  views_count: number;
  engagement_rate: number;
  completion_rate: number;
  top_hashtags: string[];
  peak_engagement_time: string;
  average_watch_time: number;
}

interface ReelInteraction {
  reel_id: string;
  user_id: string;
  interaction_type: 'like' | 'view' | 'share' | 'comment' | 'bookmark';
  timestamp: string;
  metadata?: Record<string, any>;
}

/**
 * Reels Cache Manager
 */
export class ReelsCache {
  /**
   * Get reels feed from cache or fallback to database
   */
  static async getReelsFeed(
    page: number = 1,
    limit: number = 10,
    userId?: string,
    fallbackFn?: () => Promise<ReelsFeed>
  ): Promise<ReelsFeed> {
    try {
      const cacheKey = `${CACHE_KEYS.REELS_FEED}:${page}:${limit}${userId ? `:${userId}` : ''}`;
      
      // Try to get from cache first
      const cached = await redis.get<ReelsFeed>(cacheKey);
      
      if (cached) {
        console.log('📱 Reels feed served from cache');
        return cached;
      }
      
      // If not in cache and fallback provided, fetch from database
      if (fallbackFn) {
        console.log('🔄 Reels feed cache miss, fetching from database');
        const freshData = await fallbackFn();
        
        // Cache the fresh data
        await this.setReelsFeed(freshData, page, limit, userId);
        
        return freshData;
      }
      
      return { reels: [], total_count: 0, has_more: false };
    } catch (error) {
      console.error('❌ Error getting reels feed from cache:', error);
      // Return fallback data if available
      return fallbackFn ? await fallbackFn() : { reels: [], total_count: 0, has_more: false };
    }
  }

  /**
   * Cache reels feed
   */
  static async setReelsFeed(
    feed: ReelsFeed,
    page: number = 1,
    limit: number = 10,
    userId?: string
  ): Promise<void> {
    try {
      const cacheKey = `${CACHE_KEYS.REELS_FEED}:${page}:${limit}${userId ? `:${userId}` : ''}`;
      await redis.setex(cacheKey, CACHE_TTL.REELS_FEED, feed);
      console.log(`✅ Reels feed cached for page ${page}`);
    } catch (error) {
      console.error(`❌ Error caching reels feed for page ${page}:`, error);
    }
  }

  /**
   * Get user reels from cache
   */
  static async getUserReels(
    userId: string,
    page: number = 1,
    limit: number = 10,
    fallbackFn?: () => Promise<CachedReel[]>
  ): Promise<CachedReel[]> {
    try {
      const cacheKey = `${CACHE_KEYS.USER_REELS}${userId}:${page}:${limit}`;
      
      const cached = await redis.get<CachedReel[]>(cacheKey);
      
      if (cached) {
        console.log(`📱 User reels for ${userId} served from cache`);
        return cached;
      }
      
      if (fallbackFn) {
        console.log(`🔄 User reels cache miss for ${userId}, fetching from database`);
        const freshData = await fallbackFn();
        
        // Cache the fresh data
        await this.setUserReels(userId, freshData, page, limit);
        
        return freshData;
      }
      
      return [];
    } catch (error) {
      console.error(`❌ Error getting user reels from cache for ${userId}:`, error);
      return fallbackFn ? await fallbackFn() : [];
    }
  }

  /**
   * Cache user reels
   */
  static async setUserReels(
    userId: string,
    reels: CachedReel[],
    page: number = 1,
    limit: number = 10
  ): Promise<void> {
    try {
      const cacheKey = `${CACHE_KEYS.USER_REELS}${userId}:${page}:${limit}`;
      await redis.setex(cacheKey, CACHE_TTL.USER_REELS, reels);
      console.log(`✅ User reels cached for ${userId}`);
    } catch (error) {
      console.error(`❌ Error caching user reels for ${userId}:`, error);
    }
  }

  /**
   * Get reel details from cache
   */
  static async getReelDetails(
    reelId: string,
    fallbackFn?: () => Promise<CachedReel | null>
  ): Promise<CachedReel | null> {
    try {
      const cacheKey = `${CACHE_KEYS.REEL_DETAILS}${reelId}`;
      
      const cached = await redis.get<CachedReel>(cacheKey);
      
      if (cached) {
        console.log(`📱 Reel details for ${reelId} served from cache`);
        return cached;
      }
      
      if (fallbackFn) {
        console.log(`🔄 Reel details cache miss for ${reelId}, fetching from database`);
        const freshData = await fallbackFn();
        
        if (freshData) {
          // Cache the fresh data
          await this.setReelDetails(reelId, freshData);
        }
        
        return freshData;
      }
      
      return null;
    } catch (error) {
      console.error(`❌ Error getting reel details from cache for ${reelId}:`, error);
      return fallbackFn ? await fallbackFn() : null;
    }
  }

  /**
   * Cache reel details
   */
  static async setReelDetails(reelId: string, reel: CachedReel): Promise<void> {
    try {
      const cacheKey = `${CACHE_KEYS.REEL_DETAILS}${reelId}`;
      await redis.setex(cacheKey, CACHE_TTL.REEL_DETAILS, reel);
      console.log(`✅ Reel details cached for ${reelId}`);
    } catch (error) {
      console.error(`❌ Error caching reel details for ${reelId}:`, error);
    }
  }

  /**
   * Get trending reels from cache
   */
  static async getTrendingReels(
    limit: number = 20,
    fallbackFn?: () => Promise<CachedReel[]>
  ): Promise<CachedReel[]> {
    try {
      const cacheKey = `${CACHE_KEYS.TRENDING_REELS}:${limit}`;
      
      const cached = await redis.get<CachedReel[]>(cacheKey);
      
      if (cached) {
        console.log('📱 Trending reels served from cache');
        return cached;
      }
      
      if (fallbackFn) {
        console.log('🔄 Trending reels cache miss, fetching from database');
        const freshData = await fallbackFn();
        
        // Cache the fresh data
        await this.setTrendingReels(freshData, limit);
        
        return freshData;
      }
      
      return [];
    } catch (error) {
      console.error('❌ Error getting trending reels from cache:', error);
      return fallbackFn ? await fallbackFn() : [];
    }
  }

  /**
   * Cache trending reels
   */
  static async setTrendingReels(reels: CachedReel[], limit: number = 20): Promise<void> {
    try {
      const cacheKey = `${CACHE_KEYS.TRENDING_REELS}:${limit}`;
      await redis.setex(cacheKey, CACHE_TTL.TRENDING_REELS, reels);
      console.log('✅ Trending reels cached');
    } catch (error) {
      console.error('❌ Error caching trending reels:', error);
    }
  }

  /**
   * Get reel analytics from cache
   */
  static async getReelAnalytics(
    reelId: string,
    fallbackFn?: () => Promise<ReelAnalytics | null>
  ): Promise<ReelAnalytics | null> {
    try {
      const cacheKey = `${CACHE_KEYS.REEL_ANALYTICS}${reelId}`;

      const cached = await redis.get<ReelAnalytics>(cacheKey);

      if (cached) {
        console.log(`📱 Reel analytics for ${reelId} served from cache`);
        return cached;
      }

      if (fallbackFn) {
        console.log(`🔄 Reel analytics cache miss for ${reelId}, fetching from database`);
        const freshData = await fallbackFn();

        if (freshData) {
          await this.setReelAnalytics(reelId, freshData);
        }

        return freshData;
      }

      return null;
    } catch (error) {
      console.error(`❌ Error getting reel analytics from cache for ${reelId}:`, error);
      return fallbackFn ? await fallbackFn() : null;
    }
  }

  /**
   * Cache reel analytics
   */
  static async setReelAnalytics(reelId: string, analytics: ReelAnalytics): Promise<void> {
    try {
      const cacheKey = `${CACHE_KEYS.REEL_ANALYTICS}${reelId}`;
      await redis.setex(cacheKey, CACHE_TTL.REEL_ANALYTICS, analytics);
      console.log(`✅ Reel analytics cached for ${reelId}`);
    } catch (error) {
      console.error(`❌ Error caching reel analytics for ${reelId}:`, error);
    }
  }

  /**
   * Track reel interaction
   */
  static async trackReelInteraction(interaction: ReelInteraction): Promise<void> {
    try {
      const cacheKey = `${CACHE_KEYS.REEL_INTERACTIONS}${interaction.reel_id}:${interaction.user_id}`;
      await redis.setex(cacheKey, CACHE_TTL.REEL_INTERACTIONS, interaction);
      console.log(`✅ Reel interaction tracked for ${interaction.reel_id}`);
    } catch (error) {
      console.error(`❌ Error tracking reel interaction:`, error);
    }
  }

  /**
   * Get explore reels from cache
   */
  static async getExploreReels(
    category?: string,
    limit: number = 20,
    fallbackFn?: () => Promise<CachedReel[]>
  ): Promise<CachedReel[]> {
    try {
      const cacheKey = `${CACHE_KEYS.EXPLORE_REELS}:${category || 'all'}:${limit}`;

      const cached = await redis.get<CachedReel[]>(cacheKey);

      if (cached) {
        console.log('📱 Explore reels served from cache');
        return cached;
      }

      if (fallbackFn) {
        console.log('🔄 Explore reels cache miss, fetching from database');
        const freshData = await fallbackFn();

        // Cache the fresh data
        await this.setExploreReels(freshData, category, limit);

        return freshData;
      }

      return [];
    } catch (error) {
      console.error('❌ Error getting explore reels from cache:', error);
      return fallbackFn ? await fallbackFn() : [];
    }
  }

  /**
   * Cache explore reels
   */
  static async setExploreReels(
    reels: CachedReel[],
    category?: string,
    limit: number = 20
  ): Promise<void> {
    try {
      const cacheKey = `${CACHE_KEYS.EXPLORE_REELS}:${category || 'all'}:${limit}`;
      await redis.setex(cacheKey, CACHE_TTL.EXPLORE_REELS, reels);
      console.log('✅ Explore reels cached');
    } catch (error) {
      console.error('❌ Error caching explore reels:', error);
    }
  }

  /**
   * Invalidate cache when reels are updated
   */
  static async invalidateReelsCache(userId?: string, reelId?: string): Promise<void> {
    try {
      const keysToDelete: string[] = [];

      // Always invalidate feed cache
      const feedKeys = await redis.keys(`${CACHE_KEYS.REELS_FEED}:*`);
      keysToDelete.push(...feedKeys);

      // Invalidate trending and explore reels cache
      const trendingKeys = await redis.keys(`${CACHE_KEYS.TRENDING_REELS}:*`);
      const exploreKeys = await redis.keys(`${CACHE_KEYS.EXPLORE_REELS}:*`);
      keysToDelete.push(...trendingKeys, ...exploreKeys);

      // If specific reel, invalidate its details and analytics
      if (reelId) {
        keysToDelete.push(`${CACHE_KEYS.REEL_DETAILS}${reelId}`);
        keysToDelete.push(`${CACHE_KEYS.REEL_LIKES}${reelId}`);
        keysToDelete.push(`${CACHE_KEYS.REEL_BOOKMARKS}${reelId}`);
        keysToDelete.push(`${CACHE_KEYS.REEL_ANALYTICS}${reelId}`);

        // Invalidate interaction cache for this reel
        const interactionKeys = await redis.keys(`${CACHE_KEYS.REEL_INTERACTIONS}${reelId}:*`);
        keysToDelete.push(...interactionKeys);
      }

      // If specific user, invalidate their reels
      if (userId) {
        const userReelKeys = await redis.keys(`${CACHE_KEYS.USER_REELS}${userId}:*`);
        keysToDelete.push(...userReelKeys);
      }

      // Delete all keys in batches
      if (keysToDelete.length > 0) {
        const batchSize = 50;
        for (let i = 0; i < keysToDelete.length; i += batchSize) {
          const batch = keysToDelete.slice(i, i + batchSize);
          await redis.del(...batch);
        }
        console.log(`✅ Invalidated ${keysToDelete.length} reel cache keys`);
      }
    } catch (error) {
      console.error('❌ Error invalidating reels cache:', error);
    }
  }

  /**
   * Update reel engagement in cache (optimistic updates)
   */
  static async updateReelEngagement(
    reelId: string,
    updates: Partial<Pick<CachedReel, 'likes_count' | 'comments_count' | 'views_count' | 'is_liked' | 'is_bookmarked'>>
  ): Promise<void> {
    try {
      const cacheKey = `${CACHE_KEYS.REEL_DETAILS}${reelId}`;
      const cached = await redis.get<CachedReel>(cacheKey);

      if (cached) {
        const updatedReel = { ...cached, ...updates };
        await redis.setex(cacheKey, CACHE_TTL.REEL_DETAILS, updatedReel);
        console.log(`✅ Reel engagement updated in cache for ${reelId}`);
      }
    } catch (error) {
      console.error(`❌ Error updating reel engagement in cache for ${reelId}:`, error);
    }
  }

  /**
   * Batch update multiple reels in cache
   */
  static async batchUpdateReels(updates: Array<{ reelId: string; data: Partial<CachedReel> }>): Promise<void> {
    try {
      const pipeline = redis.pipeline();

      for (const { reelId, data } of updates) {
        const cacheKey = `${CACHE_KEYS.REEL_DETAILS}${reelId}`;
        pipeline.get(cacheKey);
      }

      const results = await pipeline.exec();
      const updatePipeline = redis.pipeline();

      for (let i = 0; i < updates.length; i++) {
        const { reelId, data } = updates[i];
        const cached = results[i] as CachedReel | null;

        if (cached) {
          const updatedReel = { ...cached, ...data };
          const cacheKey = `${CACHE_KEYS.REEL_DETAILS}${reelId}`;
          updatePipeline.setex(cacheKey, CACHE_TTL.REEL_DETAILS, updatedReel);
        }
      }

      await updatePipeline.exec();
      console.log(`✅ Batch updated ${updates.length} reels in cache`);
    } catch (error) {
      console.error('❌ Error batch updating reels in cache:', error);
    }
  }
}

export default ReelsCache;
