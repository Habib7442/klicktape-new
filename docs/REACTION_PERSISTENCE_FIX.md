# Reaction Persistence Fix

## 🐛 **The Problems**

1. **Duplicate key error**: `duplicate key value violates unique constraint "message_reactions_message_id_user_id_key"`
2. **Reactions disappearing**: When reloading app or adding reactions to other messages
3. **Inconsistent state**: UI not properly syncing with database

## 🔍 **Root Causes**

### 1. **Database Design Understanding**
- The database has a **unique constraint** on `(message_id, user_id)`
- This means **one reaction per user per message** (like Instagram/WhatsApp)
- Users can only have one emoji reaction per message, not multiple

### 2. **Socket.IO Handler Issues**
- Was trying to INSERT when should UPDATE/UPSERT
- No proper handling of reaction toggles (same emoji = remove)
- Duplicate reactions causing constraint violations

### 3. **UI State Management**
- Reactions being cleared on component re-renders
- Not properly handling real-time updates
- Optimistic updates not aligned with database design

## ✅ **Fixes Applied**

### 1. **Server-side: Proper UPSERT Logic**
```javascript
// Before: INSERT causing duplicates
const { error } = await supabase.from("message_reactions").insert({...});

// After: Smart toggle logic
if (existingReaction && existingReaction.emoji === data.emoji) {
  // Same emoji - remove (toggle off)
  await supabase.from("message_reactions").delete().eq("id", existingReaction.id);
} else {
  // Different emoji or new - upsert
  await supabase.from("message_reactions").upsert({...}, {
    onConflict: 'message_id,user_id'
  });
}
```

### 2. **Client-side: Better State Management**
```javascript
// Before: Only server refresh
setTimeout(() => fetchReactions(), 100);

// After: Immediate optimistic + server refresh
setReactions(prevReactions => {
  // Immediate UI update based on action
  if (data.action === 'removed') {
    return removeEmojiFromState();
  } else {
    return addEmojiToState();
  }
});
// Then refresh from server for consistency
setTimeout(() => fetchReactions(), 500);
```

### 3. **Enhanced Debugging**
- Added detailed logging for reaction fetching
- Track when reactions are cleared vs updated
- Monitor message ID changes that trigger refetch

## 🎯 **Expected Behavior Now**

### **Single Reaction Per User Per Message:**
- User can only have **one emoji reaction** per message
- Clicking same emoji **toggles it off**
- Clicking different emoji **replaces** the previous one

### **Real-time Updates:**
- Reactions appear **instantly** on both screens
- **No duplicate key errors**
- **Persistent across app reloads**

### **UI Flow:**
1. **User A**: Clicks ❤️ → Appears instantly
2. **User B**: Sees ❤️ instantly via Socket.IO
3. **User A**: Clicks 😂 → ❤️ replaced with 😂
4. **User A**: Clicks 😂 again → 😂 removed (toggle)

## 🚀 **Test Instructions**

1. **Restart Socket.IO server**:
   ```bash
   cd server
   npm start
   ```

2. **Test reaction persistence**:
   - Add reaction ❤️ to message
   - **Reload app** → Reaction should still be there
   - Add reaction to different message → Previous reactions should remain

3. **Test reaction toggling**:
   - Click ❤️ → Should appear
   - Click ❤️ again → Should disappear (toggle)
   - Click 😂 → Should replace ❤️ (one reaction per user)

4. **Test real-time sync**:
   - User A adds ❤️ → User B sees it instantly
   - User A changes to 😂 → User B sees change instantly
   - User A removes 😂 → User B sees removal instantly

## 📊 **Console Logs to Monitor**

```javascript
// Good logs:
🔍 Fetching reactions for messages: 5
🔍 Server reactions received: 3 messages
🔍 Message abc123 has 2 reaction types
✅ Reaction upserted successfully: ❤️
😀 Socket.IO: Reaction update received: {action: "added", emoji: "❤️"}

// Fixed issues:
✅ Reaction removed successfully (toggle off)
✅ Reaction upserted successfully: 😂 (replaced ❤️)
```

## ✅ **Success Criteria**

- ✅ **No duplicate key errors**
- ✅ **Reactions persist across app reloads**
- ✅ **One reaction per user per message**
- ✅ **Real-time sync between users**
- ✅ **Proper reaction toggling**
- ✅ **Consistent UI state**

The key insight was understanding that the database design enforces **one reaction per user per message**, so the UI and logic needed to align with this constraint! 🎉
