/**
 * Egress Monitoring and Optimization System
 * Tracks and reduces Supabase bandwidth usage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

interface EgressMetric {
  endpoint: string;
  method: string;
  responseSize: number;
  timestamp: number;
  cached: boolean;
  contentType?: string;
}

interface EgressSummary {
  totalEgress: number;
  cachedEgress: number;
  uncachedEgress: number;
  topEndpoints: Array<{ endpoint: string; egress: number; percentage: number }>;
  recommendations: string[];
}

class EgressMonitor {
  private static instance: EgressMonitor;
  private metrics: EgressMetric[] = [];
  private readonly STORAGE_KEY = 'egress_metrics';
  private readonly MAX_METRICS = 1000;

  static getInstance(): EgressMonitor {
    if (!EgressMonitor.instance) {
      EgressMonitor.instance = new EgressMonitor();
    }
    return EgressMonitor.instance;
  }

  /**
   * Track egress for a request
   */
  async trackEgress(
    endpoint: string,
    method: string,
    responseSize: number,
    cached: boolean = false,
    contentType?: string
  ): Promise<void> {
    const metric: EgressMetric = {
      endpoint,
      method,
      responseSize,
      timestamp: Date.now(),
      cached,
      contentType,
    };

    this.metrics.push(metric);

    // Keep only recent metrics
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS);
    }

    // Persist metrics
    await this.saveMetrics();

    // Log high egress requests
    if (responseSize > 1024 * 1024) { // > 1MB
      console.warn(`🚨 High egress request: ${endpoint} - ${(responseSize / 1024 / 1024).toFixed(2)}MB`);
    }
  }

  /**
   * Get egress summary for the last 24 hours
   */
  getEgressSummary(hours: number = 24): EgressSummary {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    const recentMetrics = this.metrics.filter(m => m.timestamp > cutoff);

    const totalEgress = recentMetrics.reduce((sum, m) => sum + m.responseSize, 0);
    const cachedEgress = recentMetrics
      .filter(m => m.cached)
      .reduce((sum, m) => sum + m.responseSize, 0);
    const uncachedEgress = totalEgress - cachedEgress;

    // Group by endpoint
    const endpointEgress = new Map<string, number>();
    recentMetrics.forEach(metric => {
      const current = endpointEgress.get(metric.endpoint) || 0;
      endpointEgress.set(metric.endpoint, current + metric.responseSize);
    });

    // Top endpoints
    const topEndpoints = Array.from(endpointEgress.entries())
      .map(([endpoint, egress]) => ({
        endpoint,
        egress,
        percentage: (egress / totalEgress) * 100,
      }))
      .sort((a, b) => b.egress - a.egress)
      .slice(0, 10);

    const recommendations = this.generateRecommendations(recentMetrics, topEndpoints);

    return {
      totalEgress,
      cachedEgress,
      uncachedEgress,
      topEndpoints,
      recommendations,
    };
  }

  /**
   * Generate optimization recommendations
   */
  private generateRecommendations(
    metrics: EgressMetric[],
    topEndpoints: Array<{ endpoint: string; egress: number; percentage: number }>
  ): string[] {
    const recommendations: string[] = [];

    // Check cache hit rate
    const cacheHitRate = metrics.filter(m => m.cached).length / metrics.length;
    if (cacheHitRate < 0.3) {
      recommendations.push('Low cache hit rate detected. Consider implementing more aggressive caching.');
    }

    // Check for large image transfers
    const imageMetrics = metrics.filter(m => m.contentType?.startsWith('image/'));
    const avgImageSize = imageMetrics.reduce((sum, m) => sum + m.responseSize, 0) / imageMetrics.length;
    if (avgImageSize > 500 * 1024) { // > 500KB
      recommendations.push('Large image sizes detected. Consider implementing thumbnail generation.');
    }

    // Check for high-frequency endpoints
    const endpointCounts = new Map<string, number>();
    metrics.forEach(m => {
      endpointCounts.set(m.endpoint, (endpointCounts.get(m.endpoint) || 0) + 1);
    });

    const highFrequencyEndpoints = Array.from(endpointCounts.entries())
      .filter(([_, count]) => count > 50)
      .map(([endpoint]) => endpoint);

    if (highFrequencyEndpoints.length > 0) {
      recommendations.push(`High-frequency endpoints detected: ${highFrequencyEndpoints.join(', ')}. Consider batching or pagination.`);
    }

    // Check for video content
    const videoMetrics = metrics.filter(m => m.contentType?.startsWith('video/'));
    if (videoMetrics.length > 0) {
      const totalVideoEgress = videoMetrics.reduce((sum, m) => sum + m.responseSize, 0);
      const videoPercentage = (totalVideoEgress / metrics.reduce((sum, m) => sum + m.responseSize, 0)) * 100;
      if (videoPercentage > 50) {
        recommendations.push('Video content represents >50% of egress. Consider video compression or streaming optimization.');
      }
    }

    return recommendations;
  }

  /**
   * Get formatted egress report
   */
  getFormattedReport(hours: number = 24): string {
    const summary = this.getEgressSummary(hours);
    
    const formatBytes = (bytes: number): string => {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    let report = `📊 Egress Report (Last ${hours}h)\n`;
    report += `Total Egress: ${formatBytes(summary.totalEgress)}\n`;
    report += `Cached: ${formatBytes(summary.cachedEgress)} (${((summary.cachedEgress / summary.totalEgress) * 100).toFixed(1)}%)\n`;
    report += `Uncached: ${formatBytes(summary.uncachedEgress)} (${((summary.uncachedEgress / summary.totalEgress) * 100).toFixed(1)}%)\n\n`;

    report += `🔥 Top Endpoints:\n`;
    summary.topEndpoints.slice(0, 5).forEach((endpoint, index) => {
      report += `${index + 1}. ${endpoint.endpoint}: ${formatBytes(endpoint.egress)} (${endpoint.percentage.toFixed(1)}%)\n`;
    });

    if (summary.recommendations.length > 0) {
      report += `\n💡 Recommendations:\n`;
      summary.recommendations.forEach((rec, index) => {
        report += `${index + 1}. ${rec}\n`;
      });
    }

    return report;
  }

  /**
   * Save metrics to storage
   */
  private async saveMetrics(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.metrics));
    } catch (error) {
      console.error('Error saving egress metrics:', error);
    }
  }

  /**
   * Load metrics from storage
   */
  async loadMetrics(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.metrics = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading egress metrics:', error);
    }
  }

  /**
   * Clear all metrics
   */
  async clearMetrics(): Promise<void> {
    this.metrics = [];
    await AsyncStorage.removeItem(this.STORAGE_KEY);
  }
}

// Export singleton instance
export const egressMonitor = EgressMonitor.getInstance();

// Convenience function to track Supabase egress
export const trackSupabaseEgress = (
  endpoint: string,
  responseSize: number,
  cached: boolean = false,
  contentType?: string
) => {
  egressMonitor.trackEgress(endpoint, 'POST', responseSize, cached, contentType);
};

export default egressMonitor;
