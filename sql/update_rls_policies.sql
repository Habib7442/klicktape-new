-- Update RLS policies to work with the new foreign key relationships
-- This script ensures all RLS policies are properly configured

-- Start a transaction to ensure all operations succeed or fail together
BEGIN;

-- 1. Update notifications table RLS policies
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
        -- Drop existing policies if they exist
        DROP POLICY IF EXISTS notifications_select_policy ON public.notifications;
        DROP POLICY IF EXISTS notifications_insert_policy ON public.notifications;
        DROP POLICY IF EXISTS notifications_update_policy ON public.notifications;
        DROP POLICY IF EXISTS notifications_delete_policy ON public.notifications;

        -- Create new policies
        CREATE POLICY notifications_select_policy ON public.notifications
        FOR SELECT USING (auth.uid() = recipient_id OR auth.uid() = sender_id);

        CREATE POLICY notifications_insert_policy ON public.notifications
        FOR INSERT WITH CHECK (auth.uid() = sender_id);

        CREATE POLICY notifications_update_policy ON public.notifications
        FOR UPDATE USING (auth.uid() = recipient_id);

        CREATE POLICY notifications_delete_policy ON public.notifications
        FOR DELETE USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

        RAISE NOTICE 'Updated notifications table RLS policies';
    ELSE
        RAISE NOTICE 'Table notifications does not exist, skipping';
    END IF;
END
$$;

-- 2. Update reels table RLS policies
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reels') THEN
        -- Drop existing policies if they exist
        DROP POLICY IF EXISTS reels_select_policy ON public.reels;
        DROP POLICY IF EXISTS reels_insert_policy ON public.reels;
        DROP POLICY IF EXISTS reels_update_policy ON public.reels;
        DROP POLICY IF EXISTS reels_delete_policy ON public.reels;

        -- Create new policies
        CREATE POLICY reels_select_policy ON public.reels
        FOR SELECT USING (true);

        CREATE POLICY reels_insert_policy ON public.reels
        FOR INSERT WITH CHECK (auth.uid() = user_id);

        CREATE POLICY reels_update_policy ON public.reels
        FOR UPDATE USING (auth.uid() = user_id);

        CREATE POLICY reels_delete_policy ON public.reels
        FOR DELETE USING (auth.uid() = user_id);

        RAISE NOTICE 'Updated reels table RLS policies';
    ELSE
        RAISE NOTICE 'Table reels does not exist, skipping';
    END IF;
END
$$;

-- 3. Update posts table RLS policies
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'posts') THEN
        -- Drop existing policies if they exist
        DROP POLICY IF EXISTS posts_select_policy ON public.posts;
        DROP POLICY IF EXISTS posts_insert_policy ON public.posts;
        DROP POLICY IF EXISTS posts_update_policy ON public.posts;
        DROP POLICY IF EXISTS posts_delete_policy ON public.posts;

        -- Create new policies
        CREATE POLICY posts_select_policy ON public.posts
        FOR SELECT USING (true);

        CREATE POLICY posts_insert_policy ON public.posts
        FOR INSERT WITH CHECK (auth.uid() = user_id);

        CREATE POLICY posts_update_policy ON public.posts
        FOR UPDATE USING (auth.uid() = user_id);

        CREATE POLICY posts_delete_policy ON public.posts
        FOR DELETE USING (auth.uid() = user_id);

        RAISE NOTICE 'Updated posts table RLS policies';
    ELSE
        RAISE NOTICE 'Table posts does not exist, skipping';
    END IF;
END
$$;

