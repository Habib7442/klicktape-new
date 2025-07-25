-- Fix for Like Count Bug - Create new RPC function that doesn't manually update counts
-- This allows the database triggers to handle count updates automatically

-- Create a new version of the like toggle function that only handles like records
-- The existing triggers will automatically update the counts
CREATE OR REPLACE FUNCTION lightning_toggle_like_v4(post_id_param UUID, user_id_param UUID)
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
        -- Was liked, now unliked
        -- Don't manually update count - let triggers handle it
        result := FALSE;
    ELSE
        -- Wasn't liked, so insert new like
        -- Don't manually update count - let triggers handle it
        INSERT INTO likes (post_id, user_id, created_at)
        VALUES (post_id_param, user_id_param, NOW());
        result := TRUE;
    END IF;

    RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION lightning_toggle_like_v4(UUID, UUID) TO authenticated;

-- Test the function (optional - remove these lines in production)
-- SELECT lightning_toggle_like_v4('test-post-id'::UUID, 'test-user-id'::UUID);
