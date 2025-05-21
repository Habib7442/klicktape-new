-- Update RLS policies to allow administrators to delete user data
-- This script modifies existing policies to enable user deletion

-- Update profiles table delete policy
DROP POLICY IF EXISTS profiles_delete_policy ON public.profiles;
CREATE POLICY profiles_delete_policy ON public.profiles
FOR DELETE USING (auth.role() = 'service_role');

-- Update public_keys table delete policy
DROP POLICY IF EXISTS public_keys_delete_policy ON public.public_keys;
CREATE POLICY public_keys_delete_policy ON public.public_keys
FOR DELETE USING (auth.role() = 'service_role');

-- Update messages table delete policy
DROP POLICY IF EXISTS messages_delete_policy ON public.messages;
CREATE POLICY messages_delete_policy ON public.messages
FOR DELETE USING (auth.role() = 'service_role');

-- Add more policies for other tables that might prevent deletion
DO $$
DECLARE
    table_exists BOOLEAN;
BEGIN
    -- Check and update RLS for follows
    SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'follows'
    ) INTO table_exists;
    
    IF table_exists THEN
        EXECUTE 'DROP POLICY IF EXISTS follows_delete_policy ON public.follows';
        EXECUTE 'CREATE POLICY follows_delete_policy ON public.follows
                 FOR DELETE USING (auth.role() = ''service_role'')';
        RAISE NOTICE 'Updated delete policy for public.follows';
    END IF;

    -- Check and update RLS for notifications
    SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'notifications'
    ) INTO table_exists;
    
    IF table_exists THEN
        EXECUTE 'DROP POLICY IF EXISTS notifications_delete_policy ON public.notifications';
        EXECUTE 'CREATE POLICY notifications_delete_policy ON public.notifications
                 FOR DELETE USING (auth.role() = ''service_role'')';
        RAISE NOTICE 'Updated delete policy for public.notifications';
    END IF;

    -- Check and update RLS for room_participants
    SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'room_participants'
    ) INTO table_exists;
    
    IF table_exists THEN
        EXECUTE 'DROP POLICY IF EXISTS room_participants_delete_policy ON public.room_participants';
        EXECUTE 'CREATE POLICY room_participants_delete_policy ON public.room_participants
                 FOR DELETE USING (auth.role() = ''service_role'')';
        RAISE NOTICE 'Updated delete policy for public.room_participants';
    END IF;
END
$$;
