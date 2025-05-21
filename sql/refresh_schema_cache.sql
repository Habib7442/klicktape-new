-- Refresh the Supabase schema cache
-- This script helps Supabase recognize the new relationships

-- Notify PostgREST to refresh its schema cache
NOTIFY pgrst, 'reload schema';

-- Output a message
DO $$
BEGIN
    RAISE NOTICE 'Schema cache refresh requested. The new relationships should now be recognized by Supabase.';
END
$$;
