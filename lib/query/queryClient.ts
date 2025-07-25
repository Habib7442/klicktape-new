/**
 * TanStack Query Client Configuration for Klicktape
 * Integrates with Redis caching for optimal performance
 */

import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { REDIS_CONFIG } from '../config/redis';
import StoriesCache from '../redis/storiesCache';
import { performanceOptimizer } from '../utils/performanceOptimizer';
import { queryKeyToRedisKey, redisKeyToQueryKey } from './queryKeys';

// Cache time configurations (in milliseconds)
const CACHE_TIME = {
  STORIES_FEED: 5 * 60 * 1000,      // 5 minutes
  USER_STORIES: 10 * 60 * 1000,     // 10 minutes
  STORY_VIEWS: 60 * 60 * 1000,      // 1 hour
  STORY_ANALYTICS: 2 * 60 * 60 * 1000, // 2 hours
  POSTS: 5 * 60 * 1000,             // 5 minutes
  USER_PROFILE: 15 * 60 * 1000,     // 15 minutes
  NOTIFICATIONS: 2 * 60 * 1000,     // 2 minutes
  DEFAULT: 5 * 60 * 1000,           // 5 minutes
} as const;

// Stale time configurations (when data is considered stale)
const STALE_TIME = {
  STORIES_FEED: 2 * 60 * 1000,      // 2 minutes
  USER_STORIES: 5 * 60 * 1000,      // 5 minutes
  STORY_VIEWS: 30 * 60 * 1000,      // 30 minutes
  STORY_ANALYTICS: 60 * 60 * 1000,  // 1 hour
  POSTS: 2 * 60 * 1000,             // 2 minutes
  USER_PROFILE: 10 * 60 * 1000,     // 10 minutes
  NOTIFICATIONS: 30 * 1000,         // 30 seconds
  DEFAULT: 2 * 60 * 1000,           // 2 minutes
} as const;

// Custom query cache that integrates with Redis
const queryCache = new QueryCache({
  onError: (error, query) => {
    console.error(`Query failed for key: ${JSON.stringify(query.queryKey)}`, error);
    
    // Track performance metrics
    performanceOptimizer.trackCacheHit(false, Date.now() - (query.state.dataUpdatedAt || 0));
  },
  
  onSuccess: (data, query) => {
    const responseTime = Date.now() - (query.state.dataUpdatedAt || 0);
    
    // Track cache hit if data was served quickly (likely from cache)
    const wasCacheHit = responseTime < 100;
    performanceOptimizer.trackCacheHit(wasCacheHit, responseTime);
    
    // Sync successful queries to Redis cache if enabled
    if (REDIS_CONFIG.enabled && query.queryKey[0] === 'stories') {
      syncToRedisCache(query.queryKey, data);
    }
  },
});

// Custom mutation cache for handling mutations
const mutationCache = new MutationCache({
  onError: (error, variables, context, mutation) => {
    console.error(`Mutation failed:`, error);
  },
  
  onSuccess: (data, variables, context, mutation) => {
    console.log(`Mutation succeeded:`, mutation.options.mutationKey);
  },
});

// Helper function to sync TanStack Query data to Redis
const syncToRedisCache = async (queryKey: readonly unknown[], data: any) => {
  try {
    const redisKey = queryKeyToRedisKey(queryKey);
    
    // Only sync stories data to Redis for now
    if (redisKey.startsWith('stories:')) {
      if (redisKey.startsWith('stories:feed:')) {
        const limit = parseInt(redisKey.split(':')[2]) || 50;
        await StoriesCache.setStoriesFeed(data, limit);
      } else if (redisKey.startsWith('stories:user:')) {
        const userId = redisKey.split(':')[2];
        await StoriesCache.setUserStories(userId, data);
      }
    }
  } catch (error) {
    console.warn('Failed to sync to Redis cache:', error);
  }
};

// Helper function to get cache time based on query key
const getCacheTime = (queryKey: readonly unknown[]): number => {
  const [domain, type] = queryKey;
  
  if (domain === 'stories') {
    if (type === 'feeds') return CACHE_TIME.STORIES_FEED;
    if (type === 'users') return CACHE_TIME.USER_STORIES;
    if (type === 'views') return CACHE_TIME.STORY_VIEWS;
    if (type === 'analytics') return CACHE_TIME.STORY_ANALYTICS;
  }
  
  if (domain === 'posts') return CACHE_TIME.POSTS;
  if (domain === 'users') return CACHE_TIME.USER_PROFILE;
  if (domain === 'notifications') return CACHE_TIME.NOTIFICATIONS;
  
  return CACHE_TIME.DEFAULT;
};

// Helper function to get stale time based on query key
const getStaleTime = (queryKey: readonly unknown[]): number => {
  const [domain, type] = queryKey;
  
  if (domain === 'stories') {
    if (type === 'feeds') return STALE_TIME.STORIES_FEED;
    if (type === 'users') return STALE_TIME.USER_STORIES;
    if (type === 'views') return STALE_TIME.STORY_VIEWS;
    if (type === 'analytics') return STALE_TIME.STORY_ANALYTICS;
  }
  
  if (domain === 'posts') return STALE_TIME.POSTS;
  if (domain === 'users') return STALE_TIME.USER_PROFILE;
  if (domain === 'notifications') return STALE_TIME.NOTIFICATIONS;
  
  return STALE_TIME.DEFAULT;
};

