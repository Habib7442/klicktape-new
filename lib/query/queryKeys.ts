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

  // Reels/Tapes queries
  reels: {
    all: ['reels'] as const,
    lists: () => [...queryKeys.reels.all, 'list'] as const,
    list: (filters: Record<string, any>) => [...queryKeys.reels.lists(), { filters }] as const,
    details: () => [...queryKeys.reels.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.reels.details(), id] as const,
    user: (userId: string) => [...queryKeys.reels.all, 'user', userId] as const,
    explore: () => [...queryKeys.reels.all, 'explore'] as const,
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
    conversations: (userId: string) => [...queryKeys.messages.all, 'conversations', userId] as const,
    conversation: (conversationId: string) => [...queryKeys.messages.all, 'conversation', conversationId] as const,
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
  
  // Default fallback - create a key from the query key structure
  return queryKey.join(':').replace(/[^a-zA-Z0-9:_-]/g, '_');
};

export default queryKeys;
