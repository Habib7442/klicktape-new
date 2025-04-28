import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface FetchResponse<T> {
  data: T | null;
  error: Error | null;
  loading: boolean;
}

export const useSupabaseFetch = () => {
  const [loading, setLoading] = useState(false);

  const fetchUserProfile = async (userId: string): Promise<any> => {
    try {
      const { data: user, error: userError } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, account_type, gender, bio")
        .eq("id", userId)
        .single();

      if (userError || !user) throw new Error("User not found");

      const [{ count: followersCount }, { count: followingCount }] = await Promise.all([
        supabase
          .from("follows")
          .select("*", { count: "exact", head: true })
          .eq("following_id", user.id),
        supabase
          .from("follows")
          .select("*", { count: "exact", head: true })
          .eq("follower_id", user.id),
      ]);

      return {
        ...user,
        followersCount: followersCount || 0,
        followingCount: followingCount || 0,
      };
    } catch (error: any) {
      throw new Error(`Failed to fetch user profile: ${error.message}`);
    }
  };

  const fetchPosts = async (userId: string): Promise<any[]> => {
    try {
      const { data: userPosts, error } = await supabase
        .from("posts")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return userPosts || [];
    } catch (error) {
      console.error("Error fetching posts:", error);
      return [];
    }
  };

  const fetchBookmarks = async (userId: string): Promise<any[]> => {
    try {
      const { data: bookmarkedPosts, error } = await supabase
        .from("bookmarks")
        .select("post:posts(*)")
        .eq("user_id", userId);

      if (error) throw error;
      return bookmarkedPosts.map((bookmark) => bookmark.post) || [];
    } catch (error) {
      console.error("Error fetching bookmarks:", error);
      return [];
    }
  };

  const fetchReels = async (userId: string): Promise<any[]> => {
    try {
      const { data: userReels, error } = await supabase
        .from("reels")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return userReels || [];
    } catch (error) {
      console.error("Error fetching reels:", error);
      return [];
    }
  };

  return {
    fetchUserProfile,
    fetchPosts,
    fetchBookmarks,
    fetchReels,
    loading
  };
};