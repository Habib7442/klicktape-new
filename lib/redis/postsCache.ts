/**
 * Klicktape Posts Redis Caching Implementation
 * Reduces Supabase costs and improves performance
 * Based on stories caching pattern
 */

import { Redis } from '@upstash/redis';

// Initialize Redis client
const redis = new Redis({
  url: process.env.EXPO_PUBLIC_UPSTASH_REDIS_REST_URL!,
  token: process.env.EXPO_PUBLIC_UPSTASH_REDIS_REST_TOKEN!,
});

// Cache key prefixes
const CACHE_KEYS = {
  POSTS_FEED: 'posts:feed',
  USER_POSTS: 'posts:user:',
  POST_DETAILS: 'posts:detail:',
  POST_LIKES: 'posts:likes:',
  POST_BOOKMARKS: 'posts:bookmarks:',
  TRENDING_POSTS: 'posts:trending',
  POST_ANALYTICS: 'posts:analytics:',
} as const;

// Cache TTL (Time To Live) in seconds
const CACHE_TTL = {
  POSTS_FEED: 300, // 5 minutes
  USER_POSTS: 600, // 10 minutes
  POST_DETAILS: 900, // 15 minutes
  POST_LIKES: 180, // 3 minutes
  POST_BOOKMARKS: 300, // 5 minutes
  TRENDING_POSTS: 1800, // 30 minutes
  POST_ANALYTICS: 3600, // 1 hour
} as const;

// Types
interface CachedPost {
  id: string;
  user_id: string;
  username: string;
  avatar_url: string;
  caption?: string;
  image_urls: string[];
  hashtags?: string[];
  created_at: string;
  likes_count: number;
  comments_count: number;
  bookmarks_count: number;
  is_liked: boolean;
  is_bookmarked: boolean;
}

interface PostsFeed {
  posts: CachedPost[];
  total_count: number;
  has_more: boolean;
  next_page?: number;
}

interface PostAnalytics {
  post_id: string;
  views_count: number;
  engagement_rate: number;
  top_hashtags: string[];
  peak_engagement_time: string;
}

/**
 * Posts Cache Manager
 */
export class PostsCache {
  /**
   * Get posts feed from cache or fallback to database
   */
  static async getPostsFeed(
    page: number = 1,
    limit: number = 10,
    userId?: string,
    fallbackFn?: () => Promise<PostsFeed>
  ): Promise<PostsFeed> {
    try {
      const cacheKey = `${CACHE_KEYS.POSTS_FEED}:${page}:${limit}${userId ? `:${userId}` : ''}`;
      
      // Try to get from cache first
      const cached = await redis.get<PostsFeed>(cacheKey);
      
      if (cached) {
        console.log('📱 Posts feed served from cache');
        return cached;
      }
      
      // If not in cache and fallback provided, fetch from database
      if (fallbackFn) {
        console.log('🔄 Posts feed cache miss, fetching from database');
        const freshData = await fallbackFn();
        
        // Cache the fresh data
        await this.setPostsFeed(freshData, page, limit, userId);
        
        return freshData;
      }
      
      return { posts: [], total_count: 0, has_more: false };
    } catch (error) {
      console.error('❌ Error getting posts feed from cache:', error);
      // Return fallback data if available
      return fallbackFn ? await fallbackFn() : { posts: [], total_count: 0, has_more: false };
    }
  }

  /**
   * Cache posts feed data
   */
  static async setPostsFeed(
    data: PostsFeed, 
    page: number = 1, 
    limit: number = 10, 
    userId?: string
  ): Promise<void> {
    try {
      const cacheKey = `${CACHE_KEYS.POSTS_FEED}:${page}:${limit}${userId ? `:${userId}` : ''}`;
      await redis.setex(cacheKey, CACHE_TTL.POSTS_FEED, data);
      console.log('✅ Posts feed cached successfully');
    } catch (error) {
      console.error('❌ Error caching posts feed:', error);
    }
  }

  /**
   * Get user posts from cache
   */
  static async getUserPosts(
    userId: string,
    page: number = 1,
    limit: number = 10,
    fallbackFn?: () => Promise<CachedPost[]>
  ): Promise<CachedPost[]> {
    try {
      const cacheKey = `${CACHE_KEYS.USER_POSTS}${userId}:${page}:${limit}`;
      
      const cached = await redis.get<CachedPost[]>(cacheKey);
      
      if (cached) {
        console.log(`📱 User posts for ${userId} served from cache`);
        return cached;
      }
      
      if (fallbackFn) {
        console.log(`🔄 User posts cache miss for ${userId}, fetching from database`);
        const freshData = await fallbackFn();
        
        // Cache the fresh data
        await this.setUserPosts(userId, freshData, page, limit);
        
        return freshData;
      }
      
      return [];
    } catch (error) {
      console.error(`❌ Error getting user posts from cache for ${userId}:`, error);
      return fallbackFn ? await fallbackFn() : [];
    }
  }

  /**
   * Cache user posts data
   */
  static async setUserPosts(
    userId: string, 
    posts: CachedPost[], 
    page: number = 1, 
    limit: number = 10
  ): Promise<void> {
    try {
      const cacheKey = `${CACHE_KEYS.USER_POSTS}${userId}:${page}:${limit}`;
      await redis.setex(cacheKey, CACHE_TTL.USER_POSTS, posts);
      console.log(`✅ User posts cached for ${userId}`);
    } catch (error) {
      console.error(`❌ Error caching user posts for ${userId}:`, error);
    }
  }

