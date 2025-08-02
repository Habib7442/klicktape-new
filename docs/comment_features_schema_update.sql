-- Comment Features Schema Update
-- Adds support for comment editing and pinning features
-- Run this SQL to update your Supabase database

-- Add editing and pinning columns to comments table
ALTER TABLE comments 
ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS pinned_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Add editing and pinning columns to reel_comments table
ALTER TABLE reel_comments 
ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS pinned_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_comments_is_pinned ON comments(is_pinned) WHERE is_pinned = TRUE;
CREATE INDEX IF NOT EXISTS idx_reel_comments_is_pinned ON reel_comments(is_pinned) WHERE is_pinned = TRUE;
CREATE INDEX IF NOT EXISTS idx_comments_edited ON comments(is_edited) WHERE is_edited = TRUE;
CREATE INDEX IF NOT EXISTS idx_reel_comments_edited ON reel_comments(is_edited) WHERE is_edited = TRUE;

-- Function to update comment content and set edited status
CREATE OR REPLACE FUNCTION update_comment_content(
  comment_id_param UUID,
  new_content TEXT,
  new_mentions JSONB DEFAULT '[]'::jsonb,
  table_name TEXT DEFAULT 'comments'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  result JSONB;
  current_user_id UUID;
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Update the comment based on table type
  IF table_name = 'comments' THEN
    UPDATE comments 
    SET 
      content = new_content,
      mentions = new_mentions,
      edited_at = NOW(),
      is_edited = TRUE
    WHERE id = comment_id_param 
      AND user_id = current_user_id
    RETURNING jsonb_build_object(
      'id', id,
      'content', content,
      'edited_at', edited_at,
      'is_edited', is_edited,
      'mentions', mentions
    ) INTO result;
  ELSE
    UPDATE reel_comments 
    SET 
      content = new_content,
      mentions = new_mentions,
      edited_at = NOW(),
      is_edited = TRUE
    WHERE id = comment_id_param 
      AND user_id = current_user_id
    RETURNING jsonb_build_object(
      'id', id,
      'content', content,
      'edited_at', edited_at,
      'is_edited', is_edited,
      'mentions', mentions
    ) INTO result;
  END IF;

  IF result IS NULL THEN
    RAISE EXCEPTION 'Comment not found or user not authorized to edit';
  END IF;

  RETURN result;
END;
$$;

-- Function to toggle comment pin status
CREATE OR REPLACE FUNCTION toggle_comment_pin(
  comment_id_param UUID,
  entity_id_param UUID,
  entity_type TEXT DEFAULT 'post'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  result JSONB;
  current_user_id UUID;
  entity_owner_id UUID;
  current_pin_status BOOLEAN;
  table_name TEXT;
  entity_table TEXT;
  entity_column TEXT;
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Set table names based on entity type
  IF entity_type = 'post' THEN
    table_name := 'comments';
    entity_table := 'posts';
    entity_column := 'post_id';
  ELSE
    table_name := 'reel_comments';
    entity_table := 'reels';
    entity_column := 'reel_id';
  END IF;

  -- Get entity owner
  EXECUTE format('SELECT user_id FROM %I WHERE id = $1', entity_table) 
  INTO entity_owner_id 
  USING entity_id_param;

  IF entity_owner_id IS NULL THEN
    RAISE EXCEPTION 'Entity not found';
  END IF;

  -- Check if current user is the entity owner
  IF current_user_id != entity_owner_id THEN
    RAISE EXCEPTION 'Only the post/reel owner can pin comments';
  END IF;

  -- Get current pin status
  EXECUTE format('SELECT is_pinned FROM %I WHERE id = $1', table_name)
  INTO current_pin_status
  USING comment_id_param;

  IF current_pin_status IS NULL THEN
    RAISE EXCEPTION 'Comment not found';
  END IF;

  -- Toggle pin status
  IF current_pin_status THEN
    -- Unpin the comment
    EXECUTE format('
      UPDATE %I 
      SET is_pinned = FALSE, pinned_at = NULL, pinned_by = NULL
      WHERE id = $1
      RETURNING jsonb_build_object(
        ''id'', id,
        ''is_pinned'', is_pinned,
        ''pinned_at'', pinned_at,
        ''pinned_by'', pinned_by
      )', table_name)
    INTO result
    USING comment_id_param;
  ELSE
    -- Pin the comment
    EXECUTE format('
      UPDATE %I 
      SET is_pinned = TRUE, pinned_at = NOW(), pinned_by = $2
      WHERE id = $1
      RETURNING jsonb_build_object(
        ''id'', id,
        ''is_pinned'', is_pinned,
        ''pinned_at'', pinned_at,
        ''pinned_by'', pinned_by
      )', table_name)
    INTO result
    USING comment_id_param, current_user_id;
  END IF;

  RETURN result;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION update_comment_content TO authenticated;
GRANT EXECUTE ON FUNCTION toggle_comment_pin TO authenticated;

-- Comments for documentation
COMMENT ON FUNCTION update_comment_content IS 'Updates comment content and sets edited status. Only comment author can edit.';
COMMENT ON FUNCTION toggle_comment_pin IS 'Toggles comment pin status. Only post/reel owner can pin comments.';
