/**
 * Performance Monitor Component
 * Displays real-time performance metrics and optimization status
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { optimizeRealtimePerformance } from '../lib/utils/realtimeOptimizer';
import { supabase } from '../lib/supabase';

interface PerformanceMetrics {
  realtimeStats: {
    activeSubscriptions: number;
    pendingBatches: Array<{ channel: string; batchSize: number }>;
    activeTimers: number;
  };
  databaseStats: {
    slowQueries: number;
    avgQueryTime: number;
    cacheHitRate: number;
  };
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
}

const PerformanceMonitor: React.FC<{ visible: boolean; onClose: () => void }> = ({
  visible,
  onClose
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);

  useEffect(() => {
    if (visible) {
      fetchMetrics();
      const interval = setInterval(fetchMetrics, 5000); // Update every 5 seconds
      return () => clearInterval(interval);
    }
  }, [visible]);

  const fetchMetrics = async () => {
    try {
      // Get realtime stats
      const realtimeStats = optimizeRealtimePerformance.getPerformanceStats();

      // Get database stats (mock for now - would need actual implementation)
      const databaseStats = {
        slowQueries: 0,
        avgQueryTime: 0,
        cacheHitRate: 95
      };

      // Get memory usage (mock for now)
      const memoryUsage = {
        used: 45,
        total: 100,
        percentage: 45
      };

      setMetrics({
        realtimeStats,
        databaseStats,
        memoryUsage
      });
    } catch (error) {
      console.error('Error fetching performance metrics:', error);
    }
  };

  const runOptimization = async () => {
    setIsOptimizing(true);
    try {
      // Run database optimization
      await supabase.rpc('run_periodic_maintenance');
      
      // Clean up realtime subscriptions
      optimizeRealtimePerformance.cleanup();
      
      // Refresh metrics
      await fetchMetrics();
      
      console.log('✅ Performance optimization completed');
    } catch (error) {
      console.error('Error running optimization:', error);
    } finally {
      setIsOptimizing(false);
    }
  };

  if (!visible || !metrics) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Performance Monitor</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>×</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* Realtime Stats */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Realtime Performance</Text>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Active Subscriptions:</Text>
              <Text style={[styles.metricValue, 
                metrics.realtimeStats.activeSubscriptions > 10 ? styles.warning : styles.good
              ]}>
                {metrics.realtimeStats.activeSubscriptions}
              </Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Pending Batches:</Text>
              <Text style={styles.metricValue}>
                {metrics.realtimeStats.pendingBatches.length}
              </Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Active Timers:</Text>
              <Text style={styles.metricValue}>
                {metrics.realtimeStats.activeTimers}
              </Text>
            </View>
          </View>

          {/* Database Stats */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Database Performance</Text>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Cache Hit Rate:</Text>
              <Text style={[styles.metricValue, 
                metrics.databaseStats.cacheHitRate > 90 ? styles.good : styles.warning
              ]}>
                {metrics.databaseStats.cacheHitRate}%
              </Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Slow Queries:</Text>
              <Text style={[styles.metricValue,
                metrics.databaseStats.slowQueries > 5 ? styles.error : styles.good
              ]}>
                {metrics.databaseStats.slowQueries}
              </Text>
            </View>
          </View>

          {/* Memory Usage */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Memory Usage</Text>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${metrics.memoryUsage.percentage}%` },
                  metrics.memoryUsage.percentage > 80 ? styles.errorBg : styles.goodBg
                ]} 
              />
            </View>
            <Text style={styles.progressText}>
              {metrics.memoryUsage.used}MB / {metrics.memoryUsage.total}MB 
              ({metrics.memoryUsage.percentage}%)
            </Text>
          </View>

          {/* Pending Batches Detail */}
          {metrics.realtimeStats.pendingBatches.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Pending Batches</Text>
              {metrics.realtimeStats.pendingBatches.map((batch, index) => (
                <View key={index} style={styles.batchItem}>
                  <Text style={styles.batchChannel}>{batch.channel}</Text>
                  <Text style={styles.batchSize}>{batch.batchSize} items</Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity 
            onPress={runOptimization} 
            style={[styles.optimizeButton, isOptimizing && styles.optimizeButtonDisabled]}
            disabled={isOptimizing}
          >
            <Text style={styles.optimizeButtonText}>
              {isOptimizing ? 'Optimizing...' : 'Run Optimization'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    zIndex: 1000,
  },
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    margin: 20,
    borderRadius: 10,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    fontSize: 24,
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  metric: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  metricLabel: {
    fontSize: 14,
    color: '#ccc',
  },
  metricValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  good: {
    color: '#4CAF50',
  },
  warning: {
    color: '#FF9800',
  },
  error: {
    color: '#F44336',
  },
  progressBar: {
    height: 20,
    backgroundColor: '#333',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 5,
  },
  progressFill: {
    height: '100%',
    borderRadius: 10,
  },
  goodBg: {
    backgroundColor: '#4CAF50',
  },
  errorBg: {
    backgroundColor: '#F44336',
  },
  progressText: {
    fontSize: 12,
    color: '#ccc',
    textAlign: 'center',
  },
  batchItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  batchChannel: {
    fontSize: 12,
    color: '#ccc',
    flex: 1,
  },
  batchSize: {
    fontSize: 12,
    color: '#FF9800',
    fontWeight: 'bold',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  optimizeButton: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  optimizeButtonDisabled: {
    backgroundColor: '#555',
  },
  optimizeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default PerformanceMonitor;
