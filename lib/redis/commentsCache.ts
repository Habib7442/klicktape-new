/**
 * Klicktape Comments Redis Caching Implementation
 * Reduces Supabase costs and improves performance
 * Based on posts caching pattern
 */

import { Redis } from '@upstash/redis';

// Initialize Redis client
const redis = new Redis({
  url: process.env.EXPO_PUBLIC_UPSTASH_REDIS_REST_URL!,
  token: process.env.EXPO_PUBLIC_UPSTASH_REDIS_REST_TOKEN!,
});

// Cache key prefixes
const CACHE_KEYS = {
  POST_COMMENTS: 'comments:post:',
  REEL_COMMENTS: 'comments:reel:',
  COMMENT_DETAILS: 'comments:detail:',
  COMMENT_REPLIES: 'comments:replies:',
  COMMENT_LIKES: 'comments:likes:',
  USER_COMMENTS: 'comments:user:',
  TRENDING_COMMENTS: 'comments:trending',
} as const;

// Cache TTL (Time To Live) in seconds
const CACHE_TTL = {
  POST_COMMENTS: 300, // 5 minutes
  REEL_COMMENTS: 300, // 5 minutes
  COMMENT_DETAILS: 600, // 10 minutes
  COMMENT_REPLIES: 300, // 5 minutes
  COMMENT_LIKES: 180, // 3 minutes
  USER_COMMENTS: 600, // 10 minutes
  TRENDING_COMMENTS: 900, // 15 minutes
} as const;

// Types
interface CachedComment {
  id: string;
  content: string;
  user_id: string;
  post_id?: string;
  reel_id?: string;
  parent_comment_id: string | null;
  created_at: string;
  likes_count: number;
  replies_count: number;
  user: {
    username: string;
    avatar: string;
  };
  replies?: CachedComment[];
  mentions?: Array<{ user_id: string; username: string }>;
  is_liked?: boolean;
}

interface CommentsResponse {
  comments: CachedComment[];
  total_count: number;
  has_more: boolean;
  next_page?: number;
}

/**
 * Comments Cache Manager
 */
export class CommentsCache {
  /**
   * Get post comments from cache or fallback to database
   */
  static async getPostComments(
    postId: string,
    page: number = 1,
    limit: number = 20,
    fallbackFn?: () => Promise<CommentsResponse>
  ): Promise<CommentsResponse> {
    try {
      const cacheKey = `${CACHE_KEYS.POST_COMMENTS}${postId}:${page}:${limit}`;
      
      // Try to get from cache first
      const cached = await redis.get<CommentsResponse>(cacheKey);
      
      if (cached) {
        console.log(`📱 Post comments for ${postId} served from cache`);
        return cached;
      }
      
      // If not in cache and fallback provided, fetch from database
      if (fallbackFn) {
        console.log(`🔄 Post comments cache miss for ${postId}, fetching from database`);
        const freshData = await fallbackFn();
        
        // Cache the fresh data
        await this.setPostComments(postId, freshData, page, limit);
        
        return freshData;
      }
      
      return { comments: [], total_count: 0, has_more: false };
    } catch (error) {
      console.error(`❌ Error getting post comments from cache for ${postId}:`, error);
      return fallbackFn ? await fallbackFn() : { comments: [], total_count: 0, has_more: false };
    }
  }

  /**
   * Cache post comments data
   */
  static async setPostComments(
    postId: string,
    data: CommentsResponse,
    page: number = 1,
    limit: number = 20
  ): Promise<void> {
    try {
      const cacheKey = `${CACHE_KEYS.POST_COMMENTS}${postId}:${page}:${limit}`;
      await redis.setex(cacheKey, CACHE_TTL.POST_COMMENTS, data);
      console.log(`✅ Post comments cached for ${postId}`);
    } catch (error) {
      console.error(`❌ Error caching post comments for ${postId}:`, error);
    }
  }

  /**
   * Get reel comments from cache or fallback to database
   */
  static async getReelComments(
    reelId: string,
    page: number = 1,
    limit: number = 20,
    fallbackFn?: () => Promise<CommentsResponse>
  ): Promise<CommentsResponse> {
    try {
      const cacheKey = `${CACHE_KEYS.REEL_COMMENTS}${reelId}:${page}:${limit}`;
      
      const cached = await redis.get<CommentsResponse>(cacheKey);
      
      if (cached) {
        console.log(`📱 Reel comments for ${reelId} served from cache`);
        return cached;
      }
      
      if (fallbackFn) {
        console.log(`🔄 Reel comments cache miss for ${reelId}, fetching from database`);
        const freshData = await fallbackFn();
        
        await this.setReelComments(reelId, freshData, page, limit);
        return freshData;
      }
      
      return { comments: [], total_count: 0, has_more: false };
    } catch (error) {
      console.error(`❌ Error getting reel comments from cache for ${reelId}:`, error);
      return fallbackFn ? await fallbackFn() : { comments: [], total_count: 0, has_more: false };
    }
  }

  /**
   * Cache reel comments data
   */
  static async setReelComments(
    reelId: string,
    data: CommentsResponse,
    page: number = 1,
    limit: number = 20
  ): Promise<void> {
    try {
      const cacheKey = `${CACHE_KEYS.REEL_COMMENTS}${reelId}:${page}:${limit}`;
      await redis.setex(cacheKey, CACHE_TTL.REEL_COMMENTS, data);
      console.log(`✅ Reel comments cached for ${reelId}`);
    } catch (error) {
      console.error(`❌ Error caching reel comments for ${reelId}:`, error);
    }
  }

