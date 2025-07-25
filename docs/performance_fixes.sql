-- =====================================================
-- KLICKTAPE PERFORMANCE OPTIMIZATION FIXES
-- =====================================================
-- This file contains fixes for the slow queries identified in slow_queries.json

-- =====================================================
-- 1. COMMENT SYSTEM OPTIMIZATIONS
-- =====================================================

-- Create missing indexes for comment operations
CREATE INDEX IF NOT EXISTS idx_comments_parent_comment_id ON comments(parent_comment_id) WHERE parent_comment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_comments_post_user_created ON comments(post_id, user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_likes_count ON comments(likes_count DESC) WHERE likes_count > 0;
CREATE INDEX IF NOT EXISTS idx_comments_replies_count ON comments(replies_count DESC) WHERE replies_count > 0;

-- Comment likes indexes
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_user ON comment_likes(comment_id, user_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user_comment ON comment_likes(user_id, comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user_id ON comment_likes(user_id);

-- Reel comment indexes
CREATE INDEX IF NOT EXISTS idx_reel_comments_reel_id ON reel_comments(reel_id);
CREATE INDEX IF NOT EXISTS idx_reel_comments_user_id ON reel_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_reel_comments_reel_created ON reel_comments(reel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reel_comments_parent_comment_id ON reel_comments(parent_comment_id) WHERE parent_comment_id IS NOT NULL;

-- Reel comment likes indexes
CREATE INDEX IF NOT EXISTS idx_reel_comment_likes_comment_user ON reel_comment_likes(comment_id, user_id);
CREATE INDEX IF NOT EXISTS idx_reel_comment_likes_user_comment ON reel_comment_likes(user_id, comment_id);
CREATE INDEX IF NOT EXISTS idx_reel_comment_likes_comment_id ON reel_comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_reel_comment_likes_user_id ON reel_comment_likes(user_id);

-- =====================================================
-- 2. OPTIMIZED FUNCTIONS
-- =====================================================

-- Function to get comments with optimized query
CREATE OR REPLACE FUNCTION get_comments_optimized(entity_type TEXT, entity_id UUID)
RETURNS TABLE (
  id UUID,
  content TEXT,
  user_id UUID,
  parent_comment_id UUID,
  created_at TIMESTAMPTZ,
  likes_count INTEGER,
  replies_count INTEGER,
  mentions JSONB,
  username TEXT,
  avatar_url TEXT
) AS $$
BEGIN
  IF entity_type = 'post' THEN
    RETURN QUERY
    SELECT 
      c.id,
      c.content,
      c.user_id,
      c.parent_comment_id,
      c.created_at,
      c.likes_count,
      c.replies_count,
      c.mentions,
      p.username,
      p.avatar_url
    FROM comments c
    JOIN profiles p ON c.user_id = p.id
    WHERE c.post_id = entity_id
    ORDER BY c.created_at ASC;
  ELSIF entity_type = 'reel' THEN
    RETURN QUERY
    SELECT 
      rc.id,
      rc.content,
      rc.user_id,
      rc.parent_comment_id,
      rc.created_at,
      rc.likes_count,
      rc.replies_count,
      rc.mentions,
      p.username,
      p.avatar_url
    FROM reel_comments rc
    JOIN profiles p ON rc.user_id = p.id
    WHERE rc.reel_id = entity_id
    ORDER BY rc.created_at ASC;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get comment like status efficiently
CREATE OR REPLACE FUNCTION get_comment_like_status(entity_type TEXT, comment_ids UUID[], user_id_param UUID)
RETURNS TABLE (comment_id UUID) AS $$
BEGIN
  IF entity_type = 'post' THEN
    RETURN QUERY
    SELECT cl.comment_id
    FROM comment_likes cl
    WHERE cl.user_id = user_id_param
      AND cl.comment_id = ANY(comment_ids);
  ELSIF entity_type = 'reel' THEN
    RETURN QUERY
    SELECT rcl.comment_id
    FROM reel_comment_likes rcl
    WHERE rcl.user_id = user_id_param
      AND rcl.comment_id = ANY(comment_ids);
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- 3. REALTIME OPTIMIZATION
-- =====================================================

-- Function to reduce realtime subscription overhead
CREATE OR REPLACE FUNCTION optimize_realtime_subscriptions()
RETURNS void AS $$
BEGIN
  -- Clean up old realtime subscriptions
  DELETE FROM realtime.subscription 
  WHERE created_at < NOW() - INTERVAL '1 hour';
  
  -- Vacuum realtime tables
  VACUUM ANALYZE realtime.subscription;
  VACUUM ANALYZE realtime.messages;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. PERFORMANCE MONITORING
-- =====================================================

-- Function to monitor slow queries
CREATE OR REPLACE FUNCTION get_slow_queries()
RETURNS TABLE (
  query TEXT,
  calls BIGINT,
  total_time DOUBLE PRECISION,
  mean_time DOUBLE PRECISION,
  rows BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pg_stat_statements.query,
    pg_stat_statements.calls,
    pg_stat_statements.total_exec_time,
    pg_stat_statements.mean_exec_time,
    pg_stat_statements.rows
  FROM pg_stat_statements
  WHERE pg_stat_statements.mean_exec_time > 100
  ORDER BY pg_stat_statements.total_exec_time DESC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. MAINTENANCE TASKS
-- =====================================================

-- Update table statistics for optimal query planning
ANALYZE profiles;
ANALYZE posts;
ANALYZE reels;
ANALYZE comments;
ANALYZE comment_likes;
ANALYZE reel_comments;
ANALYZE reel_comment_likes;
ANALYZE likes;
ANALYZE bookmarks;
ANALYZE follows;
ANALYZE messages;

-- =====================================================
-- 6. CACHE OPTIMIZATION VIEWS
-- =====================================================

-- Optimized view for comment feeds
CREATE OR REPLACE VIEW comments_feed_optimized AS
SELECT
  c.id,
  c.content,
  c.user_id,
  c.post_id,
  c.parent_comment_id,
  c.created_at,
  c.likes_count,
  c.replies_count,
  c.mentions,
  p.username,
  p.avatar_url
FROM comments c
JOIN profiles p ON c.user_id = p.id
WHERE c.parent_comment_id IS NULL  -- Only top-level comments
ORDER BY c.created_at DESC;

-- Optimized view for reel comment feeds
CREATE OR REPLACE VIEW reel_comments_feed_optimized AS
SELECT
  rc.id,
  rc.content,
  rc.user_id,
  rc.reel_id,
  rc.parent_comment_id,
  rc.created_at,
  rc.likes_count,
  rc.replies_count,
  rc.mentions,
  p.username,
  p.avatar_url
FROM reel_comments rc
JOIN profiles p ON rc.user_id = p.id
WHERE rc.parent_comment_id IS NULL  -- Only top-level comments
ORDER BY rc.created_at DESC;

-- =====================================================
-- 7. SCHEDULED MAINTENANCE
-- =====================================================

-- Function to run periodic maintenance
CREATE OR REPLACE FUNCTION run_periodic_maintenance()
RETURNS void AS $$
BEGIN
  -- Sync comment counts
  PERFORM sync_comment_counts();
  
  -- Optimize realtime subscriptions
  PERFORM optimize_realtime_subscriptions();
  
  -- Update statistics
  ANALYZE comments;
  ANALYZE comment_likes;
  ANALYZE reel_comments;
  ANALYZE reel_comment_likes;
  
  -- Log maintenance completion
  INSERT INTO maintenance_log (task, completed_at) 
  VALUES ('periodic_maintenance', NOW());
END;
$$ LANGUAGE plpgsql;

-- Create maintenance log table if it doesn't exist
CREATE TABLE IF NOT EXISTS maintenance_log (
  id SERIAL PRIMARY KEY,
  task TEXT NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 8. EXECUTION
-- =====================================================

-- Run initial optimization
SELECT run_periodic_maintenance();

-- Log completion
INSERT INTO maintenance_log (task, completed_at) 
VALUES ('performance_optimization_applied', NOW());
