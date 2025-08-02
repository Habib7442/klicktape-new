/**
 * TanStack Query Hooks for Stories with Redis Integration
 * Maintains all Redis caching benefits while using TanStack Query
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { supabase } from '../../supabase';
import StoriesCache from '../../redis/storiesCache';
import { queryKeys } from '../queryKeys';
import { invalidateCache, setQueryData } from '../queryClient';
import { REDIS_CONFIG } from '../../config/redis';
import { performanceOptimizer } from '../../utils/performanceOptimizer';

// Types
interface Story {
  id: string;
  user_id: string;
  image_url: string;
  caption?: string;
  created_at: string;
  expires_at: string;
  viewed_by: string[];
  story_order: number;
  view_count: number;
  duration: number;
  story_type: string;
  is_active: boolean;
  user: {
    username: string;
    avatar: string;
  };
  is_viewed?: boolean;
}

interface StoriesFeed {
  user_id: string;
  username: string;
  avatar_url: string;
  story_count: number;
  latest_story_time: string;
  has_unviewed: boolean;
  stories: Story[];
}

interface CreateStoryData {
  imageUrl: string;
  userId: string;
  caption?: string;
  duration?: number;
  storyType?: string;
}

interface StoryViewData {
  storyId: string;
  viewDuration?: number;
}

// Query Functions with Redis Integration
const storiesQueryFunctions = {
  /**
   * Get stories feed with Redis caching fallback
   */
  getStoriesFeed: async (limit: number = 50): Promise<StoriesFeed[]> => {
    const startTime = Date.now();
    
    try {
      // Try Redis cache first if enabled
      if (REDIS_CONFIG.enabled) {
        const cachedFeed = await StoriesCache.getStoriesFeed(limit);
        
        if (cachedFeed.length > 0) {
          const responseTime = Date.now() - startTime;
          performanceOptimizer.trackCacheHit(true, responseTime);
          console.log('📱 Stories feed served from Redis cache');
          return cachedFeed;
        }
      }
      
      // Fallback to database
      console.log('🔄 Fetching stories feed from database');
      const { data, error } = await supabase.rpc('get_stories_feed_enhanced', {
        limit_param: limit,
      });

      if (error) {
        throw new Error(`Failed to fetch stories feed: ${error.message}`);
      }

      const result = data || [];
      
      // Cache the result in Redis
      if (REDIS_CONFIG.enabled && result.length > 0) {
        await StoriesCache.setStoriesFeed(result, limit);
      }
      
      const responseTime = Date.now() - startTime;
      performanceOptimizer.trackCacheHit(false, responseTime);
      
      return result;
    } catch (error) {
      console.error('Error fetching stories feed:', error);
      throw error;
    }
  },

  /**
   * Get user stories with Redis caching
   */
  getUserStories: async (userId: string): Promise<Story[]> => {
    const startTime = Date.now();
    
    try {
      // Try Redis cache first if enabled
      if (REDIS_CONFIG.enabled) {
        const cachedStories = await StoriesCache.getUserStories(userId);
        
        if (cachedStories.length > 0) {
          const responseTime = Date.now() - startTime;
          performanceOptimizer.trackCacheHit(true, responseTime);
          console.log(`📱 User stories for ${userId} served from Redis cache`);
          return cachedStories;
        }
      }
      
      // Fallback to database
      console.log(`🔄 Fetching user stories for ${userId} from database`);
      const { data, error } = await supabase.rpc('get_user_stories_enhanced', {
        user_id_param: userId,
      });

      if (error) {
        throw new Error(`Failed to fetch user stories: ${error.message}`);
      }

      const result = data || [];
      
      // Cache the result in Redis
      if (REDIS_CONFIG.enabled && result.length > 0) {
        await StoriesCache.setUserStories(userId, result);
      }
      
      const responseTime = Date.now() - startTime;
      performanceOptimizer.trackCacheHit(false, responseTime);
      
      return result;
    } catch (error) {
      console.error('Error fetching user stories:', error);
      throw error;
    }
  },

  /**
   * Get story analytics
   */
  getStoryAnalytics: async (storyId: string) => {
    try {
      // Try Redis cache first
      if (REDIS_CONFIG.enabled) {
        const cachedAnalytics = await StoriesCache.getStoryAnalytics(storyId);
        if (cachedAnalytics) {
          return cachedAnalytics;
        }
      }

      // Fallback to database calculation
      const { data: views, error } = await supabase
        .from('story_views')
        .select('view_duration, completed')
        .eq('story_id', storyId);

      if (error) {
        throw new Error(`Failed to fetch story analytics: ${error.message}`);
      }

      const analytics = {
        total_views: views?.length || 0,
        unique_viewers: views?.length || 0,
        completion_rate: views?.length ? views.filter(v => v.completed).length / views.length : 0,
        avg_view_duration: views?.length ? views.reduce((sum, v) => sum + v.view_duration, 0) / views.length : 0,
        last_updated: new Date().toISOString(),
      };

      return analytics;
    } catch (error) {
      console.error('Error fetching story analytics:', error);
      return null;
    }
  },
};

