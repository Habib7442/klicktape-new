/**
 * Image Caching Utilities for React Native
 * Reduces bandwidth costs and improves performance
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

// Cache configuration
const IMAGE_CACHE_CONFIG = {
  MAX_CACHE_SIZE: 100 * 1024 * 1024, // 100MB
  MAX_CACHE_AGE: 7 * 24 * 60 * 60 * 1000, // 7 days
  CACHE_KEY_PREFIX: 'image_cache_',
  METADATA_KEY: 'image_cache_metadata',
  CACHE_DIR: `${FileSystem.cacheDirectory}images/`,
} as const;

interface ImageCacheMetadata {
  url: string;
  cacheKey: string;
  timestamp: number;
  size: number;
  localPath?: string;
}

/**
 * Image Cache Manager
 */
export class ImageCacheManager {
  private static metadata: Map<string, ImageCacheMetadata> = new Map();
  private static initialized = false;

  /**
   * Initialize cache manager
   */
  static async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Ensure cache directory exists
      const dirInfo = await FileSystem.getInfoAsync(IMAGE_CACHE_CONFIG.CACHE_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(IMAGE_CACHE_CONFIG.CACHE_DIR, { intermediates: true });
      }

      const metadataJson = await AsyncStorage.getItem(IMAGE_CACHE_CONFIG.METADATA_KEY);
      if (metadataJson) {
        const metadataArray: ImageCacheMetadata[] = JSON.parse(metadataJson);
        this.metadata = new Map(metadataArray.map(item => [item.url, item]));
      }
      
      // Clean up expired cache entries
      await this.cleanupExpiredCache();
      
