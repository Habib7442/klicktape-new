-- Klicktape Reels Database Functions
-- Optimized for performance and caching integration

-- Function to toggle reel like (atomic operation)
CREATE OR REPLACE FUNCTION toggle_reel_like(
  p_reel_id UUID,
  p_user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  like_exists BOOLEAN;
  new_like_count INTEGER;
BEGIN
  -- Check if like already exists
  SELECT EXISTS(
    SELECT 1 FROM reel_likes 
    WHERE reel_id = p_reel_id AND user_id = p_user_id
  ) INTO like_exists;
  
  IF like_exists THEN
    -- Remove like
    DELETE FROM reel_likes 
    WHERE reel_id = p_reel_id AND user_id = p_user_id;
    
    -- Update likes count
    UPDATE reels 
    SET likes_count = GREATEST(likes_count - 1, 0),
        updated_at = NOW()
    WHERE id = p_reel_id;
    
    RETURN FALSE;
  ELSE
    -- Add like
    INSERT INTO reel_likes (reel_id, user_id, created_at)
    VALUES (p_reel_id, p_user_id, NOW())
    ON CONFLICT (reel_id, user_id) DO NOTHING;
    
    -- Update likes count
    UPDATE reels 
    SET likes_count = likes_count + 1,
        updated_at = NOW()
    WHERE id = p_reel_id;
    
    RETURN TRUE;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to track reel view
CREATE OR REPLACE FUNCTION track_reel_view(
  p_reel_id UUID,
  p_user_id UUID,
  p_watch_time INTEGER DEFAULT 0
) RETURNS VOID AS $$
DECLARE
  view_exists BOOLEAN;
BEGIN
  -- Check if view already exists for this user and reel
  SELECT EXISTS(
    SELECT 1 FROM reel_views 
    WHERE reel_id = p_reel_id AND user_id = p_user_id
  ) INTO view_exists;
  
  IF NOT view_exists THEN
    -- Insert new view record
    INSERT INTO reel_views (reel_id, user_id, watch_time, created_at)
    VALUES (p_reel_id, p_user_id, p_watch_time, NOW())
    ON CONFLICT (reel_id, user_id) DO UPDATE SET
      watch_time = GREATEST(reel_views.watch_time, p_watch_time),
      updated_at = NOW();
    
    -- Update views count in reels table
    UPDATE reels 
    SET views_count = views_count + 1,
        updated_at = NOW()
    WHERE id = p_reel_id;
  ELSE
    -- Update existing view with better watch time
    UPDATE reel_views 
    SET watch_time = GREATEST(watch_time, p_watch_time),
        updated_at = NOW()
    WHERE reel_id = p_reel_id AND user_id = p_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to get reel analytics
CREATE OR REPLACE FUNCTION get_reel_analytics(
  p_reel_id UUID
) RETURNS JSON AS $$
DECLARE
  result JSON;
  total_views INTEGER;
  total_likes INTEGER;
  total_comments INTEGER;
  total_bookmarks INTEGER;
  engagement_rate DECIMAL;
  completion_rate DECIMAL;
  avg_watch_time DECIMAL;
  top_hashtags TEXT[];
BEGIN
  -- Get basic metrics
  SELECT 
    views_count,
    likes_count,
    comments_count,
    bookmarks_count
  INTO 
    total_views,
    total_likes,
    total_comments,
    total_bookmarks
  FROM reels 
  WHERE id = p_reel_id;
  
  -- Calculate engagement rate
  IF total_views > 0 THEN
    engagement_rate := ROUND(
      ((total_likes + total_comments + total_bookmarks)::DECIMAL / total_views) * 100, 
      2
    );
  ELSE
    engagement_rate := 0;
  END IF;
  
  -- Calculate average watch time and completion rate
  SELECT 
    COALESCE(AVG(watch_time), 0),
    CASE 
      WHEN COUNT(*) > 0 THEN 
        ROUND((COUNT(CASE WHEN watch_time >= 15 THEN 1 END)::DECIMAL / COUNT(*)) * 100, 2)
      ELSE 0 
    END
  INTO avg_watch_time, completion_rate
  FROM reel_views 
  WHERE reel_id = p_reel_id;
  
  -- Get top hashtags (if stored in reels table)
  SELECT COALESCE(hashtags, ARRAY[]::TEXT[])
  INTO top_hashtags
  FROM reels 
  WHERE id = p_reel_id;
  
  -- Build result JSON
  result := json_build_object(
    'reel_id', p_reel_id,
    'views_count', total_views,
    'likes_count', total_likes,
    'comments_count', total_comments,
    'bookmarks_count', total_bookmarks,
    'engagement_rate', engagement_rate,
    'completion_rate', completion_rate,
    'average_watch_time', avg_watch_time,
    'top_hashtags', top_hashtags,
    'peak_engagement_time', NOW()::TEXT
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to get trending reels
CREATE OR REPLACE FUNCTION get_trending_reels(
  p_limit INTEGER DEFAULT 20,
  p_time_window INTERVAL DEFAULT '7 days'
) RETURNS TABLE (
  id UUID,
  user_id UUID,
  caption TEXT,
  video_url TEXT,
  thumbnail_url TEXT,
  music TEXT,
  hashtags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE,
  likes_count INTEGER,
  comments_count INTEGER,
  views_count INTEGER,
  bookmarks_count INTEGER,
  engagement_score DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.user_id,
    r.caption,
    r.video_url,
    r.thumbnail_url,
    r.music,
    r.hashtags,
    r.created_at,
    r.likes_count,
    r.comments_count,
    r.views_count,
    r.bookmarks_count,
    -- Calculate engagement score based on recency and interactions
    ROUND(
      (
        (r.likes_count * 1.0) + 
        (r.comments_count * 2.0) + 
        (r.views_count * 0.1) + 
        (r.bookmarks_count * 3.0)
      ) * 
      -- Recency multiplier (newer content gets higher score)
      CASE 
        WHEN r.created_at > NOW() - INTERVAL '1 day' THEN 2.0
        WHEN r.created_at > NOW() - INTERVAL '3 days' THEN 1.5
        WHEN r.created_at > NOW() - p_time_window THEN 1.0
        ELSE 0.5
      END,
      2
    ) AS engagement_score
  FROM reels r
  WHERE r.created_at > NOW() - p_time_window
    AND r.views_count > 0
  ORDER BY engagement_score DESC, r.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to get user's reel feed (personalized)
CREATE OR REPLACE FUNCTION get_user_reel_feed(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 10,
  p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
  id UUID,
  user_id UUID,
  username TEXT,
  avatar_url TEXT,
  caption TEXT,
  video_url TEXT,
  thumbnail_url TEXT,
  music TEXT,
  hashtags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE,
  likes_count INTEGER,
  comments_count INTEGER,
  views_count INTEGER,
  bookmarks_count INTEGER,
  is_liked BOOLEAN,
  is_bookmarked BOOLEAN,
  is_viewed BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.user_id,
    p.username,
    p.avatar_url,
    r.caption,
    r.video_url,
    r.thumbnail_url,
    r.music,
    r.hashtags,
    r.created_at,
    r.likes_count,
    r.comments_count,
    r.views_count,
    r.bookmarks_count,
    -- Check if user has liked this reel
    EXISTS(
      SELECT 1 FROM reel_likes rl 
      WHERE rl.reel_id = r.id AND rl.user_id = p_user_id
    ) AS is_liked,
    -- Check if user has bookmarked this reel
    EXISTS(
      SELECT 1 FROM reel_bookmarks rb 
      WHERE rb.reel_id = r.id AND rb.user_id = p_user_id
    ) AS is_bookmarked,
    -- Check if user has viewed this reel
    EXISTS(
      SELECT 1 FROM reel_views rv 
      WHERE rv.reel_id = r.id AND rv.user_id = p_user_id
    ) AS is_viewed
  FROM reels r
  JOIN profiles p ON r.user_id = p.id
  WHERE r.created_at IS NOT NULL
  ORDER BY 
    -- Prioritize content from followed users
    CASE WHEN EXISTS(
      SELECT 1 FROM follows f 
      WHERE f.follower_id = p_user_id AND f.following_id = r.user_id
    ) THEN 1 ELSE 2 END,
    -- Then by engagement score
    (r.likes_count + r.comments_count * 2 + r.views_count * 0.1) DESC,
    -- Finally by recency
    r.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old reel analytics data
CREATE OR REPLACE FUNCTION cleanup_old_reel_data(
  p_days_to_keep INTEGER DEFAULT 90
) RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete old view records (keep only recent ones for analytics)
  DELETE FROM reel_views 
  WHERE created_at < NOW() - (p_days_to_keep || ' days')::INTERVAL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for optimal performance
CREATE INDEX IF NOT EXISTS idx_reels_user_id_created_at ON reels(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reels_created_at_engagement ON reels(created_at DESC, likes_count DESC, views_count DESC);
CREATE INDEX IF NOT EXISTS idx_reel_likes_reel_user ON reel_likes(reel_id, user_id);
CREATE INDEX IF NOT EXISTS idx_reel_bookmarks_reel_user ON reel_bookmarks(reel_id, user_id);
CREATE INDEX IF NOT EXISTS idx_reel_views_reel_user ON reel_views(reel_id, user_id);
CREATE INDEX IF NOT EXISTS idx_reel_views_created_at ON reel_views(created_at);
CREATE INDEX IF NOT EXISTS idx_reels_hashtags_gin ON reels USING gin(hashtags);

-- Create composite indexes for trending algorithm
CREATE INDEX IF NOT EXISTS idx_reels_trending_score ON reels(
  created_at DESC, 
  (likes_count + comments_count * 2 + views_count * 0.1) DESC
) WHERE views_count > 0;
