# EventTarget Polyfill Fix for React Native Hermes

## 🔍 **Problem Analysis**

The error `ReferenceError: Property 'EventTarget' doesn't exist, js engine: hermes` occurs because:

1. **TanStack Query v5** relies on web APIs like `EventTarget`, `Event`, and `AbortController`
2. **React Native Hermes engine** doesn't include these web APIs by default
3. **Missing polyfills** cause the app to crash when TanStack Query tries to use these APIs

## ✅ **Solution Implemented**

### **1. Created Comprehensive Polyfills**
- **File**: `polyfills.js` - Contains all required web API polyfills
- **APIs Covered**:
  - `EventTarget` - Core event handling for TanStack Query
  - `Event` - Basic event objects
  - `CustomEvent` - Custom event objects with detail data
  - `AbortController` - Request cancellation support
  - `AbortSignal` - Signal objects for cancellation
  - `TextEncoder/TextDecoder` - Text encoding utilities
  - `performance` - Basic performance timing

### **2. Added Polyfill Loading**
- **Updated**: `app/_layout.tsx` to import polyfills first
- **Order**: Polyfills load before any other imports to ensure availability
- **Testing**: Built-in development testing to verify polyfills work

### **3. Integrated TanStack Query Provider**
- **Added**: `QueryProvider` wrapper in main app layout
- **Structure**: Proper provider hierarchy for React Query context
- **Configuration**: Uses existing query client configuration

## 🔧 **Files Modified**

### **1. polyfills.js** (New)
```javascript
// Comprehensive polyfills for React Native Hermes
// Includes EventTarget, Event, CustomEvent, AbortController, etc.
```

### **2. app/_layout.tsx** (Updated)
```tsx
// Added polyfill import at the top
import '../polyfills';

// Added QueryProvider wrapper
<QueryProvider>
  <Provider store={store}>
    {/* Rest of app */}
  </Provider>
</QueryProvider>
```

### **3. lib/utils/polyfillTest.ts** (New)
```typescript
// Utility to test if polyfills are working correctly
export const testPolyfills = () => { /* ... */ };
```

## 🚀 **How It Works**

### **Loading Order**
```
1. polyfills.js loads first
2. Sets up global.EventTarget and other APIs
3. TanStack Query can now use these APIs
4. App loads normally without errors
```

### **EventTarget Implementation**
```javascript
global.EventTarget = class EventTarget {
  constructor() {
    this.listeners = {};
  }
  
  addEventListener(type, listener, options) {
    // Implementation for event listening
  }
  
  removeEventListener(type, listener) {
    // Implementation for event removal
  }
  
  dispatchEvent(event) {
    // Implementation for event dispatching
  }
};
```

## 🧪 **Testing**

### **Automatic Testing**
- Polyfills include built-in testing in development mode
- Console logs show if polyfills are working correctly
- Errors are logged if any polyfill fails

### **Manual Testing**
```typescript
import { testPolyfills } from '@/lib/utils/polyfillTest';

// Run in development to verify all polyfills
const results = testPolyfills();
```

## 🔍 **Verification Steps**

### **1. Check Console Logs**
Look for these messages on app startup:
```
✅ Polyfills loaded successfully for React Native Hermes
✅ EventTarget polyfill is working
🚀 TanStack Query initialized
```

### **2. Test TanStack Query**
- Create-profile screen should load without errors
- Any components using TanStack Query hooks should work
- No more "EventTarget doesn't exist" errors

### **3. Verify Provider Hierarchy**
```tsx
<QueryProvider>          // ✅ Added
  <Provider store={store}> // ✅ Redux
    <ThemeProvider>        // ✅ Theme
      {/* App content */}
    </ThemeProvider>
  </Provider>
</QueryProvider>
```

## 🐛 **Troubleshooting**

### **If EventTarget Error Persists**
1. **Check Import Order**: Ensure `import '../polyfills';` is the first import in `_layout.tsx`
2. **Clear Cache**: Run `npx expo start --clear` to clear Metro cache
3. **Restart App**: Completely close and restart the app
4. **Check Console**: Look for polyfill loading messages

### **If TanStack Query Still Fails**
1. **Verify QueryProvider**: Ensure it's wrapping the entire app
2. **Check Query Client**: Verify query client is properly configured
3. **Test Polyfills**: Run `testPolyfills()` to check individual APIs

### **Performance Considerations**
- Polyfills are lightweight and only load once
- No impact on production performance
- Only adds necessary APIs that are missing

## 📋 **Expected Results**

After implementing this fix:

1. **✅ No EventTarget Errors**: App loads without ReferenceError
2. **✅ TanStack Query Works**: All query hooks function correctly
3. **✅ Create-Profile Loads**: Enhanced create-profile screen works
4. **✅ Performance Maintained**: No noticeable performance impact
5. **✅ Development Tools**: Query devtools work in development

## 🔄 **Alternative Solutions**

If this polyfill approach doesn't work, alternatives include:

### **Option 1: Downgrade TanStack Query**
```bash
npm install @tanstack/react-query@^4.36.1
```

### **Option 2: Use React Native Polyfill Package**
```bash
npm install react-native-polyfill-globals
```

### **Option 3: Custom Query Implementation**
Replace TanStack Query with custom React hooks using Supabase directly.

## 🎯 **Summary**

The EventTarget polyfill fix provides:
- **Complete compatibility** with TanStack Query v5
- **Minimal performance impact** with lightweight polyfills
- **Robust error handling** with built-in testing
- **Easy maintenance** with clear documentation

This solution ensures your Klicktape app works seamlessly with TanStack Query while maintaining all the performance benefits of the enhanced caching system.
