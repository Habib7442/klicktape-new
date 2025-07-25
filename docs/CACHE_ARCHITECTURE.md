# Cache Architecture Documentation

## Overview
Klicktape uses a two-tier caching system to optimize performance and reduce costs:

1. **Local In-Memory Cache** (cacheManager)
2. **Upstash Redis Cloud Cache** (StoriesCache)

## Local In-Memory Cache (cacheManager)

### Purpose
- Provides instant access to frequently used data within the app session
- Reduces redundant API calls during the same app session
- Does NOT affect Upstash Redis usage or billing

### Location
- `lib/utils/cacheManager.ts`
- Stores data in device memory only
- Data is lost when app is closed/restarted

### Usage
```typescript
// Set cache
cacheManager.set('stories', storiesData, 300000); // 5 minutes TTL

// Get cache
const cachedStories = cacheManager.get('stories');

// Check cache status
const status = cacheManager.getStatus('stories');
```

### Impact on Costs
- **Zero impact** on Upstash Redis billing
- **Zero impact** on Supabase API costs during cache hits
- Only uses device memory (free)

## Upstash Redis Cloud Cache (StoriesCache)

### Purpose
- Reduces Supabase database queries across app sessions
- Provides persistent caching between app restarts
- Optimizes costs by reducing Supabase API calls

### Location
- `lib/redis/storiesCache.ts`
- Stores data in Upstash Redis cloud
- Data persists between app sessions

### Usage
```typescript
// Get from Redis (with fallback to database)
const stories = await StoriesCache.getStoriesFeed(50, fallbackFunction);

// Set in Redis
await StoriesCache.setStoriesFeed(storiesData, 50);

// Track analytics
await StoriesCache.trackStoryView(storyId, userId, duration);
```

### Impact on Costs
- **Reduces Supabase costs** by serving cached data instead of database queries
- **Uses Upstash Redis** requests (but typically saves more than it costs)
- Configured with appropriate TTL to balance performance vs cost

## Cache Management in Development

### Access via Settings
- Available in Settings > Developer Tools > Cache Management (Development only)
- Provides cache statistics, entry inspection, and manual cache clearing
- Only visible when `__DEV__` is true

### Features
- View cache statistics (hit rate, memory usage, entry count)
- Inspect individual cache entries with timestamps and TTL
- Clear entire cache or specific entries
- Real-time cache status monitoring

## Best Practices

### When to Use Local Cache
- Frequently accessed data within the same session
- Data that doesn't change often (user profiles, settings)
- Temporary data that doesn't need persistence

### When to Use Redis Cache
- Data shared across app sessions
- Expensive database queries
- Analytics and tracking data
- Data that benefits from persistence

### Cache Invalidation
- Local cache: Automatic TTL expiration
- Redis cache: Manual invalidation on data updates
- Both: Clear on user logout or significant data changes

## Performance Benefits

### Local Cache
- **Instant access** (0ms latency)
- **Reduced API calls** during session
- **Better user experience** with immediate responses

### Redis Cache
- **Reduced database load** on Supabase
- **Lower API costs** over time
- **Faster app startup** with pre-cached data
- **Analytics persistence** for better insights

## Monitoring

### Development Tools
- Cache debugger shows real-time statistics
- Console logs for cache hits/misses
- Performance metrics tracking

### Production Monitoring
- Redis usage tracking via Upstash dashboard
- Supabase API call reduction metrics
- App performance improvements

## Configuration

### Cache TTL Settings
```typescript
const CACHE_TTL = {
  STORIES_FEED: 300,      // 5 minutes
  USER_STORIES: 600,      // 10 minutes
  STORY_ANALYTICS: 1800,  // 30 minutes
  STORY_VIEWS: 3600,      // 1 hour
};
```

### Environment Variables
```
EXPO_PUBLIC_UPSTASH_REDIS_REST_URL=your_redis_url
EXPO_PUBLIC_UPSTASH_REDIS_REST_TOKEN=your_redis_token
```

## Troubleshooting

### Cache Not Working
1. Check environment variables are set
2. Verify network connectivity
3. Check cache TTL hasn't expired
4. Review console logs for errors

### High Redis Usage
1. Review TTL settings (may be too long)
2. Check for unnecessary cache writes
3. Monitor cache hit rates
4. Consider cache size limits

### Performance Issues
1. Check cache hit rates in debugger
2. Verify appropriate TTL settings
3. Monitor memory usage
4. Review cache invalidation strategy
