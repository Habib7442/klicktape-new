/**
 * Unified Cache Invalidation Strategy
 * Coordinates invalidation between TanStack Query and Redis caches
 */

import { queryClient } from '../queryClient';
import StoriesCache from '../../redis/storiesCache';
import PostsCache from '../../redis/postsCache';
import CommentsCache from '../../redis/commentsCache';
import ReelsCache from '../../redis/reelsCache';
import { queryKeys } from '../queryKeys';
import { REDIS_CONFIG } from '../../config/redis';
import { supabase } from '../../supabase';

// Types for invalidation events
interface InvalidationEvent {
  type: 'stories' | 'posts' | 'reels' | 'users' | 'notifications' | 'messages';
  action: 'create' | 'update' | 'delete' | 'view' | 'like' | 'bookmark' | 'share' | 'comment';
  entityId?: string;
  userId?: string;
  relatedIds?: string[];
  metadata?: Record<string, any>;
}

interface InvalidationStrategy {
  tanstackQueries: readonly unknown[][];
  redisKeys: string[];
  customActions?: (() => Promise<void>)[];
}

class CacheInvalidator {
  /**
   * Main invalidation method that coordinates both cache systems
   */
  async invalidate(event: InvalidationEvent): Promise<void> {
    try {
      console.log(`🔄 Invalidating caches for event:`, event);
      
      const strategy = this.getInvalidationStrategy(event);
      
      // Execute TanStack Query invalidations
      const tanstackPromises = strategy.tanstackQueries.map(queryKey =>
        queryClient.invalidateQueries({ queryKey })
      );
      
      // Execute Redis invalidations
      const redisPromises = REDIS_CONFIG.enabled 
        ? strategy.redisKeys.map(key => this.invalidateRedisKey(key))
        : [];
      
      // Execute custom actions
      const customPromises = strategy.customActions || [];
      
      // Wait for all invalidations to complete
      await Promise.all([
        ...tanstackPromises,
        ...redisPromises,
        ...customPromises.map(action => action()),
      ]);
      
      console.log(`✅ Cache invalidation completed for ${event.type}:${event.action}`);
    } catch (error) {
      console.error('❌ Cache invalidation failed:', error);
      throw error;
    }
  }

  /**
   * Get invalidation strategy based on event type and action
   */
  private getInvalidationStrategy(event: InvalidationEvent): InvalidationStrategy {
    const { type, action, entityId, userId, relatedIds } = event;
    
    switch (type) {
      case 'stories':
        return this.getStoriesInvalidationStrategy(action, entityId, userId, relatedIds);
      
      case 'posts':
        return this.getPostsInvalidationStrategy(action, entityId, userId, relatedIds);

      case 'reels':
        return this.getReelsInvalidationStrategy(action, entityId, userId, relatedIds);

      case 'users':
        return this.getUsersInvalidationStrategy(action, entityId, userId, relatedIds);
      
      case 'notifications':
        return this.getNotificationsInvalidationStrategy(action, entityId, userId);
      
      case 'messages':
        return this.getMessagesInvalidationStrategy(action, entityId, userId);
      
      default:
        return { tanstackQueries: [], redisKeys: [] };
    }
  }

  /**
   * Stories invalidation strategies
   */
  private getStoriesInvalidationStrategy(
    action: string,
    entityId?: string,
    userId?: string,
    relatedIds?: string[]
  ): InvalidationStrategy {
    let tanstackQueries: readonly unknown[][] = [];
    const redisKeys: string[] = [];
    const customActions: (() => Promise<void>)[] = [];

    switch (action) {
      case 'create':
        // Invalidate stories feed and user stories
        tanstackQueries = [
          queryKeys.stories.feeds(),
          ...(userId ? [queryKeys.stories.userStories(userId)] : [])
        ] as unknown as readonly unknown[][];
        
        redisKeys.push(
          'stories:feed:*',
          ...(userId ? [`stories:user:${userId}`] : [])
        );
        
        // Custom action to invalidate active stories
        customActions.push(async () => {
          if (REDIS_CONFIG.enabled) {
            await StoriesCache.invalidateStoriesCache(userId);
          }
        });
        break;

      case 'delete':
        // Similar to create, but also invalidate specific story
        tanstackQueries.push(
          queryKeys.stories.feeds(),
          ...(userId ? [queryKeys.stories.userStories(userId)] : []),
          ...(entityId ? [queryKeys.stories.storyAnalytics(entityId)] : [])
        );
        
        redisKeys.push(
          'stories:feed:*',
          ...(userId ? [`stories:user:${userId}`] : []),
          ...(entityId ? [`stories:analytics:${entityId}`, `stories:views:${entityId}`] : [])
        );
        
        customActions.push(async () => {
          if (REDIS_CONFIG.enabled) {
            await StoriesCache.invalidateStoriesCache(userId);
          }
        });
        break;

      case 'view':
        // Only invalidate analytics and view-related caches
        tanstackQueries.push(
          ...(entityId ? [queryKeys.stories.storyAnalytics(entityId)] : [])
        );
        
        redisKeys.push(
          ...(entityId ? [`stories:analytics:${entityId}`, `stories:views:${entityId}`] : [])
        );
        break;

      case 'update':
        // Invalidate all related caches
        tanstackQueries.push(
          queryKeys.stories.feeds(),
          ...(userId ? [queryKeys.stories.userStories(userId)] : []),
          ...(entityId ? [queryKeys.stories.storyAnalytics(entityId)] : [])
        );
        
        redisKeys.push(
          'stories:feed:*',
          ...(userId ? [`stories:user:${userId}`] : []),
          ...(entityId ? [`stories:analytics:${entityId}`] : [])
        );
        break;
    }

    return { tanstackQueries, redisKeys, customActions };
  }

