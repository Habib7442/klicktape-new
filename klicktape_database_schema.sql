-- =====================================================
-- KLICKTAPE DATABASE SCHEMA RECREATION SCRIPT
-- Complete schema for fresh Supabase project setup
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- =====================================================
-- CUSTOM TYPES AND ENUMS
-- =====================================================

-- Gender enum
CREATE TYPE gender_enum AS ENUM ('male', 'female', 'other');

-- Account type enum  
CREATE TYPE account_type AS ENUM ('personal', 'creator', 'business');

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Profiles table (main user table)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    username TEXT UNIQUE,
    gender gender_enum,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    avatar_url TEXT,
    account_type account_type,
    bio TEXT,
    public_key TEXT,
    anonymous_room_name TEXT
);

-- Posts table
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    caption TEXT,
    image_urls TEXT[],
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    bookmarks_count INTEGER DEFAULT 0
);

-- Reels table (videos/tapes)
CREATE TABLE reels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    video_url TEXT NOT NULL,
    thumbnail_url TEXT NOT NULL,
    caption TEXT,
    music TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    views_count INTEGER DEFAULT 0
);

-- Stories table
CREATE TABLE stories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    caption TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ NOT NULL,
    viewed_by UUID[] DEFAULT '{}'
);

-- Likes table
CREATE TABLE likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, post_id)
);

-- Reel likes table
CREATE TABLE reel_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reel_id UUID NOT NULL REFERENCES reels(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, reel_id)
);

-- Bookmarks table
CREATE TABLE bookmarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, post_id)
);

-- Follows table
CREATE TABLE follows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    follower_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(follower_id, following_id)
);

-- Comments table
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    replies_count INTEGER DEFAULT 0,
    likes_count INTEGER DEFAULT 0,
    mentions JSONB DEFAULT '[]'
);

-- Comment likes table
CREATE TABLE comment_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(comment_id, user_id)
);

-- Reel comments table
CREATE TABLE reel_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reel_id UUID NOT NULL REFERENCES reels(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    parent_comment_id UUID REFERENCES reel_comments(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    likes_count INTEGER DEFAULT 0,
    replies_count INTEGER DEFAULT 0,
    mentions JSONB DEFAULT '[]'
);

-- Reel comment likes table
CREATE TABLE reel_comment_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    comment_id UUID NOT NULL REFERENCES reel_comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(comment_id, user_id)
);

-- Reel views table
CREATE TABLE reel_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    reel_id UUID NOT NULL REFERENCES reels(id) ON DELETE CASCADE,
    duration INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Messages table (direct messages)
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    encrypted_content TEXT,
    content TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    status TEXT DEFAULT 'sent',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    is_encrypted BOOLEAN DEFAULT FALSE,
    encryption_version TEXT DEFAULT 'v1',
    inserted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Public keys table (for encryption)
CREATE TABLE public_keys (
    user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    public_key TEXT NOT NULL,
    algorithm TEXT DEFAULT 'RSA-OAEP',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Public key audit table
CREATE TABLE public_key_audit (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    old_public_key TEXT,
    new_public_key TEXT,
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    change_type TEXT
);

-- Rooms table (anonymous chat rooms)
CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    creator_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    participants_count INTEGER DEFAULT 0,
    is_anonymous BOOLEAN DEFAULT TRUE,
    status TEXT DEFAULT 'active',
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Room participants table
CREATE TABLE room_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(room_id, user_id)
);

-- Room messages table
CREATE TABLE room_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    encrypted_content JSONB NOT NULL,
    tagged_users UUID[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications table
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

-- Typing status table
CREATE TABLE typing_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    chat_id TEXT,
    is_typing BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, chat_id)
);