-- 4. Update comments table RLS policies
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'comments') THEN
        -- Drop existing policies if they exist
        DROP POLICY IF EXISTS comments_select_policy ON public.comments;
        DROP POLICY IF EXISTS comments_insert_policy ON public.comments;
        DROP POLICY IF EXISTS comments_update_policy ON public.comments;
        DROP POLICY IF EXISTS comments_delete_policy ON public.comments;

        -- Create new policies
        CREATE POLICY comments_select_policy ON public.comments
        FOR SELECT USING (true);

        CREATE POLICY comments_insert_policy ON public.comments
        FOR INSERT WITH CHECK (auth.uid() = user_id);

        CREATE POLICY comments_update_policy ON public.comments
        FOR UPDATE USING (auth.uid() = user_id);

        CREATE POLICY comments_delete_policy ON public.comments
        FOR DELETE USING (auth.uid() = user_id);

        RAISE NOTICE 'Updated comments table RLS policies';
    ELSE
        RAISE NOTICE 'Table comments does not exist, skipping';
    END IF;
END
$$;

-- 5. Update reel_comments table RLS policies
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reel_comments') THEN
        -- Drop existing policies if they exist
        DROP POLICY IF EXISTS reel_comments_select_policy ON public.reel_comments;
        DROP POLICY IF EXISTS reel_comments_insert_policy ON public.reel_comments;
        DROP POLICY IF EXISTS reel_comments_update_policy ON public.reel_comments;
        DROP POLICY IF EXISTS reel_comments_delete_policy ON public.reel_comments;

        -- Create new policies
        CREATE POLICY reel_comments_select_policy ON public.reel_comments
        FOR SELECT USING (true);

        CREATE POLICY reel_comments_insert_policy ON public.reel_comments
        FOR INSERT WITH CHECK (auth.uid() = user_id);

        CREATE POLICY reel_comments_update_policy ON public.reel_comments
        FOR UPDATE USING (auth.uid() = user_id);

        CREATE POLICY reel_comments_delete_policy ON public.reel_comments
        FOR DELETE USING (auth.uid() = user_id);

        RAISE NOTICE 'Updated reel_comments table RLS policies';
    ELSE
        RAISE NOTICE 'Table reel_comments does not exist, skipping';
    END IF;
END
$$;

-- 6. Update messages table RLS policies
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'messages') THEN
        -- Drop existing policies if they exist
        DROP POLICY IF EXISTS messages_select_policy ON public.messages;
        DROP POLICY IF EXISTS messages_insert_policy ON public.messages;
        DROP POLICY IF EXISTS messages_update_policy ON public.messages;
        DROP POLICY IF EXISTS messages_delete_policy ON public.messages;

        -- Create new policies
        CREATE POLICY messages_select_policy ON public.messages
        FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

        CREATE POLICY messages_insert_policy ON public.messages
        FOR INSERT WITH CHECK (auth.uid() = sender_id);

        CREATE POLICY messages_update_policy ON public.messages
        FOR UPDATE USING (auth.uid() = receiver_id);

        CREATE POLICY messages_delete_policy ON public.messages
        FOR DELETE USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

        RAISE NOTICE 'Updated messages table RLS policies';
    ELSE
        RAISE NOTICE 'Table messages does not exist, skipping';
    END IF;
END
$$;

-- 7. Update room_messages table RLS policies
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'room_messages') THEN
        -- Drop existing policies if they exist
        DROP POLICY IF EXISTS room_messages_select_policy ON public.room_messages;
        DROP POLICY IF EXISTS room_messages_insert_policy ON public.room_messages;
        DROP POLICY IF EXISTS room_messages_update_policy ON public.room_messages;
        DROP POLICY IF EXISTS room_messages_delete_policy ON public.room_messages;

        -- Create new policies
        CREATE POLICY room_messages_select_policy ON public.room_messages
        FOR SELECT USING (EXISTS (
            SELECT 1 FROM public.room_participants
            WHERE room_id = room_messages.room_id AND user_id = auth.uid()
        ));

        CREATE POLICY room_messages_insert_policy ON public.room_messages
        FOR INSERT WITH CHECK (
            auth.uid() = sender_id AND
            EXISTS (
                SELECT 1 FROM public.room_participants
                WHERE room_id = room_messages.room_id AND user_id = auth.uid()
            )
        );

        CREATE POLICY room_messages_update_policy ON public.room_messages
        FOR UPDATE USING (auth.uid() = sender_id);

        CREATE POLICY room_messages_delete_policy ON public.room_messages
        FOR DELETE USING (auth.uid() = sender_id);

        RAISE NOTICE 'Updated room_messages table RLS policies';
    ELSE
        RAISE NOTICE 'Table room_messages does not exist, skipping';
    END IF;
