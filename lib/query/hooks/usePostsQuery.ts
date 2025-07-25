/**
 * TanStack Query Hooks for Posts
 * Replaces direct Supabase calls with optimized query patterns
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions, useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '../../supabase';
import { queryKeys } from '../queryKeys';
import { invalidateCache } from '../queryClient';

// Types
interface Post {
  id: string;
  user_id: string;
  caption: string;
  image_urls: string[];
  created_at: string;
  likes_count: number;
  comments_count: number;
  user: {
    username: string;
    avatar_url: string;
  };
  is_liked?: boolean;
  is_bookmarked?: boolean;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user: {
    username: string;
    avatar_url: string;
  };
}

interface CreatePostData {
  caption: string;
  imageUrls: string[];
}

interface CreateCommentData {
  postId: string;
  content: string;
}

// Query Functions
const postsQueryFunctions = {
  /**
   * Get posts feed with pagination
   */
  getPostsFeed: async ({ pageParam = 0 }: { pageParam?: number }) => {
    const POSTS_PER_PAGE = 10;
    const offset = pageParam * POSTS_PER_PAGE;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: posts, error } = await supabase
      .from('posts')
      .select(`
        *,
        profiles(username, avatar_url),
        likes!likes_post_id_fkey(user_id),
        bookmarks!bookmarks_post_id_fkey(user_id),
        comments:comments!comments_post_id_fkey(id)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + POSTS_PER_PAGE - 1);

    if (error) throw error;

    return {
      posts: posts || [],
      nextCursor: posts && posts.length === POSTS_PER_PAGE ? pageParam + 1 : undefined,
    };
  },

  /**
   * Get single post with details
   */
  getPost: async (postId: string): Promise<Post> => {
    const { data: post, error } = await supabase
      .from('posts')
      .select(`
        id,
        caption,
        image_urls,
        created_at,
        likes_count,
        comments_count,
        user:profiles!posts_user_id_fkey (
          username,
          avatar_url
        )
      `)
      .eq('id', postId)
      .single();

    if (error || !post) {
      throw new Error(`Post not found: ${error?.message || 'No data'}`);
    }

    return post as Post;
  },

  /**
   * Get post comments
   */
  getPostComments: async (postId: string): Promise<Comment[]> => {
    const { data: comments, error } = await supabase
      .from('comments')
      .select(`
        id,
        content,
        created_at,
        user:profiles!fk_comments_user (
          username,
          avatar_url
        )
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return comments || [];
  },

  /**
   * Get user posts
   */
  getUserPosts: async (userId: string): Promise<Post[]> => {
    const { data: posts, error } = await supabase
      .from('posts')
      .select(`
        *,
        profiles(username, avatar_url),
        likes!likes_post_id_fkey(user_id),
        bookmarks!bookmarks_post_id_fkey(user_id)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return posts || [];
  },

  /**
   * Get explore posts
   */
  getExplorePosts: async (): Promise<Post[]> => {
    const { data: posts, error } = await supabase
      .from('posts')
      .select(`
        *,
        profiles(username, avatar_url)
      `)
      .order('likes_count', { ascending: false })
      .limit(30);

    if (error) throw error;

    return posts || [];
  },

  /**
   * Get bookmarked posts
   */
  getBookmarkedPosts: async (userId: string): Promise<Post[]> => {
    const { data: bookmarks, error } = await supabase
      .from('bookmarks')
      .select(`
        post:posts (
          *,
          profiles(username, avatar_url)
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return bookmarks?.map(b => b.post).filter(Boolean) || [];
  },
};

// Mutation Functions
const postsMutationFunctions = {
  /**
   * Create a new post
   */
  createPost: async (data: CreatePostData) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: post, error } = await supabase
      .from('posts')
      .insert({
        user_id: user.id,
        caption: data.caption,
        image_urls: data.imageUrls,
      })
      .select()
      .single();

    if (error) throw error;

    return post;
  },

  /**
   * Like/unlike a post
   */
  togglePostLike: async (postId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Check if already liked
    const { data: existingLike } = await supabase
      .from('likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .single();

    if (existingLike) {
      // Unlike
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', user.id);

      if (error) throw error;

      return { liked: false };
    } else {
      // Like
      const { error } = await supabase
        .from('likes')
        .insert({
          post_id: postId,
          user_id: user.id,
        });

      if (error) throw error;

      return { liked: true };
    }
  },

  /**
   * Bookmark/unbookmark a post
   */
  togglePostBookmark: async (postId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Check if already bookmarked
    const { data: existingBookmark } = await supabase
      .from('bookmarks')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .single();

    if (existingBookmark) {
      // Remove bookmark
      const { error } = await supabase
        .from('bookmarks')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', user.id);

      if (error) throw error;

      return { bookmarked: false };
    } else {
      // Add bookmark
      const { error } = await supabase
        .from('bookmarks')
        .insert({
          post_id: postId,
          user_id: user.id,
        });

      if (error) throw error;

      return { bookmarked: true };
    }
  },

  /**
   * Add comment to post
   */
  createComment: async (data: CreateCommentData) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: comment, error } = await supabase
      .from('comments')
      .insert({
        post_id: data.postId,
        user_id: user.id,
        content: data.content,
      })
      .select(`
        id,
        content,
        created_at,
        user:profiles!fk_comments_user (
          username,
          avatar_url
        )
      `)
      .single();

    if (error) throw error;

    return comment;
  },

  /**
   * Delete a post
   */
  deletePost: async (postId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId)
      .eq('user_id', user.id);

    if (error) throw error;

    return true;
  },
};

