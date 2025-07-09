import { Platform } from 'react-native';

export const testServerConnection = async () => {
  console.log('🧪 Testing server connectivity...');

  const urls = [
    'http://10.0.2.2:3000/health',
    'http://192.168.52.201:3000/health',
    'http://localhost:3000/health'
  ];

  const results = [];

  for (const url of urls) {
    try {
      console.log(`🔍 Testing: ${url}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Server accessible at: ${url}`);
        console.log('📊 Server status:', data);
        results.push({ url: url.replace('/health', ''), status: 'success', data });
        return url.replace('/health', '');
      } else {
        console.log(`❌ Server not accessible at: ${url} (Status: ${response.status})`);
        results.push({ url, status: 'failed', error: `HTTP ${response.status}` });
      }
    } catch (error) {
      console.log(`❌ Failed to connect to: ${url}`, error.message);
      results.push({ url, status: 'error', error: error.message });
    }
  }

  console.log('📋 Connection test results:', results);
  console.log('❌ No server URLs are accessible');
  return null;
};

export const getOptimalServerUrl = () => {
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3000';
  } else if (Platform.OS === 'ios') {
    return 'http://localhost:3000';
  } else {
    return 'http://localhost:3000';
  }
};
