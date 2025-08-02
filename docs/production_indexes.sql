-- Production Database Indexes for Klicktape
-- Optimizes slow queries identified in slow_queries.json

-- ============================================================================
-- CRITICAL INDEXES FOR REALTIME PERFORMANCE
-- ============================================================================

-- Realtime subscription table optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_realtime_subscription_entity 
ON realtime.subscription (entity);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_realtime_subscription_filters 
ON realtime.subscription USING GIN (filters);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_realtime_subscription_created_at 
ON realtime.subscription (created_at DESC);

-- ============================================================================
-- MESSAGE AND CHAT PERFORMANCE INDEXES
-- ============================================================================

-- Messages table - critical for chat performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_chat_id_created_at 
ON public.messages (chat_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_sender_id 
ON public.messages (sender_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_status 
ON public.messages (status) WHERE status IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_is_read 
ON public.messages (is_read) WHERE is_read = false;

-- Room messages for anonymous chat
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_room_messages_room_id_created_at 
ON public.room_messages (room_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_room_messages_sender_id 
ON public.room_messages (sender_id);

-- Message reactions optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_message_reactions_message_id 
ON public.message_reactions (message_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_message_reactions_user_id 
ON public.message_reactions (user_id);

-- ============================================================================
-- POSTS AND REELS PERFORMANCE INDEXES
-- ============================================================================

-- Posts table optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_user_id_created_at 
ON public.posts (user_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_created_at 
ON public.posts (created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_likes_count 
ON public.posts (likes_count DESC) WHERE likes_count > 0;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_genre 
ON public.posts (genre) WHERE genre IS NOT NULL;

-- Reels/Tapes table optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reels_user_id_created_at 
ON public.reels (user_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reels_created_at 
ON public.reels (created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reels_likes_count_views_count 
ON public.reels (likes_count DESC, views_count DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reels_genre 
ON public.reels (genre) WHERE genre IS NOT NULL;

-- ============================================================================
-- SOCIAL FEATURES INDEXES
-- ============================================================================

-- Likes optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_post_likes_post_id_user_id 
ON public.post_likes (post_id, user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_post_likes_user_id 
ON public.post_likes (user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reel_likes_reel_id_user_id 
ON public.reel_likes (reel_id, user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reel_likes_user_id 
ON public.reel_likes (user_id);

-- Comments optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comments_post_id_created_at 
ON public.comments (post_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comments_user_id 
ON public.comments (user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comments_parent_id 
ON public.comments (parent_id) WHERE parent_id IS NOT NULL;

-- Follows optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_follows_follower_id 
ON public.follows (follower_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_follows_following_id 
ON public.follows (following_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_follows_created_at 
ON public.follows (created_at DESC);

-- ============================================================================
-- STORIES PERFORMANCE INDEXES
-- ============================================================================

-- Stories optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stories_user_id_created_at 
ON public.stories (user_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stories_expires_at 
ON public.stories (expires_at) WHERE expires_at > NOW();

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stories_viewed_by 
ON public.stories USING GIN (viewed_by);

-- ============================================================================
-- NOTIFICATIONS PERFORMANCE INDEXES
-- ============================================================================

-- Notifications optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_id_created_at 
ON public.notifications (user_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_is_read 
ON public.notifications (is_read) WHERE is_read = false;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_type 
ON public.notifications (type);

-- ============================================================================
-- PROFILES AND AUTHENTICATION INDEXES
-- ============================================================================

-- Profiles optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_username 
ON public.profiles (username);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_updated_at 
ON public.profiles (updated_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_anonymous_room_name 
ON public.profiles (anonymous_room_name) WHERE anonymous_room_name IS NOT NULL;

-- Public keys for encryption
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_public_keys_user_id 
ON public.public_keys (user_id);

-- ============================================================================
-- CHAT ROOMS AND PARTICIPANTS INDEXES
-- ============================================================================

-- Chat rooms optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chat_rooms_created_at 
ON public.chat_rooms (created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chat_rooms_updated_at 
ON public.chat_rooms (updated_at DESC);

-- Chat participants optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chat_participants_room_id 
ON public.chat_participants (room_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chat_participants_user_id 
ON public.chat_participants (user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chat_participants_joined_at 
ON public.chat_participants (joined_at DESC);

-- ============================================================================
-- COMPOSITE INDEXES FOR COMPLEX QUERIES
-- ============================================================================

-- Feed generation optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_feed_optimization 
ON public.posts (created_at DESC, user_id) 
WHERE created_at > (NOW() - INTERVAL '7 days');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reels_feed_optimization 
ON public.reels (created_at DESC, user_id, likes_count DESC) 
WHERE created_at > (NOW() - INTERVAL '7 days');

-- User activity optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_activity_posts 
ON public.posts (user_id, created_at DESC, likes_count DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_activity_reels 
ON public.reels (user_id, created_at DESC, likes_count DESC, views_count DESC);

-- Search optimization (if you have search functionality)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_username_search 
ON public.profiles USING gin(to_tsvector('english', username));

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_caption_search 
ON public.posts USING gin(to_tsvector('english', caption)) 
WHERE caption IS NOT NULL;

-- ============================================================================
-- PARTIAL INDEXES FOR BETTER PERFORMANCE
-- ============================================================================

-- Only index active/recent content
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recent_posts 
ON public.posts (created_at DESC) 
WHERE created_at > (NOW() - INTERVAL '30 days');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recent_reels 
ON public.reels (created_at DESC) 
WHERE created_at > (NOW() - INTERVAL '30 days');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recent_stories 
ON public.stories (created_at DESC) 
WHERE created_at > (NOW() - INTERVAL '1 day');

-- Only index unread notifications
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_unread_notifications 
ON public.notifications (user_id, created_at DESC) 
WHERE is_read = false;

-- Only index unread messages
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_unread_messages 
ON public.messages (chat_id, created_at DESC) 
WHERE is_read = false;

-- ============================================================================
-- ANALYZE TABLES AFTER INDEX CREATION
-- ============================================================================

-- Update table statistics for better query planning
ANALYZE public.messages;
ANALYZE public.room_messages;
ANALYZE public.message_reactions;
ANALYZE public.posts;
ANALYZE public.reels;
ANALYZE public.post_likes;
ANALYZE public.reel_likes;
ANALYZE public.comments;
ANALYZE public.follows;
ANALYZE public.stories;
ANALYZE public.notifications;
ANALYZE public.profiles;
ANALYZE public.public_keys;
ANALYZE public.chat_rooms;
ANALYZE public.chat_participants;
ANALYZE realtime.subscription;
