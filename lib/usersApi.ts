import { supabase } from "./supabase";
import { SupabaseNotificationBroadcaster } from "./supabaseNotificationManager";

interface UserProfile {
  id: string;
  username: string;
  avatar: string;
  bio: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  isFollowing: boolean;
  account_type?: string;
  gender?: string;
}

export const usersApi = {
  getUserProfile: async (userId: string): Promise<UserProfile> => {
    try {
      const { data: user, error: userError } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, account_type, gender, bio") // Added 'id' to the select
        .eq("id", userId)
        .single();

      if (userError || !user) {
        console.warn(`User not found for ID: ${userId}`);
        return {
          id: userId,
          username: "Unknown User",
          avatar: "https://via.placeholder.com/150",
          bio: "",
          followersCount: 0,
          followingCount: 0,
        };
      }

      const [{ count: followersCount }, { count: followingCount }] =
        await Promise.all([
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
      console.error("Error fetching user profile:", error);
      throw new Error(`Failed to fetch user profile: ${error.message}`);
    }
  },

  checkFollowing: async (targetUserId: string, currentUserId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", currentUserId)
        .eq("following_id", targetUserId);

      if (error) throw error;
      return data && data.length > 0;
    } catch (error: any) {
      throw new Error(`Failed to check following: ${error.message}`);
    }
  },

  toggleFollow: async (targetUserId: string, currentUserId: string): Promise<boolean> => {
    try {
      const { data: existingFollow, error: followError } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", currentUserId)
        .eq("following_id", targetUserId);

      if (followError) throw followError;

      if (existingFollow && existingFollow.length > 0) {
        await supabase.from("follows").delete().eq("id", existingFollow[0].id);
        return false;
      } else {
        await supabase.from("follows").insert({
          follower_id: currentUserId,
          following_id: targetUserId,
          created_at: new Date().toISOString(),
        });

        // Create and broadcast follow notification
        await SupabaseNotificationBroadcaster.broadcastFollow(
          targetUserId, // recipient (user being followed)
          currentUserId // sender (current user doing the following)
        );

        return true;
      }
    } catch (error: any) {
      throw new Error(`Failed to toggle follow: ${error.message}`);
    }
  },

  getUserPosts: async (userId: string): Promise<Array<{id: string, image_urls: string[], created_at: string}>> => {
    try {
      const { data, error } = await supabase
        .from("posts")
        .select("id, image_urls, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    } catch (error: any) {
      throw new Error(`Failed to fetch user posts: ${error.message}`);
    }
  },

  getUserReels: async (userId: string): Promise<Array<{id: string, video_url: string, created_at: string}>> => {
    try {
      const { data, error } = await supabase
        .from("reels")
        .select("id, video_url, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    } catch (error: any) {
      throw new Error(`Failed to fetch user reels: ${error.message}`);
    }
  },

  getFollowers: async (userId: string, limit: number = 50): Promise<Array<{follower_id: string, username: string, avatar_url: string | null, created_at: string}>> => {
    try {
      const { data, error } = await supabase.rpc("get_user_followers", {
        user_id_param: userId,
        limit_param: limit,
      });

      if (error) throw error;

      // Return the data as-is from the database function
      return data || [];
    } catch (error: any) {
      console.error("Error fetching followers:", error);
      throw new Error(`Failed to fetch followers: ${error.message}`);
    }
  },

  getFollowing: async (userId: string, limit: number = 50): Promise<Array<{following_id: string, username: string, avatar_url: string | null, created_at: string}>> => {
    try {
      const { data, error } = await supabase.rpc("get_user_following", {
        user_id_param: userId,
        limit_param: limit,
      });

      if (error) throw error;

      // Return the data as-is from the database function
      return data || [];
    } catch (error: any) {
      console.error("Error fetching following:", error);
      throw new Error(`Failed to fetch following: ${error.message}`);
    }
  },
};