  /**
   * Posts invalidation strategies
   */
  private getPostsInvalidationStrategy(
    action: string,
    entityId?: string,
    userId?: string,
    relatedIds?: string[]
  ): InvalidationStrategy {
    const tanstackQueries: unknown[][] = [];
    const redisKeys: string[] = [];
    const customActions: (() => Promise<void>)[] = [];

    switch (action) {
      case 'create':
        // Invalidate posts feed and user posts
        tanstackQueries.push(
          queryKeys.posts.lists(),
          queryKeys.posts.explore(),
          ...(userId ? [queryKeys.posts.user(userId)] : [])
        );

        redisKeys.push(
          'posts:feed:*',
          'posts:trending',
          ...(userId ? [`posts:user:${userId}:*`] : [])
        );

        // Custom action to invalidate posts cache
        customActions.push(async () => {
          if (REDIS_CONFIG.enabled) {
            await PostsCache.invalidatePostsCache(userId);
          }
        });
        break;

      case 'delete':
        tanstackQueries.push(
          queryKeys.posts.lists(),
          queryKeys.posts.explore(),
          ...(userId ? [queryKeys.posts.user(userId)] : []),
          ...(entityId ? [queryKeys.posts.detail(entityId), queryKeys.comments.post(entityId)] : [])
        );

        redisKeys.push(
          'posts:feed:*',
          'posts:trending',
          ...(userId ? [`posts:user:${userId}:*`] : []),
          ...(entityId ? [`posts:detail:${entityId}`, `posts:likes:${entityId}`, `posts:bookmarks:${entityId}`] : [])
        );

        customActions.push(async () => {
          if (REDIS_CONFIG.enabled) {
            await PostsCache.invalidatePostsCache(userId, entityId);
          }
        });
        break;

      case 'like':
      case 'bookmark':
        tanstackQueries.push(
          ...(entityId ? [queryKeys.posts.detail(entityId)] : []),
          queryKeys.posts.lists(),
          ...(userId && action === 'bookmark' ? [queryKeys.posts.bookmarks(userId)] : [])
        );

        redisKeys.push(
          'posts:feed:*',
          ...(entityId ? [`posts:detail:${entityId}`, `posts:${action}s:${entityId}`] : [])
        );

        customActions.push(async () => {
          if (REDIS_CONFIG.enabled && entityId && userId) {
            await PostsCache.trackPostInteraction(entityId, userId, action as any);
            await PostsCache.invalidatePostsCache(undefined, entityId);
          }
        });
        break;

      case 'update':
        tanstackQueries.push(
          queryKeys.posts.lists(),
          ...(entityId ? [queryKeys.posts.detail(entityId)] : []),
          ...(userId ? [queryKeys.posts.user(userId)] : [])
        );

        redisKeys.push(
          'posts:feed:*',
          ...(entityId ? [`posts:detail:${entityId}`] : []),
          ...(userId ? [`posts:user:${userId}:*`] : [])
        );

        customActions.push(async () => {
          if (REDIS_CONFIG.enabled) {
            await PostsCache.invalidatePostsCache(userId, entityId);
          }
        });
        break;
    }

    return { tanstackQueries, redisKeys, customActions };
  }

