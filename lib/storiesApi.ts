import { supabase } from "./supabase";
import { Platform } from "react-native";

interface Story {
  id: string;
  user_id: string;
  image_url: string;
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
      const filePath = `stories/${Date.now()}.${fileExt}`;

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
        throw new Error(`Failed to upload image: ${error.message}`);
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

  createStory: async (imageUrl: string, userId: string, caption?: string) => {
    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      const { data, error } = await supabase
        .from("stories")
        .insert({
          user_id: userId,
          image_url: imageUrl,
          caption,
          expires_at: expiresAt.toISOString(),
          viewed_by: [],
        })
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
          caption,
          created_at,
          expires_at,
          viewed_by,
          profiles!user_id (username, avatar_url)
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

      // Get the story with user_id verification
      const { data: story, error: fetchError } = await supabase
        .from("stories")
        .select("image_url, user_id")
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

      // Delete the associated image file if it exists
      if (story.image_url) {
        const filePath = story.image_url.split("/").slice(-2).join("/");
        try {
          await supabase.storage.from("stories").remove([filePath]);
        } catch (fileError) {
          console.warn("File already deleted or not found:", fileError);
        }
      }

      // Delete the story record
      const { error: deleteError } = await supabase
        .from("stories")
        .delete()
        .eq("id", storyId)
        .eq("user_id", user.id); // Double check ownership

      if (deleteError) {
        throw new Error(`Failed to delete story: ${deleteError.message}`);
      }

      return true;
    } catch (error) {
      console.error("Error deleting story:", error);
      throw error;
    }
  },
};
