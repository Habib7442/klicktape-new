import { supabase } from "./supabase";
import { Platform } from "react-native";

interface Story {
  id: string;
  user_id: string;
  image_url: string;
  video_url?: string;
  thumbnail_url?: string;
  story_type?: 'image' | 'video';
  caption?: string;
  created_at: string;
  expires_at: string;
  viewed_by: string[];
  user: {
    username: string;
    avatar: string;
  };
}

export const storiesAPI = {
  uploadVideo: async (file: { uri: string; name: string; type: string }) => {
    try {
      // Check authentication
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }
      console.log("Authenticated user:", user.id);

      const fileExt = file.name.split(".").pop()?.toLowerCase() || "mp4";
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      console.log("Uploading video from URI:", file.uri);

      // Normalize URI for Android
      let normalizedUri = file.uri;
      if (Platform.OS === "android" && !normalizedUri.startsWith("file://")) {
        normalizedUri = `file://${normalizedUri}`;
      }

      // Create FormData for the upload
      const formData = new FormData();
      formData.append("file", {
        uri: normalizedUri,
        name: file.name,
        type: file.type || `video/${fileExt}`,
      } as any);

      // Upload to Supabase Storage
      const { error } = await supabase.storage
        .from("stories")
        .upload(filePath, formData, {
          contentType: file.type || `video/${fileExt}`,
          upsert: false,
        });

      if (error) {
        console.error("Storage upload error:", error.message, error);

        // Provide more specific error messages
        if (error.message.includes("exceeded the maximum allowed size")) {
          throw new Error("The video file is too large. Please select a smaller video or compress it.");
        } else if (error.message.includes("Invalid file type")) {
          throw new Error("Invalid video format. Please select an MP4 or MOV file.");
        } else {
          throw new Error(`Failed to upload video: ${error.message}`);
        }
      }

      // Get public URL
      const { data } = supabase.storage.from("stories").getPublicUrl(filePath);

      if (!data?.publicUrl) {
        throw new Error("Failed to get public URL for uploaded video");
      }

      return { filePath, publicUrl: data.publicUrl };
    } catch (error) {
      console.error("Error uploading video:", error);
      throw error;
    }
  },

  uploadImage: async (file: { uri: string; name: string; type: string }) => {
    try {
      // Check authentication
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }
      console.log("Authenticated user:", user.id);

      const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      console.log("Uploading file from URI:", file.uri);

      // Normalize URI for Android
      let normalizedUri = file.uri;
      if (Platform.OS === "android" && !normalizedUri.startsWith("file://")) {
        normalizedUri = `file://${normalizedUri}`;
      }

      // Create FormData for the upload
      const formData = new FormData();
      formData.append("file", {
        uri: normalizedUri,
        name: file.name,
        type: `image/${fileExt === "jpg" ? "jpeg" : fileExt}`,
      } as any);

      // Upload to Supabase Storage
      const { error } = await supabase.storage
        .from("stories")
        .upload(filePath, formData, {
          contentType: `image/${fileExt === "jpg" ? "jpeg" : fileExt}`,
          upsert: false,
        });

      if (error) {
        console.error("Storage upload error:", error.message, error);

        // Provide more specific error messages
        if (error.message.includes("exceeded the maximum allowed size")) {
          throw new Error("The image file is too large. Please select a smaller image or compress it.");
        } else if (error.message.includes("Invalid file type")) {
          throw new Error("Invalid image format. Please select a JPEG, PNG, or WebP file.");
        } else {
          throw new Error(`Failed to upload image: ${error.message}`);
        }
      }

      // Get public URL
      const { data } = supabase.storage.from("stories").getPublicUrl(filePath);

      if (!data?.publicUrl) {
        throw new Error("Failed to get public URL for uploaded image");
      }

      return { filePath, publicUrl: data.publicUrl };
    } catch (error) {
      console.error("Error uploading image:", error);
      throw error;
    }
  },

  createStory: async (
    mediaUrl: string,
    userId: string,
    caption?: string,
    sharedContent?: {
      originalPostId?: string;
      originalReelId?: string;
      sharedFromUserId?: string;
    },
    storyType: 'image' | 'video' = 'image',
    thumbnailUrl?: string
  ) => {
    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      const storyData: any = {
        user_id: userId,
        caption,
        expires_at: expiresAt.toISOString(),
        viewed_by: [],
        is_shared_content: !!sharedContent,
        story_type: storyType,
      };

      // Set media URL based on story type
      if (storyType === 'video') {
        storyData.video_url = mediaUrl;
        storyData.thumbnail_url = thumbnailUrl;
        // For video stories, image_url can be the thumbnail or null
        storyData.image_url = thumbnailUrl || null;
      } else {
        storyData.image_url = mediaUrl;
      }

      // Add shared content tracking if provided
      if (sharedContent) {
        if (sharedContent.originalPostId) {
          storyData.original_post_id = sharedContent.originalPostId;
        }
        if (sharedContent.originalReelId) {
          storyData.original_reel_id = sharedContent.originalReelId;
        }
        if (sharedContent.sharedFromUserId) {
          storyData.shared_from_user_id = sharedContent.sharedFromUserId;
        }
      }

      const { data, error } = await supabase
        .from("stories")
        .insert(storyData)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create story: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error("Error creating story:", error);
      throw error;
    }
  },

  getActiveStories: async (): Promise<Story[]> => {
    try {
      const { data, error } = await supabase
        .from("stories")
        .select(
          `
          id,
          user_id,
          image_url,
          video_url,
          thumbnail_url,
          story_type,
          caption,
          created_at,
          expires_at,
          viewed_by,
          profiles!stories_user_id_fkey (username, avatar_url)
          `
        )
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(50);
  
      if (error) {
        throw new Error(`Failed to fetch stories: ${error.message}`);
      }
  
      const stories: Story[] = data.map((story) => ({
        id: story.id,
        user_id: story.user_id,
        image_url: story.image_url,
        video_url: story.video_url,
        thumbnail_url: story.thumbnail_url,
        story_type: story.story_type || 'image',
        caption: story.caption,
        created_at: story.created_at,
        expires_at: story.expires_at,
        viewed_by: story.viewed_by || [],
        user: {
          username: story.profiles.username,
          avatar: story.profiles.avatar_url || "",
        },
      }));
  
      return stories;
    } catch (error) {
      console.error("Error fetching stories:", error);
      throw error;
    }
  },

  getUserStories: async (userId: string): Promise<Story[]> => {
    try {
      const { data, error } = await supabase
        .from("stories")
        .select("*")
        .eq("user_id", userId)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch user stories: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error("Error fetching user stories:", error);
      throw error;
    }
  },

  markStoryAsViewed: async (storyId: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      const { data: story, error: fetchError } = await supabase
        .from("stories")
        .select("viewed_by")
        .eq("id", storyId)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch story: ${fetchError.message}`);
      }

      if (!story.viewed_by.includes(user.id)) {
        const { error: updateError } = await supabase
          .from("stories")
          .update({
            viewed_by: [...story.viewed_by, user.id],
          })
          .eq("id", storyId);

        if (updateError) {
          throw new Error(`Failed to update viewed_by: ${updateError.message}`);
        }
      }
    } catch (error) {
      console.error("Error marking story as viewed:", error);
      throw error;
    }
  },

  getFileView: (filePath: string) => {
    return supabase.storage.from("stories").getPublicUrl(filePath).data
      .publicUrl;
  },

  deleteFile: async (filePath: string) => {
    try {
      const { error } = await supabase.storage
        .from("stories")
        .remove([filePath]);
      if (error) {
        throw new Error(`Failed to delete file: ${error.message}`);
      }
    } catch (error) {
      console.error("Error deleting file:", error);
      throw error;
    }
  },

  deleteStory: async (storyId: string) => {
    try {
      // First verify the story belongs to the current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      // Get the story with ALL media URLs for complete cleanup
      const { data: story, error: fetchError } = await supabase
        .from("stories")
        .select("image_url, video_url, thumbnail_url, user_id, story_type")
        .eq("id", storyId)
        .eq("user_id", user.id) // Ensure the story belongs to current user
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch story: ${fetchError.message}`);
      }

      if (!story) {
        throw new Error(
          "Story not found or you don't have permission to delete it"
        );
      }

      console.log(`🗑️ Deleting story ${storyId} of type: ${story.story_type || 'image'}`);

      // Helper function to extract file path from Supabase URL
      const extractFilePath = (url: string): string | null => {
        if (!url) return null;
        try {
          // Handle different URL formats
          if (url.includes('/storage/v1/object/public/stories/')) {
            // Standard Supabase public URL format
            const parts = url.split('/storage/v1/object/public/stories/');
            return parts[1] || null;
          } else if (url.includes('/stories/')) {
            // Alternative format
            const parts = url.split('/stories/');
            return parts[1] || null;
          } else {
            // Fallback: try to get last two parts (user_id/filename.ext)
            const urlParts = url.split("/");
            if (urlParts.length >= 2) {
              return urlParts.slice(-2).join("/");
            }
          }
          return null;
        } catch (error) {
          console.warn(`Failed to extract file path from URL: ${url}`, error);
          return null;
        }
      };

      // Collect all media files to delete
      const filesToDelete: string[] = [];

      // Add image file if exists
      if (story.image_url) {
        const imagePath = extractFilePath(story.image_url);
        if (imagePath) {
          filesToDelete.push(imagePath);
          console.log(`📸 Found image file to delete: ${imagePath}`);
        }
      }

      // Add video file if exists
      if (story.video_url) {
        const videoPath = extractFilePath(story.video_url);
        if (videoPath) {
          filesToDelete.push(videoPath);
          console.log(`🎥 Found video file to delete: ${videoPath}`);
        }
      }

      // Add thumbnail file if exists
      if (story.thumbnail_url) {
        const thumbnailPath = extractFilePath(story.thumbnail_url);
        if (thumbnailPath) {
          filesToDelete.push(thumbnailPath);
          console.log(`🖼️ Found thumbnail file to delete: ${thumbnailPath}`);
        }
      }

      // Delete all storage files in batch
      if (filesToDelete.length > 0) {
        console.log(`🗑️ Attempting to delete ${filesToDelete.length} storage files:`, filesToDelete);

        try {
          const { data: deletedFiles, error: storageError } = await supabase.storage
            .from("stories")
            .remove(filesToDelete);

          if (storageError) {
            console.warn("Storage deletion warning:", storageError.message);
            // Don't throw error here - continue with database deletion even if storage fails
          } else {
            console.log(`✅ Successfully deleted ${deletedFiles?.length || 0} storage files`);
          }
        } catch (fileError) {
          console.warn("Storage deletion failed:", fileError);
          // Continue with database deletion even if storage cleanup fails
        }
      } else {
        console.log("ℹ️ No storage files found to delete");
      }

      // Delete the story record from database
      const { error: deleteError } = await supabase
        .from("stories")
        .delete()
        .eq("id", storyId)
        .eq("user_id", user.id); // Double check ownership

      if (deleteError) {
        throw new Error(`Failed to delete story: ${deleteError.message}`);
      }

      console.log("✅ Story record deleted successfully from database");
      return true;
    } catch (error) {
      console.error("Error deleting story:", error);
      throw error;
    }
  },

  /**
   * Cleanup orphaned files in storage (files that exist in storage but not in database)
   * This is useful for cleaning up files from failed deletions or inconsistent states
   */
  cleanupOrphanedFiles: async (): Promise<{ cleaned: number; errors: string[] }> => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      console.log("🧹 Starting orphaned files cleanup for user:", user.id);

      // Get all files in user's storage folder
      const { data: storageFiles, error: storageError } = await supabase.storage
        .from("stories")
        .list(user.id);

      if (storageError) {
        throw new Error(`Failed to list storage files: ${storageError.message}`);
      }

      if (!storageFiles || storageFiles.length === 0) {
        console.log("ℹ️ No storage files found for user");
        return { cleaned: 0, errors: [] };
      }

      // Get all story URLs from database for this user
      const { data: stories, error: dbError } = await supabase
        .from("stories")
        .select("image_url, video_url, thumbnail_url")
        .eq("user_id", user.id);

      if (dbError) {
        throw new Error(`Failed to fetch stories from database: ${dbError.message}`);
      }

      // Extract all file names that should exist from database
      const validFileNames = new Set<string>();
      stories?.forEach(story => {
        [story.image_url, story.video_url, story.thumbnail_url].forEach(url => {
          if (url) {
            const fileName = url.split('/').pop();
            if (fileName) {
              validFileNames.add(fileName);
            }
          }
        });
      });

      // Find orphaned files (exist in storage but not referenced in database)
      const orphanedFiles = storageFiles.filter(file =>
        file.name && !validFileNames.has(file.name)
      );

      console.log(`🔍 Found ${orphanedFiles.length} orphaned files out of ${storageFiles.length} total files`);

      if (orphanedFiles.length === 0) {
        return { cleaned: 0, errors: [] };
      }

      // Delete orphaned files
      const filesToDelete = orphanedFiles.map(file => `${user.id}/${file.name}`);
      const errors: string[] = [];
      let cleaned = 0;

      // Delete in batches to avoid overwhelming the storage API
      const batchSize = 10;
      for (let i = 0; i < filesToDelete.length; i += batchSize) {
        const batch = filesToDelete.slice(i, i + batchSize);

        try {
          const { data: deletedFiles, error: deleteError } = await supabase.storage
            .from("stories")
            .remove(batch);

          if (deleteError) {
            errors.push(`Batch ${i / batchSize + 1}: ${deleteError.message}`);
          } else {
            cleaned += deletedFiles?.length || 0;
            console.log(`✅ Deleted batch ${i / batchSize + 1}: ${deletedFiles?.length || 0} files`);
          }
        } catch (error) {
          errors.push(`Batch ${i / batchSize + 1}: ${error}`);
        }
      }

      console.log(`🧹 Cleanup completed: ${cleaned} files cleaned, ${errors.length} errors`);
      return { cleaned, errors };

    } catch (error) {
      console.error("Error during orphaned files cleanup:", error);
      throw error;
    }
  },
};
