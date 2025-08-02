/**
 * Realtime Optimization Utilities
 * Reduces the overhead from expensive realtime queries
 */

import { supabase } from '../supabase';

interface SubscriptionManager {
  subscriptions: Map<string, any>;
  cleanup: () => void;
}

class RealtimeOptimizer {
  private subscriptions = new Map<string, any>();
  private debounceTimers = new Map<string, NodeJS.Timeout>();
  private batchUpdates = new Map<string, any[]>();

  /**
   * Create an optimized subscription with debouncing and batching
   */
  createOptimizedSubscription(
    channelName: string,
    config: {
      table: string;
      filter?: string;
      event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
      debounceMs?: number;
      batchSize?: number;
    },
    callback: (payload: any) => void
  ): () => void {
    const {
      table,
      filter,
      event = '*',
      debounceMs = 100,
      batchSize = 10
    } = config;

    // Clean up existing subscription if it exists
    this.cleanupSubscription(channelName);

    const subscription = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event,
          schema: 'public',
          table,
          filter,
        },
        (payload) => {
          this.handleOptimizedUpdate(channelName, payload, callback, debounceMs, batchSize);
        }
      )
      .subscribe((status, error) => {
        if (error) {
          console.error(`Realtime subscription error for ${channelName}:`, error);
        }
        if (status === 'SUBSCRIBED') {
          console.log(`✅ Optimized realtime subscription active: ${channelName}`);
        }
      });

    this.subscriptions.set(channelName, subscription);

    // Return cleanup function
    return () => this.cleanupSubscription(channelName);
  }

  /**
   * Handle updates with debouncing and batching
   */
  private handleOptimizedUpdate(
    channelName: string,
    payload: any,
    callback: (payload: any) => void,
    debounceMs: number,
    batchSize: number
  ) {
    // Add to batch
    if (!this.batchUpdates.has(channelName)) {
      this.batchUpdates.set(channelName, []);
    }
    this.batchUpdates.get(channelName)!.push(payload);

    // Clear existing timer
    const existingTimer = this.debounceTimers.get(channelName);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Check if we should flush immediately due to batch size
    const batch = this.batchUpdates.get(channelName)!;
    if (batch.length >= batchSize) {
      this.flushBatch(channelName, callback);
      return;
    }

    // Set debounce timer
    const timer = setTimeout(() => {
      this.flushBatch(channelName, callback);
    }, debounceMs);

    this.debounceTimers.set(channelName, timer);
  }

  /**
   * Flush batched updates
   */
  private flushBatch(channelName: string, callback: (payload: any) => void) {
    const batch = this.batchUpdates.get(channelName);
    if (!batch || batch.length === 0) return;

    // Process batch
    if (batch.length === 1) {
      callback(batch[0]);
    } else {
      // For multiple updates, send the most recent one
      // or combine them based on the use case
      callback({
        ...batch[batch.length - 1],
        batchSize: batch.length,
        isBatched: true
      });
    }

    // Clear batch
    this.batchUpdates.set(channelName, []);
    
    // Clear timer
    const timer = this.debounceTimers.get(channelName);
    if (timer) {
      clearTimeout(timer);
      this.debounceTimers.delete(channelName);
    }
  }

  /**
   * Clean up a specific subscription
   */
  private cleanupSubscription(channelName: string) {
    const subscription = this.subscriptions.get(channelName);
    if (subscription) {
      supabase.removeChannel(subscription);
      this.subscriptions.delete(channelName);
    }

    const timer = this.debounceTimers.get(channelName);
    if (timer) {
      clearTimeout(timer);
      this.debounceTimers.delete(channelName);
    }

    this.batchUpdates.delete(channelName);
  }

  /**
   * Clean up all subscriptions
   */
  cleanup() {
    for (const channelName of this.subscriptions.keys()) {
      this.cleanupSubscription(channelName);
    }
  }

  /**
   * Get subscription statistics
   */
  getStats() {
    return {
      activeSubscriptions: this.subscriptions.size,
      pendingBatches: Array.from(this.batchUpdates.entries()).map(([channel, batch]) => ({
        channel,
        batchSize: batch.length
      })),
      activeTimers: this.debounceTimers.size
    };
  }
}

// Global instance
const realtimeOptimizer = new RealtimeOptimizer();

/**
 * Hook for optimized realtime subscriptions
 */
export const useOptimizedRealtime = (
  channelName: string,
  config: {
    table: string;
    filter?: string;
    event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
    debounceMs?: number;
    batchSize?: number;
  },
  callback: (payload: any) => void,
  dependencies: any[] = []
) => {
  const cleanup = () => {
    realtimeOptimizer.cleanupSubscription(channelName);
  };

  // Set up subscription
  const setupSubscription = () => {
    return realtimeOptimizer.createOptimizedSubscription(
      channelName,
      config,
      callback
    );
  };

  return { setupSubscription, cleanup };
};

/**
 * Utility to reduce realtime subscription overhead
 */
export const optimizeRealtimePerformance = {
  /**
   * Create a throttled subscription for high-frequency updates
   */
  createThrottledSubscription: (
    channelName: string,
    table: string,
    filter: string,
    callback: (payload: any) => void,
    throttleMs: number = 500
  ) => {
    return realtimeOptimizer.createOptimizedSubscription(
      channelName,
      {
        table,
        filter,
        debounceMs: throttleMs,
        batchSize: 5
      },
      callback
    );
  },

  /**
   * Create a batched subscription for bulk operations with egress optimization
   */
  createBatchedSubscription: (
    channelName: string,
    table: string,
    filter: string,
    callback: (payload: any) => void,
    batchSize: number = 20 // Increased batch size to reduce individual requests
  ) => {
    return realtimeOptimizer.createOptimizedSubscription(
      channelName,
      {
        table,
        filter,
        debounceMs: 500, // Increased debounce to reduce frequency
        batchSize
      },
      callback
    );
  },

  /**
   * Create lightweight subscription for minimal data transfer
   */
  createLightweightSubscription: (
    channelName: string,
    table: string,
    filter: string,
    callback: (payload: any) => void
  ) => {
    return realtimeOptimizer.createOptimizedSubscription(
      channelName,
      {
        table,
        filter,
        debounceMs: 1000, // High debounce for non-critical updates
        batchSize: 50
      },
      callback
    );
  },

  /**
   * Get performance statistics
   */
  getPerformanceStats: () => realtimeOptimizer.getStats(),

  /**
   * Clean up all subscriptions
   */
  cleanup: () => realtimeOptimizer.cleanup()
};

export default realtimeOptimizer;
