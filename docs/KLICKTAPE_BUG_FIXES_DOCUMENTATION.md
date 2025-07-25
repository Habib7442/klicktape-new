# Klicktape App - 16 Critical Bug Fixes Documentation

## Overview
This document provides detailed analysis and implementation roadmap for fixing 16 critical bugs in the Klicktape app. Each issue includes root cause analysis, required database changes, code modifications, and implementation steps.

---

## **CORE FUNCTIONALITY ISSUES (Issues 1-12)**

### **Issue 1: Likes on posts in home feed are not being registered/saved**

**Root Cause:**
- App calls `supabase.rpc("toggle_like")` but database function doesn't exist
- Should call `lightning_toggle_like_v3` with correct parameters

**Database Requirements:**
- Function `lightning_toggle_like_v3` already exists in schema
- No additional database changes needed

**Code Changes Required:**
```typescript
// In components/Posts.tsx (line ~189)
// CHANGE FROM:
const { error } = await supabase.rpc("toggle_like", {
  post_id: postId,
  user_id: user.id,
});

// CHANGE TO:
const { error } = await supabase.rpc("lightning_toggle_like_v3", {
  post_id_param: postId,
  user_id_param: user.id,
});

// In app/(root)/post/[id].tsx (line ~201)
// Apply same change pattern
```

**Files to Modify:**
- `components/Posts.tsx`
- `app/(root)/post/[id].tsx`
- `lib/postsApi.ts` (update toggleLike function)

---

### **Issue 2: Like list is unavailable (users can't see who liked their posts)**

**Root Cause:**
- No screen/component exists to display who liked a post
- Missing navigation from like count to like list

**Database Requirements:**
- Add function to get post likes with user details:
```sql
CREATE OR REPLACE FUNCTION get_post_likes(post_id_param UUID, limit_param INTEGER DEFAULT 50)
RETURNS TABLE(
    user_id UUID,
    username TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.user_id,
        p.username,
        p.avatar_url,
        l.created_at
    FROM likes l
    JOIN profiles p ON l.user_id = p.id
    WHERE l.post_id = post_id_param
    ORDER BY l.created_at DESC
    LIMIT limit_param;
END;
$$;
```

**Code Changes Required:**
1. Create new screen: `app/(root)/post-likes/[id].tsx`
2. Add navigation from like count in Posts.tsx
3. Create LikesList component
4. Add API function in postsApi.ts

**Files to Create:**
- `app/(root)/post-likes/[id].tsx`
- `components/LikesList.tsx`

**Files to Modify:**
- `components/Posts.tsx` (make like count clickable)
- `lib/postsApi.ts` (add getPostLikes function)
- `app/(root)/_layout.tsx` (add new route)

---

### **Issue 3: Followers and following lists are unavailable**

**Root Cause:**
- No screens exist to display followers/following lists
- Missing navigation from follower/following counts

**Database Requirements:**
- Add functions for followers/following lists:
```sql
CREATE OR REPLACE FUNCTION get_user_followers(user_id_param UUID, limit_param INTEGER DEFAULT 50)
RETURNS TABLE(
    follower_id UUID,
    username TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        f.follower_id,
        p.username,
        p.avatar_url,
        f.created_at
    FROM follows f
    JOIN profiles p ON f.follower_id = p.id
    WHERE f.following_id = user_id_param
    ORDER BY f.created_at DESC
    LIMIT limit_param;
END;
$$;

CREATE OR REPLACE FUNCTION get_user_following(user_id_param UUID, limit_param INTEGER DEFAULT 50)
RETURNS TABLE(
    following_id UUID,
    username TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        f.following_id,
        p.username,
        p.avatar_url,
        f.created_at
    FROM follows f
    JOIN profiles p ON f.following_id = p.id
    WHERE f.follower_id = user_id_param
    ORDER BY f.created_at DESC
    LIMIT limit_param;
END;
$$;
```

**Code Changes Required:**
1. Create followers/following screens
2. Make follower/following counts clickable in profile screens
3. Create FollowList component

**Files to Create:**
- `app/(root)/followers/[id].tsx`
- `app/(root)/following/[id].tsx`
- `components/FollowList.tsx`

**Files to Modify:**
- `app/(root)/(tabs)/profile.tsx`
- `app/(root)/userProfile/[id].tsx`
- `lib/usersApi.ts`

---

### **Issue 4: Stories don't auto-play one after another in sequence**

**Root Cause:**
- StoryViewer only shows stories from the same user
- Missing logic to advance to next user's stories

**Database Requirements:**
- No database changes needed

**Code Changes Required:**
```typescript
// In components/StoryViewer.tsx
// Modify nextStory function to advance to next user's stories
// Add logic to get all users with stories and advance through them
```

**Files to Modify:**
- `components/StoryViewer.tsx`
- `components/Stories.tsx` (pass all stories, not just user stories)

