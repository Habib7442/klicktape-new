import { Platform } from 'react-native';

export const testSocketConnection = async (): Promise<void> => {
  const getTestUrl = (): string => {
    if (Platform.OS === 'android') {
      return 'http://192.168.31.241:3001'; // Wi-Fi IP
    } else {
      return 'http://localhost:3001'; // iOS simulator
    }
  };

  const serverUrl = getTestUrl();
  console.log('🧪 Testing Socket.IO server connection...');
  console.log('🔗 Server URL:', serverUrl);

  try {
    // Test 1: Health check endpoint
    console.log('🏥 Testing health endpoint...');
    const healthResponse = await fetch(`${serverUrl}/health`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (healthResponse.ok) {
      const healthData = await healthResponse.text();
      console.log('✅ Health check passed:', healthData);
    } else {
      console.log('❌ Health check failed:', healthResponse.status, healthResponse.statusText);
    }

    // Test 2: Try to reach the server with a simple request
    console.log('🌐 Testing server reachability...');
    const testResponse = await fetch(serverUrl, {
      method: 'GET',
      headers: {
        'Accept': 'text/html,application/json',
      },
    });

    console.log('📊 Server response status:', testResponse.status);
    console.log('📊 Server response headers:', Object.fromEntries(testResponse.headers.entries()));

  } catch (error) {
    console.error('❌ Connection test failed:', error);
    
    // Additional debugging info
    console.log('🔍 Debug info:');
    console.log('  - Platform:', Platform.OS);
    console.log('  - Server URL:', serverUrl);
    console.log('  - Error type:', error instanceof Error ? error.name : typeof error);
    console.log('  - Error message:', error instanceof Error ? error.message : String(error));
  }
};

// Alternative URLs to try if the main one fails
export const getAlternativeUrls = (): string[] => {
  if (Platform.OS === 'android') {
    return [
      'http://192.168.31.241:3001', // Wi-Fi IP (current)
      'http://10.0.2.2:3001',       // Android emulator
      'http://192.168.1.241:3001',  // Alternative Wi-Fi range
      'http://localhost:3001',      // Localhost fallback
    ];
  } else {
    return [
      'http://localhost:3001',      // iOS simulator
      'http://127.0.0.1:3001',      // Alternative localhost
    ];
  }
};

export const testAllUrls = async (): Promise<string | null> => {
  const urls = getAlternativeUrls();
  console.log('🧪 Testing all possible URLs...');

  for (const url of urls) {
    try {
      console.log(`🔗 Trying: ${url}`);
      const response = await fetch(`${url}/health`, {
        method: 'GET',
        timeout: 5000,
      });

      if (response.ok) {
        console.log(`✅ Success with: ${url}`);
        return url;
      } else {
        console.log(`❌ Failed with: ${url} (${response.status})`);
      }
    } catch (error) {
      console.log(`❌ Error with: ${url} - ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  console.log('❌ All URLs failed');
  return null;
};
