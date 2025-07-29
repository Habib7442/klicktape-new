/**
 * Environment Variable Type Declarations
 *
 * SECURITY NOTE: Only EXPO_PUBLIC_ variables are available in the client bundle.
 * Non-EXPO_PUBLIC_ variables are for server-side/build-time use only.
 */

declare namespace NodeJS {
  interface ProcessEnv {
    // ============================================================================
    // PUBLIC CLIENT-SIDE VARIABLES (Safe for EXPO_PUBLIC_)
    // ============================================================================

    // Supabase public configuration
    EXPO_PUBLIC_SUPABASE_URL: string;
    EXPO_PUBLIC_SUPABASE_ANON_KEY: string;

    // Public service URLs
    EXPO_PUBLIC_SOCKET_SERVER_URL: string;
    EXPO_PUBLIC_UPSTASH_REDIS_REST_URL: string;

    // Feature flags and configuration
    EXPO_PUBLIC_ENABLE_PERFORMANCE_MONITORING: string;
    EXPO_PUBLIC_DEBUG_MODE: string;

    // ============================================================================
    // SECURE SERVER-SIDE VARIABLES (NOT exposed to client)
    // ============================================================================

    // Redis authentication (should be 'sensitive' or 'secret' in EAS)
    UPSTASH_REDIS_REST_TOKEN: string;

    // AI service keys (should be 'secret' in EAS)
    GEMINI_API_KEY: string;

    // Database admin access (should be 'secret' in EAS)
    SUPABASE_SERVICE_ROLE_KEY: string;

    // Build-time configuration
    APP_VARIANT: 'development' | 'preview' | 'production';
    PORT: string;
  }
}

// Legacy @env module support (deprecated - use process.env instead)
declare module '@env' {
  export const SUPABASE_URL: string;
  export const SUPABASE_ANON_KEY: string;
}