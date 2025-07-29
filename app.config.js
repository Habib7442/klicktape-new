/**
 * Klicktape App Configuration
 * 
 * Dynamic configuration that supports different environments
 * and secure environment variable handling.
 */

// Environment-based configuration
const IS_DEV = process.env.APP_VARIANT === 'development';
const IS_PREVIEW = process.env.APP_VARIANT === 'preview';
const IS_PRODUCTION = process.env.APP_VARIANT === 'production' || !process.env.APP_VARIANT;

/**
 * Get app name based on environment
 */
const getAppName = () => {
  if (IS_DEV) {
    return 'Klicktape (Dev)';
  }
  if (IS_PREVIEW) {
    return 'Klicktape (Preview)';
  }
  return 'Klicktape';
};

/**
 * Get bundle identifier based on environment
 */
const getBundleIdentifier = () => {
  if (IS_DEV) {
    return 'com.flerid.klicktape.dev';
  }
  if (IS_PREVIEW) {
    return 'com.flerid.klicktape.preview';
  }
  return 'com.flerid.klicktape';
};

/**
 * Get Android package name based on environment
 */
const getAndroidPackage = () => {
  if (IS_DEV) {
    return 'com.flerid.klicktape.dev';
  }
  if (IS_PREVIEW) {
    return 'com.flerid.klicktape.preview';
  }
  return 'com.flerid.klicktape';
};

/**
 * Get app icon based on environment
 */
const getAppIcon = () => {
  if (IS_DEV) {
    return './assets/images/icon-dev.png';
  }
  if (IS_PREVIEW) {
    return './assets/images/icon-preview.png';
  }
  return './assets/images/icon.png';
};

export default {
  expo: {
    name: getAppName(),
    slug: 'klicktape',
    version: '1.0.0',
    orientation: 'portrait',
    icon: getAppIcon(),
    scheme: 'klicktape',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    
    ios: {
      icon: './assets/images/ios-light.png',
      supportsTablet: true,
      requireFullScreen: true,
      bundleIdentifier: getBundleIdentifier(),
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/images/adaptive-icon.png',
        backgroundColor: '#000000',
      },
      permissions: [
        'android.permission.RECORD_AUDIO',
        'android.permission.MODIFY_AUDIO_SETTINGS',
        'android.permission.CAMERA',
        'android.permission.ACCESS_COARSE_LOCATION',
        'android.permission.ACCESS_FINE_LOCATION',
      ],
      package: getAndroidPackage(),
    },
    
    web: {
      bundler: 'metro',
      output: 'static',
      favicon: './assets/images/favicon.png',
    },
    
    plugins: [
      'expo-router',
      [
        'expo-splash-screen',
        {
          imageResizeMode: 'contain',
          imageWidth: 240,
          imageHeight: 240,
          backgroundColor: '#121212',
          dark: {
            image: './assets/images/splash-icon-dark.png',
            backgroundColor: '#121212',
          },
          light: {
            image: './assets/images/splash-icon-light.png',
            backgroundColor: '#FFFFFF',
          },
          androidSplashResourceBackgroundColor: '#121212',
          splashScreen: {
            fadeOutDuration: 1000,
            fadeInDuration: 1000,
            hideOnPress: false,
          },
        },
      ],
      [
        'expo-image-picker',
        {
          photosPermission: 'The app accesses your photos to let you share them with your friends.',
        },
      ],
      [
        'expo-av',
        {
          microphonePermission: 'Allow $(PRODUCT_NAME) to access your microphone.',
        },
      ],
      [
        'expo-camera',
        {
          cameraPermission: 'Allow $(PRODUCT_NAME) to access your camera',
          microphonePermission: 'Allow $(PRODUCT_NAME) to access your microphone',
          recordAudioAndroid: true,
        },
      ],
      [
        'expo-screen-orientation',
        {
          initialOrientation: 'DEFAULT',
        },
      ],
      [
        'expo-video',
        {
          supportsBackgroundPlayback: true,
          supportsPictureInPicture: true,
        },
      ],
      [
        'expo-location',
        {
          locationAlwaysAndWhenInUsePermission: 'Allow $(PRODUCT_NAME) to use your location.',
        },
      ],
      'expo-secure-store',
      'expo-web-browser',
    ],
    
    experiments: {
      typedRoutes: true,
    },
    
    extra: {
      router: {
        origin: false,
      },
      eas: {
        projectId: '79789b66-edbb-406a-99df-7a43c1795247',
      },
      // Environment information (safe to expose)
      environment: {
        isDev: IS_DEV,
        isPreview: IS_PREVIEW,
        isProduction: IS_PRODUCTION,
        variant: process.env.APP_VARIANT || 'production',
      },
    },
  },
};
