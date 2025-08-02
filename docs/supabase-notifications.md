# Supabase Real-time Notifications System

This document describes the new Supabase-based real-time notification system that replaces the previous Socket.IO implementation.

## Overview

The new notification system uses Supabase's built-in real-time capabilities through PostgreSQL's LISTEN/NOTIFY and WebSocket connections. This provides:

- **Native Integration**: Direct integration with Supabase database
- **Automatic Real-time**: No need for separate Socket.IO server
- **Better Performance**: Reduced latency and server overhead
- **Simplified Architecture**: One less service to maintain
- **Built-in Reliability**: Supabase handles connection management

## Architecture

### Core Components

1. **SupabaseNotificationManager** (`lib/supabaseNotificationManager.ts`)
   - Main hook: `useSupabaseNotificationManager`
   - Handles real-time subscriptions
   - Manages fallback polling
   - Provides connection status

2. **SupabaseNotificationBroadcaster** (`lib/supabaseNotificationManager.ts`)
   - Static class for creating notifications
   - Automatically triggers real-time updates
   - Methods for different notification types

3. **Redux Integration** (`src/store/slices/notificationSlice.ts`)
   - Enhanced with `updateNotification` action
   - Handles real-time state updates
   - Manages unread counts

## Usage

### Setting Up Real-time Notifications

```typescript
import { useSupabaseNotificationManager } from '@/lib/supabaseNotificationManager';

const {
  isConnected,
  subscriptionStatus,
  lastSyncTime,
  syncNotifications,
  forceReconnect,
  unreadCount,
} = useSupabaseNotificationManager({
  userId: 'user-id',
  enableRealtime: true,
  fallbackPollingInterval: 120000, // 2 minutes
  maxRetries: 2,
});
```

### Broadcasting Notifications

```typescript
import { SupabaseNotificationBroadcaster } from '@/lib/supabaseNotificationManager';

// Like notification
await SupabaseNotificationBroadcaster.broadcastLike(
  recipientId,
  senderId,
  postId,
  reelId // optional
);

// Comment notification
await SupabaseNotificationBroadcaster.broadcastComment(
  recipientId,
  senderId,
  commentId,
  postId, // optional
  reelId  // optional
);

// Follow notification
await SupabaseNotificationBroadcaster.broadcastFollow(
  recipientId,
  senderId
);

// Mention notification
await SupabaseNotificationBroadcaster.broadcastMention(
  recipientId,
  senderId,
  postId, // optional
  reelId  // optional
);
```

## How It Works

### 1. Notification Creation
When a notification is created:
1. Data is inserted into the `notifications` table
2. Supabase automatically triggers real-time events
3. All subscribed clients receive the update instantly

### 2. Real-time Subscription
```typescript
supabase
  .channel(`notifications_realtime_${userId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'notifications',
    filter: `recipient_id=eq.${userId}`,
  }, (payload) => {
    // Handle new notification
  })
  .subscribe();
```

### 3. Fallback System
- If real-time connection fails, automatic fallback to polling
- Exponential backoff for retries
- App state awareness (sync on foreground)

## Database Schema

The system uses the existing `notifications` table:

```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    reel_id UUID REFERENCES reels(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    message TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Migration from Socket.IO

### Files Updated
- `components/Posts.tsx` - Updated like notifications
- `components/Comments.tsx` - Updated comment notifications
- `components/CreatePost.tsx` - Updated mention notifications
- `app/(root)/post/[id].tsx` - Updated like notifications
- `app/(root)/(tabs)/home.tsx` - Switched to Supabase manager
- `app/(root)/userProfile/[id].tsx` - Updated follow notifications
- `lib/usersApi.ts` - Updated follow notifications
- `lib/postsApi.ts` - Updated follow notifications

### Files Deprecated (can be removed)
- `lib/socketNotificationBroadcaster.ts`
- `hooks/useSocketNotifications.ts`
- `lib/notificationManager.ts`
- `lib/socketConfig.ts`
- `lib/socketService.ts` (if only used for notifications)
- `server/` directory (Socket.IO server)

## Benefits

1. **Simplified Infrastructure**: No need for separate Socket.IO server
2. **Better Reliability**: Supabase handles connection management
3. **Reduced Latency**: Direct database-to-client communication
4. **Cost Effective**: One less service to host and maintain
5. **Native Integration**: Works seamlessly with existing Supabase setup
6. **Automatic Scaling**: Supabase handles scaling automatically

## Configuration

### Environment Variables
No additional environment variables needed - uses existing Supabase configuration.

### Real-time Settings
Configure in the notification manager:
- `enableRealtime`: Enable/disable real-time features
- `fallbackPollingInterval`: Polling frequency when real-time fails
- `maxRetries`: Maximum retry attempts for failed connections

## Monitoring

The system provides comprehensive logging:
- Connection status changes
- Subscription events
- Notification creation and delivery
- Error handling and retries

Monitor these logs to ensure proper operation:
```
🔔 Setting up Supabase real-time notification subscription...
✅ Notifications real-time subscription active
🔔 New notification received: {...}
✅ Notification added to store
```

## Performance

- **Real-time Latency**: ~100-500ms (typical Supabase real-time)
- **Fallback Polling**: 2 minutes (configurable)
- **Memory Usage**: Minimal - single subscription per user
- **Battery Impact**: Lower than Socket.IO due to native WebSocket handling

## Troubleshooting

### Common Issues

1. **Notifications not received**
   - Check subscription status
   - Verify user ID in filter
   - Check network connectivity

2. **High battery usage**
   - Increase polling interval
   - Check for subscription leaks

3. **Duplicate notifications**
   - Ensure single subscription per user
   - Check for multiple manager instances

### Debug Mode
Enable detailed logging by setting console log level to debug in the notification manager.
