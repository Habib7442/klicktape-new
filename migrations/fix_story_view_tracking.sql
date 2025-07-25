-- Migration: Fix Story View Tracking to Prevent Duplicate View Counts
-- This ensures that view counts only increment once per user per story (like Instagram)

-- Function to mark story as viewed (Updated to prevent duplicate view counts)
CREATE OR REPLACE FUNCTION mark_story_viewed(story_id_param UUID, view_duration_param INTEGER DEFAULT 0)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    viewer_id_val UUID;
    is_new_view BOOLEAN := FALSE;
BEGIN
    -- Get current user ID
    viewer_id_val := auth.uid();
    
    IF viewer_id_val IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Check if this is a new view (user hasn't viewed this story before)
    SELECT NOT EXISTS(
        SELECT 1 FROM story_views 
        WHERE story_id = story_id_param AND viewer_id = viewer_id_val
    ) INTO is_new_view;
    
    -- Insert or update story view
    INSERT INTO story_views (story_id, viewer_id, viewed_at, view_duration, completed)
    VALUES (story_id_param, viewer_id_val, NOW(), view_duration_param, view_duration_param >= 3000)
    ON CONFLICT (story_id, viewer_id) 
    DO UPDATE SET 
        viewed_at = NOW(),
        view_duration = GREATEST(story_views.view_duration, view_duration_param),
        completed = CASE 
            WHEN view_duration_param >= 3000 THEN TRUE 
            ELSE story_views.completed 
        END;
    
    -- Only increment view count for new views (like Instagram)
    IF is_new_view THEN
        UPDATE stories 
        SET view_count = view_count + 1 
        WHERE id = story_id_param;
    END IF;
    
    RETURN TRUE;
END;
$$;

-- Add comment to document the change
COMMENT ON FUNCTION mark_story_viewed(UUID, INTEGER) IS 
'Marks a story as viewed by the current user. Only increments view_count for new views to prevent duplicate counting (Instagram-like behavior).';
