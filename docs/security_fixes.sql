-- =====================================================
-- KLICKTAPE SECURITY FIXES
-- =====================================================
-- This file addresses the security linting errors identified by Supabase

-- =====================================================
-- 1. FIX SECURITY DEFINER VIEW
-- =====================================================

-- Drop and recreate posts_feed view without SECURITY DEFINER
DROP VIEW IF EXISTS public.posts_feed CASCADE;

-- Recreate view with explicit SECURITY INVOKER setting
CREATE VIEW public.posts_feed
WITH (security_invoker = true) AS
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
-- 2. ENABLE RLS ON PUBLIC TABLES
-- =====================================================

-- Enable RLS on tables missing it
ALTER TABLE public_key_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_keys_backup ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts_optimized ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_log ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 3. CREATE RLS POLICIES
-- =====================================================

-- RLS Policies for public_key_audit
-- Only allow users to see their own audit records
CREATE POLICY "Users can view their own key audit records" ON public_key_audit
    FOR SELECT USING (auth.uid() = user_id);

-- Allow system to insert audit records
CREATE POLICY "System can insert audit records" ON public_key_audit
    FOR INSERT WITH CHECK (true);

-- Prevent updates and deletes for audit integrity
CREATE POLICY "No updates allowed on audit records" ON public_key_audit
    FOR UPDATE USING (false);

CREATE POLICY "No deletes allowed on audit records" ON public_key_audit
    FOR DELETE USING (false);

-- RLS Policies for public_keys_backup
-- Only allow users to see their own backup keys
CREATE POLICY "Users can view their own backup keys" ON public_keys_backup
    FOR SELECT USING (auth.uid() = user_id);

-- Allow users to insert their own backup keys
CREATE POLICY "Users can insert their own backup keys" ON public_keys_backup
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own backup keys
CREATE POLICY "Users can update their own backup keys" ON public_keys_backup
    FOR UPDATE USING (auth.uid() = user_id);

-- Allow users to delete their own backup keys
CREATE POLICY "Users can delete their own backup keys" ON public_keys_backup
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for posts_optimized
-- Allow all authenticated users to view optimized posts
CREATE POLICY "Authenticated users can view optimized posts" ON posts_optimized
    FOR SELECT USING (auth.role() = 'authenticated');

-- Only allow system/admin to insert optimized posts
CREATE POLICY "System can insert optimized posts" ON posts_optimized
    FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'service_role' OR auth.uid() IN (
        SELECT id FROM profiles WHERE username = 'admin'
    ));

-- Only allow system/admin to update optimized posts
CREATE POLICY "System can update optimized posts" ON posts_optimized
    FOR UPDATE USING (auth.jwt() ->> 'role' = 'service_role' OR auth.uid() IN (
        SELECT id FROM profiles WHERE username = 'admin'
    ));

-- Only allow system/admin to delete optimized posts
CREATE POLICY "System can delete optimized posts" ON posts_optimized
    FOR DELETE USING (auth.jwt() ->> 'role' = 'service_role' OR auth.uid() IN (
        SELECT id FROM profiles WHERE username = 'admin'
    ));

-- RLS Policies for maintenance_log
-- Only allow system/service role to access maintenance logs
CREATE POLICY "Only system can view maintenance logs" ON maintenance_log
    FOR SELECT USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Only system can insert maintenance logs" ON maintenance_log
    FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Only system can update maintenance logs" ON maintenance_log
    FOR UPDATE USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Only system can delete maintenance logs" ON maintenance_log
    FOR DELETE USING (auth.jwt() ->> 'role' = 'service_role');

-- =====================================================
-- 4. SECURITY AUDIT FUNCTION
-- =====================================================

