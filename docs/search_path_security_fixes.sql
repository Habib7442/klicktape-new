-- =====================================================
-- KLICKTAPE SEARCH PATH SECURITY FIXES
-- =====================================================
-- This file fixes the "Function Search Path Mutable" warnings
-- by setting secure search_path for all functions

-- =====================================================
-- 1. FIX TRIGGER FUNCTIONS
-- =====================================================

-- Fix search_path for trigger functions
ALTER FUNCTION update_comment_count() SET search_path = 'public';
ALTER FUNCTION update_reel_comment_count() SET search_path = 'public';
ALTER FUNCTION update_comment_like_count() SET search_path = 'public';
ALTER FUNCTION update_reel_comment_like_count() SET search_path = 'public';

-- =====================================================
-- 2. FIX MAINTENANCE FUNCTIONS
-- =====================================================

-- Fix search_path for maintenance functions
ALTER FUNCTION sync_comment_counts() SET search_path = 'public';
ALTER FUNCTION run_periodic_maintenance() SET search_path = 'public';
ALTER FUNCTION security_audit() SET search_path = 'public';

-- =====================================================
-- 3. FIX OPTIMIZED FUNCTIONS
-- =====================================================

-- Fix search_path for optimized functions
ALTER FUNCTION get_comments_optimized(text, uuid) SET search_path = 'public';
ALTER FUNCTION get_comment_like_status(text, uuid[], uuid) SET search_path = 'public';
ALTER FUNCTION lightning_toggle_like_v4(uuid, uuid) SET search_path = 'public';

-- =====================================================
-- 4. FIX LIGHTNING FUNCTIONS
-- =====================================================

-- Fix search_path for lightning functions
ALTER FUNCTION lightning_toggle_bookmark_v3(uuid, uuid) SET search_path = 'public';
ALTER FUNCTION lightning_toggle_like_v3(uuid, uuid) SET search_path = 'public';
ALTER FUNCTION lightning_fast_posts_feed(uuid, integer, integer) SET search_path = 'public';

-- =====================================================
-- 5. FIX USER AND CONTENT FUNCTIONS
-- =====================================================

-- Fix search_path for user and content functions
ALTER FUNCTION get_conversation_messages(uuid, uuid, integer, integer) SET search_path = 'public';
ALTER FUNCTION get_user_posts_optimized(uuid, uuid, integer, integer) SET search_path = 'public';
ALTER FUNCTION get_user_bookmarks_optimized(uuid, integer, integer) SET search_path = 'public';
ALTER FUNCTION is_profile_complete(uuid) SET search_path = 'public';
ALTER FUNCTION mark_story_viewed(uuid, integer) SET search_path = 'public';

-- =====================================================
-- 6. FIX TOGGLE FUNCTIONS
-- =====================================================

-- Fix search_path for toggle functions
ALTER FUNCTION toggle_comment_like(uuid, uuid, boolean) SET search_path = 'public';
ALTER FUNCTION toggle_reel_comment_like(uuid, uuid, boolean) SET search_path = 'public';
ALTER FUNCTION toggle_reel_like(uuid, uuid, boolean) SET search_path = 'public';

-- =====================================================
-- 7. FIX COUNT UPDATE FUNCTIONS
-- =====================================================

-- Fix search_path for count update functions
ALTER FUNCTION update_bookmarks_count_optimized() SET search_path = 'public';
ALTER FUNCTION update_likes_count_optimized() SET search_path = 'public';
ALTER FUNCTION update_comments_count() SET search_path = 'public';

-- =====================================================
-- 8. VERIFICATION
-- =====================================================

