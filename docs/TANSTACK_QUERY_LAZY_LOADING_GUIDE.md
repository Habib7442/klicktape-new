# TanStack Query Lazy Loading Implementation Guide

## 🎯 **Problem Solved**

Removed TanStack Query from initial app load to eliminate EventTarget errors while keeping it available for data fetching when needed.

## ✅ **What Was Changed**

### **1. Removed from Initial Load**
- ❌ Removed `QueryProvider` from `app/_layout.tsx`
- ❌ Removed polyfill imports from main layout
- ❌ No more EventTarget errors on app startup

### **2. Created Lazy Loading System**
- ✅ `LazyQueryProvider` - Loads TanStack Query only when needed
- ✅ `conditionalHooks.ts` - Hooks that work with or without TanStack Query
- ✅ Fallback to direct Supabase calls if TanStack Query fails

## 🚀 **How to Use**

### **For Screens That Need Data Fetching**

```tsx
import React from 'react';
import { LazyQueryProvider } from '@/lib/query/LazyQueryProvider';
import { useStories, usePosts } from '@/lib/query/conditionalHooks';

// Wrap your screen with LazyQueryProvider
const HomeScreen = () => {
  return (
    <LazyQueryProvider>
      <HomeContent />
    </LazyQueryProvider>
  );
};

// Use conditional hooks inside the provider
const HomeContent = () => {
  const { data: stories, isLoading, error } = useStories();
  const { data: posts } = usePosts();
  
  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  
  return (
    <View>
      {/* Render your stories and posts */}
    </View>
  );
};
```

### **Available Hooks**

```tsx
// Stories
const { data, isLoading, error, refetch } = useStories();

// Posts/Tapes
const { data, isLoading, error, refetch } = usePosts();

// User Profile
const { data, isLoading, error } = useUserProfile(userId);

// Notifications
const { data, isLoading, error } = useNotifications(userId);

// Chat Messages
const { data, isLoading, error } = useChatMessages(chatId);

// Custom Query
const { data, isLoading, error } = useConditionalQuery(
  ['custom-key'],
  async () => {
    // Your custom fetch logic
    const { data } = await supabase.from('table').select('*');
    return data;
  }
);
```

## 📁 **File Structure**

```
lib/query/
├── LazyQueryProvider.tsx     # Lazy loads TanStack Query
├── conditionalHooks.ts       # Hooks that work with/without TanStack Query
├── QueryProvider.tsx         # Original provider (not used in initial load)
└── queryClient.ts           # Query client configuration

components/
└── DataFetchingExample.tsx  # Example implementation
```

## 🔧 **Implementation Steps**

### **Step 1: Wrap Screens That Need Data Fetching**

```tsx
// Before (caused EventTarget errors)
const App = () => (
  <QueryProvider>
    <YourApp />
  </QueryProvider>
);

// After (no initial errors)
const HomeScreen = () => (
  <LazyQueryProvider>
    <HomeContent />
  </LazyQueryProvider>
);
```

### **Step 2: Replace TanStack Query Hooks**

```tsx
// Before
import { useQuery } from '@tanstack/react-query';

const { data } = useQuery({
  queryKey: ['stories'],
  queryFn: fetchStories,
});

// After
import { useStories } from '@/lib/query/conditionalHooks';

const { data, isLoading, error } = useStories();
```

### **Step 3: Add to Screens That Need It**

Update these screens to use `LazyQueryProvider`:
- Home screen (for stories/posts)
- Profile screen (for user data)
- Chat screens (for messages)
- Notifications screen
- Any screen that fetches data

## 🎯 **Benefits**

### **✅ No Initial Load Errors**
- App starts without EventTarget errors
- No polyfill complications
- Faster initial load time

### **✅ TanStack Query When Needed**
- Full TanStack Query features available in data screens
- Caching, background updates, optimistic updates
- Automatic retries and error handling

### **✅ Graceful Fallbacks**
- If TanStack Query fails to load, falls back to direct Supabase
- App continues to work even if polyfills fail
- Better error resilience

### **✅ Performance Benefits**
- Lazy loading reduces initial bundle size
- TanStack Query only loads when actually needed
- Better memory usage

## 🧪 **Testing**

### **Test App Startup**
1. App should start without EventTarget errors
2. No polyfill-related crashes
3. Authentication flow works normally

### **Test Data Fetching Screens**
1. Navigate to home screen
2. Should see "Loading TanStack Query modules..." briefly
3. Then "TanStack Query modules loaded successfully"
4. Data should load normally

### **Test Fallback Behavior**
1. If TanStack Query fails, should see warning about fallback
2. Data should still load using direct Supabase calls
3. App should remain functional

## 🔍 **Debugging**

### **Console Messages to Look For**

```
✅ App startup (no EventTarget errors)
🔄 Loading TanStack Query modules...
✅ TanStack Query modules loaded successfully
🔄 Using TanStack Query for: ['stories']
```

### **If TanStack Query Fails**

```
❌ Failed to load TanStack Query: [error]
⚠️ TanStack Query not available, falling back to direct Supabase calls
🔄 Using direct Supabase call for: ['stories']
```

## 📋 **Migration Checklist**

- [ ] Remove QueryProvider from main app layout
- [ ] Add LazyQueryProvider to screens that need data fetching
- [ ] Replace useQuery hooks with conditional hooks
- [ ] Test app startup (no EventTarget errors)
- [ ] Test data fetching screens work correctly
- [ ] Verify fallback behavior if TanStack Query fails

## 🎉 **Result**

Your app now:
- ✅ Starts without EventTarget errors
- ✅ Has TanStack Query available when needed
- ✅ Falls back gracefully if TanStack Query fails
- ✅ Maintains all caching and performance benefits
- ✅ Is more resilient to polyfill issues

This approach gives you the best of both worlds: a stable app startup and powerful data fetching capabilities when you need them!