  /**
   * Get post details from cache
   */
  static async getPostDetails(
    postId: string,
    fallbackFn?: () => Promise<CachedPost | null>
  ): Promise<CachedPost | null> {
    try {
      const cacheKey = `${CACHE_KEYS.POST_DETAILS}${postId}`;
      
      const cached = await redis.get<CachedPost>(cacheKey);
      
      if (cached) {
        console.log(`📱 Post details for ${postId} served from cache`);
        return cached;
      }
      
      if (fallbackFn) {
        console.log(`🔄 Post details cache miss for ${postId}, fetching from database`);
        const freshData = await fallbackFn();
        
        if (freshData) {
          // Cache the fresh data
          await this.setPostDetails(postId, freshData);
        }
        
        return freshData;
      }
      
      return null;
    } catch (error) {
      console.error(`❌ Error getting post details from cache for ${postId}:`, error);
      return fallbackFn ? await fallbackFn() : null;
    }
  }

  /**
   * Cache post details
   */
  static async setPostDetails(postId: string, post: CachedPost): Promise<void> {
    try {
      const cacheKey = `${CACHE_KEYS.POST_DETAILS}${postId}`;
      await redis.setex(cacheKey, CACHE_TTL.POST_DETAILS, post);
      console.log(`✅ Post details cached for ${postId}`);
    } catch (error) {
      console.error(`❌ Error caching post details for ${postId}:`, error);
    }
  }

  /**
   * Track post interaction (like, bookmark, etc.)
   */
  static async trackPostInteraction(
    postId: string,
    userId: string,
    action: 'like' | 'unlike' | 'bookmark' | 'unbookmark' | 'view',
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const analyticsKey = `${CACHE_KEYS.POST_ANALYTICS}${postId}`;
      
      // Track interaction data
      const interactionData = {
        user_id: userId,
        action,
        timestamp: new Date().toISOString(),
        metadata: metadata || {},
      };
      
      // Add to analytics cache (append to list)
      await redis.lpush(`${analyticsKey}:interactions`, interactionData);
      await redis.expire(`${analyticsKey}:interactions`, CACHE_TTL.POST_ANALYTICS);
      
      console.log(`✅ Post interaction tracked: ${action} on ${postId} by ${userId}`);
    } catch (error) {
      console.error(`❌ Error tracking post interaction:`, error);
    }
  }

  /**
   * Invalidate cache when posts are updated
   */
  static async invalidatePostsCache(userId?: string, postId?: string): Promise<void> {
    try {
      const keysToDelete: string[] = [];
      
      // Always invalidate feed cache
      const feedKeys = await redis.keys(`${CACHE_KEYS.POSTS_FEED}:*`);
      keysToDelete.push(...feedKeys);
      
      // Invalidate trending posts cache
      keysToDelete.push(CACHE_KEYS.TRENDING_POSTS);
      
      // If specific post, invalidate its details
      if (postId) {
        keysToDelete.push(`${CACHE_KEYS.POST_DETAILS}${postId}`);
        keysToDelete.push(`${CACHE_KEYS.POST_LIKES}${postId}`);
        keysToDelete.push(`${CACHE_KEYS.POST_BOOKMARKS}${postId}`);
      }
      
      // If specific user, invalidate their posts
      if (userId) {
        const userPostKeys = await redis.keys(`${CACHE_KEYS.USER_POSTS}${userId}:*`);
        keysToDelete.push(...userPostKeys);
      } else {
        // Invalidate all user posts
        const allUserPostKeys = await redis.keys(`${CACHE_KEYS.USER_POSTS}*`);
        keysToDelete.push(...allUserPostKeys);
      }
      
      // Delete all keys
      if (keysToDelete.length > 0) {
        await redis.del(...keysToDelete);
        console.log(`🗑️ Invalidated ${keysToDelete.length} posts cache keys`);
      }
    } catch (error) {
      console.error('❌ Error invalidating posts cache:', error);
    }
  }

  /**
   * Cache trending posts
   */
  static async setTrendingPosts(posts: CachedPost[]): Promise<void> {
    try {
      await redis.setex(CACHE_KEYS.TRENDING_POSTS, CACHE_TTL.TRENDING_POSTS, posts);
      console.log(`✅ Trending posts cached (${posts.length} posts)`);
    } catch (error) {
      console.error('❌ Error caching trending posts:', error);
    }
  }

  /**
   * Get trending posts from cache
   */
  static async getTrendingPosts(fallbackFn?: () => Promise<CachedPost[]>): Promise<CachedPost[]> {
    try {
      const cached = await redis.get<CachedPost[]>(CACHE_KEYS.TRENDING_POSTS);
      
      if (cached) {
        console.log('📱 Trending posts served from cache');
        return cached;
      }
      
      if (fallbackFn) {
        console.log('🔄 Trending posts cache miss, fetching from database');
        const freshData = await fallbackFn();
        await this.setTrendingPosts(freshData);
        return freshData;
      }
      
      return [];
    } catch (error) {
      console.error('❌ Error getting trending posts from cache:', error);
      return fallbackFn ? await fallbackFn() : [];
    }
  }
}

export default PostsCache;