---

### **Issue 5: Users cannot add multiple stories (only single story per user)**

**Root Cause:**
- Database design allows multiple stories per user
- UI logic filters to show only one story per user

**Database Requirements:**
- No changes needed - schema already supports multiple stories

**Code Changes Required:**
```typescript
// In components/Stories.tsx
// Remove filtering logic that shows only one story per user
// Group stories by user but show all stories for each user
// Update story display to show story count indicator
```

**Files to Modify:**
- `components/Stories.tsx`
- `lib/storiesApi.ts`

---

### **Issue 6: User profiles cannot be navigated to from posts in explore tab**

**Root Cause:**
- Missing navigation logic in explore tab post items
- Posts in explore don't have user profile navigation

**Database Requirements:**
- No database changes needed

**Code Changes Required:**
```typescript
// In app/(root)/(tabs)/search.tsx
// Add onPress navigation to user profile in renderPostItem
// Make username/avatar clickable to navigate to profile
```

**Files to Modify:**
- `app/(root)/(tabs)/search.tsx`

---

### **Issue 7: Edit filters functionality is not working when posting pictures**

**Root Cause:**
- Missing filter editing screen/component
- No image filter functionality implemented

**Database Requirements:**
- No database changes needed

**Code Changes Required:**
1. Create image filter component
2. Add filter editing screen
3. Integrate with image posting flow

**Files to Create:**
- `components/ImageFilters.tsx`
- `app/(root)/edit-filters.tsx`

**Files to Modify:**
- Image posting flow components

---

### **Issue 8: When uploading tapes, recorded video continues playing alongside uploaded tape**

**Root Cause:**
- Video player not properly stopped when switching between recorded and uploaded videos
- Multiple video instances playing simultaneously

**Database Requirements:**
- No database changes needed

**Code Changes Required:**
```typescript
// In tape upload components
// Add proper video player cleanup
// Ensure only one video plays at a time
```

**Files to Modify:**
- Tape upload/recording components
- Video player components

---

### **Issue 9: Title shows "Reels" instead of "Tapes" in videos under 'tapes' tab**

**Root Cause:**
- Hardcoded "Reels" text in UI components
- Inconsistent terminology throughout app

**Database Requirements:**
- No database changes needed

**Code Changes Required:**
```typescript
// Replace all instances of "Reels" with "Tapes"
// Update tab titles, headers, and UI text
```

**Files to Modify:**
- `app/(root)/(tabs)/reels.tsx`
- All components with "Reels" text
- Navigation labels

---

### **Issue 10: Usernames cannot contain spaces (preventing full names as usernames)**

**Root Cause:**
- Username validation prevents spaces
- Sanitization logic replaces spaces with underscores

**Database Requirements:**
- Update username validation constraints:
```sql
-- Remove unique constraint temporarily
ALTER TABLE profiles DROP CONSTRAINT profiles_username_key;

-- Add new constraint allowing spaces but ensuring uniqueness
ALTER TABLE profiles ADD CONSTRAINT profiles_username_unique UNIQUE(username);

-- Update validation to allow spaces
```

**Code Changes Required:**
```typescript
// In app/(auth)/sign-up.tsx (line ~174-176)
// CHANGE FROM:
const sanitizedUsername = email.split("@")[0]
  .replace(/[^a-zA-Z0-9_]/g, '_')
  .substring(0, 30);

// CHANGE TO:
const sanitizedUsername = email.split("@")[0]
  .replace(/[^a-zA-Z0-9_ ]/g, '')
  .trim()
  .substring(0, 30);

// Update validation in create-profile.tsx and edit-profile.tsx
```

**Files to Modify:**
- `app/(auth)/sign-up.tsx`
- `app/(root)/create-profile.tsx`
- `app/(root)/edit-profile.tsx`

---

### **Issue 11: Save feature for posts is not functional**

**Root Cause:**
- App calls `toggle_bookmark` but should call `lightning_toggle_bookmark_v3`
- Incorrect parameter names in RPC calls

**Database Requirements:**
- Function `lightning_toggle_bookmark_v3` already exists
- No additional database changes needed

**Code Changes Required:**
```typescript
// In components/Posts.tsx (line ~238)
// CHANGE FROM:
const { error } = await supabase.rpc("toggle_bookmark", {
  post_id: postId,
  user_id: user.id,
});

// CHANGE TO:
const { error } = await supabase.rpc("lightning_toggle_bookmark_v3", {
  post_id_param: postId,
  user_id_param: user.id,
});
```

**Files to Modify:**
- `components/Posts.tsx`
- `app/(root)/post/[id].tsx`
- `lib/postsApi.ts`

---

### **Issue 12: Tapes cannot be sent to other Klicktape users in direct messages**

