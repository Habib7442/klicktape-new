/**
 * Video Compression Utilities for Stories and Reels
 * Reduces file sizes to prevent storage upload errors
 */

import * as FileSystem from 'expo-file-system';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { Alert } from 'react-native';

// File size limits (in MB) - Updated to your preferred limits
export const FILE_SIZE_LIMITS = {
  STORIES_VIDEO: 10, // 10MB for stories videos (as requested)
  STORIES_IMAGE: 10, // 10MB for stories images (as requested)
  REELS_VIDEO: 50,   // 50MB for reels videos
  THUMBNAIL: 1,      // 1MB for thumbnails
} as const;

// Actual Supabase bucket limits in bytes
export const SUPABASE_LIMITS = {
  STORIES: 52428800,   // 50MB (updated to match your config)
  REELS: 52428800,     // 50MB
  AVATARS: 2097152,    // 2MB
  POSTS: 5242880,      // 5MB
  THUMBNAILS: 1048576, // 1MB
} as const;

// Convert MB to bytes
const MB_TO_BYTES = 1024 * 1024;

export interface FileInfo {
  uri: string;
  size: number;
  sizeInMB: number;
}

export interface CompressionResult {
  success: boolean;
  uri?: string;
  originalSize: number;
  compressedSize?: number;
  error?: string;
}

/**
 * Get file information including size
 */
export const getFileInfo = async (uri: string): Promise<FileInfo> => {
  try {
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (!fileInfo.exists) {
      throw new Error("File does not exist");
    }

    const sizeInMB = fileInfo.size / MB_TO_BYTES;
    
    return {
      uri,
      size: fileInfo.size,
      sizeInMB,
    };
  } catch (error) {
    console.error("Error getting file info:", error);
    throw error;
  }
};

/**
 * Check if file size exceeds the limit
 */
export const checkFileSize = async (
  uri: string, 
  limitMB: number,
  fileType: string = 'file'
): Promise<boolean> => {
  try {
    const fileInfo = await getFileInfo(uri);
    
    if (fileInfo.sizeInMB > limitMB) {
      const message = `${fileType} size (${fileInfo.sizeInMB.toFixed(1)}MB) exceeds the ${limitMB}MB limit. Please select a smaller file or the app will compress it automatically.`;
      console.warn(message);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Error checking file size:", error);
    throw error;
  }
};

/**
 * Validate file size and show user-friendly error
 */
export const validateFileSize = async (
  uri: string,
  limitMB: number,
  fileType: string = 'file'
): Promise<boolean> => {
  try {
    const fileInfo = await getFileInfo(uri);
    
    if (fileInfo.sizeInMB > limitMB) {
      Alert.alert(
        "File Too Large",
        `The selected ${fileType} (${fileInfo.sizeInMB.toFixed(1)}MB) exceeds the ${limitMB}MB limit.\n\nPlease select a smaller file or use the app's compression feature.`,
        [{ text: "OK" }]
      );
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Error validating file size:", error);
    Alert.alert(
      "Error",
      "Unable to check file size. Please try again.",
      [{ text: "OK" }]
    );
    return false;
  }
};

/**
 * Generate video thumbnail with compression
 */
export const generateCompressedThumbnail = async (
  videoUri: string,
  quality: number = 0.7
): Promise<string> => {
  try {
    const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
      time: 0,
      quality,
    });

    // Check thumbnail size
    const isValidSize = await checkFileSize(uri, FILE_SIZE_LIMITS.THUMBNAIL, 'thumbnail');
    
    if (!isValidSize) {
      // If thumbnail is too large, generate with lower quality
      const { uri: compressedUri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
        time: 0,
        quality: 0.3,
      });
      return compressedUri;
    }

    return uri;
  } catch (error) {
    console.error("Error generating thumbnail:", error);
    throw new Error("Failed to generate video thumbnail");
  }
};

/**
 * Show compression options to user
 */
