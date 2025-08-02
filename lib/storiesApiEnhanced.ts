/**
 * Enhanced Stories API with Redis Caching
 * Reduces Supabase costs and improves performance
 */

import { supabase } from "./supabase";
import { Platform } from "react-native";
import StoriesCache from "./redis/storiesCache";

interface Story {
  id: string;
  user_id: string;
  image_url: string;
  caption?: string;
  created_at: string;
  expires_at: string;
  viewed_by: string[];
  story_order: number;
  view_count: number;
  duration: number;
  story_type: string;
  is_active: boolean;
  user: {
    username: string;
    avatar: string;
  };
  is_viewed?: boolean;
}

interface StoriesFeed {
  user_id: string;
  username: string;
  avatar_url: string;
  story_count: number;
  latest_story_time: string;
  has_unviewed: boolean;
  stories: Story[];
}

export const storiesAPIEnhanced = {
  /**
   * Upload image with optimized file handling
   */
  uploadImage: async (file: { uri: string; name: string; type: string }) => {
    try {
      // Check authentication
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const filePath = `stories/${user.id}/${Date.now()}.${fileExt}`;

      // Normalize URI for Android
      let normalizedUri = file.uri;
      if (Platform.OS === "android" && !normalizedUri.startsWith("file://")) {
        normalizedUri = `file://${normalizedUri}`;
      }

      // Create FormData for upload
      const formData = new FormData();
      formData.append("file", {
        uri: normalizedUri,
        type: file.type,
        name: file.name,
      } as any);

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from("stories")
        .upload(filePath, formData, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) {
        throw new Error(`Upload failed: ${error.message}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("stories")
        .getPublicUrl(data.path);

      return { filePath: data.path, publicUrl: urlData.publicUrl };
    } catch (error) {
      console.error("Error uploading image:", error);
      throw error;
    }
  },

  /**
   * Create story with enhanced features and cache invalidation
   */
  createStory: async (
    imageUrl: string,
    userId: string,
    caption?: string,
    duration: number = 5000,
    storyType: string = 'image'
  ) => {
    try {
      // Use enhanced database function
      const { data, error } = await supabase.rpc("create_story_enhanced", {
        p_image_url: imageUrl,
        p_caption: caption,
        p_duration: duration,
        p_story_type: storyType,
      });

      if (error) {
        throw new Error(`Failed to create story: ${error.message}`);
      }

      // Invalidate cache for this user and feed
      await StoriesCache.invalidateStoriesCache(userId);

      return { id: data, success: true };
    } catch (error) {
      console.error("Error creating story:", error);
      throw error;
    }
  },

  /**
   * Get stories feed with Redis caching
   */
  getStoriesFeed: async (limit: number = 50): Promise<StoriesFeed[]> => {
    try {
      // Try to get from cache first
      const cachedFeed = await StoriesCache.getStoriesFeed(limit, async () => {
        // Fallback to database
        console.log("🔄 Fetching stories feed from database");
        
        const { data, error } = await supabase.rpc("get_stories_feed_enhanced", {
          limit_count: limit,
        });

        if (error) {
          throw new Error(`Failed to fetch stories feed: ${error.message}`);
        }

        return data || [];
      });

      return cachedFeed;
    } catch (error) {
      console.error("Error fetching stories feed:", error);
      throw error;
    }
  },

  /**
   * Get user stories with caching and multiple stories support
   */
  getUserStories: async (userId: string): Promise<Story[]> => {
    try {
      const cachedStories = await StoriesCache.getUserStories(userId, async () => {
        console.log(`🔄 Fetching user stories for ${userId} from database`);
        
        const { data, error } = await supabase.rpc("get_user_stories_enhanced", {
          target_user_id: userId,
        });

        if (error) {
          throw new Error(`Failed to fetch user stories: ${error.message}`);
        }

        return data || [];
      });

      return cachedStories;
    } catch (error) {
      console.error("Error fetching user stories:", error);
      throw error;
    }
  },

  /**
   * Mark story as viewed with analytics tracking
   */
  markStoryViewed: async (storyId: string, viewDuration: number = 0): Promise<boolean> => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      
      if (!user) {
        return false;
      }

      // Update database
      const { data, error } = await supabase.rpc("mark_story_viewed", {
        story_id: storyId,
        view_duration: viewDuration,
      });

      if (error) {
        console.error("Error marking story as viewed:", error);
        return false;
      }

      // Track in cache for analytics
      await StoriesCache.trackStoryView(storyId, user.id, viewDuration);

      return data || false;
    } catch (error) {
      console.error("Error marking story as viewed:", error);
      return false;
    }
  },

  /**
   * Get active stories (for quick checks)
   */
  getActiveStories: async (): Promise<Story[]> => {
    try {
      // Check cache first
      const activeStoryIds = await StoriesCache.getActiveStories();
      
      if (activeStoryIds.length > 0) {
        // Get full story data from cache or database
        const stories = await Promise.all(
          activeStoryIds.map(async (id) => {
            // This could be optimized further with batch fetching
            const { data, error } = await supabase
              .from("stories")
              .select(`
                id,
                user_id,
                image_url,
                caption,
                created_at,
                expires_at,
                viewed_by,
                story_order,
                view_count,
                duration,
                story_type,
                is_active,
                profiles!stories_user_id_fkey (username, avatar_url)
              `)
              .eq("id", id)
              .eq("is_active", true)
              .gt("expires_at", new Date().toISOString())
              .single();

            if (error || !data) return null;

            return {
              ...data,
              user: {
                username: data.profiles.username,
                avatar: data.profiles.avatar_url || "",
              },
            };
          })
        );

        return stories.filter(Boolean) as Story[];
      }

      // Fallback to database query
      const { data, error } = await supabase
        .from("stories")
        .select(`
          id,
          user_id,
          image_url,
          caption,
          created_at,
          expires_at,
          viewed_by,
          story_order,
          view_count,
          duration,
          story_type,
          is_active,
          profiles!stories_user_id_fkey (username, avatar_url)
        `)
        .eq("is_active", true)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        throw new Error(`Failed to fetch active stories: ${error.message}`);
      }

      const stories: Story[] = (data || []).map((story) => ({
        ...story,
        user: {
          username: story.profiles.username,
          avatar: story.profiles.avatar_url || "",
        },
      }));

      // Cache the active story IDs
      await StoriesCache.setActiveStories(stories.map(s => s.id));

      return stories;
    } catch (error) {
      console.error("Error fetching active stories:", error);
      throw error;
    }
  },

  /**
   * Delete story with complete storage cleanup and cache invalidation
   */
  deleteStory: async (storyId: string): Promise<boolean> => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return false;
      }

      // Import storiesAPI for proper deletion with storage cleanup
      const { storiesAPI } = await import('./storiesApi');

      // Use the enhanced deleteStory function that handles storage cleanup
      const result = await storiesAPI.deleteStory(storyId);

      if (result) {
        // Invalidate cache after successful deletion
        await StoriesCache.invalidateStoriesCache(user.id);
        console.log("✅ Story deleted and cache invalidated");
      }

      return result;
    } catch (error) {
      console.error("Error deleting story:", error);
      return false;
    }
  },

  /**
   * Get story analytics
   */
  getStoryAnalytics: async (storyId: string) => {
    try {
      // Try cache first
      const cachedAnalytics = await StoriesCache.getStoryAnalytics(storyId);
      
      if (cachedAnalytics) {
        return cachedAnalytics;
      }

      // Fallback to database calculation
      const { data: views, error } = await supabase
        .from("story_views")
        .select("view_duration, completed")
        .eq("story_id", storyId);

      if (error) {
        throw new Error(`Failed to fetch story analytics: ${error.message}`);
      }

      const analytics = {
        total_views: views?.length || 0,
        unique_viewers: views?.length || 0, // Since we have unique constraint
        completion_rate: views?.length ? views.filter(v => v.completed).length / views.length : 0,
        avg_view_duration: views?.length ? views.reduce((sum, v) => sum + v.view_duration, 0) / views.length : 0,
        last_updated: new Date().toISOString(),
      };

      return analytics;
    } catch (error) {
      console.error("Error fetching story analytics:", error);
      return null;
    }
  },

  /**
   * Cleanup expired stories (call periodically)
   */
  cleanupExpiredStories: async (): Promise<number> => {
    try {
      const { data, error } = await supabase.rpc("cleanup_expired_stories");

      if (error) {
        throw new Error(`Failed to cleanup expired stories: ${error.message}`);
      }

      // Clear cache after cleanup
      await StoriesCache.invalidateStoriesCache();

      console.log(`🧹 Cleaned up ${data} expired stories`);
      return data || 0;
    } catch (error) {
      console.error("Error cleaning up expired stories:", error);
      return 0;
    }
  },

  /**
   * Preload stories for better performance
   */
  preloadStories: async (userIds: string[]): Promise<void> => {
    try {
      // Batch fetch stories for multiple users
      const storiesPromises = userIds.map(userId => 
        this.getUserStories(userId)
      );

      await Promise.all(storiesPromises);
      console.log(`📦 Preloaded stories for ${userIds.length} users`);
    } catch (error) {
      console.error("Error preloading stories:", error);
    }
  },

  /**
   * Get cache statistics
   */
  getCacheStats: async () => {
    try {
      return await StoriesCache.getCacheStats();
    } catch (error) {
      console.error("Error getting cache stats:", error);
      return null;
    }
  },
};
