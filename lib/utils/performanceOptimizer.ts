/**
 * Performance Optimization Utilities for Klicktape Stories
 * Reduces Supabase costs and improves app performance
 */

import { supabase } from '../supabase';
import StoriesCache from '../redis/storiesCache';
import { REDIS_CONFIG } from '../config/redis';

interface PerformanceMetrics {
  cacheHitRate: number;
  avgResponseTime: number;
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  supabaseQueries: number;
  lastUpdated: string;
}

class PerformanceOptimizer {
  private metrics: PerformanceMetrics = {
    cacheHitRate: 0,
    avgResponseTime: 0,
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    supabaseQueries: 0,
    lastUpdated: new Date().toISOString(),
  };

  /**
   * Track cache hit/miss for performance monitoring
   */
  trackCacheHit(hit: boolean, responseTime: number) {
    this.metrics.totalRequests++;
    this.metrics.avgResponseTime = 
      (this.metrics.avgResponseTime * (this.metrics.totalRequests - 1) + responseTime) / 
      this.metrics.totalRequests;

    if (hit) {
      this.metrics.cacheHits++;
    } else {
      this.metrics.cacheMisses++;
      this.metrics.supabaseQueries++;
    }

    this.metrics.cacheHitRate = 
      this.metrics.totalRequests > 0 ? 
      (this.metrics.cacheHits / this.metrics.totalRequests) * 100 : 0;

    this.metrics.lastUpdated = new Date().toISOString();
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset performance metrics
   */
  resetMetrics() {
    this.metrics = {
      cacheHitRate: 0,
      avgResponseTime: 0,
      totalRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      supabaseQueries: 0,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Optimized batch story fetching to reduce database calls
   */
  async batchFetchStories(userIds: string[]): Promise<any[]> {
    const startTime = Date.now();
    
    try {
      // Check cache first for all users
      const cachedResults = await Promise.all(
        userIds.map(async (userId) => {
          const cached = await StoriesCache.getUserStories(userId);
          return { userId, stories: cached, fromCache: cached.length > 0 };
        })
      );

      // Identify users whose stories are not in cache
      const uncachedUserIds = cachedResults
        .filter(result => !result.fromCache)
        .map(result => result.userId);

      let freshStories: any[] = [];

      // Batch fetch uncached stories from database
      if (uncachedUserIds.length > 0) {
        const { data, error } = await supabase
          .from('stories')
          .select(`
            id,
            user_id,
            image_url,
            caption,
            created_at,
            expires_at,
            story_order,
            view_count,
            duration,
            story_type,
            is_active,
            profiles!stories_user_id_fkey (username, avatar_url)
          `)
          .in('user_id', uncachedUserIds)
          .eq('is_active', true)
          .gt('expires_at', new Date().toISOString())
          .order('story_order', { ascending: true });

        if (error) {
          throw error;
        }

        freshStories = data || [];

        // Cache the fresh stories by user
        const storiesByUser = freshStories.reduce((acc, story) => {
          if (!acc[story.user_id]) {
            acc[story.user_id] = [];
          }
          acc[story.user_id].push(story);
          return acc;
        }, {} as Record<string, any[]>);

        // Cache each user's stories
        await Promise.all(
          Object.entries(storiesByUser).map(([userId, stories]) =>
            StoriesCache.setUserStories(userId, stories)
          )
        );
      }

      // Combine cached and fresh results
      const allResults = cachedResults.map(result => {
        if (result.fromCache) {
          return result.stories;
        } else {
          return freshStories.filter(story => story.user_id === result.userId);
        }
      }).flat();

      const responseTime = Date.now() - startTime;
      const cacheHitRate = cachedResults.filter(r => r.fromCache).length / cachedResults.length;
      
      this.trackCacheHit(cacheHitRate > 0.5, responseTime);

      console.log(`📊 Batch fetch completed: ${allResults.length} stories, ${responseTime}ms, ${(cacheHitRate * 100).toFixed(1)}% cache hit rate`);

      return allResults;
    } catch (error) {
      console.error('❌ Error in batch fetch stories:', error);
      throw error;
    }
  }

  /**
   * Preload critical stories data for better UX
   */
  async preloadCriticalData(userId: string): Promise<void> {
    try {
      console.log('🚀 Preloading critical stories data...');

      // Preload user's own stories
      const userStoriesPromise = StoriesCache.getUserStories(userId, async () => {
        const { data } = await supabase.rpc('get_user_stories_enhanced', {
          user_id_param: userId,
        });
        return data || [];
      });

      // Preload stories feed
      const feedPromise = StoriesCache.getStoriesFeed(20, async () => {
        const { data } = await supabase.rpc('get_stories_feed_enhanced', {
          limit_param: 20,
        });
        return data || [];
      });

      // Preload active stories list
      const activeStoriesPromise = StoriesCache.getActiveStories();

      await Promise.all([userStoriesPromise, feedPromise, activeStoriesPromise]);

      console.log('✅ Critical data preloaded successfully');
    } catch (error) {
      console.error('❌ Error preloading critical data:', error);
    }
  }

  /**
   * Cleanup expired cache entries to save memory
   */
  async cleanupExpiredCache(): Promise<void> {
    try {
      if (!REDIS_CONFIG.enabled) {
        return;
      }

      console.log('🧹 Starting cache cleanup...');

      // Get cache statistics before cleanup
      const statsBefore = await StoriesCache.getCacheStats();

      // This would typically be handled by Redis TTL, but we can add manual cleanup
      // for specific patterns if needed
      
      console.log(`🧹 Cache cleanup completed. Keys before: ${statsBefore.total_keys}`);
    } catch (error) {
      console.error('❌ Error during cache cleanup:', error);
    }
  }

  /**
   * Optimize database queries by using prepared statements and indexes
   */
  async optimizeQueries(): Promise<void> {
    try {
      console.log('⚡ Optimizing database queries...');

      // Ensure indexes exist (these should be in the schema)
      const indexQueries = [
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stories_user_active_created ON stories(user_id, is_active, created_at DESC)',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stories_expires_active ON stories(expires_at, is_active) WHERE is_active = TRUE',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_story_views_story_viewer ON story_views(story_id, viewer_id)',
      ];

      // Note: In production, these indexes should be created via migrations
      // This is just for demonstration
      console.log('📋 Database optimization queries prepared (should be run via migrations)');
      
    } catch (error) {
      console.error('❌ Error optimizing queries:', error);
    }
  }

  /**
   * Monitor and report performance statistics
   */
  async generatePerformanceReport(): Promise<{
    performance: PerformanceMetrics;
    cacheStats: any;
    recommendations: string[];
  }> {
    try {
      const cacheStats = await StoriesCache.getCacheStats();
      const recommendations: string[] = [];

      // Generate recommendations based on metrics
      if (this.metrics.cacheHitRate < 70) {
        recommendations.push('Consider increasing cache TTL values to improve hit rate');
      }

      if (this.metrics.avgResponseTime > 1000) {
        recommendations.push('Response times are high - consider optimizing queries or increasing cache usage');
      }

      if (this.metrics.supabaseQueries > this.metrics.totalRequests * 0.5) {
        recommendations.push('High database query rate - implement more aggressive caching');
      }

      if (cacheStats.total_keys > 10000) {
        recommendations.push('High cache key count - consider implementing cache cleanup strategies');
      }

      return {
        performance: this.getMetrics(),
        cacheStats,
        recommendations,
      };
    } catch (error) {
      console.error('❌ Error generating performance report:', error);
      return {
        performance: this.getMetrics(),
        cacheStats: { error: 'Failed to fetch cache stats' },
        recommendations: ['Error generating recommendations'],
      };
    }
  }

  /**
   * Cost optimization by reducing unnecessary Supabase calls
   */
  async optimizeCosts(): Promise<{
    estimatedSavings: number;
    optimizations: string[];
  }> {
    const optimizations: string[] = [];
    let estimatedSavings = 0;

    // Calculate potential savings based on cache hit rate
    const potentialCacheHits = this.metrics.cacheMisses * 0.8; // Assume 80% could be cached
    const costPerQuery = 0.001; // Estimated cost per Supabase query
    estimatedSavings = potentialCacheHits * costPerQuery;

    if (this.metrics.cacheHitRate < 80) {
      optimizations.push('Implement more aggressive caching strategies');
    }

    if (this.metrics.supabaseQueries > 1000) {
      optimizations.push('Batch database queries to reduce total calls');
    }

    optimizations.push('Use Redis caching for frequently accessed data');
    optimizations.push('Implement query result pagination');
    optimizations.push('Use database functions for complex operations');

    return {
      estimatedSavings,
      optimizations,
    };
  }
}

// Export singleton instance
export const performanceOptimizer = new PerformanceOptimizer();

export default performanceOptimizer;
