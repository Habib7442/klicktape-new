import { supabase } from "./supabase";
import { Platform } from "react-native";

export interface MediaFile {
  uri: string;
  name?: string;
  type: string;
  size?: number;
}

export interface UploadResult {
  filePath: string;
  publicUrl: string;
}

export const communityMediaUpload = {
  /**
   * Upload image for community posts
   */
  uploadImage: async (file: MediaFile): Promise<UploadResult> => {
    try {
      // Check authentication
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      const fileExt = file.name?.split(".").pop()?.toLowerCase() || "jpg";
      const fileName = file.name || `community_post_${Date.now()}_${Math.floor(Math.random() * 1000000)}.${fileExt}`;
      const filePath = `community_posts/${user.id}/${fileName}`;

      console.log("Uploading community image from URI:", file.uri);

      // Normalize URI for Android
      let normalizedUri = file.uri;
      if (Platform.OS === "android" && !normalizedUri.startsWith("file://")) {
        normalizedUri = `file://${normalizedUri}`;
      }

      // Create FormData for the upload
      const formData = new FormData();
      formData.append("file", {
        uri: normalizedUri,
        name: fileName,
        type: `image/${fileExt === "jpg" ? "jpeg" : fileExt}`,
      } as any);

      // Upload to Supabase Storage
      const { error } = await supabase.storage
        .from("community-media")
        .upload(filePath, formData, {
          contentType: `image/${fileExt === "jpg" ? "jpeg" : fileExt}`,
          upsert: false,
        });

      if (error) {
        console.error("Storage upload error:", error.message, error);
        throw new Error(`Failed to upload image: ${error.message}`);
      }

      // Get public URL
      const { data } = supabase.storage.from("community-media").getPublicUrl(filePath);

      if (!data?.publicUrl) {
        throw new Error("Failed to get public URL for uploaded image");
      }

      return { filePath, publicUrl: data.publicUrl };
    } catch (error) {
      console.error("Error uploading community image:", error);
      throw error;
    }
  },

  /**
   * Upload video for community posts
   */
  uploadVideo: async (file: MediaFile): Promise<UploadResult> => {
    try {
      // Check authentication
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      const fileExt = file.name?.split(".").pop()?.toLowerCase() || "mp4";
      const fileName = file.name || `community_video_${Date.now()}_${Math.floor(Math.random() * 1000000)}.${fileExt}`;
      const filePath = `community_posts/${user.id}/${fileName}`;

      console.log("Uploading community video from URI:", file.uri);

      // Normalize URI for Android
      let normalizedUri = file.uri;
      if (Platform.OS === "android" && !normalizedUri.startsWith("file://")) {
        normalizedUri = `file://${normalizedUri}`;
      }

      // Create FormData for the upload
      const formData = new FormData();
      formData.append("file", {
        uri: normalizedUri,
        name: fileName,
        type: `video/${fileExt}`,
      } as any);

      // Upload to Supabase Storage
      const { error } = await supabase.storage
        .from("community-media")
        .upload(filePath, formData, {
          contentType: `video/${fileExt}`,
          upsert: false,
        });

      if (error) {
        console.error("Storage upload error:", error.message, error);
        throw new Error(`Failed to upload video: ${error.message}`);
      }

      // Get public URL
      const { data } = supabase.storage.from("community-media").getPublicUrl(filePath);

      if (!data?.publicUrl) {
        throw new Error("Failed to get public URL for uploaded video");
      }

      return { filePath, publicUrl: data.publicUrl };
    } catch (error) {
      console.error("Error uploading community video:", error);
      throw error;
    }
  },

  /**
   * Upload multiple images for community posts
   */
  uploadMultipleImages: async (files: MediaFile[]): Promise<UploadResult[]> => {
    try {
      const uploadPromises = files.map(file => communityMediaUpload.uploadImage(file));
      const results = await Promise.all(uploadPromises);
      return results;
    } catch (error) {
      console.error("Error uploading multiple images:", error);
      throw error;
    }
  },

  /**
   * Delete media file from storage
   */
  deleteMedia: async (filePath: string): Promise<void> => {
    try {
      const { error } = await supabase.storage
        .from("community-media")
        .remove([filePath]);

      if (error) {
        console.error("Storage delete error:", error.message, error);
        throw new Error(`Failed to delete media: ${error.message}`);
      }
    } catch (error) {
      console.error("Error deleting community media:", error);
      throw error;
    }
  },

  /**
   * Get file info from URI
   */
  getFileInfo: (uri: string): MediaFile => {
    const fileName = uri.split('/').pop() || `file_${Date.now()}`;
    const fileExt = fileName.split('.').pop()?.toLowerCase() || '';
    
    let type = 'application/octet-stream';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt)) {
      type = `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`;
    } else if (['mp4', 'mov', 'avi', 'mkv'].includes(fileExt)) {
      type = `video/${fileExt}`;
    }

    return {
      uri,
      name: fileName,
      type,
    };
  },

  /**
   * Validate file size and type
   */
  validateFile: (file: MediaFile, maxSizeMB: number = 50): { isValid: boolean; error?: string } => {
    // Check file type
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    
    if (!isImage && !isVideo) {
      return { isValid: false, error: 'Only images and videos are allowed' };
    }

    // Check file size if provided
    if (file.size) {
      const maxSizeBytes = maxSizeMB * 1024 * 1024;
      if (file.size > maxSizeBytes) {
        return { isValid: false, error: `File size must be less than ${maxSizeMB}MB` };
      }
    }

    return { isValid: true };
  },
};