  /**
   * Reels invalidation strategies
   */
  private getReelsInvalidationStrategy(
    action: string,
    entityId?: string,
    userId?: string,
    relatedIds?: string[]
  ): InvalidationStrategy {
    const tanstackQueries: unknown[][] = [];
    const redisKeys: string[] = [];
    const customActions: (() => Promise<void>)[] = [];

    switch (action) {
      case 'create':
        // Invalidate reels feed and user reels
        tanstackQueries.push(
          queryKeys.reels.lists(),
          queryKeys.reels.explore(),
          ...(userId ? [queryKeys.reels.user(userId)] : [])
        );

        redisKeys.push(
          'reels:feed:*',
          'reels:trending:*',
          'reels:explore:*',
          ...(userId ? [`reels:user:${userId}:*`] : [])
        );

        // Custom action to invalidate reels cache
        customActions.push(async () => {
          if (REDIS_CONFIG.enabled) {
            await ReelsCache.invalidateReelsCache(userId);
          }
        });
        break;

      case 'delete':
        tanstackQueries.push(
          queryKeys.reels.lists(),
          queryKeys.reels.explore(),
          ...(entityId ? [queryKeys.reels.detail(entityId)] : []),
          ...(userId ? [queryKeys.reels.user(userId)] : [])
        );

        redisKeys.push(
          'reels:feed:*',
          'reels:trending:*',
          'reels:explore:*',
          ...(entityId ? [`reels:detail:${entityId}`, `reels:*:${entityId}`] : []),
          ...(userId ? [`reels:user:${userId}:*`] : [])
        );

        customActions.push(async () => {
          if (REDIS_CONFIG.enabled) {
            await ReelsCache.invalidateReelsCache(userId, entityId);
          }
        });
        break;

      case 'like':
      case 'bookmark':
      case 'view':
      case 'share':
        tanstackQueries.push(
          queryKeys.reels.lists(),
          ...(entityId ? [queryKeys.reels.detail(entityId)] : [])
        );

        redisKeys.push(
          'reels:feed:*',
          ...(entityId ? [`reels:detail:${entityId}`, `reels:${action}s:${entityId}`] : [])
        );

        customActions.push(async () => {
          if (REDIS_CONFIG.enabled && entityId && userId) {
            await ReelsCache.trackReelInteraction({
              reel_id: entityId,
              user_id: userId,
              interaction_type: action as any,
              timestamp: new Date().toISOString(),
            });
            await ReelsCache.invalidateReelsCache(undefined, entityId);
          }
        });
        break;

      case 'comment':
        tanstackQueries.push(
          queryKeys.reels.lists(),
          ...(entityId ? [queryKeys.reels.detail(entityId)] : [])
        );

        redisKeys.push(
          'reels:feed:*',
          ...(entityId ? [`reels:detail:${entityId}`] : [])
        );

        customActions.push(async () => {
          if (REDIS_CONFIG.enabled && entityId) {
            await ReelsCache.updateReelEngagement(entityId, {
              comments_count: undefined, // Will be updated by the backend
            });
          }
        });
        break;

      case 'update':
        tanstackQueries.push(
          queryKeys.reels.lists(),
          ...(entityId ? [queryKeys.reels.detail(entityId)] : []),
          ...(userId ? [queryKeys.reels.user(userId)] : [])
        );

        redisKeys.push(
          'reels:feed:*',
          ...(entityId ? [`reels:detail:${entityId}`] : []),
          ...(userId ? [`reels:user:${userId}:*`] : [])
        );

        customActions.push(async () => {
          if (REDIS_CONFIG.enabled) {
            await ReelsCache.invalidateReelsCache(userId, entityId);
          }
        });
        break;
    }

    return { tanstackQueries, redisKeys, customActions };
  }

  /**
   * Users invalidation strategies
   */
  private getUsersInvalidationStrategy(
    action: string,
    entityId?: string,
    userId?: string,
    relatedIds?: string[]
  ): InvalidationStrategy {
    const tanstackQueries: readonly unknown[][] = [];
    const redisKeys: string[] = [];

    switch (action) {
      case 'update':
        tanstackQueries.push(
          ...(entityId ? [queryKeys.users.profile(entityId)] : []),
          queryKeys.users.current()
        );
        break;

      case 'create':
        tanstackQueries.push(
          queryKeys.users.lists(),
          queryKeys.search.users('*')
        );
        break;
    }

    return { tanstackQueries, redisKeys };
  }

  /**
   * Notifications invalidation strategies
   */
  private getNotificationsInvalidationStrategy(
    action: string,
    entityId?: string,
    userId?: string
  ): InvalidationStrategy {
    const tanstackQueries: readonly unknown[][] = [];
    const redisKeys: string[] = [];

    if (userId) {
      tanstackQueries.push(
        queryKeys.notifications.user(userId),
        queryKeys.notifications.unread(userId)
      );
    }

    return { tanstackQueries, redisKeys };
  }

