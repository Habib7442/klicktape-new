import React, { useState, useEffect } from 'react';
import { Image, ImageProps, ActivityIndicator, View } from 'react-native';
import { ImageCacheManager } from '@/lib/utils/imageCaching';

interface CachedImageProps extends Omit<ImageProps, 'source'> {
  uri: string;
  fallbackUri?: string;
  showLoader?: boolean;
  loaderColor?: string;
  loaderSize?: 'small' | 'large';
}

/**
 * CachedImage Component
 * 
 * A wrapper around React Native's Image component that provides automatic caching
 * to reduce bandwidth costs and improve performance.
 * 
 * Features:
 * - Automatic image caching using ImageCacheManager
 * - Fallback image support
 * - Loading indicator
 * - Error handling with fallback
 * - Maintains all standard Image props
 */
const CachedImage: React.FC<CachedImageProps> = ({
  uri,
  fallbackUri = "https://via.placeholder.com/40",
  showLoader = false,
  loaderColor = "#999",
  loaderSize = "small",
  style,
  onError,
  onLoad,
  ...imageProps
}) => {
  const [imageUri, setImageUri] = useState<string>(uri);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    loadImage();
  }, [uri]);

  const loadImage = async () => {
    if (!uri || uri === fallbackUri) {
      setImageUri(fallbackUri);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(false);

      // Try to get cached image first
      const cachedUri = await ImageCacheManager.getCachedImageUri(uri);
      setImageUri(cachedUri);

      // If we got the original URI back (not cached), start caching it
      if (cachedUri === uri && uri.startsWith('http')) {
        // Cache the image in the background
        ImageCacheManager.cacheImageFromUrl(uri).catch(error => {
          console.warn('⚠️ Background image caching failed:', error);
        });
      }
    } catch (err) {
      console.error('❌ Error loading cached image:', err);
      setError(true);
      setImageUri(fallbackUri);
    } finally {
      setLoading(false);
    }
  };

  const handleLoad = (event: any) => {
    setLoading(false);
    setError(false);
    console.log(`📱 Image loaded successfully: ${uri}`);
    onLoad?.(event);
  };

  const handleError = (event: any) => {
    console.log(`❌ Image failed to load: ${uri}`);
    setLoading(false);
    setError(true);
    
    // Fallback to placeholder if not already using it
    if (imageUri !== fallbackUri) {
      setImageUri(fallbackUri);
    }
    
    onError?.(event);
  };

  return (
    <View style={style}>
      <Image
        {...imageProps}
        source={{ uri: imageUri }}
        style={style}
        onLoad={handleLoad}
        onError={handleError}
      />
      {loading && showLoader && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.1)',
          }}
        >
          <ActivityIndicator size={loaderSize} color={loaderColor} />
        </View>
      )}
    </View>
  );
};

export default CachedImage;
