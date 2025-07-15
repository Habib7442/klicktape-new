# Instagram-Style Chat Layout Guide

This guide explains how to implement Instagram-style chat layout where sender messages appear on the right (blue) and receiver messages appear on the left (gray).

## 🎯 **Key Features Implemented**

### **✅ Message Positioning**
- **Sender messages**: Right side with blue background
- **Receiver messages**: Left side with gray background
- **Maximum width**: 80% of screen width
- **Proper alignment**: Using `alignSelf` for positioning

### **✅ Instagram-Style Colors**
- **Sender bubbles**: `#0084FF` (Instagram blue)
- **Receiver bubbles**: `#F0F0F0` (Light gray) in light mode, `rgba(255, 255, 255, 0.1)` in dark mode
- **Sender text**: White (`#FFFFFF`)
- **Receiver text**: Theme-based color
- **Timestamps**: Semi-transparent colors

### **✅ Visual Design**
- **Border radius**: 18px for rounded bubbles
- **No borders**: Clean, borderless design
- **Proper spacing**: Consistent margins and padding
- **Date headers**: Grouped messages by date

## 🔧 **Implementation Details**

### **1. Message Container Styles**

```typescript
messageContainer: {
  marginBottom: 8,
  marginHorizontal: 16,
  maxWidth: "80%", // Limit width like Instagram
  borderRadius: 16,
},
messageLeft: {
  alignSelf: "flex-start", // Receiver messages on left
  alignItems: "flex-start",
},
messageRight: {
  alignSelf: "flex-end", // Sender messages on right
  alignItems: "flex-end",
},
```

### **2. Message Bubble Styling**

```typescript
const bubbleStyle = {
  ...styles.messageBubble,
  backgroundColor:
    item.sender_id === userId
      ? "#0084FF" // Instagram blue for sender
      : isDarkMode
        ? "rgba(255, 255, 255, 0.1)" // Dark gray for receiver in dark mode
        : "#F0F0F0", // Light gray for receiver in light mode
  borderWidth: 0, // Remove border for cleaner look
};
```

### **3. Text Colors**

```typescript
// Message text color
color: item.sender_id === userId 
  ? "#FFFFFF" // White text for sender messages
  : colors.text // Theme text color for receiver messages

// Timestamp color
color: item.sender_id === userId 
  ? "rgba(255, 255, 255, 0.7)" // Light white for sender timestamp
  : colors.textTertiary // Theme tertiary color for receiver timestamp
```

## 📱 **Usage Example**

### **Basic Implementation**

```typescript
// In your message render function
<View style={[
  styles.messageContainer,
  item.sender_id === userId ? styles.messageRight : styles.messageLeft,
]}>
  <View style={bubbleStyle}>
    <Text style={textStyle}>
      {item.content}
    </Text>
    <Text style={timestampStyle}>
      {formatMessageTime(item.created_at)}
    </Text>
  </View>
</View>
```

### **Complete Demo**

```typescript
import InstagramChatExample from '../examples/InstagramChatExample';

// Test the Instagram-style layout
<InstagramChatExample
  userId="user1"
  recipientId="user2"
/>
```

## 🎨 **Visual Comparison**

### **Before (Generic Chat)**
- All messages looked similar
- No clear sender/receiver distinction
- Inconsistent alignment
- Generic colors

### **After (Instagram Style)**
- ✅ **Sender**: Right side, blue background, white text
- ✅ **Receiver**: Left side, gray background, dark text
- ✅ **Clear distinction**: Easy to identify who sent what
- ✅ **Professional look**: Matches popular messaging apps

## 🔧 **Customization Options**

### **Colors**

```typescript
// Customize sender color
const SENDER_COLOR = "#0084FF"; // Instagram blue
const SENDER_COLOR_DARK = "#0066CC"; // Darker blue for dark mode

// Customize receiver color
const RECEIVER_COLOR_LIGHT = "#F0F0F0"; // Light gray
const RECEIVER_COLOR_DARK = "rgba(255, 255, 255, 0.1)"; // Dark gray
```

### **Dimensions**

```typescript
// Adjust message width
maxWidth: "75%", // Narrower messages
maxWidth: "85%", // Wider messages

// Adjust border radius
borderRadius: 16, // Less rounded
borderRadius: 22, // More rounded
```

### **Spacing**

```typescript
// Adjust message spacing
marginVertical: 4, // More space between messages
marginVertical: 1, // Less space between messages

// Adjust horizontal margins
marginHorizontal: 12, // Less side margin
marginHorizontal: 20, // More side margin
```

## 📊 **Layout Structure**

```
Chat Container
├── Date Header (centered)
├── Receiver Message (left aligned)
│   └── Gray bubble with dark text
├── Sender Message (right aligned)
│   └── Blue bubble with white text
├── Receiver Message (left aligned)
│   └── Gray bubble with dark text
└── Input Container (bottom)
```

## 🎯 **Best Practices**

### **1. Consistent Alignment**
- Always use `alignSelf` for message positioning
- Use `alignItems` for content alignment within bubbles
- Maintain consistent spacing

### **2. Color Accessibility**
- Ensure sufficient contrast for text readability
- Test in both light and dark modes
- Use semi-transparent colors for timestamps

### **3. Responsive Design**
- Limit message width to prevent overly wide bubbles
- Use flexible layouts that work on different screen sizes
- Maintain proper touch targets

### **4. Performance**
- Use `useCallback` for render functions
- Implement proper key extraction
- Consider virtualization for large message lists

## 🚀 **Integration Steps**

1. **Update message container styles** with `alignSelf`
2. **Implement color logic** based on sender/receiver
3. **Remove unnecessary borders** for cleaner look
4. **Update text colors** for proper contrast
5. **Test on different devices** and themes

## 📱 **Result**

Your chat now has:
- ✅ **Instagram-style layout** with proper alignment
- ✅ **Clear visual distinction** between sender and receiver
- ✅ **Professional appearance** matching popular apps
- ✅ **Proper color contrast** for accessibility
- ✅ **Responsive design** that works on all devices

The layout now clearly shows:
- **Your messages**: Blue bubbles on the right
- **Their messages**: Gray bubbles on the left
- **Date headers**: Centered between message groups
- **Clean design**: No unnecessary borders or elements
