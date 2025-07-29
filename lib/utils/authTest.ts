/**
 * Simple test utility to verify auth manager functionality
 */

import { authManager } from '../authManager';

export const testAuthManager = async () => {
  try {
    console.log('🧪 Testing Auth Manager...');
    
    const user = await authManager.getCurrentUser();
    
    if (user) {
      console.log('✅ Auth Manager working:', {
        id: user.id,
        email: user.email,
        username: user.username,
        cached: authManager.isAuthenticated(),
      });
    } else {
      console.log('ℹ️ No authenticated user found');
    }
    
    return user;
  } catch (error) {
    console.error('❌ Auth Manager test failed:', error);
    return null;
  }
};
