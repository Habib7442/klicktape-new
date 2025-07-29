/**
 * TanStack Query Hooks for Reels/Tapes
 * Integrates with Redis caching for optimal performance
 * Based on posts and stories query patterns
 */

import { 
  useQuery, 
  useMutation, 
  useQueryClient, 
  UseQueryOptions, 
  UseMutationOptions, 
  useInfiniteQuery 
} from '@tanstack/react-query';
import { supabase } from '../../supabase';
import { queryKeys } from '../queryKeys';
import ReelsCache from '../../redis/reelsCache';
import { REDIS_CONFIG } from '../../config/redis';
import { invalidateCache } from '../queryClient';

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

interface ReelComment {
  id: string;
  content: string;
  created_at: string;
  likes_count: number;
  user: {
    username: string;
    avatar_url: string;
  };
  is_liked?: boolean;
}

interface CreateReelData {
  video_url: string;
  caption?: string;
  music?: string;
  thumbnail_url?: string;
  hashtags?: string[];
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

// Performance tracking
const performanceOptimizer = {
  trackCacheHit: (isHit: boolean, responseTime: number) => {
    console.log(`📊 Reels Cache ${isHit ? 'HIT' : 'MISS'} - ${responseTime}ms`);
  }
};

// Query Functions with Redis Integration
const reelsQueryFunctions = {
  /**
   * Get reels feed with Redis caching fallback
   */
  getReelsFeed: async ({ pageParam = 0 }: { pageParam?: number }) => {
    const REELS_PER_PAGE = 10;
    const startTime = Date.now();
    
    try {
      // Try Redis cache first if enabled
      if (REDIS_CONFIG.enabled) {
        const cachedFeed = await ReelsCache.getReelsFeed(pageParam + 1, REELS_PER_PAGE);
        
        if (cachedFeed.reels.length > 0) {
          const responseTime = Date.now() - startTime;
          performanceOptimizer.trackCacheHit(true, responseTime);
          console.log('📱 Reels feed served from Redis cache');
          return {
            reels: cachedFeed.reels,
            nextCursor: cachedFeed.has_more ? pageParam + 1 : undefined,
          };
        }
      }
      
      // Fallback to database
      console.log('🔄 Fetching reels feed from database');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const offset = pageParam * REELS_PER_PAGE;

      // Get user's liked reels
      const { data: likedReels } = await supabase
        .from('reel_likes')
        .select('reel_id')
        .eq('user_id', user.id);

      const userLikedReelIds = likedReels?.map(like => like.reel_id) || [];

      // Get user's bookmarked reels
      const { data: bookmarkedReels } = await supabase
        .from('reel_bookmarks')
        .select('reel_id')
        .eq('user_id', user.id);

      const userBookmarkedReelIds = bookmarkedReels?.map(bookmark => bookmark.reel_id) || [];

      // Fetch reels with user profiles
      const { data: reels, error } = await supabase
        .from('reels')
        .select(`
          *,
          user:profiles!reels_user_id_fkey (username, avatar_url)
        `)
        .order('created_at', { ascending: false })
        .range(offset, offset + REELS_PER_PAGE - 1);

      if (error) throw error;

      const processedReels = (reels || []).map(reel => ({
        ...reel,
        is_liked: userLikedReelIds.includes(reel.id),
        is_bookmarked: userBookmarkedReelIds.includes(reel.id),
        is_viewed: false, // Will be updated when viewed
        user: {
          ...reel.user,
          avatar_url: reel.user?.avatar_url || "https://via.placeholder.com/150"
        }
      }));

      const result = {
        reels: processedReels,
        nextCursor: processedReels.length === REELS_PER_PAGE ? pageParam + 1 : undefined,
      };
      
      // Cache the result in Redis
      if (REDIS_CONFIG.enabled && processedReels.length > 0) {
        await ReelsCache.setReelsFeed({
          reels: processedReels,
          total_count: processedReels.length,
          has_more: !!result.nextCursor,
          next_page: result.nextCursor
        }, pageParam + 1, REELS_PER_PAGE);
      }

      const responseTime = Date.now() - startTime;
      performanceOptimizer.trackCacheHit(false, responseTime);

      return result;
    } catch (error) {
      console.error('❌ Error fetching reels feed:', error);
      throw error;
    }
  },

  /**
   * Get single reel with details
   */
  getReel: async (reelId: string): Promise<Reel> => {
    const startTime = Date.now();
    
    try {
      // Try Redis cache first if enabled
      if (REDIS_CONFIG.enabled) {
        const cachedReel = await ReelsCache.getReelDetails(reelId);
        
        if (cachedReel) {
          const responseTime = Date.now() - startTime;
          performanceOptimizer.trackCacheHit(true, responseTime);
          console.log(`📱 Reel details for ${reelId} served from Redis cache`);
          return cachedReel as Reel;
        }
      }
      
      // Fallback to database
      console.log(`🔄 Fetching reel details from database for ${reelId}`);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: reel, error } = await supabase
        .from('reels')
        .select(`
          *,
          user:profiles!reels_user_id_fkey (username, avatar_url)
        `)
        .eq('id', reelId)
        .single();

      if (error || !reel) {
        throw new Error(`Reel not found: ${error?.message || 'No data'}`);
      }

      // Check if user has liked the reel
      const { data: likeData } = await supabase
        .from('reel_likes')
        .select('id')
        .eq('reel_id', reelId)
        .eq('user_id', user.id)
        .single();

      // Check if user has bookmarked the reel
      const { data: bookmarkData } = await supabase
        .from('reel_bookmarks')
        .select('id')
        .eq('reel_id', reelId)
        .eq('user_id', user.id)
        .single();

      const processedReel = {
        ...reel,
        is_liked: !!likeData,
        is_bookmarked: !!bookmarkData,
        is_viewed: false,
        user: {
          ...reel.user,
          avatar_url: reel.user?.avatar_url || "https://via.placeholder.com/150"
        }
      } as Reel;

      // Cache the result in Redis
      if (REDIS_CONFIG.enabled) {
        await ReelsCache.setReelDetails(reelId, processedReel);
      }

      const responseTime = Date.now() - startTime;
      performanceOptimizer.trackCacheHit(false, responseTime);

      return processedReel;
    } catch (error) {
      console.error(`❌ Error fetching reel details for ${reelId}:`, error);
      throw error;
    }
  },

