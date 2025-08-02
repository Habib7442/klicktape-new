/**
 * Thumbnail Generator for Reducing Egress Costs
 * Generates smaller thumbnails for lists and previews
 */

import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from '../supabase';

interface ThumbnailConfig {
  width: number;
  height: number;
  quality: number;
  suffix: string;
}

const THUMBNAIL_CONFIGS = {
  small: { width: 150, height: 150, quality: 0.3, suffix: '_thumb_sm' },
  medium: { width: 300, height: 300, quality: 0.4, suffix: '_thumb_md' },
  large: { width: 600, height: 600, quality: 0.5, suffix: '_thumb_lg' },
} as const;

export class ThumbnailGenerator {
  /**
   * Generate thumbnails for an image
   */
  static async generateThumbnails(
    originalUri: string,
    fileName: string,
    userId: string,
    bucket: 'posts' | 'reels' | 'stories'
  ): Promise<{ [key: string]: string }> {
    const thumbnails: { [key: string]: string } = {};

    try {
      for (const [size, config] of Object.entries(THUMBNAIL_CONFIGS)) {
        const thumbnail = await this.createThumbnail(originalUri, config);
        const thumbnailPath = await this.uploadThumbnail(
          thumbnail.uri,
          fileName,
          userId,
          bucket,
          config.suffix
        );
        
        if (thumbnailPath) {
          thumbnails[size] = thumbnailPath;
        }
      }

      return thumbnails;
    } catch (error) {
      console.error('Error generating thumbnails:', error);
      return {};
    }
  }

  /**
   * Create a single thumbnail
   */
  private static async createThumbnail(
    uri: string,
    config: ThumbnailConfig
  ): Promise<{ uri: string }> {
    return await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: config.width, height: config.height } }],
      { 
        compress: config.quality, 
        format: ImageManipulator.SaveFormat.JPEG 
      }
    );
  }

  /**
   * Upload thumbnail to Supabase Storage
   */
  private static async uploadThumbnail(
    thumbnailUri: string,
    originalFileName: string,
    userId: string,
    bucket: string,
    suffix: string
  ): Promise<string | null> {
    try {
      const fileExt = originalFileName.split('.').pop()?.toLowerCase() || 'jpg';
      const baseName = originalFileName.replace(`.${fileExt}`, '');
      const thumbnailFileName = `${baseName}${suffix}.${fileExt}`;
      const filePath = `${userId}/thumbnails/${thumbnailFileName}`;

      const response = await fetch(thumbnailUri);
      const blob = await response.blob();

      const { error } = await supabase.storage
        .from(bucket)
        .upload(filePath, blob, {
          contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
          upsert: true,
        });

      if (error) {
        console.error('Thumbnail upload error:', error);
        return null;
      }

      const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading thumbnail:', error);
      return null;
    }
  }

  /**
   * Get appropriate thumbnail URL based on context
   */
  static getThumbnailUrl(
    originalUrl: string,
    size: 'small' | 'medium' | 'large' = 'medium',
    thumbnails?: { [key: string]: string }
  ): string {
    if (thumbnails && thumbnails[size]) {
      return thumbnails[size];
    }

    // Fallback: try to construct thumbnail URL from original
    const config = THUMBNAIL_CONFIGS[size];
    const thumbnailUrl = originalUrl.replace(
      /(\.[^.]+)$/,
      `${config.suffix}$1`
    );

    return thumbnailUrl;
  }

  /**
   * Clean up old thumbnails when original is deleted
   */
  static async cleanupThumbnails(
    originalFilePath: string,
    bucket: string
  ): Promise<void> {
    try {
      const basePath = originalFilePath.replace(/\.[^.]+$/, '');
      const thumbnailPaths = Object.values(THUMBNAIL_CONFIGS).map(
        config => `${basePath}${config.suffix}.jpg`
      );

      for (const path of thumbnailPaths) {
        await supabase.storage.from(bucket).remove([path]);
      }
    } catch (error) {
      console.error('Error cleaning up thumbnails:', error);
    }
  }
}

/**
 * Hook for using thumbnails in components
 */
export const useThumbnail = (
  originalUrl: string,
  size: 'small' | 'medium' | 'large' = 'medium',
  thumbnails?: { [key: string]: string }
) => {
  return ThumbnailGenerator.getThumbnailUrl(originalUrl, size, thumbnails);
};

export default ThumbnailGenerator;
