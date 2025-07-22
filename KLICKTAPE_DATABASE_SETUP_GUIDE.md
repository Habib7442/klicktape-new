# Klicktape Database Setup Guide

## Overview
This guide will help you recreate your complete Klicktape database schema on a fresh Supabase project with all production-level optimizations, security policies, and functionality.

## Prerequisites
- Fresh Supabase project
- Database access (SQL Editor or direct PostgreSQL connection)
- Admin privileges on the Supabase project

## Setup Steps

### 1. Execute Main Schema Script
Run the main schema file first:
```sql
-- Execute klicktape_database_schema.sql
-- This creates all tables, indexes, functions, triggers, and RLS policies
```

### 2. Execute Additional Functions
Run the additional functions for enhanced functionality:
```sql
-- Execute klicktape_additional_functions.sql
-- This adds advanced search, conversation, and optimization functions
```

### 3. Setup Storage Buckets
Run the storage setup script:
```sql
-- Execute klicktape_storage_setup.sql
-- This creates all necessary storage buckets with proper policies
```

**Alternative: Create via Supabase Dashboard**
If you prefer using the Dashboard:
1. Go to Storage in your Supabase Dashboard
2. Create these buckets manually:
   - `avatars` (Public, 5MB limit, images only)
   - `posts` (Public, 10MB limit, images only)
   - `stories` (Public, 10MB limit, images only)
   - `reels` (Public, 100MB limit, videos only)
   - `thumbnails` (Public, 2MB limit, images only)

### 4. Verify Setup
Check that all components are properly installed:
```sql
-- Verify tables
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;

-- Verify functions
SELECT proname FROM pg_proc WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public') ORDER BY proname;

-- Verify indexes
SELECT indexname FROM pg_indexes WHERE schemaname = 'public' ORDER BY indexname;

-- Verify storage buckets
SELECT id, name, public, file_size_limit FROM storage.buckets ORDER BY name;

-- Verify storage policies
SELECT policyname FROM pg_policies WHERE schemaname = 'storage' ORDER BY policyname;
```

## Database Schema Overview

### Core Tables
- **profiles**: User profiles (main user table)
- **posts**: User posts with images
- **reels**: Video content (tapes)
- **stories**: Temporary story content
- **likes**: Post likes
- **reel_likes**: Reel/tape likes
- **bookmarks**: Saved posts
- **follows**: User follow relationships
- **comments**: Post comments
- **reel_comments**: Reel comments
- **messages**: Direct messages with encryption support
- **rooms**: Anonymous chat rooms
- **notifications**: User notifications

### Key Features Implemented

#### 1. Performance Optimizations
- **Production-level indexes** for all critical queries
- **Optimized functions** for common operations (likes, bookmarks, feeds)
- **Materialized views** for complex queries
- **Batch operations** for better performance

#### 2. Security Features
- **Row Level Security (RLS)** on all tables
- **Comprehensive policies** for data access control
- **Encryption support** for messages
- **Public key management** for end-to-end encryption

#### 3. Real-time Features
- **Message status tracking** (sent, delivered, read)
- **Typing indicators** for chat
- **Live notifications** system
- **Real-time updates** for likes and comments

#### 4. Social Features
- **Follow/unfollow** functionality
- **Like/unlike** with optimized toggle functions
- **Bookmark/unbookmark** posts
- **Comment system** with nested replies
- **Story system** with expiration
- **Anonymous rooms** for group chat

### Critical Functions

#### Lightning Fast Operations
- `lightning_toggle_like_v3()` - Optimized like/unlike
- `lightning_toggle_bookmark_v3()` - Optimized bookmark toggle
- `lightning_fast_posts_feed()` - Optimized feed loading
- `lightning_search_users()` - Fast user search

#### Chat & Messaging
- `get_conversation_messages()` - Retrieve chat messages
- `get_user_conversations()` - Get user's conversation list

#### Content Management
- `get_user_posts_optimized()` - User's posts with engagement data
- `get_user_bookmarks_optimized()` - User's saved posts
- `search_posts_simple()` - Search through posts

### Database Indexes for Performance

#### Critical Indexes
- **Likes**: `idx_likes_toggle_optimized` - For instant like operations
- **Posts**: `idx_posts_created_at_desc` - For chronological feeds
- **Messages**: `idx_messages_conversation_optimized` - For chat performance
- **Follows**: `idx_follows_both` - For relationship queries

#### Composite Indexes
- User-specific queries (user_id + created_at)
- Conversation queries (sender + receiver + timestamp)
- Engagement queries (post_id + user_id combinations)

## Environment Variables Needed

Add these to your app's environment:
```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

## Testing the Setup

### 1. Test User Creation
```sql
-- This should automatically create a profile when a user signs up
SELECT * FROM profiles LIMIT 5;
```

### 2. Test Core Functions
```sql
-- Test like toggle
SELECT lightning_toggle_like_v3('post-uuid', 'user-uuid');

-- Test feed function
SELECT * FROM lightning_fast_posts_feed('user-uuid', 10, 0);
```

### 3. Test RLS Policies
```sql
-- Should only return user's own data when authenticated
SELECT * FROM bookmarks WHERE user_id = auth.uid();
```

## Migration from Existing Database

If migrating from an existing Klicktape database:

1. **Export existing data** using pg_dump
2. **Set up new schema** using these scripts
3. **Import data** ensuring UUID consistency
4. **Update sequences** if needed
5. **Verify foreign key relationships**

## Performance Monitoring

Monitor these key metrics:
- Query execution times for feed loading
- Like/unlike operation speed
- Message delivery performance
- Search query response times

## Troubleshooting

### Common Issues
1. **RLS Policy Errors**: Ensure user is authenticated
2. **Foreign Key Violations**: Check UUID references
3. **Performance Issues**: Verify indexes are created
4. **Function Errors**: Check function permissions

### Debug Queries
```sql
-- Check slow queries
SELECT query, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;

-- Check index usage
SELECT schemaname, tablename, indexname FROM pg_indexes WHERE schemaname = 'public';
```

## Next Steps

After setup:
1. Configure your app's Supabase client
2. Test authentication flow
3. Implement real-time subscriptions
4. Set up file storage for images/videos
5. Configure push notifications

## Support

For issues with this setup:
1. Check Supabase logs for errors
2. Verify all scripts executed successfully
3. Test individual functions in SQL editor
4. Check RLS policies are properly configured

---

**Note**: This schema is optimized for production use with proper indexing, security, and performance considerations. All functions are designed to handle high-traffic scenarios efficiently.
