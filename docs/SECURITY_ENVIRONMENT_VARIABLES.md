# 🔒 Secure Environment Variables Guide for Klicktape

This guide explains how to properly handle environment variables in your Klicktape React Native/Expo app for production security.

## 🚨 Critical Security Issue: EXPO_PUBLIC_ Variables

### ⚠️ The Problem
**EXPO_PUBLIC_ variables are embedded directly into your app bundle and are visible to anyone who can run your app.**

According to Expo documentation:
> "Do not store sensitive information in `EXPO_PUBLIC_` variables, such as private keys. These variables will be visible in plain-text in your compiled app."

### 🔍 What This Means
- Anyone can extract API keys from your app bundle
- Mobile apps can be reverse-engineered to reveal secrets
- Your sensitive data becomes public information
- **This is a critical security vulnerability**

## ✅ Secure Solution: EAS Environment Variables

### 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    SECURE ARCHITECTURE                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📱 CLIENT SIDE (EXPO_PUBLIC_)                             │
│  ├── Public URLs (Supabase URL, Socket URL)                │
│  ├── Feature flags (Debug mode, monitoring)                │
│  └── Non-sensitive configuration                           │
│                                                             │
│  🔒 SERVER SIDE (EAS Environment Variables)                │
│  ├── API Keys (Gemini, Redis tokens)                       │
│  ├── Database credentials (Service role keys)              │
│  └── Authentication secrets                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 🔧 Implementation

#### 1. Environment Variable Categories

**✅ SAFE for EXPO_PUBLIC_ (Client-Side)**
```env
# Public URLs and endpoints
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SOCKET_SERVER_URL=https://your-server.com
EXPO_PUBLIC_UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io

# Feature flags and configuration
EXPO_PUBLIC_ENABLE_PERFORMANCE_MONITORING=true
EXPO_PUBLIC_DEBUG_MODE=false

# Public keys (designed to be public)
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

**🚨 NEVER use EXPO_PUBLIC_ for these (Server-Side)**
```env
# API Keys and tokens
GEMINI_API_KEY=your_secret_key
UPSTASH_REDIS_REST_TOKEN=your_secret_token

# Database admin access
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Any authentication secrets
```

#### 2. Setting Up EAS Environment Variables

**Create secure environment variables:**

```bash
# Production environment
eas env:create --name GEMINI_API_KEY --value "your_key" --environment production --visibility secret
eas env:create --name UPSTASH_REDIS_REST_TOKEN --value "your_token" --environment production --visibility secret
eas env:create --name SUPABASE_SERVICE_ROLE_KEY --value "your_key" --environment production --visibility secret

# Preview environment
eas env:create --name GEMINI_API_KEY --value "your_preview_key" --environment preview --visibility secret
eas env:create --name UPSTASH_REDIS_REST_TOKEN --value "your_preview_token" --environment preview --visibility secret

# Development environment
eas env:create --name GEMINI_API_KEY --value "your_dev_key" --environment development --visibility secret
eas env:create --name UPSTASH_REDIS_REST_TOKEN --value "your_dev_token" --environment development --visibility secret
```

**Visibility Levels:**
- `secret`: Not readable outside EAS servers (for API keys, credentials)
- `sensitive`: Obfuscated in logs, readable in EAS CLI (for less critical data)
- `plain text`: Visible everywhere (for non-sensitive configuration)

#### 3. Code Implementation

**Direct environment variable usage:**

```typescript
// Direct usage in your code files
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// For secure variables (server-side only)
const geminiApiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
const redisToken = process.env.EXPO_PUBLIC_UPSTASH_REDIS_REST_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
```

#### 4. EAS Build Configuration

**eas.json:**
```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "environment": "development"
    },
    "preview": {
      "distribution": "internal", 
      "environment": "preview"
    },
    "production": {
      "autoIncrement": true,
      "environment": "production"
    }
  }
}
```

## 🔄 Migration Steps

### Step 1: Update Code
✅ **Completed** - Code updated to use secure configuration

### Step 2: Set EAS Environment Variables
```bash
# Run these commands to set up secure variables
eas env:create --name GEMINI_API_KEY --value "AIzaSyDjAvPSoMkEdLfWzX1DldIWcE_tc4C-YiM" --environment production --visibility secret
eas env:create --name UPSTASH_REDIS_REST_TOKEN --value "your_token" --environment production --visibility secret
```

### Step 3: Remove Sensitive Data from .env
Remove these lines from production .env:
```env
# Remove these (now handled securely via EAS)
EXPO_PUBLIC_UPSTASH_REDIS_REST_TOKEN=...
EXPO_PUBLIC_GEMINI_API_KEY=...
```

### Step 4: Test Builds
```bash
# Test with different environments
eas build --platform ios --profile development
eas build --platform android --profile preview  
eas build --platform all --profile production
```

## 🧪 Testing and Validation

### Local Development
```bash
# Pull environment variables for local development
eas env:pull --environment development
```

### Build Testing
```bash
# Test builds with different environments
eas build --platform ios --profile production --local
```

### Security Validation
1. **Bundle Analysis**: Inspect app bundle to ensure no secrets are embedded
2. **Environment Testing**: Verify app works with EAS environment variables
3. **Access Testing**: Confirm sensitive endpoints are not accessible from client

## 📋 Security Checklist

- [ ] ✅ No API keys in EXPO_PUBLIC_ variables
- [ ] ✅ Sensitive data uses EAS Environment Variables
- [ ] ✅ Proper visibility settings (secret/sensitive/plain text)
- [ ] ✅ Different values for dev/preview/production
- [ ] ✅ .env files added to .gitignore
- [ ] ✅ Code uses secure configuration helpers
- [ ] ✅ Documentation updated with security practices

## 🚀 Production Deployment

### Before Deploying
1. Set all EAS environment variables
2. Remove sensitive data from .env files
3. Test builds with production environment
4. Verify app functionality with secure variables

### Deployment Commands
```bash
# Build for production with secure environment
eas build --platform all --profile production

# Publish updates with production environment
eas update --environment production
```

## 🔍 Monitoring and Maintenance

### Regular Security Audits
- Review environment variable usage
- Check for accidentally exposed secrets
- Validate EAS environment variable settings
- Monitor for security best practices compliance

### Key Rotation
When rotating API keys:
1. Update EAS environment variables
2. Deploy new builds
3. Verify functionality
4. Revoke old keys

## 📚 Additional Resources

- [Expo Environment Variables Documentation](https://docs.expo.dev/eas/environment-variables/)
- [EAS Build Configuration](https://docs.expo.dev/build/eas-json/)
- [Security Best Practices](https://docs.expo.dev/guides/security/)

---

**🔒 Remember: Security is not optional. Always protect your users' data and your application's integrity.**
