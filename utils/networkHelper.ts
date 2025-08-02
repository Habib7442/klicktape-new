import { Platform } from 'react-native';
import { PUBLIC_CONFIG } from '@/lib/config/environment';

/**
 * Network Helper Utility
 * Helps manage Socket.IO connection URLs for different network configurations
 */

export const getSocketUrls = (customIP?: string) => {
  const urls: string[] = [];

  // Check for environment variable first
  const SERVER_URL = PUBLIC_CONFIG.SOCKET_SERVER_URL;
  if (SERVER_URL) {
    urls.push(SERVER_URL);
  }

  // Add custom IP if provided
  if (customIP) {
    urls.push(`http://${customIP}:3001`);
  }

  // Platform-specific URLs
  if (Platform.OS === 'android') {
    urls.push('http://10.0.2.2:3000'); // Android emulator
    urls.push('http://192.168.31.241:3000'); // Current network IP
    urls.push('http://192.168.31.241:3001'); // Current network IP
    urls.push('http://192.168.38.201:3000'); // Previous IP
    urls.push('http://192.168.52.201:3000'); // Older IP
    urls.push('http://localhost:3000');
  } else if (Platform.OS === 'ios') {
    urls.push('http://localhost:3000'); // iOS simulator
    urls.push('http://192.168.31.241:3000'); // Current network IP
    urls.push('http://10.0.2.2:3000');
    urls.push('http://192.168.38.201:3000'); // Previous IP
    urls.push('http://192.168.52.201:3000'); // Older IP
  } else {
    // Web or other platforms
    urls.push('http://localhost:3000');
    urls.push('http://192.168.31.241:3000'); // Current network IP
    urls.push('http://192.168.38.201:3000'); // Previous IP
    urls.push('http://192.168.52.201:3000'); // Older IP
  }

  // Remove duplicates
  return [...new Set(urls)];
};

export const testConnection = async (url: string): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`${url}/health`, {
      method: 'GET',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    console.log(`❌ Connection test failed for ${url}:`, error);
    return false;
  }
};

export const findWorkingUrl = async (urls: string[]): Promise<string | null> => {
  console.log('🔍 Testing connection URLs...');
  
  for (const url of urls) {
    console.log(`🧪 Testing: ${url}`);
    const isWorking = await testConnection(url);
    if (isWorking) {
      console.log(`✅ Found working URL: ${url}`);
      return url;
    }
  }
  
  console.log('❌ No working URLs found');
  return null;
};

export const getCurrentNetworkInfo = () => {
  return {
    platform: Platform.OS,
    isAndroidEmulator: Platform.OS === 'android',
    isIOSSimulator: Platform.OS === 'ios',
    recommendedUrls: getSocketUrls(),
  };
};
