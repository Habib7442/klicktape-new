/**
 * Performance Monitor for API Request Optimization
 * Tracks and reports on API usage to help reduce costs
 */

interface RequestMetric {
  endpoint: string;
  method: string;
  timestamp: number;
  responseTime: number;
  cached: boolean;
  error?: string;
}

interface PerformanceStats {
  totalRequests: number;
  cachedRequests: number;
  averageResponseTime: number;
  errorRate: number;
  requestsByEndpoint: Record<string, number>;
  cacheHitRate: number;
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: RequestMetric[] = [];
  private readonly MAX_METRICS = 1000; // Keep last 1000 requests
  private readonly REPORT_INTERVAL = 5 * 60 * 1000; // 5 minutes

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  constructor() {
    // Set up periodic reporting
    setInterval(() => {
      this.generateReport();
    }, this.REPORT_INTERVAL);
  }

  /**
   * Track an API request
   */
  trackRequest(
    endpoint: string,
    method: string,
    responseTime: number,
    cached: boolean = false,
    error?: string
  ): void {
    const metric: RequestMetric = {
      endpoint,
      method,
      timestamp: Date.now(),
      responseTime,
      cached,
      error,
    };

    this.metrics.push(metric);

    // Keep only recent metrics
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS);
    }

    // Log high-impact requests
    if (responseTime > 2000) {
      console.warn(`🐌 Slow request: ${method} ${endpoint} (${responseTime}ms)`);
    }

    if (!cached && this.shouldBeCached(endpoint)) {
      console.warn(`💸 Uncached request: ${method} ${endpoint}`);
    }
  }

  /**
   * Generate performance statistics
   */
  getStats(timeWindow: number = 60 * 60 * 1000): PerformanceStats {
    const cutoff = Date.now() - timeWindow;
    const recentMetrics = this.metrics.filter(m => m.timestamp > cutoff);

    if (recentMetrics.length === 0) {
      return {
        totalRequests: 0,
        cachedRequests: 0,
        averageResponseTime: 0,
        errorRate: 0,
        requestsByEndpoint: {},
        cacheHitRate: 0,
      };
    }

    const totalRequests = recentMetrics.length;
    const cachedRequests = recentMetrics.filter(m => m.cached).length;
    const errorRequests = recentMetrics.filter(m => m.error).length;
    const totalResponseTime = recentMetrics.reduce((sum, m) => sum + m.responseTime, 0);

    const requestsByEndpoint: Record<string, number> = {};
    recentMetrics.forEach(m => {
      requestsByEndpoint[m.endpoint] = (requestsByEndpoint[m.endpoint] || 0) + 1;
    });

    return {
      totalRequests,
      cachedRequests,
      averageResponseTime: totalResponseTime / totalRequests,
      errorRate: errorRequests / totalRequests,
      requestsByEndpoint,
      cacheHitRate: cachedRequests / totalRequests,
    };
  }

  /**
   * Generate and log performance report
   */
  generateReport(): void {
    const stats = this.getStats();
    
    if (stats.totalRequests === 0) return;

    console.log('📊 Performance Report (Last Hour):');
    console.log(`   Total Requests: ${stats.totalRequests}`);
    console.log(`   Cache Hit Rate: ${(stats.cacheHitRate * 100).toFixed(1)}%`);
    console.log(`   Average Response Time: ${stats.averageResponseTime.toFixed(0)}ms`);
    console.log(`   Error Rate: ${(stats.errorRate * 100).toFixed(1)}%`);

    // Show top endpoints by request count
    const topEndpoints = Object.entries(stats.requestsByEndpoint)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);

    console.log('   Top Endpoints:');
    topEndpoints.forEach(([endpoint, count]) => {
      console.log(`     ${endpoint}: ${count} requests`);
    });

    // Recommendations
    if (stats.cacheHitRate < 0.5) {
      console.warn('💡 Recommendation: Cache hit rate is low. Consider increasing cache times.');
    }

    if (stats.averageResponseTime > 1000) {
      console.warn('💡 Recommendation: Average response time is high. Consider optimizing queries.');
    }
  }

  /**
   * Check if an endpoint should typically be cached
   */
  private shouldBeCached(endpoint: string): boolean {
    const cacheableEndpoints = [
      'profiles',
      'posts',
      'reels',
      'stories',
      'notifications',
      'comments',
    ];

    return cacheableEndpoints.some(cacheable => endpoint.includes(cacheable));
  }

  /**
   * Get optimization suggestions
   */
  getOptimizationSuggestions(): string[] {
    const stats = this.getStats();
    const suggestions: string[] = [];

    if (stats.cacheHitRate < 0.3) {
      suggestions.push('Increase cache times for frequently accessed data');
    }

    if (stats.averageResponseTime > 1500) {
      suggestions.push('Optimize database queries and add indexes');
    }

    if (stats.errorRate > 0.05) {
      suggestions.push('Investigate and fix API errors');
    }

    // Check for endpoints with high request counts
    const highVolumeEndpoints = Object.entries(stats.requestsByEndpoint)
      .filter(([, count]) => count > stats.totalRequests * 0.2);

    if (highVolumeEndpoints.length > 0) {
      suggestions.push(`Consider batching requests for: ${highVolumeEndpoints.map(([endpoint]) => endpoint).join(', ')}`);
    }

    return suggestions;
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();

// Convenience function to track Supabase requests
export const trackSupabaseRequest = (
  table: string,
  operation: string,
  startTime: number,
  cached: boolean = false,
  error?: string
) => {
  const responseTime = Date.now() - startTime;
  const endpoint = `${table}:${operation}`;
  
  performanceMonitor.trackRequest(
    endpoint,
    'POST', // Most Supabase operations are POST
    responseTime,
    cached,
    error
  );
};
