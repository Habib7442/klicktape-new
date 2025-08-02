-- Production Database Configuration for Klicktape
-- Optimizes database settings for production deployment

-- ============================================================================
-- CONNECTION POOLING OPTIMIZATION
-- ============================================================================

-- Optimize connection settings for production
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;
ALTER SYSTEM SET random_page_cost = 1.1;
ALTER SYSTEM SET effective_io_concurrency = 200;

-- ============================================================================
-- REALTIME SUBSCRIPTION OPTIMIZATION
-- ============================================================================

-- Optimize realtime subscription settings
ALTER SYSTEM SET max_wal_size = '2GB';
ALTER SYSTEM SET min_wal_size = '80MB';
ALTER SYSTEM SET wal_level = 'logical';
ALTER SYSTEM SET max_replication_slots = 20;
ALTER SYSTEM SET max_logical_replication_workers = 10;

-- Create function to clean up old realtime subscriptions
CREATE OR REPLACE FUNCTION cleanup_realtime_subscriptions()
RETURNS void AS $$
BEGIN
  -- Clean up subscriptions older than 1 hour
  DELETE FROM realtime.subscription 
  WHERE created_at < NOW() - INTERVAL '1 hour'
    AND entity NOT IN (
      SELECT DISTINCT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    );
  
  -- Log cleanup
  RAISE NOTICE 'Cleaned up old realtime subscriptions';
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup every 30 minutes
SELECT cron.schedule('cleanup-realtime', '*/30 * * * *', 'SELECT cleanup_realtime_subscriptions();');

-- ============================================================================
-- QUERY OPTIMIZATION SETTINGS
-- ============================================================================

-- Optimize query planning
ALTER SYSTEM SET work_mem = '4MB';
ALTER SYSTEM SET hash_mem_multiplier = 2.0;
ALTER SYSTEM SET max_parallel_workers_per_gather = 2;
ALTER SYSTEM SET max_parallel_workers = 8;
ALTER SYSTEM SET max_parallel_maintenance_workers = 2;

-- Enable parallel query execution
ALTER SYSTEM SET force_parallel_mode = off;
ALTER SYSTEM SET parallel_tuple_cost = 0.1;
ALTER SYSTEM SET parallel_setup_cost = 1000.0;

-- ============================================================================
-- LOGGING AND MONITORING
-- ============================================================================

-- Enable slow query logging
ALTER SYSTEM SET log_min_duration_statement = 1000; -- Log queries > 1 second
ALTER SYSTEM SET log_statement = 'mod'; -- Log all data-modifying statements
ALTER SYSTEM SET log_duration = on;
ALTER SYSTEM SET log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h ';

-- Enable query statistics
ALTER SYSTEM SET track_activities = on;
ALTER SYSTEM SET track_counts = on;
ALTER SYSTEM SET track_io_timing = on;
ALTER SYSTEM SET track_functions = 'all';

-- ============================================================================
-- MEMORY OPTIMIZATION
-- ============================================================================

-- Optimize memory usage
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
ALTER SYSTEM SET pg_stat_statements.max = 10000;
ALTER SYSTEM SET pg_stat_statements.track = 'all';

-- ============================================================================
-- VACUUM AND AUTOVACUUM OPTIMIZATION
-- ============================================================================

-- Optimize autovacuum for high-traffic tables
ALTER SYSTEM SET autovacuum_max_workers = 3;
ALTER SYSTEM SET autovacuum_naptime = '20s';
ALTER SYSTEM SET autovacuum_vacuum_threshold = 50;
ALTER SYSTEM SET autovacuum_analyze_threshold = 50;
ALTER SYSTEM SET autovacuum_vacuum_scale_factor = 0.1;
ALTER SYSTEM SET autovacuum_analyze_scale_factor = 0.05;

-- Specific autovacuum settings for high-traffic tables
ALTER TABLE public.messages SET (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_scale_factor = 0.02,
  autovacuum_vacuum_threshold = 25,
  autovacuum_analyze_threshold = 25
);

ALTER TABLE public.room_messages SET (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_scale_factor = 0.02,
  autovacuum_vacuum_threshold = 25,
  autovacuum_analyze_threshold = 25
);

ALTER TABLE public.posts SET (
  autovacuum_vacuum_scale_factor = 0.1,
  autovacuum_analyze_scale_factor = 0.05
);

ALTER TABLE public.reels SET (
  autovacuum_vacuum_scale_factor = 0.1,
  autovacuum_analyze_scale_factor = 0.05
);

-- ============================================================================
-- SECURITY OPTIMIZATION
-- ============================================================================

