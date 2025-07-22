-- =====================================================
-- KLICKTAPE ADDITIONAL FUNCTIONS AND OPTIMIZATIONS
-- Advanced functions for enhanced app functionality
-- =====================================================

-- =====================================================
-- STORAGE BUCKETS SETUP
-- Note: These are typically created via Supabase Dashboard or API
-- But here are the SQL equivalents for reference
-- =====================================================

-- Create storage buckets for Klicktape app
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('posts', 'posts', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('stories', 'stories', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('reels', 'reels', true, 104857600, ARRAY['video/mp4', 'video/quicktime', 'video/x-msvideo']),
  ('thumbnails', 'thumbnails', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars bucket
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update their own avatar" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete their own avatar" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Storage policies for posts bucket
CREATE POLICY "Post images are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'posts');

CREATE POLICY "Users can upload post images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'posts'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete their own post images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'posts'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Storage policies for stories bucket
CREATE POLICY "Story images are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'stories');

CREATE POLICY "Users can upload story images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'stories'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete their own story images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'stories'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Storage policies for reels bucket
CREATE POLICY "Reel videos are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'reels');

CREATE POLICY "Users can upload reel videos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'reels'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete their own reel videos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'reels'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Storage policies for thumbnails bucket
CREATE POLICY "Thumbnail images are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'thumbnails');

CREATE POLICY "Users can upload thumbnail images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'thumbnails'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete their own thumbnail images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'thumbnails'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Search users function
CREATE OR REPLACE FUNCTION lightning_search_users(search_query TEXT, limit_param INTEGER DEFAULT 20)
RETURNS TABLE(id UUID, username TEXT, avatar_url TEXT)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.username,
        p.avatar_url
    FROM public.profiles p
    WHERE p.username ILIKE '%' || search_query || '%'
    ORDER BY p.username
    LIMIT limit_param;
END;
$$;

-- Get user conversations function
CREATE OR REPLACE FUNCTION get_user_conversations(user_id_param UUID, limit_param INTEGER DEFAULT 20)
RETURNS TABLE(
    conversation_id TEXT, 
    other_user_id UUID, 
    other_username TEXT, 
    other_avatar_url TEXT, 
    last_message TEXT, 
    last_message_time TIMESTAMPTZ, 
    unread_count BIGINT
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
    RETURN QUERY
    WITH conversations AS (
        SELECT DISTINCT
            CASE 
                WHEN m.sender_id = user_id_param THEN m.receiver_id
                ELSE m.sender_id
            END as other_user_id,
            CASE 
                WHEN m.sender_id < m.receiver_id THEN m.sender_id::text || '_' || m.receiver_id::text
                ELSE m.receiver_id::text || '_' || m.sender_id::text
            END as conversation_id
        FROM public.messages m
        WHERE m.sender_id = user_id_param OR m.receiver_id = user_id_param
    ),
    latest_messages AS (
        SELECT DISTINCT ON (
            CASE 
                WHEN m.sender_id < m.receiver_id THEN m.sender_id::text || '_' || m.receiver_id::text
                ELSE m.receiver_id::text || '_' || m.sender_id::text
            END
        )
            CASE 
                WHEN m.sender_id < m.receiver_id THEN m.sender_id::text || '_' || m.receiver_id::text
                ELSE m.receiver_id::text || '_' || m.sender_id::text
            END as conversation_id,
            m.content as last_message,
            m.created_at as last_message_time
        FROM public.messages m
        WHERE m.sender_id = user_id_param OR m.receiver_id = user_id_param
        ORDER BY conversation_id, m.created_at DESC
    ),
    unread_counts AS (
        SELECT 
            CASE 
                WHEN m.sender_id < m.receiver_id THEN m.sender_id::text || '_' || m.receiver_id::text
                ELSE m.receiver_id::text || '_' || m.sender_id::text
            END as conversation_id,
            COUNT(*) as unread_count
        FROM public.messages m
        WHERE m.receiver_id = user_id_param AND m.is_read = false
        GROUP BY conversation_id
    )
    SELECT 
        c.conversation_id,
        c.other_user_id,
        COALESCE(p.username, 'Unknown User') as other_username,
        COALESCE(p.avatar_url, 'https://via.placeholder.com/150') as other_avatar_url,
        COALESCE(lm.last_message, '') as last_message,
        COALESCE(lm.last_message_time, NOW()) as last_message_time,
        COALESCE(uc.unread_count, 0) as unread_count
    FROM conversations c
    LEFT JOIN public.profiles p ON c.other_user_id = p.id
    LEFT JOIN latest_messages lm ON c.conversation_id = lm.conversation_id
    LEFT JOIN unread_counts uc ON c.conversation_id = uc.conversation_id
    ORDER BY lm.last_message_time DESC NULLS LAST
    LIMIT limit_param;
END;
$$;

-- Get user posts optimized function
CREATE OR REPLACE FUNCTION get_user_posts_optimized(
    target_user_id UUID, 
    current_user_id UUID, 
    limit_param INTEGER DEFAULT 20, 
    offset_param INTEGER DEFAULT 0
)
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
    LEFT JOIN likes l ON p.id = l.post_id AND l.user_id = current_user_id
    LEFT JOIN bookmarks b ON p.id = b.post_id AND b.user_id = current_user_id
    WHERE p.user_id = target_user_id
    ORDER BY p.created_at DESC
    LIMIT limit_param OFFSET offset_param;
END;
$$;

-- Get user bookmarks optimized function
CREATE OR REPLACE FUNCTION get_user_bookmarks_optimized(
    user_id_param UUID, 
    limit_param INTEGER DEFAULT 20, 
    offset_param INTEGER DEFAULT 0
)
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
    avatar_url TEXT, 
    bookmarked_at TIMESTAMPTZ
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
        TRUE as is_bookmarked,
        pr.username,
        pr.avatar_url,
        b.created_at as bookmarked_at
    FROM bookmarks b
    INNER JOIN posts p ON b.post_id = p.id
    INNER JOIN profiles pr ON p.user_id = pr.id
    LEFT JOIN likes l ON p.id = l.post_id AND l.user_id = user_id_param
    WHERE b.user_id = user_id_param
    ORDER BY b.created_at DESC
    LIMIT limit_param OFFSET offset_param;
END;
$$;

-- Check if user is following another user
CREATE OR REPLACE FUNCTION lightning_is_following(follower_id_param UUID, following_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
    RETURN EXISTS(
        SELECT 1 FROM public.follows 
        WHERE follower_id = follower_id_param AND following_id = following_id_param
    );
END;
$$;

-- Toggle comment like function
CREATE OR REPLACE FUNCTION toggle_comment_like(p_comment_id UUID, p_user_id UUID, p_is_liked BOOLEAN)
RETURNS TABLE(is_liked BOOLEAN, likes_count INTEGER)
LANGUAGE plpgsql
AS $$
BEGIN
  -- If currently liked, unlike by deleting the like
  IF p_is_liked THEN
    DELETE FROM comment_likes
    WHERE comment_id = p_comment_id AND user_id = p_user_id;
  ELSE
    -- If not liked, insert a new like (ignore if already exists)
    INSERT INTO comment_likes (comment_id, user_id, created_at)
    VALUES (p_comment_id, p_user_id, now())
    ON CONFLICT DO NOTHING;
  END IF;

  -- Update likes_count in comments based on actual count
  UPDATE comments
  SET likes_count = (
    SELECT COUNT(*)::integer
    FROM comment_likes
    WHERE comment_id = p_comment_id
  )
  WHERE id = p_comment_id;

  -- Return the new is_liked state and updated likes_count
  RETURN QUERY
  SELECT
    EXISTS (
      SELECT 1
      FROM comment_likes
      WHERE comment_id = p_comment_id AND user_id = p_user_id
    ) AS is_liked,
    (SELECT likes_count FROM comments WHERE id = p_comment_id) AS likes_count;
END;
$$;

-- Toggle reel comment like function
CREATE OR REPLACE FUNCTION toggle_reel_comment_like(p_comment_id UUID, p_user_id UUID, p_is_liked BOOLEAN)
RETURNS TABLE(is_liked BOOLEAN, likes_count INTEGER)
LANGUAGE plpgsql
AS $$
BEGIN
  -- If currently liked, unlike by deleting the like
  IF p_is_liked THEN
    DELETE FROM reel_comment_likes
    WHERE comment_id = p_comment_id AND user_id = p_user_id;
  ELSE
    -- If not liked, insert a new like (ignore if already exists)
    INSERT INTO reel_comment_likes (comment_id, user_id)
    VALUES (p_comment_id, p_user_id)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Update likes_count in reel_comments based on actual count
  UPDATE reel_comments
  SET likes_count = (
    SELECT COUNT(*)::integer
    FROM reel_comment_likes
    WHERE comment_id = p_comment_id
  )
  WHERE id = p_comment_id;

  -- Return the new is_liked state and updated likes_count
  RETURN QUERY
  SELECT
    EXISTS (
      SELECT 1
      FROM reel_comment_likes
      WHERE comment_id = p_comment_id AND user_id = p_user_id
    ) AS is_liked,
    (SELECT likes_count FROM reel_comments WHERE id = p_comment_id) AS likes_count;
END;
$$;

-- Search posts function
CREATE OR REPLACE FUNCTION search_posts_simple(search_query TEXT, limit_param INTEGER DEFAULT 20)
RETURNS TABLE(
    id UUID, 
    caption TEXT, 
    image_urls TEXT[], 
    username TEXT, 
    avatar_url TEXT, 
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.caption,
        p.image_urls,
        pr.username,
        pr.avatar_url,
        p.created_at
    FROM public.posts p
    JOIN public.profiles pr ON p.user_id = pr.id
    WHERE p.caption ILIKE '%' || search_query || '%'
    ORDER BY p.created_at DESC
    LIMIT limit_param;
END;
$$;
