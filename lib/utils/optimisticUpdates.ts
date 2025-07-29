/**
 * Optimistic Updates Utilities for Reels
 * Provides immediate UI feedback while syncing with backend
 */

import { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '../query/queryKeys';
import ReelsCache from '../redis/reelsCache';
import { REDIS_CONFIG } from '../config/redis';

// Types
interface Reel {
  id: string;
  user_id: string;
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
  user: {
    username: string;
    avatar_url: string;
  };
  is_liked?: boolean;
  is_bookmarked?: boolean;
  is_viewed?: boolean;
}

interface OptimisticUpdateContext {
  previousData?: any;
  rollbackActions: (() => void)[];
}

/**
 * Optimistic Updates Manager for Reels
 */
export class ReelsOptimisticUpdates {
  private queryClient: QueryClient;

  constructor(queryClient: QueryClient) {
    this.queryClient = queryClient;
  }

  /**
   * Optimistically update reel like status
   */
  async optimisticLikeUpdate(
    reelId: string,
    currentLikeStatus: boolean
  ): Promise<OptimisticUpdateContext> {
    const context: OptimisticUpdateContext = {
      rollbackActions: []
    };

    try {
      // Cancel outgoing refetches
      await this.queryClient.cancelQueries({ queryKey: queryKeys.reels.detail(reelId) });

      // Snapshot previous value
      const previousReel = this.queryClient.getQueryData<Reel>(queryKeys.reels.detail(reelId));
      context.previousData = previousReel;

      if (previousReel) {
        const newLikesCount = currentLikeStatus 
          ? previousReel.likes_count - 1 
          : previousReel.likes_count + 1;
        
        const updatedReel = {
          ...previousReel,
          is_liked: !currentLikeStatus,
          likes_count: Math.max(0, newLikesCount),
        };

        // Update TanStack Query cache
        this.queryClient.setQueryData<Reel>(queryKeys.reels.detail(reelId), updatedReel);

        // Update Redis cache optimistically
        if (REDIS_CONFIG.enabled) {
          await ReelsCache.updateReelEngagement(reelId, {
            is_liked: !currentLikeStatus,
            likes_count: Math.max(0, newLikesCount),
          });
        }

        // Update reels feed cache if present
        this.updateReelInFeed(reelId, {
          is_liked: !currentLikeStatus,
          likes_count: Math.max(0, newLikesCount),
        });

        // Add rollback action
        context.rollbackActions.push(() => {
          this.queryClient.setQueryData(queryKeys.reels.detail(reelId), previousReel);
          this.updateReelInFeed(reelId, {
            is_liked: previousReel.is_liked,
            likes_count: previousReel.likes_count,
          });
        });
      }

      console.log(`✅ Optimistic like update applied for reel ${reelId}`);
      return context;
    } catch (error) {
      console.error('❌ Error applying optimistic like update:', error);
      return context;
    }
  }

  /**
   * Optimistically update reel bookmark status
   */
  async optimisticBookmarkUpdate(
    reelId: string,
    currentBookmarkStatus: boolean
  ): Promise<OptimisticUpdateContext> {
    const context: OptimisticUpdateContext = {
      rollbackActions: []
    };

    try {
      await this.queryClient.cancelQueries({ queryKey: queryKeys.reels.detail(reelId) });

      const previousReel = this.queryClient.getQueryData<Reel>(queryKeys.reels.detail(reelId));
      context.previousData = previousReel;

      if (previousReel) {
        const newBookmarksCount = currentBookmarkStatus 
          ? previousReel.bookmarks_count - 1 
          : previousReel.bookmarks_count + 1;
        
        const updatedReel = {
          ...previousReel,
          is_bookmarked: !currentBookmarkStatus,
          bookmarks_count: Math.max(0, newBookmarksCount),
        };

        this.queryClient.setQueryData<Reel>(queryKeys.reels.detail(reelId), updatedReel);

        if (REDIS_CONFIG.enabled) {
          await ReelsCache.updateReelEngagement(reelId, {
            is_bookmarked: !currentBookmarkStatus,
            bookmarks_count: Math.max(0, newBookmarksCount),
          });
        }

        this.updateReelInFeed(reelId, {
          is_bookmarked: !currentBookmarkStatus,
          bookmarks_count: Math.max(0, newBookmarksCount),
        });

        context.rollbackActions.push(() => {
          this.queryClient.setQueryData(queryKeys.reels.detail(reelId), previousReel);
          this.updateReelInFeed(reelId, {
            is_bookmarked: previousReel.is_bookmarked,
            bookmarks_count: previousReel.bookmarks_count,
          });
        });
      }

      console.log(`✅ Optimistic bookmark update applied for reel ${reelId}`);
      return context;
    } catch (error) {
      console.error('❌ Error applying optimistic bookmark update:', error);
      return context;
    }
  }

  /**
   * Optimistically update reel view status
   */
  async optimisticViewUpdate(
    reelId: string,
    watchTime?: number
  ): Promise<OptimisticUpdateContext> {
    const context: OptimisticUpdateContext = {
      rollbackActions: []
    };

    try {
      const previousReel = this.queryClient.getQueryData<Reel>(queryKeys.reels.detail(reelId));
      context.previousData = previousReel;

      if (previousReel && !previousReel.is_viewed) {
        const updatedReel = {
          ...previousReel,
          is_viewed: true,
          views_count: previousReel.views_count + 1,
        };

        this.queryClient.setQueryData<Reel>(queryKeys.reels.detail(reelId), updatedReel);

        if (REDIS_CONFIG.enabled) {
          await ReelsCache.updateReelEngagement(reelId, {
            is_viewed: true,
            views_count: previousReel.views_count + 1,
          });

          // Track the view interaction
          await ReelsCache.trackReelInteraction({
            reel_id: reelId,
            user_id: '', // Will be set by the backend
            interaction_type: 'view',
            timestamp: new Date().toISOString(),
            metadata: { watch_time: watchTime || 0 },
          });
        }

        this.updateReelInFeed(reelId, {
          is_viewed: true,
          views_count: previousReel.views_count + 1,
        });

        context.rollbackActions.push(() => {
          this.queryClient.setQueryData(queryKeys.reels.detail(reelId), previousReel);
          this.updateReelInFeed(reelId, {
            is_viewed: previousReel.is_viewed,
            views_count: previousReel.views_count,
          });
        });
      }

      console.log(`✅ Optimistic view update applied for reel ${reelId}`);
      return context;
    } catch (error) {
      console.error('❌ Error applying optimistic view update:', error);
      return context;
    }
  }

  /**
   * Optimistically add new reel to feed
   */
  async optimisticReelCreate(newReel: Reel): Promise<OptimisticUpdateContext> {
    const context: OptimisticUpdateContext = {
      rollbackActions: []
    };

    try {
      // Get current feed data
      const feedQueryKey = queryKeys.reels.lists();
      const currentFeedData = this.queryClient.getQueryData(feedQueryKey);

      if (currentFeedData) {
        // Add new reel to the beginning of the feed
        const updatedFeedData = {
          ...currentFeedData,
          pages: [
            {
              reels: [newReel, ...(currentFeedData as any).pages[0]?.reels || []],
              nextCursor: (currentFeedData as any).pages[0]?.nextCursor,
            },
            ...(currentFeedData as any).pages.slice(1),
          ],
        };

        this.queryClient.setQueryData(feedQueryKey, updatedFeedData);

        context.rollbackActions.push(() => {
          this.queryClient.setQueryData(feedQueryKey, currentFeedData);
        });
      }

      // Add to user's reels cache
      const userReelsKey = queryKeys.reels.user(newReel.user_id);
      const currentUserReels = this.queryClient.getQueryData<Reel[]>(userReelsKey);

      if (currentUserReels) {
        const updatedUserReels = [newReel, ...currentUserReels];
        this.queryClient.setQueryData(userReelsKey, updatedUserReels);

        context.rollbackActions.push(() => {
          this.queryClient.setQueryData(userReelsKey, currentUserReels);
        });
      }

      console.log(`✅ Optimistic reel creation applied for reel ${newReel.id}`);
      return context;
    } catch (error) {
      console.error('❌ Error applying optimistic reel creation:', error);
      return context;
    }
  }

  /**
   * Rollback optimistic updates
   */
  rollback(context: OptimisticUpdateContext): void {
    try {
      context.rollbackActions.forEach(action => action());
      console.log('✅ Optimistic updates rolled back');
    } catch (error) {
      console.error('❌ Error rolling back optimistic updates:', error);
    }
  }

  /**
   * Update a specific reel in the feed cache
   */
  private updateReelInFeed(reelId: string, updates: Partial<Reel>): void {
    try {
      const feedQueryKey = queryKeys.reels.lists();
      const currentFeedData = this.queryClient.getQueryData(feedQueryKey);

      if (currentFeedData && (currentFeedData as any).pages) {
        const updatedFeedData = {
          ...(currentFeedData as any),
          pages: (currentFeedData as any).pages.map((page: any) => ({
            ...page,
            reels: page.reels?.map((reel: Reel) => 
              reel.id === reelId ? { ...reel, ...updates } : reel
            ) || [],
          })),
        };

        this.queryClient.setQueryData(feedQueryKey, updatedFeedData);
      }
    } catch (error) {
      console.error('❌ Error updating reel in feed:', error);
    }
  }
}

/**
 * Create optimistic updates manager instance
 */
export const createReelsOptimisticUpdates = (queryClient: QueryClient) => {
  return new ReelsOptimisticUpdates(queryClient);
};

export default ReelsOptimisticUpdates;