**Root Cause:**
- Missing tape sharing functionality in chat
- No media attachment support in messages

**Database Requirements:**
- Add media support to messages table:
```sql
ALTER TABLE messages ADD COLUMN media_type TEXT;
ALTER TABLE messages ADD COLUMN media_url TEXT;
ALTER TABLE messages ADD COLUMN media_thumbnail_url TEXT;

-- Add index for media queries
CREATE INDEX idx_messages_media_type ON messages(media_type) WHERE media_type IS NOT NULL;
```

**Code Changes Required:**
1. Add media picker in chat
2. Update message component to display tapes
3. Add tape sharing from reels screen

**Files to Create:**
- `components/MediaPicker.tsx`
- `components/TapeMessage.tsx`

**Files to Modify:**
- Chat components
- Message sending logic
- Reels screen (add share button)

---

## **CHAT/UI ISSUES (Issues 13-16)**

### **Issue 13: Chat messages are not grouped by dates for older messages**

**Root Cause:**
- Missing date grouping logic in chat component
- No date separators in message list

**Database Requirements:**
- No database changes needed

**Code Changes Required:**
```typescript
// Add date grouping logic to chat components
// Insert date separators between messages from different days
// Format dates appropriately
```

**Files to Modify:**
- Chat message components
- Message list rendering logic

---

### **Issue 14: Chat interface shows "Other user" instead of actual user's name**

**Root Cause:**
- Hardcoded "Other user" text
- Missing user data fetching in chat

**Database Requirements:**
- No database changes needed

**Code Changes Required:**
```typescript
// Replace hardcoded "Other user" with actual username
// Ensure proper user data fetching in chat screens
```

**Files to Modify:**
- Chat header components
- User data fetching logic

---

### **Issue 15: "Forgot Password" functionality is broken - password reset page doesn't open**

**Root Cause:**
- Missing or broken navigation to reset password screen
- Incorrect route configuration

**Database Requirements:**
- No database changes needed

**Code Changes Required:**
```typescript
// Fix navigation to reset-password screen
// Ensure proper route configuration
// Test password reset flow
```

**Files to Modify:**
- `app/(auth)/sign-in.tsx`
- `app/reset-password.tsx`
- Navigation configuration

---

### **Issue 16: "Save Changes" button not visible on some phones during profile creation**

**Root Cause:**
- Button positioned at bottom without proper scrolling
- Screen doesn't scroll to show button on smaller screens

**Database Requirements:**
- No database changes needed

**Code Changes Required:**
```typescript
// Move save button to top of screen or ensure proper scrolling
// Add ScrollView wrapper if missing
// Ensure button is always visible
```

**Files to Modify:**
- `app/(root)/create-profile.tsx`
- Profile creation form layout

---

## **IMPLEMENTATION PRIORITY ORDER**

### **High Priority (Critical Functionality)**
1. Issue 1: Fix likes not registering
2. Issue 11: Fix save/bookmark functionality  
3. Issue 15: Fix forgot password
4. Issue 16: Fix save button visibility

### **Medium Priority (User Experience)**
5. Issue 9: Change "Reels" to "Tapes"
6. Issue 10: Allow spaces in usernames
7. Issue 13: Add date grouping in chat
8. Issue 14: Fix chat user names

### **Lower Priority (Feature Enhancements)**
9. Issue 2: Add like lists
10. Issue 3: Add follower/following lists
11. Issue 4: Stories auto-play sequence
12. Issue 5: Multiple stories per user
13. Issue 6: Profile navigation from explore
14. Issue 7: Edit filters functionality
15. Issue 8: Fix video playback issues
16. Issue 12: Tape sharing in messages

---

## **TESTING CHECKLIST**

After implementing fixes, test:
- [ ] Like/unlike posts works and persists
- [ ] Bookmark/unbookmark posts works
- [ ] Like lists display correctly
- [ ] Follower/following lists work
- [ ] Stories auto-advance properly
- [ ] Multiple stories per user
- [ ] Username with spaces works
- [ ] Save button always visible
- [ ] Forgot password flow works
- [ ] Chat shows correct usernames
- [ ] Date grouping in chat
- [ ] Tape sharing in messages
- [ ] All "Reels" changed to "Tapes"
- [ ] Profile navigation from explore
- [ ] Video playback issues resolved

---

## **DATABASE MIGRATION SCRIPT**

Execute this after implementing the fixes:

```sql
-- Add media support to messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_type TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_url TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_thumbnail_url TEXT;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_media_type ON messages(media_type) WHERE media_type IS NOT NULL;

-- Add functions for like lists
-- (Include the functions from Issues 2 and 3 above)

-- Update any constraints for username spaces
-- (Include the username constraint updates from Issue 10)
```

This documentation provides a complete roadmap for fixing all 16 critical issues in your Klicktape app.
