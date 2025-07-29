/**
 * Secure Environment Configuration for Klicktape
 * 
 * This file handles environment variables with proper security practices:
 * - EXPO_PUBLIC_ variables are safe for client-side use (public data only)
 * - Non-EXPO_PUBLIC_ variables are for server-side/build-time use only
 * - Sensitive data should never use EXPO_PUBLIC_ prefix
 */

// ============================================================================
// PUBLIC CLIENT-SIDE VARIABLES (Safe for EXPO_PUBLIC_)
// ============================================================================

export const PUBLIC_CONFIG = {
  // Supabase public configuration
  SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
  
  // Public service URLs
  SOCKET_SERVER_URL: process.env.EXPO_PUBLIC_SOCKET_SERVER_URL || '',
  UPSTASH_REDIS_REST_URL: process.env.EXPO_PUBLIC_UPSTASH_REDIS_REST_URL || '',
  
  // Feature flags and non-sensitive configuration
  ENABLE_PERFORMANCE_MONITORING: process.env.EXPO_PUBLIC_ENABLE_PERFORMANCE_MONITORING === 'true',
  DEBUG_MODE: process.env.EXPO_PUBLIC_DEBUG_MODE === 'true',
} as const;

// ============================================================================
// SERVER-SIDE/BUILD-TIME VARIABLES (Secure - NOT exposed to client)
// ============================================================================

export const SECURE_CONFIG = {
  // ⚠️ DEVELOPMENT ONLY: These use EXPO_PUBLIC_ for local development
  // 🚨 SECURITY WARNING: In production, these should be set via EAS Environment Variables
  // 📝 TODO: Remove EXPO_PUBLIC_ prefix and use EAS Environment Variables for production

  // Redis authentication (should be 'sensitive' or 'secret' in EAS)
  UPSTASH_REDIS_REST_TOKEN: process.env.EXPO_PUBLIC_UPSTASH_REDIS_REST_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '',

  // AI service keys (should be 'secret' in EAS)
  GEMINI_API_KEY: process.env.EXPO_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '',

  // Database admin access (should be 'secret' in EAS)
  SUPABASE_SERVICE_ROLE_KEY: process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '',

  // Server configuration
  PORT: process.env.PORT || '3000',
} as const;

// ============================================================================
// VALIDATION AND HELPERS
// ============================================================================

/**
 * Validates that required public environment variables are present
 */
export function validatePublicConfig(): { isValid: boolean; missing: string[] } {
  const required = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
  ] as const;
  
  const missing = required.filter(key => !PUBLIC_CONFIG[key]);
  
  return {
    isValid: missing.length === 0,
    missing: missing as string[]
  };
}

/**
 * Validates that required secure environment variables are present
 * Note: This should only be called on the server side or during build
 */
export function validateSecureConfig(): { isValid: boolean; missing: string[] } {
  const required = [
    'UPSTASH_REDIS_REST_TOKEN',
    'GEMINI_API_KEY',
  ] as const;
  
  const missing = required.filter(key => !SECURE_CONFIG[key]);
  
  return {
    isValid: missing.length === 0,
    missing: missing as string[]
  };
}

/**
 * Gets Redis configuration with proper fallback
 */
export function getRedisConfig() {
  return {
    url: PUBLIC_CONFIG.UPSTASH_REDIS_REST_URL,
    token: SECURE_CONFIG.UPSTASH_REDIS_REST_TOKEN,
    enabled: !!(PUBLIC_CONFIG.UPSTASH_REDIS_REST_URL && SECURE_CONFIG.UPSTASH_REDIS_REST_TOKEN),
  };
}

/**
 * Gets Supabase configuration
 */
export function getSupabaseConfig() {
  return {
    url: PUBLIC_CONFIG.SUPABASE_URL,
    anonKey: PUBLIC_CONFIG.SUPABASE_ANON_KEY,
    serviceRoleKey: SECURE_CONFIG.SUPABASE_SERVICE_ROLE_KEY,
  };
}

/**
 * Gets AI service configuration
 */
export function getAIConfig() {
  return {
    geminiApiKey: SECURE_CONFIG.GEMINI_API_KEY,
  };
}

// ============================================================================
// SECURITY WARNINGS
// ============================================================================

/**
 * Warns about development-only security configuration
 */
export function warnAboutDevelopmentSecurity() {
  if (__DEV__ && (
    process.env.EXPO_PUBLIC_UPSTASH_REDIS_REST_TOKEN ||
    process.env.EXPO_PUBLIC_GEMINI_API_KEY ||
    process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
  )) {
    console.warn('🚨 SECURITY WARNING: Sensitive data is exposed via EXPO_PUBLIC_ variables!');
    console.warn('📝 This is for development only. For production:');
    console.warn('   1. Remove EXPO_PUBLIC_ versions from .env');
    console.warn('   2. Set secure variables via EAS Environment Variables');
    console.warn('   3. Run: npm run setup-eas-env');
  }
}

// ============================================================================
// DEVELOPMENT HELPERS
// ============================================================================

/**
 * Logs configuration status (for development only)
 */
export function logConfigStatus() {
  if (__DEV__) {
    const publicValidation = validatePublicConfig();
    const secureValidation = validateSecureConfig();
    
    console.log('🔧 Environment Configuration Status:');
    console.log('📱 Public Config:', publicValidation.isValid ? '✅ Valid' : '❌ Missing: ' + publicValidation.missing.join(', '));
    console.log('🔒 Secure Config:', secureValidation.isValid ? '✅ Valid' : '❌ Missing: ' + secureValidation.missing.join(', '));
    
    if (!publicValidation.isValid || !secureValidation.isValid) {
      console.warn('⚠️ Some environment variables are missing. Check your .env file and EAS environment variables.');
    }
  }
}
