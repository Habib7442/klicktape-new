/**
 * TanStack Query Key Factory for Klicktape
 * Provides type-safe, hierarchical query keys that align with Redis cache structure
 */

export const queryKeys = {
  // Stories queries - aligned with Redis cache keys
  stories: {
    all: ['stories'] as const,
    feeds: () => [...queryKeys.stories.all, 'feeds'] as const,
    feed: (limit: number = 50) => [...queryKeys.stories.feeds(), { limit }] as const,
    users: () => [...queryKeys.stories.all, 'users'] as const,
    user: (userId: string) => [...queryKeys.stories.users(), userId] as const,
    userStories: (userId: string) => [...queryKeys.stories.user(userId), 'stories'] as const,
    views: () => [...queryKeys.stories.all, 'views'] as const,
    storyViews: (storyId: string) => [...queryKeys.stories.views(), storyId] as const,
    analytics: () => [...queryKeys.stories.all, 'analytics'] as const,
    storyAnalytics: (storyId: string) => [...queryKeys.stories.analytics(), storyId] as const,
    active: () => [...queryKeys.stories.all, 'active'] as const,
  },

  // Posts queries
  posts: {
    all: ['posts'] as const,
    lists: () => [...queryKeys.posts.all, 'list'] as const,
    list: (filters: Record<string, any>) => [...queryKeys.posts.lists(), { filters }] as const,
    details: () => [...queryKeys.posts.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.posts.details(), id] as const,
    user: (userId: string) => [...queryKeys.posts.all, 'user', userId] as const,
    explore: () => [...queryKeys.posts.all, 'explore'] as const,
    bookmarks: (userId: string) => [...queryKeys.posts.all, 'bookmarks', userId] as const,
  },

  // Reels/Tapes queries - aligned with Redis cache keys
  reels: {
    all: ['reels'] as const,
    lists: () => [...queryKeys.reels.all, 'lists'] as const,
    list: (filters: Record<string, any>) => [...queryKeys.reels.lists(), { filters }] as const,
    feeds: () => [...queryKeys.reels.all, 'feeds'] as const,
    feed: (page: number = 1, limit: number = 10) => [...queryKeys.reels.feeds(), { page, limit }] as const,
    details: () => [...queryKeys.reels.all, 'details'] as const,
    detail: (id: string) => [...queryKeys.reels.details(), id] as const,
    users: () => [...queryKeys.reels.all, 'users'] as const,
    user: (userId: string) => [...queryKeys.reels.users(), userId] as const,
    userReels: (userId: string, page?: number, limit?: number) => [...queryKeys.reels.user(userId), 'reels', { page, limit }] as const,
    explore: () => [...queryKeys.reels.all, 'explore'] as const,
    trending: (limit?: number) => [...queryKeys.reels.explore(), 'trending', { limit }] as const,
    analytics: () => [...queryKeys.reels.all, 'analytics'] as const,
    reelAnalytics: (reelId: string) => [...queryKeys.reels.analytics(), reelId] as const,
    likes: () => [...queryKeys.reels.all, 'likes'] as const,
    reelLikes: (reelId: string) => [...queryKeys.reels.likes(), reelId] as const,
    bookmarks: () => [...queryKeys.reels.all, 'bookmarks'] as const,
    reelBookmarks: (reelId: string) => [...queryKeys.reels.bookmarks(), reelId] as const,
    views: () => [...queryKeys.reels.all, 'views'] as const,
    reelViews: (reelId: string) => [...queryKeys.reels.views(), reelId] as const,
    interactions: () => [...queryKeys.reels.all, 'interactions'] as const,
    reelInteractions: (reelId: string) => [...queryKeys.reels.interactions(), reelId] as const,
  },

  // User/Profile queries
  users: {
    all: ['users'] as const,
    lists: () => [...queryKeys.users.all, 'list'] as const,
    list: (filters: Record<string, any>) => [...queryKeys.users.lists(), { filters }] as const,
    details: () => [...queryKeys.users.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.users.details(), id] as const,
    current: () => [...queryKeys.users.all, 'current'] as const,
    profile: (userId: string) => [...queryKeys.users.detail(userId), 'profile'] as const,
    followers: (userId: string) => [...queryKeys.users.detail(userId), 'followers'] as const,
    following: (userId: string) => [...queryKeys.users.detail(userId), 'following'] as const,
  },

  // Comments queries
  comments: {
    all: ['comments'] as const,
    post: (postId: string) => [...queryKeys.comments.all, 'post', postId] as const,
    reel: (reelId: string) => [...queryKeys.comments.all, 'reel', reelId] as const,
  },

  // Notifications queries
  notifications: {
    all: ['notifications'] as const,
    user: (userId: string) => [...queryKeys.notifications.all, 'user', userId] as const,
    unread: (userId: string) => [...queryKeys.notifications.user(userId), 'unread'] as const,
  },

  // Messages/Chat queries
  messages: {
    all: ['messages'] as const,
    conversations: () => [...queryKeys.messages.all, 'conversations'] as const,
    conversation: (userId: string) => [...queryKeys.messages.all, 'conversation', userId] as const,
    messages: (userId: string) => [...queryKeys.messages.all, 'messages', userId] as const,
    userProfile: (userId: string) => [...queryKeys.messages.all, 'userProfile', userId] as const,
    unread: (userId: string) => [...queryKeys.messages.all, 'unread', userId] as const,
  },

  // Search queries
  search: {
    all: ['search'] as const,
    users: (query: string) => [...queryKeys.search.all, 'users', query] as const,
    posts: (query: string) => [...queryKeys.search.all, 'posts', query] as const,
    reels: (query: string) => [...queryKeys.search.all, 'reels', query] as const,
    explore: () => [...queryKeys.search.all, 'explore'] as const,
  },

  // Likes and interactions
  interactions: {
    all: ['interactions'] as const,
    likes: () => [...queryKeys.interactions.all, 'likes'] as const,
    postLikes: (postId: string) => [...queryKeys.interactions.likes(), 'post', postId] as const,
    reelLikes: (reelId: string) => [...queryKeys.interactions.likes(), 'reel', reelId] as const,
    userLikes: (userId: string) => [...queryKeys.interactions.likes(), 'user', userId] as const,
    bookmarks: () => [...queryKeys.interactions.all, 'bookmarks'] as const,
    userBookmarks: (userId: string) => [...queryKeys.interactions.bookmarks(), 'user', userId] as const,
  },
} as const;