  /**
   * Messages invalidation strategies
   */
  private getMessagesInvalidationStrategy(
    action: string,
    entityId?: string,
    userId?: string
  ): InvalidationStrategy {
    const tanstackQueries: readonly unknown[][] = [];
    const redisKeys: string[] = [];

    if (userId) {
      tanstackQueries.push(
        queryKeys.messages.conversations(userId),
        queryKeys.messages.unread(userId)
      );
    }

    if (entityId) {
      tanstackQueries.push(
        queryKeys.messages.conversation(entityId)
      );
    }

    return { tanstackQueries, redisKeys };
  }

  /**
   * Invalidate Redis key with pattern support
   */
  private async invalidateRedisKey(key: string): Promise<void> {
    try {
      if (!REDIS_CONFIG.enabled) return;

      if (key.includes('*')) {
        // Handle pattern-based invalidation
        const pattern = key.replace('*', '');
        
        if (pattern.startsWith('stories:feed:')) {
          // Invalidate all stories feed caches
          await StoriesCache.invalidateStoriesCache();
        }
      } else {
        // Handle specific key invalidation
        if (key.startsWith('stories:user:')) {
          const userId = key.split(':')[2];
          await StoriesCache.invalidateStoriesCache(userId);
        } else if (key.startsWith('stories:')) {
          await StoriesCache.invalidateStoriesCache();
        }
      }
    } catch (error) {
      console.warn(`Failed to invalidate Redis key ${key}:`, error);
    }
  }

  /**
   * Batch invalidation for multiple events
   */
  async batchInvalidate(events: InvalidationEvent[]): Promise<void> {
    try {
      console.log(`🔄 Batch invalidating ${events.length} events`);
      
      // Group events by type for optimization
      const groupedEvents = events.reduce((acc, event) => {
        const key = `${event.type}:${event.action}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(event);
        return acc;
      }, {} as Record<string, InvalidationEvent[]>);

      // Process each group
      const promises = Object.values(groupedEvents).map(eventGroup =>
        Promise.all(eventGroup.map(event => this.invalidate(event)))
      );

      await Promise.all(promises);
      
      console.log(`✅ Batch invalidation completed for ${events.length} events`);
    } catch (error) {
      console.error('❌ Batch invalidation failed:', error);
      throw error;
    }
  }

  /**
   * Real-time invalidation for live updates
   */
  async setupRealTimeInvalidation(): Promise<void> {
    try {
      // Set up Supabase real-time subscriptions for automatic invalidation
      const channel = supabase
        .channel('cache-invalidation')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'stories' },
          (payload) => {
            const event: InvalidationEvent = {
              type: 'stories',
              action: payload.eventType === 'INSERT' ? 'create' : 
                     payload.eventType === 'UPDATE' ? 'update' : 'delete',
              entityId: payload.new?.id || payload.old?.id,
              userId: payload.new?.user_id || payload.old?.user_id,
            };
            
            this.invalidate(event).catch(console.error);
          }
        )
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'posts' },
          (payload) => {
            const event: InvalidationEvent = {
              type: 'posts',
              action: payload.eventType === 'INSERT' ? 'create' : 
                     payload.eventType === 'UPDATE' ? 'update' : 'delete',
              entityId: payload.new?.id || payload.old?.id,
              userId: payload.new?.user_id || payload.old?.user_id,
            };
            
            this.invalidate(event).catch(console.error);
          }
        )
        .subscribe();

      console.log('✅ Real-time cache invalidation setup completed');
    } catch (error) {
      console.error('❌ Failed to setup real-time invalidation:', error);
    }
  }
}

// Export singleton instance
export const cacheInvalidator = new CacheInvalidator();

// Convenience functions for common invalidation patterns
export const invalidateStories = (action: string, entityId?: string, userId?: string) =>
  cacheInvalidator.invalidate({
    type: 'stories',
    action: action as any,
    entityId,
    userId,
  });

export const invalidatePosts = (action: string, entityId?: string, userId?: string) =>
  cacheInvalidator.invalidate({
    type: 'posts',
    action: action as any,
    entityId,
    userId,
  });

export const invalidateUsers = (action: string, entityId?: string, userId?: string) =>
  cacheInvalidator.invalidate({
    type: 'users',
    action: action as any,
    entityId,
    userId,
  });

export const invalidateComments = (action: string, entityId?: string, userId?: string, relatedIds?: string[]) =>
  cacheInvalidator.invalidate({
    type: 'comments' as any,
    action: action as any,
    entityId,
    userId,
    relatedIds,
  });

export default cacheInvalidator;
