-- =====================================================
-- KLICKTAPE ENHANCED STORIES SCHEMA
-- Comprehensive stories feature with multiple stories support
-- =====================================================

-- =====================================================
-- ENHANCED STORIES TABLE STRUCTURE
-- =====================================================

-- Add new columns to existing stories table for enhanced functionality
ALTER TABLE stories ADD COLUMN IF NOT EXISTS story_order INTEGER DEFAULT 1;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS story_type TEXT DEFAULT 'image';
ALTER TABLE stories ADD COLUMN IF NOT EXISTS duration INTEGER DEFAULT 5000; -- milliseconds
ALTER TABLE stories ADD COLUMN IF NOT EXISTS background_color TEXT;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS text_content TEXT;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS font_style JSONB;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS filters JSONB;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS music_url TEXT;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- Create story collections table for grouping stories
CREATE TABLE IF NOT EXISTS story_collections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT,
    cover_image_url TEXT,
    story_count INTEGER DEFAULT 0,
    total_views INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ NOT NULL,
    is_highlight BOOLEAN DEFAULT FALSE
);

-- Story views tracking table for analytics
CREATE TABLE IF NOT EXISTS story_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    viewer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    viewed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    view_duration INTEGER DEFAULT 0, -- milliseconds
    completed BOOLEAN DEFAULT FALSE,
    UNIQUE(story_id, viewer_id)
);

-- Story interactions table (likes, reactions, etc.)
CREATE TABLE IF NOT EXISTS story_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    interaction_type TEXT NOT NULL, -- 'like', 'reaction', 'share'
    reaction_emoji TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(story_id, user_id, interaction_type)
);

-- =====================================================
-- PRODUCTION-LEVEL INDEXES FOR STORIES
-- =====================================================