  /**
   * Get user's reels
   */
  getUserReels: async (userId: string, page: number = 1, limit: number = 12): Promise<Reel[]> => {
    const startTime = Date.now();
    
    try {
      // Try Redis cache first if enabled
      if (REDIS_CONFIG.enabled) {
        const cachedReels = await ReelsCache.getUserReels(userId, page, limit);
        
        if (cachedReels.length > 0) {
          const responseTime = Date.now() - startTime;
          performanceOptimizer.trackCacheHit(true, responseTime);
          console.log(`📱 User reels for ${userId} served from Redis cache`);
          return cachedReels as Reel[];
        }
      }
      
      // Fallback to database
      console.log(`🔄 Fetching user reels from database for ${userId}`);
      const offset = (page - 1) * limit;

      const { data: reels, error } = await supabase
        .from('reels')
        .select(`
          *,
          user:profiles!reels_user_id_fkey (username, avatar_url)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      const processedReels = (reels || []).map(reel => ({
        ...reel,
        is_liked: false, // Will be updated based on current user
        is_bookmarked: false,
        is_viewed: false,
        user: {
          ...reel.user,
          avatar_url: reel.user?.avatar_url || "https://via.placeholder.com/150"
        }
      })) as Reel[];

      // Cache the result in Redis
      if (REDIS_CONFIG.enabled && processedReels.length > 0) {
        await ReelsCache.setUserReels(userId, processedReels, page, limit);
      }

      const responseTime = Date.now() - startTime;
      performanceOptimizer.trackCacheHit(false, responseTime);

      return processedReels;
    } catch (error) {
      console.error(`❌ Error fetching user reels for ${userId}:`, error);
      throw error;
    }
  },

  /**
   * Get trending reels
   */
  getTrendingReels: async (limit: number = 20): Promise<Reel[]> => {
    const startTime = Date.now();
    
    try {
      // Try Redis cache first if enabled
      if (REDIS_CONFIG.enabled) {
        const cachedReels = await ReelsCache.getTrendingReels(limit);
        
        if (cachedReels.length > 0) {
          const responseTime = Date.now() - startTime;
          performanceOptimizer.trackCacheHit(true, responseTime);
          console.log('📱 Trending reels served from Redis cache');
          return cachedReels as Reel[];
        }
      }
      
      // Fallback to database - get reels with high engagement
      console.log('🔄 Fetching trending reels from database');
      const { data: reels, error } = await supabase
        .from('reels')
        .select(`
          *,
          user:profiles!reels_user_id_fkey (username, avatar_url)
        `)
        .order('likes_count', { ascending: false })
        .order('views_count', { ascending: false })
        .limit(limit);

      if (error) throw error;

      const processedReels = (reels || []).map(reel => ({
        ...reel,
        is_liked: false,
        is_bookmarked: false,
        is_viewed: false,
        user: {
          ...reel.user,
          avatar_url: reel.user?.avatar_url || "https://via.placeholder.com/150"
        }
      })) as Reel[];

      // Cache the result in Redis
      if (REDIS_CONFIG.enabled && processedReels.length > 0) {
        await ReelsCache.setTrendingReels(processedReels, limit);
      }

      const responseTime = Date.now() - startTime;
      performanceOptimizer.trackCacheHit(false, responseTime);

      return processedReels;
    } catch (error) {
      console.error('❌ Error fetching trending reels:', error);
      throw error;
    }
  },

  /**
   * Create a new reel
   */
  createReel: async (reelData: CreateReelData) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: reel, error } = await supabase
      .from('reels')
      .insert({
        ...reelData,
        user_id: user.id,
        created_at: new Date().toISOString(),
        likes_count: 0,
        comments_count: 0,
        views_count: 0,
        bookmarks_count: 0,
      })
      .select(`
        *,
        user:profiles!reels_user_id_fkey (username, avatar_url)
      `)
      .single();

    if (error) throw error;

    return reel;
  },

  /**
   * Toggle reel like
   */
  toggleReelLike: async (reelId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Use RPC function for atomic like toggle
    const { data, error } = await supabase
      .rpc('toggle_reel_like', {
        p_reel_id: reelId,
        p_user_id: user.id,
      });

    if (error) throw error;

    return { liked: data };
  },

  /**
   * Toggle reel bookmark
   */
  toggleReelBookmark: async (reelId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Check if already bookmarked
    const { data: existingBookmark } = await supabase
      .from('reel_bookmarks')
      .select('id')
      .eq('reel_id', reelId)
      .eq('user_id', user.id)
      .single();

    if (existingBookmark) {
      // Remove bookmark
      const { error } = await supabase
        .from('reel_bookmarks')
        .delete()
        .eq('reel_id', reelId)
        .eq('user_id', user.id);

      if (error) throw error;
      return { bookmarked: false };
    } else {
      // Add bookmark
      const { error } = await supabase
        .from('reel_bookmarks')
        .insert({
          reel_id: reelId,
          user_id: user.id,
        });

      if (error) throw error;
      return { bookmarked: true };
    }
  },

  /**
   * Track reel view
   */
  trackReelView: async (reelId: string, watchTime?: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Use RPC function to track view and update count
    const { error } = await supabase
      .rpc('track_reel_view', {
        p_reel_id: reelId,
        p_user_id: user.id,
        p_watch_time: watchTime || 0,
      });

    if (error) throw error;

    return true;
  },

  /**
   * Delete a reel
   */
  deleteReel: async (reelId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('reels')
      .delete()
      .eq('id', reelId)
      .eq('user_id', user.id);

    if (error) throw error;

    return true;
  },

  /**
   * Get reel analytics
   */
  getReelAnalytics: async (reelId: string): Promise<ReelAnalytics> => {
    const startTime = Date.now();

    try {
      // Try Redis cache first if enabled
      if (REDIS_CONFIG.enabled) {
        const cachedAnalytics = await ReelsCache.getReelAnalytics(reelId);

        if (cachedAnalytics) {
          const responseTime = Date.now() - startTime;
          performanceOptimizer.trackCacheHit(true, responseTime);
          console.log(`📱 Reel analytics for ${reelId} served from Redis cache`);
          return cachedAnalytics;
        }
      }

      // Fallback to database - use RPC function for analytics
      console.log(`🔄 Fetching reel analytics from database for ${reelId}`);
      const { data: analytics, error } = await supabase
        .rpc('get_reel_analytics', {
          p_reel_id: reelId,
        });

      if (error) throw error;

      const result = analytics || {
        reel_id: reelId,
        views_count: 0,
        engagement_rate: 0,
        completion_rate: 0,
        top_hashtags: [],
        peak_engagement_time: new Date().toISOString(),
        average_watch_time: 0,
      };

      // Cache the result in Redis
      if (REDIS_CONFIG.enabled) {
        await ReelsCache.setReelAnalytics(reelId, result);
      }

      const responseTime = Date.now() - startTime;
      performanceOptimizer.trackCacheHit(false, responseTime);

      return result;
    } catch (error) {
      console.error(`❌ Error fetching reel analytics for ${reelId}:`, error);
      throw error;
    }
  },
};

// Custom Hooks
export const useReelsFeed = (
  options?: Omit<UseQueryOptions<any, Error>, 'queryKey' | 'queryFn'>
) => {
  return useInfiniteQuery({
    queryKey: queryKeys.reels.lists(),
    queryFn: reelsQueryFunctions.getReelsFeed,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
};

export const useReel = (
  reelId: string,
  options?: Omit<UseQueryOptions<Reel, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: queryKeys.reels.detail(reelId),
    queryFn: () => reelsQueryFunctions.getReel(reelId),
    enabled: !!reelId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
};

export const useUserReels = (
  userId: string,
  page: number = 1,
  limit: number = 12,
  options?: Omit<UseQueryOptions<Reel[], Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: queryKeys.reels.user(userId),
    queryFn: () => reelsQueryFunctions.getUserReels(userId, page, limit),
    enabled: !!userId,
    staleTime: 3 * 60 * 1000, // 3 minutes
    cacheTime: 8 * 60 * 1000, // 8 minutes
    ...options,
  });
};

export const useTrendingReels = (
  limit: number = 20,
  options?: Omit<UseQueryOptions<Reel[], Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: queryKeys.reels.explore(),
    queryFn: () => reelsQueryFunctions.getTrendingReels(limit),
    staleTime: 10 * 60 * 1000, // 10 minutes
    cacheTime: 15 * 60 * 1000, // 15 minutes
    ...options,
  });
};

export const useReelAnalytics = (
  reelId: string,
  options?: Omit<UseQueryOptions<ReelAnalytics, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: queryKeys.reels.analytics(reelId),
    queryFn: () => reelsQueryFunctions.getReelAnalytics(reelId),
    enabled: !!reelId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 15 * 60 * 1000, // 15 minutes
    ...options,
  });
};

// Mutation Hooks
export const useCreateReel = (
  options?: UseMutationOptions<any, Error, CreateReelData>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: reelsQueryFunctions.createReel,
    onSuccess: (data) => {
      // Invalidate and refetch reels feed
      queryClient.invalidateQueries({ queryKey: queryKeys.reels.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.reels.user(data.user_id) });

      // Invalidate Redis cache
      if (REDIS_CONFIG.enabled) {
        ReelsCache.invalidateReelsCache(data.user_id);
      }
    },
    ...options,
  });
};

export const useToggleReelLike = (
  options?: UseMutationOptions<any, Error, { reelId: string; optimisticUpdate?: boolean }>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ reelId }) => reelsQueryFunctions.toggleReelLike(reelId),
    onMutate: async ({ reelId, optimisticUpdate = true }) => {
      if (!optimisticUpdate) return;

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.reels.detail(reelId) });

      // Snapshot previous value
      const previousReel = queryClient.getQueryData<Reel>(queryKeys.reels.detail(reelId));

      // Optimistically update
      if (previousReel) {
        const newLikesCount = previousReel.is_liked
          ? previousReel.likes_count - 1
          : previousReel.likes_count + 1;

        queryClient.setQueryData<Reel>(queryKeys.reels.detail(reelId), {
          ...previousReel,
          is_liked: !previousReel.is_liked,
          likes_count: newLikesCount,
        });

        // Update cache optimistically
        if (REDIS_CONFIG.enabled) {
          ReelsCache.updateReelEngagement(reelId, {
            is_liked: !previousReel.is_liked,
            likes_count: newLikesCount,
          });
        }
      }

      return { previousReel };
    },
    onError: (err, { reelId }, context) => {
      // Revert optimistic update on error
      if (context?.previousReel) {
        queryClient.setQueryData(queryKeys.reels.detail(reelId), context.previousReel);
      }
    },
    onSettled: (data, error, { reelId }) => {
      // Always refetch after mutation
      queryClient.invalidateQueries({ queryKey: queryKeys.reels.detail(reelId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.reels.lists() });
    },
    ...options,
  });
};

export const useToggleReelBookmark = (
  options?: UseMutationOptions<any, Error, { reelId: string; optimisticUpdate?: boolean }>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ reelId }) => reelsQueryFunctions.toggleReelBookmark(reelId),
    onMutate: async ({ reelId, optimisticUpdate = true }) => {
      if (!optimisticUpdate) return;

      await queryClient.cancelQueries({ queryKey: queryKeys.reels.detail(reelId) });

      const previousReel = queryClient.getQueryData<Reel>(queryKeys.reels.detail(reelId));

      if (previousReel) {
        const newBookmarksCount = previousReel.is_bookmarked
          ? previousReel.bookmarks_count - 1
          : previousReel.bookmarks_count + 1;

        queryClient.setQueryData<Reel>(queryKeys.reels.detail(reelId), {
          ...previousReel,
          is_bookmarked: !previousReel.is_bookmarked,
          bookmarks_count: newBookmarksCount,
        });

        // Update cache optimistically
        if (REDIS_CONFIG.enabled) {
          ReelsCache.updateReelEngagement(reelId, {
            is_bookmarked: !previousReel.is_bookmarked,
            bookmarks_count: newBookmarksCount,
          });
        }
      }

      return { previousReel };
    },
    onError: (err, { reelId }, context) => {
      if (context?.previousReel) {
        queryClient.setQueryData(queryKeys.reels.detail(reelId), context.previousReel);
      }
    },
    onSettled: (data, error, { reelId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reels.detail(reelId) });
    },
    ...options,
  });
};

export const useTrackReelView = (
  options?: UseMutationOptions<any, Error, { reelId: string; watchTime?: number }>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ reelId, watchTime }) => reelsQueryFunctions.trackReelView(reelId, watchTime),
    onSuccess: (data, { reelId }) => {
      // Update view count in cache
      const previousReel = queryClient.getQueryData<Reel>(queryKeys.reels.detail(reelId));

      if (previousReel) {
        queryClient.setQueryData<Reel>(queryKeys.reels.detail(reelId), {
          ...previousReel,
          views_count: previousReel.views_count + 1,
          is_viewed: true,
        });

        // Update cache
        if (REDIS_CONFIG.enabled) {
          ReelsCache.updateReelEngagement(reelId, {
            views_count: previousReel.views_count + 1,
            is_viewed: true,
          });
        }
      }

      // Track interaction in Redis
      if (REDIS_CONFIG.enabled) {
        ReelsCache.trackReelInteraction({
          reel_id: reelId,
          user_id: '', // Will be set in the function
          interaction_type: 'view',
          timestamp: new Date().toISOString(),
          metadata: { watch_time: data.watchTime },
        });
      }
    },
    ...options,
  });
};

export const useDeleteReel = (
  options?: UseMutationOptions<any, Error, string>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: reelsQueryFunctions.deleteReel,
    onSuccess: (data, reelId) => {
      // Remove from all relevant queries
      queryClient.invalidateQueries({ queryKey: queryKeys.reels.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.reels.explore() });
      queryClient.removeQueries({ queryKey: queryKeys.reels.detail(reelId) });

      // Invalidate Redis cache
      if (REDIS_CONFIG.enabled) {
        ReelsCache.invalidateReelsCache(undefined, reelId);
      }
    },
    ...options,
  });
};

// Prefetch helpers
export const prefetchReelsFeed = async () => {
  const queryClient = useQueryClient();

  return queryClient.prefetchInfiniteQuery({
    queryKey: queryKeys.reels.lists(),
    queryFn: reelsQueryFunctions.getReelsFeed,
  });
};

export const prefetchUserReels = async (userId: string) => {
  const queryClient = useQueryClient();

  return queryClient.prefetchQuery({
    queryKey: queryKeys.reels.user(userId),
    queryFn: () => reelsQueryFunctions.getUserReels(userId),
  });
};

export const prefetchTrendingReels = async () => {
  const queryClient = useQueryClient();

  return queryClient.prefetchQuery({
    queryKey: queryKeys.reels.explore(),
    queryFn: () => reelsQueryFunctions.getTrendingReels(),
  });
};

// Cache invalidation helpers
export const invalidateReelsCache = async (userId?: string, reelId?: string) => {
  const queryClient = useQueryClient();

  // Invalidate TanStack Query cache
  if (reelId) {
    queryClient.invalidateQueries({ queryKey: queryKeys.reels.detail(reelId) });
  }

  if (userId) {
    queryClient.invalidateQueries({ queryKey: queryKeys.reels.user(userId) });
  }

  queryClient.invalidateQueries({ queryKey: queryKeys.reels.lists() });
  queryClient.invalidateQueries({ queryKey: queryKeys.reels.explore() });

  // Invalidate Redis cache
  if (REDIS_CONFIG.enabled) {
    await ReelsCache.invalidateReelsCache(userId, reelId);
  }
};

export default {
  useReelsFeed,
  useReel,
  useUserReels,
  useTrendingReels,
  useReelAnalytics,
  useCreateReel,
  useToggleReelLike,
  useToggleReelBookmark,
  useTrackReelView,
  useDeleteReel,
  prefetchReelsFeed,
  prefetchUserReels,
  prefetchTrendingReels,
  invalidateReelsCache,
};
