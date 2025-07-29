/**
 * Request Deduplication Utility
 * Prevents duplicate API calls by caching in-flight requests
 */

interface PendingRequest {
  promise: Promise<any>;
  timestamp: number;
}

class RequestDeduplicator {
  private static instance: RequestDeduplicator;
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private readonly REQUEST_TIMEOUT = 30000; // 30 seconds

  static getInstance(): RequestDeduplicator {
    if (!RequestDeduplicator.instance) {
      RequestDeduplicator.instance = new RequestDeduplicator();
    }
    return RequestDeduplicator.instance;
  }

  /**
   * Execute a request with deduplication
   * If the same request is already in flight, return the existing promise
   */
  async deduplicate<T>(
    key: string,
    requestFn: () => Promise<T>,
    options: {
      timeout?: number;
      forceRefresh?: boolean;
    } = {}
  ): Promise<T> {
    const { timeout = this.REQUEST_TIMEOUT, forceRefresh = false } = options;

    // Clean up expired requests
    this.cleanupExpiredRequests();

    // If force refresh, remove existing request
    if (forceRefresh) {
      this.pendingRequests.delete(key);
    }

    // Check if request is already in flight
    const existingRequest = this.pendingRequests.get(key);
    if (existingRequest) {
      console.log(`🔄 Deduplicating request: ${key}`);
      return existingRequest.promise;
    }

    // Create new request
    console.log(`🚀 New request: ${key}`);
    const promise = requestFn()
      .finally(() => {
        // Remove from pending requests when completed
        this.pendingRequests.delete(key);
      });

    // Store the pending request
    this.pendingRequests.set(key, {
      promise,
      timestamp: Date.now(),
    });

    // Set up timeout
    setTimeout(() => {
      this.pendingRequests.delete(key);
    }, timeout);

    return promise;
  }

  /**
   * Clean up expired requests
   */
  private cleanupExpiredRequests(): void {
    const now = Date.now();
    for (const [key, request] of this.pendingRequests.entries()) {
      if (now - request.timestamp > this.REQUEST_TIMEOUT) {
        this.pendingRequests.delete(key);
      }
    }
  }

  /**
   * Clear all pending requests
   */
  clear(): void {
    this.pendingRequests.clear();
  }

  /**
   * Get number of pending requests
   */
  getPendingCount(): number {
    return this.pendingRequests.size;
  }

  /**
   * Generate a cache key for common request patterns
   */
  static generateKey(
    table: string,
    operation: string,
    params: Record<string, any> = {}
  ): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|');
    
    return `${table}:${operation}:${sortedParams}`;
  }
}

// Export singleton instance
export const requestDeduplicator = RequestDeduplicator.getInstance();

// Convenience functions for common patterns
export const deduplicateUserProfile = (userId: string, requestFn: () => Promise<any>) =>
  requestDeduplicator.deduplicate(
    RequestDeduplicator.generateKey('profiles', 'get', { userId }),
    requestFn
  );

export const deduplicatePostsFeed = (limit: number, offset: number, requestFn: () => Promise<any>) =>
  requestDeduplicator.deduplicate(
    RequestDeduplicator.generateKey('posts', 'feed', { limit, offset }),
    requestFn
  );

export const deduplicateReelsFeed = (limit: number, offset: number, requestFn: () => Promise<any>) =>
  requestDeduplicator.deduplicate(
    RequestDeduplicator.generateKey('reels', 'feed', { limit, offset }),
    requestFn
  );

export const deduplicateStoriesFeed = (limit: number, requestFn: () => Promise<any>) =>
  requestDeduplicator.deduplicate(
    RequestDeduplicator.generateKey('stories', 'feed', { limit }),
    requestFn
  );

export const deduplicateNotifications = (userId: string, requestFn: () => Promise<any>) =>
  requestDeduplicator.deduplicate(
    RequestDeduplicator.generateKey('notifications', 'get', { userId }),
    requestFn
  );

export const deduplicateMessages = (userId: string, requestFn: () => Promise<any>) =>
  requestDeduplicator.deduplicate(
    RequestDeduplicator.generateKey('messages', 'unread', { userId }),
    requestFn
  );