export const showCompressionOptions = (
  fileInfo: FileInfo,
  limitMB: number,
  onCompress: () => void,
  onCancel: () => void
) => {
  Alert.alert(
    "File Too Large",
    `The selected file (${fileInfo.sizeInMB.toFixed(1)}MB) exceeds the ${limitMB}MB limit.\n\nWould you like to compress it automatically?`,
    [
      {
        text: "Cancel",
        style: "cancel",
        onPress: onCancel,
      },
      {
        text: "Compress",
        onPress: onCompress,
      },
    ]
  );
};

/**
 * Clean up temporary files
 */
export const cleanupFile = async (uri: string): Promise<void> => {
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch (error) {
    console.error("Error cleaning up file:", error);
  }
};

/**
 * Format file size for display
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Get recommended compression settings based on file size
 */
export const getCompressionSettings = (fileSizeMB: number) => {
  if (fileSizeMB > 50) {
    return { quality: 0.3, maxDuration: 15 }; // Very aggressive compression
  } else if (fileSizeMB > 20) {
    return { quality: 0.5, maxDuration: 20 }; // Moderate compression
  } else if (fileSizeMB > 10) {
    return { quality: 0.7, maxDuration: 25 }; // Light compression
  } else {
    return { quality: 0.8, maxDuration: 30 }; // Minimal compression
  }
};

/**
 * Show file size warning with options
 */
export const showFileSizeWarning = (
  fileSizeMB: number,
  limitMB: number,
  fileType: string,
  onProceed: () => void,
  onCancel: () => void
) => {
  Alert.alert(
    "Large File Warning",
    `The selected ${fileType} (${fileSizeMB.toFixed(1)}MB) is close to or exceeds the ${limitMB}MB limit.\n\nUploading may fail. Do you want to proceed anyway?`,
    [
      {
        text: "Cancel",
        style: "cancel",
        onPress: onCancel,
      },
      {
        text: "Proceed",
        style: "destructive",
        onPress: onProceed,
      },
    ]
  );
};

/**
 * Show detailed file size error with specific limits and suggestions
 */
export const showFileSizeError = (
  fileInfo: FileInfo,
  limitMB: number,
  fileType: string,
  onRetry: () => void
) => {
  const suggestions = fileType === 'video'
    ? [
        "• Record a shorter video (15-20 seconds max)",
        "• Use lower quality when recording",
        "• Trim the video to reduce length",
        "• Use a video compression app before uploading",
        "• Try recording in 720p instead of 1080p"
      ]
    : [
        "• Take a new photo with lower resolution",
        "• Use image editing apps to reduce file size",
        "• Choose JPEG format instead of PNG",
        "• Reduce image quality in camera settings"
      ];

  Alert.alert(
    "File Too Large for Stories",
    `Your ${fileType} (${fileInfo.sizeInMB.toFixed(1)}MB) exceeds the ${limitMB}MB limit for Stories.\n\nTo fix this:\n\n${suggestions.join('\n')}\n\nNote: Both Stories and Reels support up to 50MB.`,
    [
      { text: "Cancel", style: "cancel" },
      { text: "Try Again", onPress: onRetry }
    ]
  );
};

/**
 * Suggest alternative actions for large files
 */
export const suggestAlternatives = (fileType: string) => {
  const suggestions = fileType === 'video'
    ? [
        "• Record a shorter video (max 30 seconds)",
        "• Use lower quality settings when recording",
        "• Trim the video to reduce length",
        "• Use a third-party app to compress the video"
      ]
    : [
        "• Take a new photo with lower resolution",
        "• Use image editing apps to reduce file size",
        "• Choose a different image format (JPEG vs PNG)"
      ];

  Alert.alert(
    "File Too Large",
    `To reduce file size, try:\n\n${suggestions.join('\n')}`,
    [{ text: "OK" }]
  );
};

/**
 * Show storage bucket limits to user
 */
export const showStorageLimits = () => {
  Alert.alert(
    "Storage Limits",
    `Current file size limits:\n\n• Stories: 10MB (images & videos)\n• Reels: 50MB (videos)\n• Posts: 5MB (images)\n• Avatars: 2MB (images)\n• Thumbnails: 1MB\n\nFor larger videos, use Reels instead of Stories.`,
    [{ text: "OK" }]
  );
};
