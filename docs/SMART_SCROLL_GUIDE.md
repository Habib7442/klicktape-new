# Smart Scroll Chat Guide

This guide explains how to implement smooth, intelligent scrolling behavior in your chat screens that prevents unwanted auto-scrolling when users are viewing older messages.

## 🚨 **Problem Solved**

**Before:** Chat automatically scrolls to bottom even when user is reading older messages, causing frustrating interruptions.

**After:** Smart scrolling that:
- ✅ Only auto-scrolls when user is near the bottom
- ✅ Always scrolls for your own messages
- ✅ Shows a "scroll to bottom" button when needed
- ✅ Respects user's current scroll position
- ✅ Provides smooth, non-intrusive behavior

## 🔧 **Implementation**

### **1. Updated Chat Screen**

Your main chat screen (`app/(root)/chat/[id].tsx`) now includes:

- **Smart scroll detection** - Knows when user is actively scrolling
- **Bottom proximity detection** - Tracks if user is near bottom of chat
- **Intelligent auto-scroll** - Only scrolls when appropriate
- **Scroll to bottom button** - Appears when user scrolls up

### **2. Reusable Hook**

```typescript
import { useSmartScroll } from '../hooks/useSmartScroll';

const {
  flatListRef,
  isUserScrolling,
  isNearBottom,
  handleScroll,
  smartScrollToBottom,
  scrollToBottomButtonVisible,
} = useSmartScroll({
  messages,
  userId,
  loading,
});
```

### **3. Reusable Components**

```typescript
import ScrollToBottomButton from '../components/ScrollToBottomButton';

<ScrollToBottomButton
  visible={scrollToBottomButtonVisible}
  onPress={() => smartScrollToBottom(true, true)}
/>
```

## 🎯 **Key Features**

### **Smart Auto-Scroll Logic**

```typescript
// ✅ Always scroll for own messages
if (isOwnMessage) {
  smartScrollToBottom(true, true);
}

// ✅ Smart scroll for others' messages
else {
  smartScrollToBottom(true, false);
}
```

### **User Scroll Detection**

```typescript
// Detects when user is actively scrolling
const handleScroll = (event) => {
  const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
  const distanceFromBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height);
  const nearBottom = distanceFromBottom <= 100; // 100px threshold
  
  setIsNearBottom(nearBottom);
  setIsUserScrolling(true);
  
  // Stop detecting after 1 second of no scrolling
  setTimeout(() => setIsUserScrolling(false), 1000);
};
```

### **Scroll to Bottom Button**

- Appears when user scrolls up from bottom
- Animated fade in/out
- Customizable position and size
- Forces scroll to bottom when pressed

## 📱 **Usage Examples**

### **Basic Integration**

```typescript
// In your existing chat screen
import { useSmartScroll } from '../hooks/useSmartScroll';
import ScrollToBottomButton from '../components/ScrollToBottomButton';

const ChatScreen = () => {
  const {
    flatListRef,
    handleScroll,
    smartScrollToBottom,
    scrollToBottomButtonVisible,
  } = useSmartScroll({ messages, userId, loading });

  return (
    <View>
      <FlatList
        ref={flatListRef}
        data={messages}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        // ... other props
      />
      
      <ScrollToBottomButton
        visible={scrollToBottomButtonVisible}
        onPress={() => smartScrollToBottom(true, true)}
      />
    </View>
  );
};
```

### **Complete Demo**

```typescript
import SmartScrollChatExample from '../examples/SmartScrollChatExample';

// Test the smart scroll behavior
<SmartScrollChatExample
  userId="user1"
  recipientId="user2"
/>
```

## 🔧 **Configuration Options**

### **Scroll Threshold**

```typescript
// Adjust how close to bottom triggers "near bottom"
const threshold = 100; // pixels from bottom
const nearBottom = distanceFromBottom <= threshold;
```

### **Scroll Timeout**

```typescript
// How long to wait before stopping scroll detection
setTimeout(() => setIsUserScrolling(false), 1000); // 1 second
```

### **Button Position**

```typescript
<ScrollToBottomButton
  visible={scrollToBottomButtonVisible}
  bottom={80}    // Distance from bottom
  right={20}     // Distance from right
  size={40}      // Button size
  iconSize={20}  // Icon size
  onPress={() => smartScrollToBottom(true, true)}
/>
```

## 🎮 **Behavior Rules**

### **When Auto-Scroll Happens:**
- ✅ User sends a message (always)
- ✅ User receives a message AND is near bottom
- ✅ User receives a message AND is not actively scrolling
- ✅ Keyboard shows/hides AND user is near bottom

### **When Auto-Scroll is Prevented:**
- ❌ User is actively scrolling up
- ❌ User is viewing older messages (not near bottom)
- ❌ User is in the middle of reading something

### **Force Scroll Scenarios:**
- 🔄 User sends a message
- 🔄 Initial message load
- 🔄 User taps "scroll to bottom" button

## 🧪 **Testing**

Use the demo component to test different scenarios:

1. **Add test messages** - Fill chat with content
2. **Scroll up** - See scroll-to-bottom button appear
3. **Send message** - Should force scroll to bottom
4. **Simulate received** - Should only scroll if near bottom
5. **Scroll while receiving** - Should not interrupt your reading

## 🔍 **Debug Information**

The demo shows real-time status:
- **Scrolling**: Whether user is actively scrolling
- **Near Bottom**: Whether user is close to bottom
- **Button Visible**: Whether scroll button should show

## 📊 **Performance**

- **Scroll event throttling**: 16ms for smooth detection
- **Timeout cleanup**: Prevents memory leaks
- **Efficient calculations**: Minimal impact on performance
- **Native animations**: Smooth button transitions

## 🚀 **Migration from Old System**

If you have existing auto-scroll code:

1. **Remove old auto-scroll triggers**:
   ```typescript
   // ❌ Remove these
   onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
   onLayout={() => flatListRef.current?.scrollToEnd()}
   ```

2. **Replace with smart scroll**:
   ```typescript
   // ✅ Add these
   onScroll={handleScroll}
   scrollEventThrottle={16}
   onContentSizeChange={() => {
     if (loading || isNearBottom) {
       smartScrollToBottom(false);
     }
   }}
   ```

3. **Update message handlers**:
   ```typescript
   // ❌ Old way
   setTimeout(() => flatListRef.current?.scrollToEnd(), 100);
   
   // ✅ New way
   smartScrollToBottom(true, false);
   ```

## 🎯 **Best Practices**

1. **Always force scroll for own messages**
2. **Use smart scroll for received messages**
3. **Show scroll button when user scrolls up**
4. **Respect user's reading position**
5. **Provide smooth animations**
6. **Clean up timeouts on unmount**

## 🔧 **Customization**

You can customize the behavior by:
- Adjusting the bottom threshold
- Changing scroll timeout duration
- Modifying button appearance
- Adding haptic feedback
- Implementing custom animations

The smart scroll system is designed to be flexible and can be adapted to your specific chat requirements while maintaining excellent user experience.

## 📱 **Result**

Your chat now provides:
- **Smooth scrolling** without interruptions
- **Intelligent behavior** that respects user intent
- **Visual feedback** with scroll-to-bottom button
- **Consistent experience** across all scenarios
- **Better UX** for reading older messages