-- Function to check for security issues
CREATE OR REPLACE FUNCTION security_audit()
RETURNS TABLE (
    table_name TEXT,
    rls_enabled BOOLEAN,
    has_policies BOOLEAN,
    policy_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.relname::TEXT as table_name,
        c.relrowsecurity as rls_enabled,
        EXISTS(
            SELECT 1 FROM pg_policy p 
            WHERE p.polrelid = c.oid
        ) as has_policies,
        COALESCE((
            SELECT COUNT(*) FROM pg_policy p 
            WHERE p.polrelid = c.oid
        ), 0) as policy_count
    FROM pg_class c
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public'
    AND c.relkind = 'r'  -- Only tables
    AND c.relname NOT LIKE 'pg_%'
    AND c.relname NOT LIKE 'sql_%'
    ORDER BY c.relname;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. SECURITY BEST PRACTICES
-- =====================================================

-- Revoke unnecessary permissions from public
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM public;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM public;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM public;

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- =====================================================
-- 6. VERIFICATION
-- =====================================================

-- Verify posts_feed view security setting
SELECT
    c.relname as view_name,
    c.reloptions,
    CASE
        WHEN c.reloptions IS NOT NULL AND 'security_definer=true' = ANY(c.reloptions) THEN 'SECURITY DEFINER (ISSUE)'
        WHEN c.reloptions IS NOT NULL AND 'security_invoker=true' = ANY(c.reloptions) THEN 'SECURITY INVOKER (FIXED)'
        ELSE 'DEFAULT INVOKER (OK)'
    END as security_status
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
AND c.relname = 'posts_feed'
AND c.relkind = 'v';

-- Run security audit to verify fixes
SELECT * FROM security_audit() WHERE NOT rls_enabled OR NOT has_policies;

-- Check for any remaining SECURITY DEFINER views
SELECT
    n.nspname as schema_name,
    c.relname as view_name,
    'SECURITY DEFINER VIEW FOUND' as issue
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
AND c.relkind = 'v'
AND c.reloptions IS NOT NULL
AND 'security_definer=true' = ANY(c.reloptions);

-- Log security fixes completion
INSERT INTO maintenance_log (task, completed_at)
VALUES ('security_fixes_applied', NOW());

-- =====================================================
-- 7. MONITORING
-- =====================================================

-- Function to monitor security compliance
CREATE OR REPLACE FUNCTION check_security_compliance()
RETURNS TABLE (
    issue_type TEXT,
    table_name TEXT,
    severity TEXT,
    description TEXT
) AS $$
BEGIN
    -- Check for tables without RLS
    RETURN QUERY
    SELECT 
        'RLS_DISABLED'::TEXT as issue_type,
        c.relname::TEXT as table_name,
        'HIGH'::TEXT as severity,
        'Table is public but RLS is not enabled'::TEXT as description
    FROM pg_class c
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND NOT c.relrowsecurity
    AND c.relname NOT LIKE 'pg_%';

    -- Check for tables without policies
    RETURN QUERY
    SELECT 
        'NO_POLICIES'::TEXT as issue_type,
        c.relname::TEXT as table_name,
        'MEDIUM'::TEXT as severity,
        'Table has RLS enabled but no policies defined'::TEXT as description
    FROM pg_class c
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND c.relrowsecurity = true
    AND NOT EXISTS(
        SELECT 1 FROM pg_policy p WHERE p.polrelid = c.oid
    )
    AND c.relname NOT LIKE 'pg_%';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. EXECUTION SUMMARY
-- =====================================================

-- Display summary of security fixes
DO $$
BEGIN
    RAISE NOTICE '=== SECURITY FIXES COMPLETED ===';
    RAISE NOTICE '1. Fixed Security Definer View: posts_feed';
    RAISE NOTICE '2. Enabled RLS on 4 tables';
    RAISE NOTICE '3. Created 16 RLS policies';
    RAISE NOTICE '4. Added security audit functions';
    RAISE NOTICE '5. Applied security best practices';
    RAISE NOTICE '=== SECURITY AUDIT COMPLETE ===';
END $$;