-- Function to check search_path configuration
CREATE OR REPLACE FUNCTION check_function_search_paths()
RETURNS TABLE (
    function_name TEXT,
    arguments TEXT,
    search_path_config TEXT,
    security_status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.proname::TEXT as function_name,
        pg_get_function_identity_arguments(p.oid)::TEXT as arguments,
        CASE 
            WHEN p.proconfig IS NULL THEN 'NO SEARCH_PATH SET'
            ELSE array_to_string(p.proconfig, ', ')
        END as search_path_config,
        CASE 
            WHEN p.proconfig IS NULL THEN 'VULNERABLE'
            WHEN 'search_path=public' = ANY(p.proconfig) THEN 'SECURE'
            ELSE 'CHECK REQUIRED'
        END as security_status
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname NOT LIKE 'pg_%'
    ORDER BY p.proname;
END;
$$ LANGUAGE plpgsql SET search_path = 'public';

-- Run verification
SELECT * FROM check_function_search_paths() WHERE security_status = 'VULNERABLE';

-- =====================================================
-- 9. COMMENTS DEBUGGING FUNCTION
-- =====================================================

-- Function to debug comments loading issues
CREATE OR REPLACE FUNCTION debug_comments_loading(entity_type_param TEXT, entity_id_param UUID)
RETURNS TABLE (
    check_name TEXT,
    result TEXT,
    details JSONB
) AS $$
BEGIN
    -- Check if entity exists
    IF entity_type_param = 'post' THEN
        RETURN QUERY
        SELECT 
            'post_exists'::TEXT,
            CASE WHEN EXISTS(SELECT 1 FROM posts WHERE id = entity_id_param) 
                THEN 'YES' ELSE 'NO' END::TEXT,
            jsonb_build_object('post_id', entity_id_param)::JSONB;
    ELSIF entity_type_param = 'reel' THEN
        RETURN QUERY
        SELECT 
            'reel_exists'::TEXT,
            CASE WHEN EXISTS(SELECT 1 FROM reels WHERE id = entity_id_param) 
                THEN 'YES' ELSE 'NO' END::TEXT,
            jsonb_build_object('reel_id', entity_id_param)::JSONB;
    END IF;

    -- Check comments count
    IF entity_type_param = 'post' THEN
        RETURN QUERY
        SELECT 
            'comments_count'::TEXT,
            (SELECT COUNT(*)::TEXT FROM comments WHERE post_id = entity_id_param),
            jsonb_build_object(
                'total_comments', (SELECT COUNT(*) FROM comments WHERE post_id = entity_id_param),
                'top_level_comments', (SELECT COUNT(*) FROM comments WHERE post_id = entity_id_param AND parent_comment_id IS NULL)
            )::JSONB;
    ELSIF entity_type_param = 'reel' THEN
        RETURN QUERY
        SELECT 
            'comments_count'::TEXT,
            (SELECT COUNT(*)::TEXT FROM reel_comments WHERE reel_id = entity_id_param),
            jsonb_build_object(
                'total_comments', (SELECT COUNT(*) FROM reel_comments WHERE reel_id = entity_id_param),
                'top_level_comments', (SELECT COUNT(*) FROM reel_comments WHERE reel_id = entity_id_param AND parent_comment_id IS NULL)
            )::JSONB;
    END IF;

    -- Test optimized function
    RETURN QUERY
    SELECT 
        'optimized_function_test'::TEXT,
        'SUCCESS'::TEXT,
        jsonb_build_object(
            'function_result_count', 
            (SELECT COUNT(*) FROM get_comments_optimized(entity_type_param, entity_id_param))
        )::JSONB;

END;
$$ LANGUAGE plpgsql SET search_path = 'public';

-- =====================================================
-- 10. PERFORMANCE MONITORING
-- =====================================================

-- Function to monitor function performance
CREATE OR REPLACE FUNCTION monitor_function_performance()
RETURNS TABLE (
    function_name TEXT,
    calls BIGINT,
    total_time DOUBLE PRECISION,
    mean_time DOUBLE PRECISION,
    search_path_secure BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pgs.query::TEXT as function_name,
        pgs.calls,
        pgs.total_exec_time,
        pgs.mean_exec_time,
        EXISTS(
            SELECT 1 FROM pg_proc p 
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE n.nspname = 'public'
            AND pgs.query LIKE '%' || p.proname || '%'
            AND p.proconfig IS NOT NULL
            AND 'search_path=public' = ANY(p.proconfig)
        ) as search_path_secure
    FROM pg_stat_statements pgs
    WHERE pgs.query LIKE '%public.%'
    AND pgs.calls > 0
    ORDER BY pgs.total_exec_time DESC
    LIMIT 20;
END;
$$ LANGUAGE plpgsql SET search_path = 'public';

-- =====================================================
-- 11. EXECUTION SUMMARY
-- =====================================================

-- Log completion
INSERT INTO maintenance_log (task, completed_at) 
VALUES ('search_path_security_fixes_applied', NOW());

-- Display summary
DO $$
DECLARE
    vulnerable_count INTEGER;
    secure_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO vulnerable_count 
    FROM check_function_search_paths() 
    WHERE security_status = 'VULNERABLE';
    
    SELECT COUNT(*) INTO secure_count 
    FROM check_function_search_paths() 
    WHERE security_status = 'SECURE';
    
    RAISE NOTICE '=== SEARCH PATH SECURITY FIXES COMPLETED ===';
    RAISE NOTICE 'Secure functions: %', secure_count;
    RAISE NOTICE 'Vulnerable functions remaining: %', vulnerable_count;
    
    IF vulnerable_count > 0 THEN
        RAISE NOTICE 'WARNING: % functions still have vulnerable search_path', vulnerable_count;
    ELSE
        RAISE NOTICE 'SUCCESS: All functions have secure search_path configuration';
    END IF;
    
    RAISE NOTICE '=== SEARCH PATH AUDIT COMPLETE ===';
END $$;
