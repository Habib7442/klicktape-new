/**
 * Pagination Optimizer for Reducing Egress
 * Implements smart pagination to minimize data transfer
 */

import { supabase } from '../supabase';
import { egressMonitor } from './egressMonitor';

interface PaginationConfig {
  pageSize: number;
  maxPages?: number;
  preloadNext?: boolean;
  cachePages?: boolean;
}

interface PaginatedResult<T> {
  data: T[];
  hasMore: boolean;
  nextPage: number;
  totalCount?: number;
}

export class PaginationOptimizer {
  private static pageCache = new Map<string, any>();
  private static readonly DEFAULT_PAGE_SIZE = 10; // Reduced from typical 20-50

  /**
   * Optimized paginated query with minimal data transfer
   */
  static async paginatedQuery<T>(
    table: string,
    selectFields: string,
    filters: Record<string, any> = {},
    orderBy: { column: string; ascending?: boolean } = { column: 'created_at', ascending: false },
    config: PaginationConfig = { pageSize: this.DEFAULT_PAGE_SIZE }
  ): Promise<PaginatedResult<T>> {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(table, selectFields, filters, orderBy, config);

    try {
      // Check cache first
      if (config.cachePages && this.pageCache.has(cacheKey)) {
        const cached = this.pageCache.get(cacheKey);
        await egressMonitor.trackEgress(
          `${table}:paginated`,
          JSON.stringify(cached).length,
          true
        );
        return cached;
      }

      // Build query
      let query = supabase
        .from(table)
        .select(selectFields, { count: 'exact' })
        .order(orderBy.column, { ascending: orderBy.ascending || false })
        .limit(config.pageSize);

      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });

      const { data, error, count } = await query;

      if (error) {
        throw error;
      }

      const result: PaginatedResult<T> = {
        data: data || [],
        hasMore: (data?.length || 0) === config.pageSize,
        nextPage: 1,
        totalCount: count || 0,
      };

      // Cache result if enabled
      if (config.cachePages) {
        this.pageCache.set(cacheKey, result);
        // Auto-expire cache after 5 minutes
        setTimeout(() => this.pageCache.delete(cacheKey), 5 * 60 * 1000);
      }

      // Track egress
      const responseSize = JSON.stringify(result).length;
      await egressMonitor.trackEgress(
        `${table}:paginated`,
        responseSize,
        false
      );

      console.log(`📄 Paginated query: ${table} - ${data?.length || 0} items (${responseSize} bytes)`);

      return result;
    } catch (error) {
      console.error('Pagination error:', error);
      throw error;
    }
  }

  /**
   * Load next page with range-based pagination
   */
  static async loadNextPage<T>(
    table: string,
    selectFields: string,
    lastItemId: string,
    filters: Record<string, any> = {},
    orderBy: { column: string; ascending?: boolean } = { column: 'created_at', ascending: false },
    pageSize: number = this.DEFAULT_PAGE_SIZE
  ): Promise<T[]> {
    try {
      let query = supabase
        .from(table)
        .select(selectFields)
        .order(orderBy.column, { ascending: orderBy.ascending || false })
        .limit(pageSize);

      // Use range-based pagination (more efficient than offset)
      if (orderBy.ascending) {
        query = query.gt(orderBy.column, lastItemId);
      } else {
        query = query.lt(orderBy.column, lastItemId);
      }

      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      // Track egress
      const responseSize = JSON.stringify(data).length;
      await egressMonitor.trackEgress(
        `${table}:next_page`,
        responseSize,
        false
      );

      return data || [];
    } catch (error) {
      console.error('Next page error:', error);
      throw error;
    }
  }

  /**
   * Infinite scroll with optimized loading
   */
  static async infiniteScroll<T>(
    table: string,
    selectFields: string,
    currentData: T[],
    filters: Record<string, any> = {},
    orderBy: { column: string; ascending?: boolean } = { column: 'created_at', ascending: false },
    pageSize: number = this.DEFAULT_PAGE_SIZE
  ): Promise<{ data: T[]; hasMore: boolean }> {
    if (currentData.length === 0) {
      // First load
      const result = await this.paginatedQuery<T>(
        table,
        selectFields,
        filters,
        orderBy,
        { pageSize, cachePages: true }
      );
      return {
        data: result.data,
        hasMore: result.hasMore,
      };
    }

    // Load next page
    const lastItem = currentData[currentData.length - 1] as any;
    const lastItemValue = lastItem[orderBy.column];
    
    const nextPageData = await this.loadNextPage<T>(
      table,
      selectFields,
      lastItemValue,
      filters,
      orderBy,
      pageSize
    );

    return {
      data: [...currentData, ...nextPageData],
      hasMore: nextPageData.length === pageSize,
    };
  }

  /**
   * Generate cache key for pagination
   */
  private static generateCacheKey(
    table: string,
    selectFields: string,
    filters: Record<string, any>,
    orderBy: { column: string; ascending?: boolean },
    config: PaginationConfig
  ): string {
    const filterStr = JSON.stringify(filters);
    const orderStr = `${orderBy.column}_${orderBy.ascending ? 'asc' : 'desc'}`;
    return `${table}_${selectFields}_${filterStr}_${orderStr}_${config.pageSize}`;
  }

  /**
   * Clear pagination cache
   */
  static clearCache(): void {
    this.pageCache.clear();
  }

  /**
   * Get cache statistics
   */
  static getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.pageCache.size,
      keys: Array.from(this.pageCache.keys()),
    };
  }
}

/**
 * Hook for optimized pagination
 */
export const useOptimizedPagination = <T>(
  table: string,
  selectFields: string,
  filters: Record<string, any> = {},
  orderBy: { column: string; ascending?: boolean } = { column: 'created_at', ascending: false },
  pageSize: number = 10
) => {
  const loadPage = async (page: number = 0): Promise<PaginatedResult<T>> => {
    return PaginationOptimizer.paginatedQuery<T>(
      table,
      selectFields,
      filters,
      orderBy,
      { pageSize, cachePages: true }
    );
  };

  const loadMore = async (currentData: T[]): Promise<{ data: T[]; hasMore: boolean }> => {
    return PaginationOptimizer.infiniteScroll<T>(
      table,
      selectFields,
      currentData,
      filters,
      orderBy,
      pageSize
    );
  };

  return { loadPage, loadMore };
};

export default PaginationOptimizer;
