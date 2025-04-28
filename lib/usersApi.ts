import { supabase } from "./supabase";

export const usersApi = {
  getUserProfile: async (userId: string) => {
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

  checkFollowing: async (targetUserId: string, currentUserId: string) => {
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

  toggleFollow: async (targetUserId: string, currentUserId: string) => {
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

        await supabase.from("notifications").insert({
          recipient_id: targetUserId,
          sender_id: currentUserId,
          type: "follow",
          created_at: new Date().toISOString(),
          is_read: false,
        });

        return true;
      }
    } catch (error: any) {
      throw new Error(`Failed to toggle follow: ${error.message}`);
    }
  },

  getUserPosts: async (userId: string) => {
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

  getUserReels: async (userId: string) => {
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
};