// Type helpers for query keys
export type QueryKey = typeof queryKeys;
export type StoriesQueryKey = typeof queryKeys.stories;
export type PostsQueryKey = typeof queryKeys.posts;
export type ReelsQueryKey = typeof queryKeys.reels;
export type UsersQueryKey = typeof queryKeys.users;

// Helper function to create cache tags for invalidation
export const createCacheTags = {
  stories: {
    feed: (limit?: number) => limit ? `stories:feed:${limit}` : 'stories:feed',
    user: (userId: string) => `stories:user:${userId}`,
    views: (storyId: string) => `stories:views:${storyId}`,
    analytics: (storyId: string) => `stories:analytics:${storyId}`,
    active: () => 'stories:active',
  },
  posts: {
    user: (userId: string) => `posts:user:${userId}`,
    detail: (postId: string) => `posts:detail:${postId}`,
    explore: () => 'posts:explore',
  },
  reels: {
    feed: (page?: number, limit?: number) => page && limit ? `reels:feed:${page}:${limit}` : 'reels:feed',
    user: (userId: string) => `reels:user:${userId}`,
    detail: (reelId: string) => `reels:detail:${reelId}`,
    trending: (limit?: number) => limit ? `reels:trending:${limit}` : 'reels:trending',
    explore: (category?: string) => category ? `reels:explore:${category}` : 'reels:explore',
    analytics: (reelId: string) => `reels:analytics:${reelId}`,
    likes: (reelId: string) => `reels:likes:${reelId}`,
    bookmarks: (reelId: string) => `reels:bookmarks:${reelId}`,
    views: (reelId: string) => `reels:views:${reelId}`,
    interactions: (reelId: string) => `reels:interactions:${reelId}`,
  },
  users: {
    profile: (userId: string) => `users:profile:${userId}`,
    current: () => 'users:current',
  },
};

// Redis cache key mapping to TanStack Query keys
export const redisCacheKeyMapping = {
  'stories:feed': queryKeys.stories.feeds(),
  'stories:user:': queryKeys.stories.users(),
  'stories:views:': queryKeys.stories.views(),
  'stories:analytics:': queryKeys.stories.analytics(),
  'stories:active': queryKeys.stories.active(),
  'reels:feed': queryKeys.reels.feeds(),
  'reels:user:': queryKeys.reels.users(),
  'reels:detail:': queryKeys.reels.details(),
  'reels:trending': queryKeys.reels.explore(),
  'reels:explore': queryKeys.reels.explore(),
  'reels:analytics:': queryKeys.reels.analytics(),
  'reels:likes:': queryKeys.reels.likes(),
  'reels:bookmarks:': queryKeys.reels.bookmarks(),
  'reels:views:': queryKeys.reels.views(),
  'reels:interactions:': queryKeys.reels.interactions(),
} as const;