END
$$;

-- 8. Update public_keys table RLS policies
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'public_keys') THEN
        -- Drop existing policies if they exist
        DROP POLICY IF EXISTS public_keys_select_policy ON public.public_keys;
        DROP POLICY IF EXISTS public_keys_insert_policy ON public.public_keys;
        DROP POLICY IF EXISTS public_keys_update_policy ON public.public_keys;
        DROP POLICY IF EXISTS public_keys_delete_policy ON public.public_keys;

        -- Create new policies
        CREATE POLICY public_keys_select_policy ON public.public_keys
        FOR SELECT USING (true);

        CREATE POLICY public_keys_insert_policy ON public.public_keys
        FOR INSERT WITH CHECK (auth.uid() = user_id);

        CREATE POLICY public_keys_update_policy ON public.public_keys
        FOR UPDATE USING (auth.uid() = user_id);

        CREATE POLICY public_keys_delete_policy ON public.public_keys
        FOR DELETE USING (auth.uid() = user_id);

        RAISE NOTICE 'Updated public_keys table RLS policies';
    ELSE
        RAISE NOTICE 'Table public_keys does not exist, skipping';
    END IF;
END
$$;

-- 9. Update follows table RLS policies
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'follows') THEN
        -- Drop existing policies if they exist
        DROP POLICY IF EXISTS follows_select_policy ON public.follows;
        DROP POLICY IF EXISTS follows_insert_policy ON public.follows;
        DROP POLICY IF EXISTS follows_update_policy ON public.follows;
        DROP POLICY IF EXISTS follows_delete_policy ON public.follows;

        -- Create new policies
        CREATE POLICY follows_select_policy ON public.follows
        FOR SELECT USING (true);

        CREATE POLICY follows_insert_policy ON public.follows
        FOR INSERT WITH CHECK (auth.uid() = follower_id);

        CREATE POLICY follows_update_policy ON public.follows
        FOR UPDATE USING (auth.uid() = follower_id);

        CREATE POLICY follows_delete_policy ON public.follows
        FOR DELETE USING (auth.uid() = follower_id);

        RAISE NOTICE 'Updated follows table RLS policies';
    ELSE
        RAISE NOTICE 'Table follows does not exist, skipping';
    END IF;
END
$$;

-- 10. Update likes table RLS policies
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'likes') THEN
        -- Drop existing policies if they exist
        DROP POLICY IF EXISTS likes_select_policy ON public.likes;
        DROP POLICY IF EXISTS likes_insert_policy ON public.likes;
        DROP POLICY IF EXISTS likes_update_policy ON public.likes;
        DROP POLICY IF EXISTS likes_delete_policy ON public.likes;

        -- Create new policies
        CREATE POLICY likes_select_policy ON public.likes
        FOR SELECT USING (true);

        CREATE POLICY likes_insert_policy ON public.likes
        FOR INSERT WITH CHECK (auth.uid() = user_id);

        CREATE POLICY likes_update_policy ON public.likes
        FOR UPDATE USING (auth.uid() = user_id);

        CREATE POLICY likes_delete_policy ON public.likes
        FOR DELETE USING (auth.uid() = user_id);

        RAISE NOTICE 'Updated likes table RLS policies';
    ELSE
        RAISE NOTICE 'Table likes does not exist, skipping';
    END IF;
END
$$;

-- Commit the transaction
COMMIT;