-- Optimize authentication settings
ALTER SYSTEM SET password_encryption = 'scram-sha-256';
ALTER SYSTEM SET ssl = on;
ALTER SYSTEM SET ssl_prefer_server_ciphers = on;

-- ============================================================================
-- CHECKPOINT OPTIMIZATION
-- ============================================================================

-- Optimize checkpoints for better performance
ALTER SYSTEM SET checkpoint_timeout = '5min';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET checkpoint_warning = '30s';

-- ============================================================================
-- PRODUCTION MONITORING FUNCTIONS
-- ============================================================================

-- Function to get real-time performance metrics
CREATE OR REPLACE FUNCTION get_performance_metrics()
RETURNS TABLE (
  metric_name text,
  metric_value text,
  description text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'active_connections'::text,
    (SELECT count(*)::text FROM pg_stat_activity WHERE state = 'active'),
    'Number of active database connections'::text
  UNION ALL
  SELECT 
    'slow_queries_last_hour'::text,
    (SELECT count(*)::text FROM pg_stat_statements WHERE mean_exec_time > 1000),
    'Number of slow queries (>1s) in the last hour'::text
  UNION ALL
  SELECT 
    'cache_hit_ratio'::text,
    (SELECT round((sum(blks_hit) * 100.0 / sum(blks_hit + blks_read))::numeric, 2)::text 
     FROM pg_stat_database WHERE datname = current_database()),
    'Database cache hit ratio percentage'::text
  UNION ALL
  SELECT 
    'realtime_subscriptions'::text,
    (SELECT count(*)::text FROM realtime.subscription),
    'Number of active realtime subscriptions'::text
  UNION ALL
  SELECT 
    'table_sizes'::text,
    (SELECT string_agg(schemaname||'.'||tablename||': '||pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)), ', ')
     FROM pg_tables WHERE schemaname = 'public' ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC LIMIT 5),
    'Top 5 largest tables by size'::text;
END;
$$ LANGUAGE plpgsql;

-- Function to optimize table statistics
CREATE OR REPLACE FUNCTION optimize_table_statistics()
RETURNS void AS $$
BEGIN
  -- Update statistics for all tables
  ANALYZE public.messages;
  ANALYZE public.room_messages;
  ANALYZE public.posts;
  ANALYZE public.reels;
  ANALYZE public.profiles;
  ANALYZE public.notifications;
  ANALYZE public.stories;
  
  -- Log completion
  RAISE NOTICE 'Table statistics updated for optimal query planning';
END;
$$ LANGUAGE plpgsql;

-- Schedule statistics update every 6 hours
SELECT cron.schedule('update-statistics', '0 */6 * * *', 'SELECT optimize_table_statistics();');

-- ============================================================================
-- PRODUCTION HEALTH CHECK FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION production_health_check()
RETURNS TABLE (
  check_name text,
  status text,
  details text
) AS $$
BEGIN
  RETURN QUERY
  -- Check connection count
  SELECT 
    'connection_count'::text,
    CASE WHEN count(*) < 150 THEN 'OK' ELSE 'WARNING' END,
    'Active connections: ' || count(*)::text
  FROM pg_stat_activity
  UNION ALL
  -- Check slow queries
  SELECT 
    'slow_queries'::text,
    CASE WHEN count(*) < 10 THEN 'OK' ELSE 'WARNING' END,
    'Slow queries (>1s): ' || count(*)::text
  FROM pg_stat_statements WHERE mean_exec_time > 1000
  UNION ALL
  -- Check cache hit ratio
  SELECT 
    'cache_hit_ratio'::text,
    CASE WHEN ratio > 95 THEN 'OK' ELSE 'WARNING' END,
    'Cache hit ratio: ' || ratio::text || '%'
  FROM (
    SELECT round((sum(blks_hit) * 100.0 / sum(blks_hit + blks_read))::numeric, 2) as ratio
    FROM pg_stat_database WHERE datname = current_database()
  ) t
  UNION ALL
  -- Check realtime subscriptions
  SELECT 
    'realtime_subscriptions'::text,
    CASE WHEN count(*) < 50 THEN 'OK' ELSE 'WARNING' END,
    'Active subscriptions: ' || count(*)::text
  FROM realtime.subscription;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- APPLY CONFIGURATION
-- ============================================================================

-- Reload configuration
SELECT pg_reload_conf();

-- Update table statistics immediately
SELECT optimize_table_statistics();

-- Show current performance metrics
SELECT * FROM get_performance_metrics();

-- Run health check
SELECT * FROM production_health_check();