// Helper to convert Redis cache key to TanStack Query key
export const redisKeyToQueryKey = (redisKey: string): readonly unknown[] => {
  if (redisKey.startsWith('stories:feed:')) {
    const limit = parseInt(redisKey.split(':')[2]) || 50;
    return queryKeys.stories.feed(limit);
  }
  
  if (redisKey.startsWith('stories:user:')) {
    const userId = redisKey.split(':')[2];
    return queryKeys.stories.userStories(userId);
  }
  
  if (redisKey.startsWith('stories:views:')) {
    const storyId = redisKey.split(':')[2];
    return queryKeys.stories.storyViews(storyId);
  }
  
  if (redisKey.startsWith('stories:analytics:')) {
    const storyId = redisKey.split(':')[2];
    return queryKeys.stories.storyAnalytics(storyId);
  }
  
  if (redisKey === 'stories:active') {
    return queryKeys.stories.active();
  }

  // Reels mappings
  if (redisKey.startsWith('reels:feed:')) {
    const parts = redisKey.split(':');
    const page = parseInt(parts[2]) || 1;
    const limit = parseInt(parts[3]) || 10;
    return queryKeys.reels.feed(page, limit);
  }

  if (redisKey.startsWith('reels:user:')) {
    const userId = redisKey.split(':')[2];
    return queryKeys.reels.userReels(userId);
  }

  if (redisKey.startsWith('reels:detail:')) {
    const reelId = redisKey.split(':')[2];
    return queryKeys.reels.detail(reelId);
  }

  if (redisKey.startsWith('reels:trending:')) {
    const limit = parseInt(redisKey.split(':')[2]) || 20;
    return queryKeys.reels.trending(limit);
  }

  if (redisKey.startsWith('reels:explore:')) {
    return queryKeys.reels.explore();
  }

  if (redisKey.startsWith('reels:analytics:')) {
    const reelId = redisKey.split(':')[2];
    return queryKeys.reels.reelAnalytics(reelId);
  }

  if (redisKey.startsWith('reels:likes:')) {
    const reelId = redisKey.split(':')[2];
    return queryKeys.reels.reelLikes(reelId);
  }

  if (redisKey.startsWith('reels:bookmarks:')) {
    const reelId = redisKey.split(':')[2];
    return queryKeys.reels.reelBookmarks(reelId);
  }

  if (redisKey.startsWith('reels:views:')) {
    const reelId = redisKey.split(':')[2];
    return queryKeys.reels.reelViews(reelId);
  }

  if (redisKey.startsWith('reels:interactions:')) {
    const reelId = redisKey.split(':')[2];
    return queryKeys.reels.reelInteractions(reelId);
  }

  // Default fallback
  return [redisKey];
};

// Helper to convert TanStack Query key to Redis cache key
export const queryKeyToRedisKey = (queryKey: readonly unknown[]): string => {
  const [domain, ...rest] = queryKey;
  
  if (domain === 'stories') {
    if (rest[0] === 'feeds' && rest[1] && typeof rest[1] === 'object') {
      const { limit } = rest[1] as { limit: number };
      return `stories:feed:${limit}`;
    }
    
    if (rest[0] === 'users' && rest[1] && rest[2] === 'stories') {
      return `stories:user:${rest[1]}`;
    }
    
    if (rest[0] === 'views' && rest[1]) {
      return `stories:views:${rest[1]}`;
    }
    
    if (rest[0] === 'analytics' && rest[1]) {
      return `stories:analytics:${rest[1]}`;
    }
    
    if (rest[0] === 'active') {
      return 'stories:active';
    }
  }

  if (domain === 'reels') {
    if (rest[0] === 'feeds' && rest[1] && typeof rest[1] === 'object') {
      const { page, limit } = rest[1] as { page: number; limit: number };
      return `reels:feed:${page}:${limit}`;
    }

    if (rest[0] === 'users' && rest[1] && rest[2] === 'reels') {
      return `reels:user:${rest[1]}`;
    }

    if (rest[0] === 'details' && rest[1]) {
      return `reels:detail:${rest[1]}`;
    }

    if (rest[0] === 'explore' && rest[1] === 'trending') {
      const limit = rest[2] && typeof rest[2] === 'object' ? (rest[2] as { limit: number }).limit : 20;
      return `reels:trending:${limit}`;
    }

    if (rest[0] === 'explore') {
      return 'reels:explore';
    }

    if (rest[0] === 'analytics' && rest[1]) {
      return `reels:analytics:${rest[1]}`;
    }

    if (rest[0] === 'likes' && rest[1]) {
      return `reels:likes:${rest[1]}`;
    }

    if (rest[0] === 'bookmarks' && rest[1]) {
      return `reels:bookmarks:${rest[1]}`;
    }

    if (rest[0] === 'views' && rest[1]) {
      return `reels:views:${rest[1]}`;
    }

    if (rest[0] === 'interactions' && rest[1]) {
      return `reels:interactions:${rest[1]}`;
    }
  }

  // Default fallback - create a key from the query key structure
  return queryKey.join(':').replace(/[^a-zA-Z0-9:_-]/g, '_');
};

export default queryKeys;