-- Core stories indexes
CREATE INDEX IF NOT EXISTS idx_stories_user_id_active ON stories(user_id, is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stories_expires_at ON stories(expires_at) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_stories_user_order ON stories(user_id, story_order, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stories_active_recent ON stories(is_active, created_at DESC) WHERE expires_at > NOW();

-- Story collections indexes
CREATE INDEX IF NOT EXISTS idx_story_collections_user_id ON story_collections(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_story_collections_expires ON story_collections(expires_at) WHERE is_highlight = FALSE;

-- Story views indexes
CREATE INDEX IF NOT EXISTS idx_story_views_story_id ON story_views(story_id, viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_story_views_viewer_id ON story_views(viewer_id, viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_story_views_completed ON story_views(story_id, completed, viewed_at DESC);

-- Story interactions indexes
CREATE INDEX IF NOT EXISTS idx_story_interactions_story_id ON story_interactions(story_id, interaction_type);
CREATE INDEX IF NOT EXISTS idx_story_interactions_user_id ON story_interactions(user_id, created_at DESC);

-- =====================================================
-- ENHANCED STORIES FUNCTIONS
-- =====================================================

-- Function to get user stories with proper ordering and multiple stories support
CREATE OR REPLACE FUNCTION get_user_stories_enhanced(user_id_param UUID)
RETURNS TABLE(
    id UUID,
    user_id UUID,
    image_url TEXT,
    caption TEXT,
    created_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    story_order INTEGER,
    view_count INTEGER,
    duration INTEGER,
    story_type TEXT,
    username TEXT,
    avatar_url TEXT,
    is_viewed BOOLEAN
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.user_id,
        s.image_url,
        s.caption,
        s.created_at,
        s.expires_at,
        s.story_order,
        s.view_count,
        s.duration,
        s.story_type,
        p.username,
        p.avatar_url,
        CASE 
            WHEN sv.story_id IS NOT NULL THEN TRUE 
            ELSE FALSE 
        END as is_viewed
    FROM stories s
    JOIN profiles p ON s.user_id = p.id
    LEFT JOIN story_views sv ON s.id = sv.story_id AND sv.viewer_id = auth.uid()
    WHERE s.user_id = user_id_param
        AND s.is_active = TRUE
        AND s.expires_at > NOW()
    ORDER BY s.story_order ASC, s.created_at ASC;
END;
$$;

-- Function to get all active stories grouped by user with auto-play sequence support
CREATE OR REPLACE FUNCTION get_stories_feed_enhanced(limit_param INTEGER DEFAULT 50)
RETURNS TABLE(
    user_id UUID,
    username TEXT,
    avatar_url TEXT,
    story_count INTEGER,
    latest_story_time TIMESTAMPTZ,
    has_unviewed BOOLEAN,
    stories JSONB
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH user_stories AS (
        SELECT 
            s.user_id,
            p.username,
            p.avatar_url,
            COUNT(s.id) as story_count,
            MAX(s.created_at) as latest_story_time,
            BOOL_OR(sv.story_id IS NULL) as has_unviewed,
            JSON_AGG(
                JSON_BUILD_OBJECT(
                    'id', s.id,
                    'image_url', s.image_url,
                    'caption', s.caption,
                    'created_at', s.created_at,
                    'expires_at', s.expires_at,
                    'story_order', s.story_order,
                    'duration', s.duration,
                    'story_type', s.story_type,
                    'is_viewed', CASE WHEN sv.story_id IS NOT NULL THEN true ELSE false END
                ) ORDER BY s.story_order ASC, s.created_at ASC
            ) as stories
        FROM stories s
        JOIN profiles p ON s.user_id = p.id
        LEFT JOIN story_views sv ON s.id = sv.story_id AND sv.viewer_id = auth.uid()
        WHERE s.is_active = TRUE
            AND s.expires_at > NOW()
        GROUP BY s.user_id, p.username, p.avatar_url
    )
    SELECT 
        us.user_id,
        us.username,
        us.avatar_url,
        us.story_count::INTEGER,
        us.latest_story_time,
        us.has_unviewed,
        us.stories
    FROM user_stories us
    ORDER BY us.has_unviewed DESC, us.latest_story_time DESC
    LIMIT limit_param;
END;
$$;

-- Function to mark story as viewed
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

-- Function to create story with proper ordering
CREATE OR REPLACE FUNCTION create_story_enhanced(
    image_url_param TEXT,
    caption_param TEXT DEFAULT NULL,
    duration_param INTEGER DEFAULT 5000,
    story_type_param TEXT DEFAULT 'image'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_id_val UUID;
    next_order INTEGER;
    story_id UUID;
    expires_time TIMESTAMPTZ;
BEGIN
    -- Get current user ID
    user_id_val := auth.uid();
    
    IF user_id_val IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    -- Calculate expiration time (24 hours from now)
    expires_time := NOW() + INTERVAL '24 hours';
    
    -- Get next story order for this user
    SELECT COALESCE(MAX(story_order), 0) + 1 
    INTO next_order
    FROM stories 
    WHERE user_id = user_id_val 
        AND is_active = TRUE 
        AND expires_at > NOW();
    
    -- Insert new story
    INSERT INTO stories (
        user_id, 
        image_url, 
        caption, 
        expires_at, 
        story_order, 
        duration, 
        story_type,
        is_active
    )
    VALUES (
        user_id_val, 
        image_url_param, 
        caption_param, 
        expires_time, 
        next_order, 
        duration_param, 
        story_type_param,
        TRUE
    )
    RETURNING id INTO story_id;
    
    RETURN story_id;
END;
$$;

-- Function to cleanup expired stories
CREATE OR REPLACE FUNCTION cleanup_expired_stories()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Mark expired stories as inactive instead of deleting
    UPDATE stories 
    SET is_active = FALSE 
    WHERE expires_at <= NOW() 
        AND is_active = TRUE;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Clean up old story views (older than 30 days)
    DELETE FROM story_views 
    WHERE viewed_at < NOW() - INTERVAL '30 days';
    
    -- Clean up old story interactions (older than 30 days)
    DELETE FROM story_interactions 
    WHERE created_at < NOW() - INTERVAL '30 days';
    
    RETURN deleted_count;
END;
$$;

-- =====================================================
-- TRIGGERS FOR STORIES
-- =====================================================

-- Trigger to update story collection counts
CREATE OR REPLACE FUNCTION update_story_collection_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Update story count for user's active collection
        UPDATE story_collections 
        SET story_count = story_count + 1,
            updated_at = NOW()
        WHERE user_id = NEW.user_id 
            AND expires_at > NOW() 
            AND is_highlight = FALSE;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Handle story activation/deactivation
        IF OLD.is_active != NEW.is_active THEN
            UPDATE story_collections 
            SET story_count = (
                SELECT COUNT(*) 
                FROM stories 
                WHERE user_id = NEW.user_id 
                    AND is_active = TRUE 
                    AND expires_at > NOW()
            ),
            updated_at = NOW()
            WHERE user_id = NEW.user_id 
                AND expires_at > NOW() 
                AND is_highlight = FALSE;
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$;

-- Create trigger
CREATE TRIGGER trigger_update_story_collection_counts
    AFTER INSERT OR UPDATE ON stories
    FOR EACH ROW EXECUTE FUNCTION update_story_collection_counts();

-- =====================================================
-- RLS POLICIES FOR NEW TABLES
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE story_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_interactions ENABLE ROW LEVEL SECURITY;

-- Story collections policies
CREATE POLICY "story_collections_select_policy" ON story_collections FOR SELECT USING (true);
CREATE POLICY "story_collections_insert_policy" ON story_collections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "story_collections_update_policy" ON story_collections FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "story_collections_delete_policy" ON story_collections FOR DELETE USING (auth.uid() = user_id);

-- Story views policies
CREATE POLICY "story_views_select_policy" ON story_views FOR SELECT USING (true);
CREATE POLICY "story_views_insert_policy" ON story_views FOR INSERT WITH CHECK (auth.uid() = viewer_id);
CREATE POLICY "story_views_update_policy" ON story_views FOR UPDATE USING (auth.uid() = viewer_id);

-- Story interactions policies
CREATE POLICY "story_interactions_select_policy" ON story_interactions FOR SELECT USING (true);
CREATE POLICY "story_interactions_insert_policy" ON story_interactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "story_interactions_update_policy" ON story_interactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "story_interactions_delete_policy" ON story_interactions FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- VERIFICATION AND CLEANUP
-- =====================================================

-- Verify new columns were added
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'stories' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- Create cleanup job (run this periodically)
-- SELECT cleanup_expired_stories();

-- =====================================================
-- SUMMARY OF ENHANCEMENTS
-- =====================================================

/*
ENHANCED FEATURES:
1. Multiple stories per user with proper ordering
2. Story view tracking and analytics
3. Story interactions (likes, reactions)
4. Enhanced story types (image, video, text)
5. Custom durations and styling options
6. Proper indexing for performance
7. Auto-cleanup of expired content
8. Story collections for highlights
9. View completion tracking
10. Optimized queries for feed generation

PERFORMANCE IMPROVEMENTS:
- Composite indexes for common queries
- Efficient story feed generation
- View tracking without blocking
- Proper cleanup mechanisms
- Optimized for Redis caching

MULTIPLE STORIES SUPPORT:
- story_order column for sequencing
- Enhanced feed function groups by user
- Proper view tracking per story
- Collection management for highlights
*/