-- Backup tables (for data safety)
CREATE TABLE public_keys_backup (
    user_id UUID,
    public_key TEXT,
    algorithm TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    backup_created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Optimized posts view (materialized for performance)
CREATE TABLE posts_optimized (
    id UUID PRIMARY KEY,
    caption TEXT,
    image_urls TEXT[],
    user_id UUID,
    created_at TIMESTAMPTZ,
    likes_count BIGINT,
    comments_count BIGINT,
    bookmarks_count BIGINT,
    username TEXT,
    avatar_url TEXT
);

-- Posts feed view (for optimized feed queries)
CREATE VIEW posts_feed AS
SELECT
    p.id,
    p.caption,
    p.image_urls,
    p.user_id,
    p.created_at,
    p.likes_count,
    p.comments_count,
    p.bookmarks_count,
    pr.username,
    pr.avatar_url
FROM posts p
JOIN profiles pr ON p.user_id = pr.id
ORDER BY p.created_at DESC;

-- =====================================================
-- PRODUCTION-LEVEL INDEXES FOR OPTIMAL PERFORMANCE
-- =====================================================

-- Profiles indexes
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_username ON profiles(username);
CREATE INDEX idx_profiles_id ON profiles(id);

-- Posts indexes
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_created_at_desc ON posts(created_at DESC);
CREATE INDEX idx_posts_user_created ON posts(user_id, created_at DESC);
CREATE INDEX idx_posts_created_desc ON posts(created_at DESC);

-- Likes indexes (critical for performance)
CREATE INDEX idx_likes_user_id ON likes(user_id);
CREATE INDEX idx_likes_post_id ON likes(post_id);
CREATE INDEX idx_likes_user_post ON likes(user_id, post_id);
CREATE INDEX idx_likes_post_user ON likes(post_id, user_id);
CREATE INDEX idx_likes_toggle_optimized ON likes(user_id, post_id) INCLUDE (id, created_at);

-- Bookmarks indexes
CREATE INDEX idx_bookmarks_user_id ON bookmarks(user_id);
CREATE INDEX idx_bookmarks_post_id ON bookmarks(post_id);
CREATE INDEX idx_bookmarks_user_post ON bookmarks(user_id, post_id);
CREATE INDEX idx_bookmarks_post_user ON bookmarks(post_id, user_id);
CREATE INDEX idx_bookmarks_toggle_optimized ON bookmarks(user_id, post_id) INCLUDE (id, created_at);

-- Follows indexes
CREATE INDEX idx_follows_follower_id ON follows(follower_id);
CREATE INDEX idx_follows_following_id ON follows(following_id);
CREATE INDEX idx_follows_both ON follows(follower_id, following_id);

-- Comments indexes
CREATE INDEX idx_comments_post_id ON comments(post_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_comments_post_created ON comments(post_id, created_at DESC);

-- Messages indexes (for chat performance)
CREATE INDEX idx_messages_sender_receiver_created ON messages(sender_id, receiver_id, created_at);
CREATE INDEX idx_messages_receiver_sender_created ON messages(receiver_id, sender_id, created_at);
CREATE INDEX idx_messages_conversation_optimized ON messages(LEAST(sender_id, receiver_id), GREATEST(sender_id, receiver_id), created_at);
CREATE INDEX idx_messages_receiver_is_read ON messages(receiver_id, is_read, created_at DESC);
CREATE INDEX idx_messages_realtime_created ON messages(created_at DESC, sender_id, receiver_id);
CREATE INDEX idx_messages_is_encrypted ON messages(is_encrypted);
CREATE INDEX idx_messages_encryption_version ON messages(encryption_version);

-- Reel indexes
CREATE INDEX reel_likes_user_id_idx ON reel_likes(user_id);
CREATE INDEX reel_comments_user_id_idx ON reel_comments(user_id);

-- Room indexes
CREATE INDEX idx_rooms_participants_count ON rooms(participants_count DESC);
CREATE INDEX idx_room_participants_room_id ON room_participants(room_id);
CREATE INDEX idx_room_participants_user_id ON room_participants(user_id);
CREATE INDEX idx_room_messages_room_id ON room_messages(room_id);
CREATE INDEX idx_room_messages_sender_id ON room_messages(sender_id);

-- Notifications indexes
CREATE INDEX notifications_sender_id_idx ON notifications(sender_id);

-- Public keys indexes
CREATE INDEX idx_public_keys_user_id ON public_keys(user_id);
CREATE INDEX idx_public_keys_algorithm ON public_keys(algorithm);
CREATE INDEX idx_public_keys_created_at ON public_keys(created_at);

-- Note: Views cannot have indexes directly.
-- The underlying posts and profiles tables already have the necessary indexes:
-- - idx_posts_created_at_desc for chronological ordering
-- - idx_posts_user_created for user-specific queries
-- - idx_profiles_id for profile joins

-- =====================================================
-- DATABASE FUNCTIONS
-- =====================================================

-- User profile creation function
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, username, created_at, updated_at)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
        NOW(),
        NOW()
    );
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the user creation
    RAISE WARNING 'Failed to create user profile: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Lightning fast like toggle function
