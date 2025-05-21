/**
 * Secure Logger Utility
 * 
 * This utility provides secure logging functions that prevent sensitive information
 * from being logged in production environments.
 */

import Constants from 'expo-constants';

// Determine if we're in development mode
const isDev = __DEV__ || process.env.NODE_ENV === 'development';

// Define sensitive data patterns to redact
const SENSITIVE_PATTERNS = [
  // Email addresses
  /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/g,
  // Phone numbers (various formats)
  /(\+\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g,
  // Credit card numbers
  /\b(?:\d[ -]*?){13,16}\b/g,
  // Authentication tokens (common formats)
  /eyJ[a-zA-Z0-9_-]{5,}\.[a-zA-Z0-9_-]{5,}\.[a-zA-Z0-9_-]{5,}/g, // JWT
  /sk_live_[a-zA-Z0-9]{24}/g, // Stripe secret key
  /pk_live_[a-zA-Z0-9]{24}/g, // Stripe publishable key
  // API keys and secrets
  /api[_-]?key[_-]?[a-zA-Z0-9]{16,}/gi,
  /secret[_-]?key[_-]?[a-zA-Z0-9]{16,}/gi,
  // Passwords in objects
  /"password"\s*:\s*"[^"]+"/g,
  /'password'\s*:\s*'[^']+'/g,
  /password\s*:\s*['"][^'"]+['"]/g,
];

/**
 * Redacts sensitive information from a string
 * @param input The string to redact
 * @returns The redacted string
 */
const redactSensitiveInfo = (input: string): string => {
  if (typeof input !== 'string') return input;
  
  let redacted = input;
  SENSITIVE_PATTERNS.forEach(pattern => {
    redacted = redacted.replace(pattern, '[REDACTED]');
  });
  
  return redacted;
};

/**
 * Safely stringifies an object, redacting sensitive information
 * @param obj The object to stringify
 * @returns A safe string representation of the object
 */
const safeStringify = (obj: any): string => {
  if (obj === null || obj === undefined) return String(obj);
  
  try {
    // Handle Error objects
    if (obj instanceof Error) {
      const errorObj = {
        name: obj.name,
        message: obj.message,
        stack: isDev ? obj.stack : undefined
      };
      return redactSensitiveInfo(JSON.stringify(errorObj));
    }
    
    // Handle circular references
    const seen = new WeakSet();
    const stringified = JSON.stringify(obj, (key, value) => {
      // Skip password fields entirely
      if (key.toLowerCase().includes('password') || 
          key.toLowerCase().includes('secret') || 
          key.toLowerCase().includes('token')) {
        return '[REDACTED]';
      }
      
      // Handle circular references
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular]';
        }
        seen.add(value);
      }
      
      return value;
    });
    
    return redactSensitiveInfo(stringified);
  } catch (error) {
    return '[Object cannot be safely stringified]';
  }
};

/**
 * Secure logger that prevents sensitive information from being logged
 */
export const secureLogger = {
  /**
   * Log information in development, redacted in production
   */
  info: (...args: any[]): void => {
    if (isDev) {
      console.log(...args);
    } else {
      // In production, only log safe strings
      const safeArgs = args.map(arg => 
        typeof arg === 'string' ? redactSensitiveInfo(arg) : safeStringify(arg)
      );
      console.log(...safeArgs);
    }
  },
  
  /**
   * Log warnings in development, redacted in production
   */
  warn: (...args: any[]): void => {
    if (isDev) {
      console.warn(...args);
    } else {
      // In production, only log safe strings
      const safeArgs = args.map(arg => 
        typeof arg === 'string' ? redactSensitiveInfo(arg) : safeStringify(arg)
      );
      console.warn(...safeArgs);
    }
  },
  
  /**
   * Log errors in development, redacted in production
   */
  error: (...args: any[]): void => {
    // Always log errors, but redact sensitive info in production
    const safeArgs = !isDev 
      ? args.map(arg => 
          typeof arg === 'string' ? redactSensitiveInfo(arg) : safeStringify(arg)
        )
      : args;
    
    console.error(...safeArgs);
  },
  
  /**
   * Log debug information in development only
   */
  debug: (...args: any[]): void => {
    // Only log in development
    if (isDev) {
      console.log('[DEBUG]', ...args);
    }
  },
  
  /**
   * Log sensitive information in development only
   */
  sensitive: (...args: any[]): void => {
    // Only log in development and with explicit flag
    if (isDev && Constants.expoConfig?.extra?.enableSensitiveLogs) {
      console.log('[SENSITIVE]', ...args);
    }
  }
};

export default secureLogger;
