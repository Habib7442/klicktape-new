import { useEffect } from 'react';
import { Linking } from 'react-native';
import { router } from 'expo-router';

/**
 * Deep Link Handler Component
 * Handles incoming deep links and navigates to appropriate screens
 */
export default function DeepLinkHandler() {
  useEffect(() => {
    // Handle deep links when app is already open
    const handleDeepLink = (url: string) => {
      console.log('🔗 Deep link received:', url);
      
      try {
        // Parse the URL
        const urlObj = new URL(url);
        const path = urlObj.pathname;
        const params = urlObj.searchParams;
        
        console.log('📍 Path:', path);
        console.log('📋 Params:', Object.fromEntries(params.entries()));
        
        // Handle different deep link routes
        if (path.startsWith('/post/')) {
          const postId = path.split('/post/')[1];
          if (postId) {
            console.log('📝 Navigating to post:', postId);
            router.push(`/post/${postId}`);
          }
        } else if (path.startsWith('/reel/')) {
          const reelId = path.split('/reel/')[1];
          if (reelId) {
            console.log('🎬 Navigating to reel:', reelId);
            router.push(`/reel/${reelId}`);
          }
        } else if (path.startsWith('/userProfile/')) {
          const userId = path.split('/userProfile/')[1];
          if (userId) {
            console.log('👤 Navigating to user profile:', userId);
            router.push(`/userProfile/${userId}`);
          }
        } else if (path.startsWith('/reset-password')) {
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');
          if (accessToken) {
            console.log('🔑 Navigating to reset password');
            router.push(`/reset-password?access_token=${accessToken}&refresh_token=${refreshToken || ''}`);
          }
        } else {
          // Default to home screen for unrecognized paths
          console.log('🏠 Navigating to home (default)');
          router.push('/(tabs)/home');
        }
      } catch (error) {
        console.error('❌ Error parsing deep link:', error);
        // Fallback to home screen
        router.push('/(tabs)/home');
      }
    };

    // Handle deep link when app is opened from a link
    const getInitialURL = async () => {
      try {
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl) {
          console.log('🚀 App opened with deep link:', initialUrl);
          // Add a small delay to ensure the app is fully loaded
          setTimeout(() => {
            handleDeepLink(initialUrl);
          }, 1000);
        }
      } catch (error) {
        console.error('❌ Error getting initial URL:', error);
      }
    };

    // Set up event listener for deep links when app is already open
    const subscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    // Check for initial URL
    getInitialURL();

    // Cleanup
    return () => {
      subscription?.remove();
    };
  }, []);

  // This component doesn't render anything
  return null;
}