// Mutation Functions
const storiesMutationFunctions = {
  /**
   * Create a new story
   */
  createStory: async (data: CreateStoryData) => {
    try {
      const { imageUrl, userId, caption, duration = 5000, storyType = 'image' } = data;
      
      const { data: result, error } = await supabase.rpc('create_story_enhanced', {
        image_url_param: imageUrl,
        caption_param: caption,
        duration_param: duration,
        story_type_param: storyType,
      });

      if (error) {
        throw new Error(`Failed to create story: ${error.message}`);
      }

      return { id: result, success: true };
    } catch (error) {
      console.error('Error creating story:', error);
      throw error;
    }
  },

  /**
   * Mark story as viewed
   */
  markStoryViewed: async (data: StoryViewData) => {
    try {
      const { storyId, viewDuration = 0 } = data;
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return false;
      }

      const { data: result, error } = await supabase.rpc('mark_story_viewed', {
        story_id_param: storyId,
        view_duration_param: viewDuration,
      });

      if (error) {
        console.error('Error marking story as viewed:', error);
        return false;
      }

      // Track in Redis cache for analytics
      if (REDIS_CONFIG.enabled) {
        await StoriesCache.trackStoryView(storyId, user.id, viewDuration);
      }

      return result || false;
    } catch (error) {
      console.error('Error marking story as viewed:', error);
      return false;
    }
  },

  /**
   * Delete a story (complete deletion with storage cleanup)
   */
  deleteStory: async (storyId: string) => {
    try {
      // Import storiesAPI for proper deletion with storage cleanup
      const { storiesAPI } = await import('../../storiesApi');

      // Use the enhanced deleteStory function that handles storage cleanup
      const result = await storiesAPI.deleteStory(storyId);

      return result;
    } catch (error) {
      console.error('Error deleting story:', error);
      throw error; // Re-throw to let the mutation handle the error
    }
  },
};

// Custom Hooks
export const useStoriesFeed = (
  limit: number = 50,
  options?: Omit<UseQueryOptions<StoriesFeed[], Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: queryKeys.stories.feed(limit),
    queryFn: () => storiesQueryFunctions.getStoriesFeed(limit),
    ...options,
  });
};

export const useUserStories = (
  userId: string,
  options?: Omit<UseQueryOptions<Story[], Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: queryKeys.stories.userStories(userId),
    queryFn: () => storiesQueryFunctions.getUserStories(userId),
    enabled: !!userId,
    ...options,
  });
};

export const useStoryAnalytics = (
  storyId: string,
  options?: Omit<UseQueryOptions<any, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: queryKeys.stories.storyAnalytics(storyId),
    queryFn: () => storiesQueryFunctions.getStoryAnalytics(storyId),
    enabled: !!storyId,
    ...options,
  });
};

export const useCreateStory = (
  options?: UseMutationOptions<any, Error, CreateStoryData>
) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: storiesMutationFunctions.createStory,
    onSuccess: async (data, variables) => {
      // Invalidate and refetch stories queries
      await invalidateCache(queryKeys.stories.feeds());
      await invalidateCache(queryKeys.stories.userStories(variables.userId));
      
      // Invalidate Redis cache
      if (REDIS_CONFIG.enabled) {
        await StoriesCache.invalidateStoriesCache(variables.userId);
      }
      
      console.log('✅ Story created successfully, cache invalidated');
    },
    ...options,
  });
};

export const useMarkStoryViewed = (
  options?: UseMutationOptions<boolean, Error, StoryViewData>
) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: storiesMutationFunctions.markStoryViewed,
    onSuccess: async (data, variables) => {
      // Update story analytics cache
      await queryClient.invalidateQueries({
        queryKey: queryKeys.stories.storyAnalytics(variables.storyId),
      });
      
      console.log('✅ Story view tracked successfully');
    },
    ...options,
  });
};

export const useDeleteStory = (
  options?: UseMutationOptions<boolean, Error, string>
) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: storiesMutationFunctions.deleteStory,
    onSuccess: async (data, storyId) => {
      // Get current user to invalidate their stories
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Invalidate stories queries
        await invalidateCache(queryKeys.stories.feeds());
        await invalidateCache(queryKeys.stories.userStories(user.id));
        
        // Invalidate Redis cache
        if (REDIS_CONFIG.enabled) {
          await StoriesCache.invalidateStoriesCache(user.id);
        }
      }
      
      console.log('✅ Story deleted successfully, cache invalidated');
    },
    ...options,
  });
};

// Prefetch helpers
export const prefetchStoriesFeed = async (limit: number = 50) => {
  const queryClient = useQueryClient();
  
  return queryClient.prefetchQuery({
    queryKey: queryKeys.stories.feed(limit),
    queryFn: () => storiesQueryFunctions.getStoriesFeed(limit),
  });
};

export const prefetchUserStories = async (userId: string) => {
  const queryClient = useQueryClient();
  
  return queryClient.prefetchQuery({
    queryKey: queryKeys.stories.userStories(userId),
    queryFn: () => storiesQueryFunctions.getUserStories(userId),
  });
};

export default {
  useStoriesFeed,
  useUserStories,
  useStoryAnalytics,
  useCreateStory,
  useMarkStoryViewed,
  useDeleteStory,
  prefetchStoriesFeed,
  prefetchUserStories,
};