  /**
   * Get comment replies from cache
   */
  static async getCommentReplies(
    commentId: string,
    fallbackFn?: () => Promise<CachedComment[]>
  ): Promise<CachedComment[]> {
    try {
      const cacheKey = `${CACHE_KEYS.COMMENT_REPLIES}${commentId}`;
      
      const cached = await redis.get<CachedComment[]>(cacheKey);
      
      if (cached) {
        console.log(`📱 Comment replies for ${commentId} served from cache`);
        return cached;
      }
      
      if (fallbackFn) {
        console.log(`🔄 Comment replies cache miss for ${commentId}, fetching from database`);
        const freshData = await fallbackFn();
        
        await this.setCommentReplies(commentId, freshData);
        return freshData;
      }
      
      return [];
    } catch (error) {
      console.error(`❌ Error getting comment replies from cache for ${commentId}:`, error);
      return fallbackFn ? await fallbackFn() : [];
    }
  }

  /**
   * Cache comment replies
   */
  static async setCommentReplies(commentId: string, replies: CachedComment[]): Promise<void> {
    try {
      const cacheKey = `${CACHE_KEYS.COMMENT_REPLIES}${commentId}`;
      await redis.setex(cacheKey, CACHE_TTL.COMMENT_REPLIES, replies);
      console.log(`✅ Comment replies cached for ${commentId}`);
    } catch (error) {
      console.error(`❌ Error caching comment replies for ${commentId}:`, error);
    }
  }

  /**
   * Track comment interaction (like, reply, etc.)
   */
  static async trackCommentInteraction(
    commentId: string,
    userId: string,
    action: 'like' | 'unlike' | 'reply' | 'view',
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const interactionData = {
        user_id: userId,
        action,
        timestamp: new Date().toISOString(),
        metadata: metadata || {},
      };
      
      // Track in a simple list for analytics
      await redis.lpush(`comments:interactions:${commentId}`, interactionData);
      await redis.expire(`comments:interactions:${commentId}`, CACHE_TTL.COMMENT_DETAILS);
      
      console.log(`✅ Comment interaction tracked: ${action} on ${commentId} by ${userId}`);
    } catch (error) {
      console.error(`❌ Error tracking comment interaction:`, error);
    }
  }

  /**
   * Invalidate cache when comments are updated
   */
  static async invalidateCommentsCache(
    entityType: 'post' | 'reel',
    entityId?: string,
    commentId?: string,
    userId?: string
  ): Promise<void> {
    try {
      const keysToDelete: string[] = [];
      
      // Invalidate entity-specific comments
      if (entityId) {
        const entityPrefix = entityType === 'post' ? CACHE_KEYS.POST_COMMENTS : CACHE_KEYS.REEL_COMMENTS;
        const entityKeys = await redis.keys(`${entityPrefix}${entityId}:*`);
        keysToDelete.push(...entityKeys);
      } else {
        // Invalidate all comments for the entity type
        const entityPrefix = entityType === 'post' ? CACHE_KEYS.POST_COMMENTS : CACHE_KEYS.REEL_COMMENTS;
        const allEntityKeys = await redis.keys(`${entityPrefix}*`);
        keysToDelete.push(...allEntityKeys);
      }
      
      // If specific comment, invalidate its details and replies
      if (commentId) {
        keysToDelete.push(`${CACHE_KEYS.COMMENT_DETAILS}${commentId}`);
        keysToDelete.push(`${CACHE_KEYS.COMMENT_REPLIES}${commentId}`);
        keysToDelete.push(`${CACHE_KEYS.COMMENT_LIKES}${commentId}`);
      }
      
      // If specific user, invalidate their comments
      if (userId) {
        const userCommentKeys = await redis.keys(`${CACHE_KEYS.USER_COMMENTS}${userId}:*`);
        keysToDelete.push(...userCommentKeys);
      }
      
      // Invalidate trending comments
      keysToDelete.push(CACHE_KEYS.TRENDING_COMMENTS);
      
      // Delete all keys
      if (keysToDelete.length > 0) {
        await redis.del(...keysToDelete);
        console.log(`🗑️ Invalidated ${keysToDelete.length} comments cache keys`);
      }
    } catch (error) {
      console.error('❌ Error invalidating comments cache:', error);
    }
  }

  /**
   * Get user comments from cache
   */
  static async getUserComments(
    userId: string,
    page: number = 1,
    limit: number = 20,
    fallbackFn?: () => Promise<CachedComment[]>
  ): Promise<CachedComment[]> {
    try {
      const cacheKey = `${CACHE_KEYS.USER_COMMENTS}${userId}:${page}:${limit}`;
      
      const cached = await redis.get<CachedComment[]>(cacheKey);
      
      if (cached) {
        console.log(`📱 User comments for ${userId} served from cache`);
        return cached;
      }
      
      if (fallbackFn) {
        console.log(`🔄 User comments cache miss for ${userId}, fetching from database`);
        const freshData = await fallbackFn();
        
        await this.setUserComments(userId, freshData, page, limit);
        return freshData;
      }
      
      return [];
    } catch (error) {
      console.error(`❌ Error getting user comments from cache for ${userId}:`, error);
      return fallbackFn ? await fallbackFn() : [];
    }
  }

  /**
   * Cache user comments
   */
  static async setUserComments(
    userId: string,
    comments: CachedComment[],
    page: number = 1,
    limit: number = 20
  ): Promise<void> {
    try {
      const cacheKey = `${CACHE_KEYS.USER_COMMENTS}${userId}:${page}:${limit}`;
      await redis.setex(cacheKey, CACHE_TTL.USER_COMMENTS, comments);
      console.log(`✅ User comments cached for ${userId}`);
    } catch (error) {
      console.error(`❌ Error caching user comments for ${userId}:`, error);
    }
  }
}

export default CommentsCache;
