import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface FetchResponse<T> {
  data: T | null;
  error: Error | null;
  loading: boolean;
}

// Constants for profile check retries
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

export const useSupabaseFetch = () => {
  const [loading, setLoading] = useState(false);

  const checkProfile = async (
    email: string,
    userId?: string,
    retryCount = 0
  ): Promise<boolean> => {
    try {
      // First try by email
      const { data: profileByEmail, error: emailError } = await supabase
        .from("profiles")
        .select("username")
        .eq("email", email)
        .single();

      // If found by email and has username, return true
      if (profileByEmail?.username && profileByEmail.username.trim() !== "") {
        console.log("Profile found by email:", email);
        return true;
      }

      // If userId is provided, also try by ID
      if (userId) {
        const { data: profileById, error: idError } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", userId)
          .single();

        // If found by ID and has username, return true
        if (profileById?.username && profileById.username.trim() !== "") {
          console.log("Profile found by ID:", userId);
          return true;
        }
      }

      // No valid profile found
      return false;
    } catch (error) {
      console.error("Error checking profile:", error);
      if (retryCount < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
        return checkProfile(email, userId, retryCount + 1);
      }
      return false;
    }
  };

  const fetchUserProfile = async (userId: string): Promise<any> => {
    try {
      const { data: user, error: userError } = await supabase
        .from("profiles")
        .select("id, username, name, avatar_url, account_type, gender, bio")
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
    checkProfile,
    fetchUserProfile,
    fetchPosts,
    fetchBookmarks,
    fetchReels,
    loading
  };
};