// Custom Hooks
export const usePostsFeed = (
  options?: Omit<UseQueryOptions<any, Error>, 'queryKey' | 'queryFn'>
) => {
  return useInfiniteQuery({
    queryKey: queryKeys.posts.lists(),
    queryFn: postsQueryFunctions.getPostsFeed,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    ...options,
  });
};

export const usePost = (
  postId: string,
  options?: Omit<UseQueryOptions<Post, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: queryKeys.posts.detail(postId),
    queryFn: () => postsQueryFunctions.getPost(postId),
    enabled: !!postId,
    ...options,
  });
};

export const usePostComments = (
  postId: string,
  options?: Omit<UseQueryOptions<Comment[], Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: queryKeys.comments.post(postId),
    queryFn: () => postsQueryFunctions.getPostComments(postId),
    enabled: !!postId,
    ...options,
  });
};

export const useUserPosts = (
  userId: string,
  options?: Omit<UseQueryOptions<Post[], Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: queryKeys.posts.user(userId),
    queryFn: () => postsQueryFunctions.getUserPosts(userId),
    enabled: !!userId,
    ...options,
  });
};

export const useExplorePosts = (
  options?: Omit<UseQueryOptions<Post[], Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: queryKeys.posts.explore(),
    queryFn: postsQueryFunctions.getExplorePosts,
    ...options,
  });
};

export const useBookmarkedPosts = (
  userId: string,
  options?: Omit<UseQueryOptions<Post[], Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: queryKeys.posts.bookmarks(userId),
    queryFn: () => postsQueryFunctions.getBookmarkedPosts(userId),
    enabled: !!userId,
    ...options,
  });
};

export const useCreatePost = (
  options?: UseMutationOptions<any, Error, CreatePostData>
) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: postsMutationFunctions.createPost,
    onSuccess: async () => {
      // Invalidate posts feed and user posts
      await invalidateCache(queryKeys.posts.lists());
      
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await invalidateCache(queryKeys.posts.user(user.id));
      }
      
      console.log('✅ Post created successfully, cache invalidated');
    },
    ...options,
  });
};

export const useTogglePostLike = (
  options?: UseMutationOptions<any, Error, string>
) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: postsMutationFunctions.togglePostLike,
    onSuccess: async (data, postId) => {
      // Invalidate post details and feed
      await invalidateCache(queryKeys.posts.detail(postId));
      await invalidateCache(queryKeys.posts.lists());
      
      console.log('✅ Post like toggled successfully');
    },
    ...options,
  });
};

export const useTogglePostBookmark = (
  options?: UseMutationOptions<any, Error, string>
) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: postsMutationFunctions.togglePostBookmark,
    onSuccess: async (data, postId) => {
      // Invalidate post details and bookmarks
      await invalidateCache(queryKeys.posts.detail(postId));
      
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await invalidateCache(queryKeys.posts.bookmarks(user.id));
      }
      
      console.log('✅ Post bookmark toggled successfully');
    },
    ...options,
  });
};

export const useCreateComment = (
  options?: UseMutationOptions<any, Error, CreateCommentData>
) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: postsMutationFunctions.createComment,
    onSuccess: async (data, variables) => {
      // Invalidate post comments and post details
      await invalidateCache(queryKeys.comments.post(variables.postId));
      await invalidateCache(queryKeys.posts.detail(variables.postId));
      
      console.log('✅ Comment created successfully');
    },
    ...options,
  });
};

export const useDeletePost = (
  options?: UseMutationOptions<boolean, Error, string>
) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: postsMutationFunctions.deletePost,
    onSuccess: async (data, postId) => {
      // Invalidate posts feed and user posts
      await invalidateCache(queryKeys.posts.lists());
      
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await invalidateCache(queryKeys.posts.user(user.id));
      }
      
      console.log('✅ Post deleted successfully, cache invalidated');
    },
    ...options,
  });
};

export default {
  usePostsFeed,
  usePost,
  usePostComments,
  useUserPosts,
  useExplorePosts,
  useBookmarkedPosts,
  useCreatePost,
  useTogglePostLike,
  useTogglePostBookmark,
  useCreateComment,
  useDeletePost,
};