      this.initialized = true;
      console.log('✅ Image cache manager initialized');
    } catch (error) {
      console.error('❌ Error initializing image cache manager:', error);
    }
  }

  /**
   * Get cached image URI or original URI
   */
  static async getCachedImageUri(originalUri: string): Promise<string> {
    await this.initialize();

    try {
      const metadata = this.metadata.get(originalUri);
      
      if (metadata) {
        // Check if cache is still valid
        const age = Date.now() - metadata.timestamp;
        if (age < IMAGE_CACHE_CONFIG.MAX_CACHE_AGE) {
          // Check if local file exists
          if (metadata.localPath) {
            const fileInfo = await FileSystem.getInfoAsync(metadata.localPath);
            if (fileInfo.exists) {
              console.log(`📱 Image served from cache: ${originalUri}`);
              return metadata.localPath;
            }
          }
          
          // Fallback to AsyncStorage for base64 data
          const cachedData = await AsyncStorage.getItem(metadata.cacheKey);
          if (cachedData) {
            console.log(`📱 Image served from AsyncStorage cache: ${originalUri}`);
            return `data:image/jpeg;base64,${cachedData}`;
          }
        }
        
        // Cache expired or corrupted, remove metadata
        this.metadata.delete(originalUri);
        await this.saveMetadata();
      }
      
      // Return original URI if not cached or cache invalid
      return originalUri;
    } catch (error) {
      console.error('❌ Error getting cached image:', error);
      return originalUri;
    }
  }

  /**
   * Cache image from URL
   */
  static async cacheImageFromUrl(url: string): Promise<void> {
    await this.initialize();

    try {
      // Check if already cached
      const existing = this.metadata.get(url);
      if (existing) {
        const age = Date.now() - existing.timestamp;
        if (age < IMAGE_CACHE_CONFIG.MAX_CACHE_AGE) {
          return; // Already cached and valid
        }
      }

      console.log(`📥 Caching image: ${url}`);
      
      // Generate unique filename
      const filename = `${Date.now()}_${Math.random().toString(36).substring(2, 11)}.jpg`;
      const localPath = `${IMAGE_CACHE_CONFIG.CACHE_DIR}${filename}`;
      
      // Download image to local file system
      const downloadResult = await FileSystem.downloadAsync(url, localPath);
      
      if (downloadResult.status === 200) {
        const fileInfo = await FileSystem.getInfoAsync(localPath);
        const size = (fileInfo.exists && 'size' in fileInfo) ? fileInfo.size : 0;
        
        // Check cache size limits
        await this.ensureCacheSpace(size);
        
        // Update metadata
        const metadata: ImageCacheMetadata = {
          url,
          cacheKey: `${IMAGE_CACHE_CONFIG.CACHE_KEY_PREFIX}${filename}`,
          timestamp: Date.now(),
          size,
          localPath,
        };
        
        this.metadata.set(url, metadata);
        await this.saveMetadata();
        
        console.log(`✅ Image cached: ${url} (${(size / 1024).toFixed(1)}KB)`);
      } else {
        console.warn(`⚠️ Failed to download image: ${url}`);
      }
    } catch (error) {
      console.error('❌ Error caching image:', error);
    }
  }

  /**
   * Cache image data (base64)
   */
  static async cacheImage(uri: string, base64Data: string): Promise<void> {
    await this.initialize();

    try {
      const cacheKey = `${IMAGE_CACHE_CONFIG.CACHE_KEY_PREFIX}${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      const size = base64Data.length;
      
      // Check cache size limits
      await this.ensureCacheSpace(size);
      
      // Store image data
      await AsyncStorage.setItem(cacheKey, base64Data);
      
      // Update metadata
      const metadata: ImageCacheMetadata = {
        url: uri,
        cacheKey,
        timestamp: Date.now(),
        size,
      };
      
      this.metadata.set(uri, metadata);
      await this.saveMetadata();
      
      console.log(`✅ Image cached: ${uri} (${(size / 1024).toFixed(1)}KB)`);
    } catch (error) {
      console.error('❌ Error caching image:', error);
    }
  }

  /**
   * Ensure cache has enough space
   */
  private static async ensureCacheSpace(requiredSize: number): Promise<void> {
    const currentSize = Array.from(this.metadata.values())
      .reduce((total, item) => total + item.size, 0);
    
    if (currentSize + requiredSize <= IMAGE_CACHE_CONFIG.MAX_CACHE_SIZE) {
      return;
    }
    
    // Remove oldest entries until we have enough space
    const sortedEntries = Array.from(this.metadata.entries())
      .sort(([, a], [, b]) => a.timestamp - b.timestamp);
    
    let freedSpace = 0;
    for (const [url, metadata] of sortedEntries) {
      try {
        // Remove local file if exists
        if (metadata.localPath) {
          await FileSystem.deleteAsync(metadata.localPath, { idempotent: true });
        }
        
        // Remove AsyncStorage entry
        await AsyncStorage.removeItem(metadata.cacheKey);
        
        this.metadata.delete(url);
        freedSpace += metadata.size;
        
        if (freedSpace >= requiredSize) {
          break;
        }
      } catch (error) {
        console.error('❌ Error removing cached image:', error);
      }
    }
    
    await this.saveMetadata();
  }

  /**
   * Clean up expired cache entries
   */
  private static async cleanupExpiredCache(): Promise<void> {
    const now = Date.now();
    const expiredEntries: string[] = [];
    
    for (const [url, metadata] of this.metadata.entries()) {
      const age = now - metadata.timestamp;
      if (age > IMAGE_CACHE_CONFIG.MAX_CACHE_AGE) {
        expiredEntries.push(url);
        try {
          // Remove local file if exists
          if (metadata.localPath) {
            await FileSystem.deleteAsync(metadata.localPath, { idempotent: true });
          }
          
          // Remove AsyncStorage entry
          await AsyncStorage.removeItem(metadata.cacheKey);
        } catch (error) {
          console.error('❌ Error removing expired cache entry:', error);
        }
      }
    }
    
    expiredEntries.forEach(url => this.metadata.delete(url));
    
    if (expiredEntries.length > 0) {
      await this.saveMetadata();
      console.log(`🧹 Cleaned up ${expiredEntries.length} expired cache entries`);
    }
  }

  /**
   * Save metadata to storage
   */
  private static async saveMetadata(): Promise<void> {
    try {
      const metadataArray = Array.from(this.metadata.values());
      await AsyncStorage.setItem(
        IMAGE_CACHE_CONFIG.METADATA_KEY,
        JSON.stringify(metadataArray)
      );
    } catch (error) {
      console.error('❌ Error saving cache metadata:', error);
    }
  }

  /**
   * Clear all cached images
   */
  static async clearCache(): Promise<void> {
    await this.initialize();

    try {
      for (const metadata of this.metadata.values()) {
        // Remove local file if exists
        if (metadata.localPath) {
          await FileSystem.deleteAsync(metadata.localPath, { idempotent: true });
        }
        
        // Remove AsyncStorage entry
        await AsyncStorage.removeItem(metadata.cacheKey);
      }
      
      this.metadata.clear();
      await AsyncStorage.removeItem(IMAGE_CACHE_CONFIG.METADATA_KEY);
      
      console.log('✅ Image cache cleared');
    } catch (error) {
      console.error('❌ Error clearing image cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  static async getCacheStats(): Promise<{
    totalSize: number;
    totalImages: number;
    oldestEntry: number;
    newestEntry: number;
  }> {
    await this.initialize();

    const entries = Array.from(this.metadata.values());
    const totalSize = entries.reduce((sum, item) => sum + item.size, 0);
    const timestamps = entries.map(item => item.timestamp);
    
    return {
      totalSize,
      totalImages: entries.length,
      oldestEntry: timestamps.length > 0 ? Math.min(...timestamps) : 0,
      newestEntry: timestamps.length > 0 ? Math.max(...timestamps) : 0,
    };
  }
}
