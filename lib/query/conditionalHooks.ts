/**
 * Conditional Query Hooks
 * Provides TanStack Query hooks that fall back to direct Supabase calls
 */

import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useLazyQuery } from './LazyQueryProvider';

// Generic hook that uses TanStack Query if available, otherwise direct Supabase
export const useConditionalQuery = <T>(
  queryKey: string[],
  queryFn: () => Promise<T>,
  options: {
    enabled?: boolean;
    staleTime?: number;
    cacheTime?: number;
    refetchOnWindowFocus?: boolean;
  } = {}
) => {
  const { isReady } = useLazyQuery();
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (options.enabled === false) return;

    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const result = await queryFn();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setIsLoading(false);
      }
    };

    if (isReady) {
      // Use TanStack Query if available
      console.log('🔄 Using TanStack Query for:', queryKey);
      // This would use the actual TanStack Query hook
      // For now, fall back to direct call
      fetchData();
    } else {
      // Fall back to direct Supabase call
      console.log('🔄 Using direct Supabase call for:', queryKey);
      fetchData();
    }
  }, [isReady, options.enabled, ...queryKey]);

  return {
    data,
    isLoading,
    error,
    refetch: async () => {
      const result = await queryFn();
      setData(result);
      return result;
    },
  };
};

// Hook for fetching stories
export const useStories = (options: { enabled?: boolean } = {}) => {
  return useConditionalQuery(
    ['stories'],
    async () => {
      const { data, error } = await supabase
        .from('stories')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    options
  );
};

// Hook for fetching posts/tapes
export const usePosts = (options: { enabled?: boolean } = {}) => {
  return useConditionalQuery(
    ['posts'],
    async () => {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles:user_id (
            id,
            username,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    options
  );
};

// Hook for fetching user profile
export const useUserProfile = (userId: string, options: { enabled?: boolean } = {}) => {
  return useConditionalQuery(
    ['profile', userId],
    async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      return data;
    },
    {
      ...options,
      enabled: options.enabled !== false && !!userId,
    }
  );
};

// Hook for fetching notifications
export const useNotifications = (userId: string, options: { enabled?: boolean } = {}) => {
  return useConditionalQuery(
    ['notifications', userId],
    async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    {
      ...options,
      enabled: options.enabled !== false && !!userId,
    }
  );
};

// Hook for fetching chat messages
export const useChatMessages = (chatId: string, options: { enabled?: boolean } = {}) => {
  return useConditionalQuery(
    ['chat', chatId, 'messages'],
    async () => {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:sender_id (
            id,
            username,
            avatar_url
          )
        `)
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    {
      ...options,
      enabled: options.enabled !== false && !!chatId,
    }
  );
};

export default {
  useConditionalQuery,
  useStories,
  usePosts,
  useUserProfile,
  useNotifications,
  useChatMessages,
};