// Create the main QueryClient instance
export const queryClient = new QueryClient({
  queryCache,
  mutationCache,
  defaultOptions: {
    queries: {
      // Dynamic cache and stale times based on query key
      cacheTime: (context) => getCacheTime(context.queryKey),
      staleTime: (context) => getStaleTime(context.queryKey),
      
      // Retry configuration
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors (client errors)
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },
      
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // Background refetch settings
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: true,
      
      // Error handling
      onError: (error) => {
        console.error('Query error:', error);
      },
    },
    
    mutations: {
      // Retry mutations once
      retry: 1,
      retryDelay: 1000,
      
      // Error handling
      onError: (error) => {
        console.error('Mutation error:', error);
      },
    },
  },
});

// Helper function to invalidate both TanStack Query and Redis cache
export const invalidateCache = async (queryKey: readonly unknown[]) => {
  try {
    // Invalidate TanStack Query cache
    await queryClient.invalidateQueries({ queryKey });
    
    // Invalidate Redis cache if it's a stories query
    if (REDIS_CONFIG.enabled && queryKey[0] === 'stories') {
      if (queryKey[1] === 'users' && queryKey[2]) {
        // Invalidate specific user's stories
        await StoriesCache.invalidateStoriesCache(queryKey[2] as string);
      } else {
        // Invalidate all stories cache
        await StoriesCache.invalidateStoriesCache();
      }
    }
    
    console.log(`✅ Cache invalidated for key: ${JSON.stringify(queryKey)}`);
  } catch (error) {
    console.error('❌ Failed to invalidate cache:', error);
  }
};

// Helper function to prefetch data with Redis integration
export const prefetchWithRedis = async (
  queryKey: readonly unknown[],
  queryFn: () => Promise<any>
) => {
  try {
    // For stories queries, try Redis first
    if (REDIS_CONFIG.enabled && queryKey[0] === 'stories') {
      const redisKey = queryKeyToRedisKey(queryKey);
      
      if (redisKey.startsWith('stories:feed:')) {
        const limit = parseInt(redisKey.split(':')[2]) || 50;
        const cachedData = await StoriesCache.getStoriesFeed(limit);
        
        if (cachedData.length > 0) {
          // Set the data in TanStack Query cache
          queryClient.setQueryData(queryKey, cachedData);
          console.log(`📱 Prefetched from Redis: ${JSON.stringify(queryKey)}`);
          return cachedData;
        }
      } else if (redisKey.startsWith('stories:user:')) {
        const userId = redisKey.split(':')[2];
        const cachedData = await StoriesCache.getUserStories(userId);
        
        if (cachedData.length > 0) {
          queryClient.setQueryData(queryKey, cachedData);
          console.log(`📱 Prefetched from Redis: ${JSON.stringify(queryKey)}`);
          return cachedData;
        }
      }
    }
    
    // Fallback to regular prefetch
    return await queryClient.prefetchQuery({
      queryKey,
      queryFn,
      cacheTime: getCacheTime(queryKey),
      staleTime: getStaleTime(queryKey),
    });
  } catch (error) {
    console.error('❌ Failed to prefetch data:', error);
    throw error;
  }
};

// Helper function to set query data in both caches
export const setQueryData = async (
  queryKey: readonly unknown[],
  data: any
) => {
  try {
    // Set in TanStack Query cache
    queryClient.setQueryData(queryKey, data);
    
    // Sync to Redis cache if enabled and it's a stories query
    if (REDIS_CONFIG.enabled && queryKey[0] === 'stories') {
      await syncToRedisCache(queryKey, data);
    }
    
    console.log(`✅ Query data set for key: ${JSON.stringify(queryKey)}`);
  } catch (error) {
    console.error('❌ Failed to set query data:', error);
  }
};

// Performance monitoring helpers
export const getQueryClientStats = () => {
  const cache = queryClient.getQueryCache();
  const queries = cache.getAll();
  
  return {
    totalQueries: queries.length,
    activeQueries: queries.filter(q => q.getObserversCount() > 0).length,
    staleQueries: queries.filter(q => q.isStale()).length,
    invalidQueries: queries.filter(q => q.isInvalidated()).length,
    cacheSize: cache.getAll().reduce((size, query) => {
      return size + (JSON.stringify(query.state.data)?.length || 0);
    }, 0),
  };
};

// Cleanup function for memory management
export const cleanupQueryCache = () => {
  try {
    // Remove queries that haven't been used in the last hour
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    
    queryClient.getQueryCache().getAll().forEach(query => {
      if (query.state.dataUpdatedAt < oneHourAgo && query.getObserversCount() === 0) {
        queryClient.removeQueries({ queryKey: query.queryKey });
      }
    });
    
    console.log('🧹 Query cache cleanup completed');
  } catch (error) {
    console.error('❌ Failed to cleanup query cache:', error);
  }
};

export default queryClient;