CREATE OR REPLACE FUNCTION lightning_toggle_like_v3(post_id_param UUID, user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    like_exists BOOLEAN;
    result BOOLEAN;
BEGIN
    -- Use a single query to check and delete if exists
    DELETE FROM likes
    WHERE post_id = post_id_param AND user_id = user_id_param;

    -- Check if we deleted anything
    GET DIAGNOSTICS like_exists = ROW_COUNT;

    IF like_exists THEN
        -- Was liked, now unliked - update count atomically
        UPDATE posts
        SET likes_count = GREATEST(0, likes_count - 1)
        WHERE id = post_id_param;
        result := FALSE;
    ELSE
        -- Wasn't liked, so insert and update count atomically
        INSERT INTO likes (post_id, user_id, created_at)
        VALUES (post_id_param, user_id_param, NOW());

        UPDATE posts
        SET likes_count = likes_count + 1
        WHERE id = post_id_param;
        result := TRUE;
    END IF;

    RETURN result;
END;
$$;

-- Lightning fast bookmark toggle function
CREATE OR REPLACE FUNCTION lightning_toggle_bookmark_v3(post_id_param UUID, user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    bookmark_exists BOOLEAN;
    result BOOLEAN;
BEGIN
    -- Use a single query to check and delete if exists
    DELETE FROM bookmarks
    WHERE post_id = post_id_param AND user_id = user_id_param;

    -- Check if we deleted anything
    GET DIAGNOSTICS bookmark_exists = ROW_COUNT;

    IF bookmark_exists THEN
        -- Was bookmarked, now unbookmarked - update count atomically
        UPDATE posts
        SET bookmarks_count = GREATEST(0, bookmarks_count - 1)
        WHERE id = post_id_param;
        result := FALSE;
    ELSE
        -- Wasn't bookmarked, so insert and update count atomically
        INSERT INTO bookmarks (post_id, user_id, created_at)
        VALUES (post_id_param, user_id_param, NOW());

        UPDATE posts
        SET bookmarks_count = bookmarks_count + 1
        WHERE id = post_id_param;
        result := TRUE;
    END IF;

    RETURN result;
END;
$$;

-- Optimized posts feed function
CREATE OR REPLACE FUNCTION lightning_fast_posts_feed(user_id_param UUID, limit_param INTEGER DEFAULT 20, offset_param INTEGER DEFAULT 0)
RETURNS TABLE(
    id UUID,
    caption TEXT,
    image_urls TEXT[],
    user_id UUID,
    created_at TIMESTAMPTZ,
    likes_count BIGINT,
    comments_count BIGINT,
    bookmarks_count BIGINT,
    is_liked BOOLEAN,
    is_bookmarked BOOLEAN,
    username TEXT,
    avatar_url TEXT
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.caption,
        p.image_urls,
        p.user_id,
        p.created_at,
        COALESCE(p.likes_count, 0)::BIGINT as likes_count,
        COALESCE(p.comments_count, 0)::BIGINT as comments_count,
        COALESCE(p.bookmarks_count, 0)::BIGINT as bookmarks_count,
        (l.user_id IS NOT NULL) as is_liked,
        (b.user_id IS NOT NULL) as is_bookmarked,
        pr.username,
        pr.avatar_url
    FROM posts p
    INNER JOIN profiles pr ON p.user_id = pr.id
    LEFT JOIN likes l ON p.id = l.post_id AND l.user_id = user_id_param
    LEFT JOIN bookmarks b ON p.id = b.post_id AND b.user_id = user_id_param
    WHERE pr.id IS NOT NULL
    ORDER BY p.created_at DESC
    LIMIT limit_param OFFSET offset_param;
END;
$$;

-- Reel like toggle function
CREATE OR REPLACE FUNCTION toggle_reel_like(p_reel_id UUID, p_user_id UUID, p_is_liked BOOLEAN)
RETURNS TABLE(is_liked BOOLEAN, likes_count INTEGER)
LANGUAGE plpgsql
AS $$
BEGIN
    IF p_is_liked THEN
        -- Unlike: Remove like from reel_likes
        DELETE FROM reel_likes
        WHERE reel_id = p_reel_id AND user_id = p_user_id;

        -- Update likes_count in reels
        UPDATE reels
        SET likes_count = reels.likes_count - 1
        WHERE id = p_reel_id;
    ELSE
        -- Like: Add like to reel_likes
        INSERT INTO reel_likes (reel_id, user_id)
        VALUES (p_reel_id, p_user_id);

        -- Update likes_count in reels
        UPDATE reels
        SET likes_count = reels.likes_count + 1
        WHERE id = p_reel_id;
    END IF;

    -- Return the updated state
    RETURN QUERY
    SELECT
        EXISTS (
            SELECT 1
            FROM reel_likes
            WHERE reel_id = p_reel_id AND user_id = p_user_id
        ) AS is_liked,
        reels.likes_count
    FROM reels
    WHERE id = p_reel_id;
END;
$$;

-- Get conversation messages function
CREATE OR REPLACE FUNCTION get_conversation_messages(
    user1_id UUID,
    user2_id UUID,
    limit_count INTEGER DEFAULT 50,
    offset_count INTEGER DEFAULT 0
)
RETURNS TABLE(
    id UUID,
    sender_id UUID,
    receiver_id UUID,
    content TEXT,
    encrypted_content TEXT,
    is_read BOOLEAN,
    status TEXT,
    created_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    sender JSONB,
    receiver JSONB
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.sender_id,
    m.receiver_id,
    m.content,
    m.encrypted_content,
    m.is_read,
    m.status,
    m.created_at,
    m.delivered_at,
    m.read_at,
    jsonb_build_object(
      'id', sender.id,
      'username', sender.username,
      'avatar_url', sender.avatar_url
    ) as sender,
    jsonb_build_object(
      'id', receiver.id,
      'username', receiver.username,
      'avatar_url', receiver.avatar_url
    ) as receiver
  FROM messages m
  LEFT JOIN profiles sender ON m.sender_id = sender.id
  LEFT JOIN profiles receiver ON m.receiver_id = receiver.id
  WHERE
    (m.sender_id = user1_id AND m.receiver_id = user2_id)
    OR (m.sender_id = user2_id AND m.receiver_id = user1_id)
  ORDER BY m.created_at ASC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$;

-- =====================================================
-- TRIGGER FUNCTIONS
-- =====================================================

-- Update likes count trigger function
CREATE OR REPLACE FUNCTION update_likes_count_optimized()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Use a more efficient update that doesn't lock the entire row
  IF TG_OP = 'INSERT' THEN
    UPDATE posts
    SET likes_count = likes_count + 1
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts
    SET likes_count = GREATEST(0, likes_count - 1)
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Update bookmarks count trigger function
CREATE OR REPLACE FUNCTION update_bookmarks_count_optimized()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts
    SET bookmarks_count = bookmarks_count + 1
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts
    SET bookmarks_count = GREATEST(0, bookmarks_count - 1)
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Update comments count trigger function
CREATE OR REPLACE FUNCTION update_comments_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET comments_count = comments_count - 1 WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Update updated_at column trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- User profile creation trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION create_user_profile();

-- Likes count triggers
CREATE TRIGGER trigger_update_likes_count_insert_optimized
    AFTER INSERT ON likes
    FOR EACH ROW EXECUTE FUNCTION update_likes_count_optimized();

CREATE TRIGGER trigger_update_likes_count_delete_optimized
    AFTER DELETE ON likes
    FOR EACH ROW EXECUTE FUNCTION update_likes_count_optimized();

-- Bookmarks count triggers
CREATE TRIGGER trigger_update_bookmarks_count_insert_optimized
    AFTER INSERT ON bookmarks
    FOR EACH ROW EXECUTE FUNCTION update_bookmarks_count_optimized();

CREATE TRIGGER trigger_update_bookmarks_count_delete_optimized
    AFTER DELETE ON bookmarks
    FOR EACH ROW EXECUTE FUNCTION update_bookmarks_count_optimized();

-- Comments count triggers
CREATE TRIGGER trigger_update_comments_count_insert
    AFTER INSERT ON comments
    FOR EACH ROW EXECUTE FUNCTION update_comments_count();

CREATE TRIGGER trigger_update_comments_count_delete
    AFTER DELETE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_comments_count();

-- Updated at triggers
CREATE TRIGGER update_public_keys_updated_at
    BEFORE UPDATE ON public_keys
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reels ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reel_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reel_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reel_comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reel_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE typing_status ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Enable read access for all users" ON profiles FOR SELECT USING (true);
CREATE POLICY "Enable insert for signing up users" ON profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for users based on id" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Posts policies
CREATE POLICY "posts_select_policy" ON posts FOR SELECT USING (true);
CREATE POLICY "posts_insert_policy" ON posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "posts_update_policy" ON posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "posts_delete_policy" ON posts FOR DELETE USING (auth.uid() = user_id);

-- Reels policies
CREATE POLICY "reels_select_policy" ON reels FOR SELECT USING (true);
CREATE POLICY "reels_insert_policy" ON reels FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reels_update_policy" ON reels FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "reels_delete_policy" ON reels FOR DELETE USING (auth.uid() = user_id);

-- Stories policies
CREATE POLICY "stories_select_policy" ON stories FOR SELECT USING (true);
CREATE POLICY "stories_insert_policy" ON stories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "stories_update_policy" ON stories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "stories_delete_policy" ON stories FOR DELETE USING (auth.uid() = user_id);

-- Likes policies
CREATE POLICY "likes_select_policy" ON likes FOR SELECT USING (true);
CREATE POLICY "likes_insert_policy" ON likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "likes_update_policy" ON likes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "likes_delete_policy" ON likes FOR DELETE USING (auth.uid() = user_id);

-- Reel likes policies
CREATE POLICY "reel_likes_select_policy" ON reel_likes FOR SELECT USING (true);
CREATE POLICY "reel_likes_insert_policy" ON reel_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reel_likes_update_policy" ON reel_likes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "reel_likes_delete_policy" ON reel_likes FOR DELETE USING (auth.uid() = user_id);

-- Bookmarks policies
CREATE POLICY "Allow users to read their own bookmarks" ON bookmarks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Allow users to create their own bookmarks" ON bookmarks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow users to delete their own bookmarks" ON bookmarks FOR DELETE USING (auth.uid() = user_id);

-- Follows policies
CREATE POLICY "follows_select_policy" ON follows FOR SELECT USING (true);
CREATE POLICY "follows_insert_policy" ON follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "follows_update_policy" ON follows FOR UPDATE USING (auth.uid() = follower_id);
CREATE POLICY "follows_delete_policy" ON follows FOR DELETE USING (auth.uid() = follower_id);

-- Comments policies
CREATE POLICY "comments_select_policy" ON comments FOR SELECT USING (true);
CREATE POLICY "comments_insert_policy" ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "comments_update_policy" ON comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "comments_delete_policy" ON comments FOR DELETE USING (auth.uid() = user_id);

-- Comment likes policies
CREATE POLICY "Allow read for authenticated users" ON comment_likes FOR SELECT USING (auth.role() = 'authenticated'::text);
CREATE POLICY "Allow insert for authenticated users" ON comment_likes FOR INSERT WITH CHECK (auth.role() = 'authenticated'::text);
CREATE POLICY "Allow delete for like owner" ON comment_likes FOR DELETE USING (auth.uid() = user_id);

-- Reel comments policies
CREATE POLICY "reel_comments_select_policy" ON reel_comments FOR SELECT USING (true);
CREATE POLICY "reel_comments_insert_policy" ON reel_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reel_comments_update_policy" ON reel_comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "reel_comments_delete_policy" ON reel_comments FOR DELETE USING (auth.uid() = user_id);

-- Reel comment likes policies
CREATE POLICY "Allow read for authenticated users" ON reel_comment_likes FOR SELECT USING (auth.role() = 'authenticated'::text);
CREATE POLICY "Allow insert for authenticated users" ON reel_comment_likes FOR INSERT WITH CHECK (auth.role() = 'authenticated'::text);
CREATE POLICY "Allow delete for like owner" ON reel_comment_likes FOR DELETE USING (auth.uid() = user_id);

-- Reel views policies
CREATE POLICY "Allow authenticated read access to reel_views" ON reel_views FOR SELECT USING (auth.role() = 'authenticated'::text);
CREATE POLICY "Allow users to record views" ON reel_views FOR INSERT WITH CHECK (user_id = auth.uid());

-- Messages policies
CREATE POLICY "messages_select_policy" ON messages FOR SELECT USING ((auth.uid() = sender_id) OR (auth.uid() = receiver_id));
CREATE POLICY "messages_insert_policy" ON messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "messages_update_policy" ON messages FOR UPDATE USING (auth.uid() = receiver_id);
CREATE POLICY "messages_delete_policy" ON messages FOR DELETE USING ((auth.uid() = sender_id) OR (auth.uid() = receiver_id));

-- Public keys policies
CREATE POLICY "public_keys_select_policy" ON public_keys FOR SELECT USING (true);
CREATE POLICY "public_keys_insert_policy" ON public_keys FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "public_keys_update_policy" ON public_keys FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "public_keys_delete_policy" ON public_keys FOR DELETE USING (auth.uid() = user_id);

-- Rooms policies
CREATE POLICY "view_rooms" ON rooms FOR SELECT USING (auth.role() = 'authenticated'::text);
CREATE POLICY "create_room" ON rooms FOR INSERT WITH CHECK (auth.uid() = creator_id);

-- Room participants policies
CREATE POLICY "view_room_participants" ON room_participants FOR SELECT USING (auth.role() = 'authenticated'::text);
CREATE POLICY "join_room" ON room_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "leave_room" ON room_participants FOR DELETE USING (auth.uid() = user_id);

-- Room messages policies
CREATE POLICY "room_messages_select_policy" ON room_messages FOR SELECT USING (EXISTS (SELECT 1 FROM room_participants WHERE room_participants.room_id = room_messages.room_id AND room_participants.user_id = auth.uid()));
CREATE POLICY "room_messages_insert_policy" ON room_messages FOR INSERT WITH CHECK ((auth.uid() = sender_id) AND (EXISTS (SELECT 1 FROM room_participants WHERE room_participants.room_id = room_messages.room_id AND room_participants.user_id = auth.uid())));
CREATE POLICY "room_messages_update_policy" ON room_messages FOR UPDATE USING (auth.uid() = sender_id);
CREATE POLICY "room_messages_delete_policy" ON room_messages FOR DELETE USING (auth.uid() = sender_id);

-- Notifications policies
CREATE POLICY "notifications_select_policy" ON notifications FOR SELECT USING ((auth.uid() = recipient_id) OR (auth.uid() = sender_id));
CREATE POLICY "notifications_insert_policy" ON notifications FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "notifications_update_policy" ON notifications FOR UPDATE USING (auth.uid() = recipient_id);
CREATE POLICY "notifications_delete_policy" ON notifications FOR DELETE USING ((auth.uid() = sender_id) OR (auth.uid() = recipient_id));

-- Typing status policies
CREATE POLICY "Users can manage their typing status" ON typing_status FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users can view chat typing status" ON typing_status FOR SELECT USING (true);

-- =====================================================
-- FINAL SETUP AND OPTIMIZATIONS
-- =====================================================

-- Update table statistics for optimal query planning
ANALYZE profiles;
ANALYZE posts;
ANALYZE reels;
ANALYZE stories;
ANALYZE likes;
ANALYZE reel_likes;
ANALYZE bookmarks;
ANALYZE follows;
ANALYZE comments;
ANALYZE messages;
ANALYZE notifications;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

-- This completes the Klicktape database schema setup
-- All tables, indexes, functions, triggers, and RLS policies are now configured
-- The database is optimized for production use with proper security and performance

SELECT 'Klicktape database schema setup completed successfully!' as status;
