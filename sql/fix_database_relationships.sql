-- Fix Database Relationships
-- This script fixes foreign key relationships and RLS policies to ensure proper table relationships

-- Start a transaction to ensure all operations succeed or fail together
BEGIN;

-- Enable RLS on all tables
DO $$
DECLARE
    table_record RECORD;
BEGIN
    FOR table_record IN
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_record.table_name);
        RAISE NOTICE 'Enabled RLS on table %', table_record.table_name;
    END LOOP;
END
$$;

-- Fix foreign key relationships for notifications table
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
        -- Drop existing foreign keys if they exist
        ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_sender_id_fkey;
        ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_recipient_id_fkey;

        -- Add new foreign keys pointing to profiles
        ALTER TABLE public.notifications
        ADD CONSTRAINT notifications_sender_id_fkey
        FOREIGN KEY (sender_id)
        REFERENCES public.profiles(id)
        ON DELETE CASCADE;

        ALTER TABLE public.notifications
        ADD CONSTRAINT notifications_recipient_id_fkey
        FOREIGN KEY (recipient_id)
        REFERENCES public.profiles(id)
        ON DELETE CASCADE;

        -- Update RLS policies
        DROP POLICY IF EXISTS notifications_select_policy ON public.notifications;
        DROP POLICY IF EXISTS notifications_insert_policy ON public.notifications;
        DROP POLICY IF EXISTS notifications_update_policy ON public.notifications;
        DROP POLICY IF EXISTS notifications_delete_policy ON public.notifications;

        CREATE POLICY notifications_select_policy ON public.notifications
        FOR SELECT USING (auth.uid() = recipient_id OR auth.uid() = sender_id);

        CREATE POLICY notifications_insert_policy ON public.notifications
        FOR INSERT WITH CHECK (auth.uid() = sender_id);

        CREATE POLICY notifications_update_policy ON public.notifications
        FOR UPDATE USING (auth.uid() = recipient_id);

        CREATE POLICY notifications_delete_policy ON public.notifications
        FOR DELETE USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

        RAISE NOTICE 'Fixed notifications table relationships and policies';
    ELSE
        RAISE NOTICE 'Table notifications does not exist, skipping';
    END IF;
END
$$;

-- Fix foreign key relationships for reels table
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reels') THEN
        -- Drop existing foreign key if it exists
        ALTER TABLE public.reels DROP CONSTRAINT IF EXISTS reels_user_id_fkey;

        -- Add new foreign key pointing to profiles
        ALTER TABLE public.reels
        ADD CONSTRAINT reels_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES public.profiles(id)
        ON DELETE CASCADE;

        -- Update RLS policies
        DROP POLICY IF EXISTS reels_select_policy ON public.reels;
        DROP POLICY IF EXISTS reels_insert_policy ON public.reels;
        DROP POLICY IF EXISTS reels_update_policy ON public.reels;
        DROP POLICY IF EXISTS reels_delete_policy ON public.reels;

        CREATE POLICY reels_select_policy ON public.reels
        FOR SELECT USING (true);

        CREATE POLICY reels_insert_policy ON public.reels
        FOR INSERT WITH CHECK (auth.uid() = user_id);

        CREATE POLICY reels_update_policy ON public.reels
        FOR UPDATE USING (auth.uid() = user_id);

        CREATE POLICY reels_delete_policy ON public.reels
        FOR DELETE USING (auth.uid() = user_id);

        RAISE NOTICE 'Fixed reels table relationships and policies';
    ELSE
        RAISE NOTICE 'Table reels does not exist, skipping';
    END IF;
END
$$;

-- Fix foreign key relationships for posts table
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'posts') THEN
        -- Drop existing foreign keys if they exist
        ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_user_id_fkey;
        ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS fk_posts_user;

        -- Add new foreign key pointing to profiles with the specific name expected by the application
        ALTER TABLE public.posts
        ADD CONSTRAINT posts_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES public.profiles(id)
        ON DELETE CASCADE;

        -- Update RLS policies
        DROP POLICY IF EXISTS posts_select_policy ON public.posts;
        DROP POLICY IF EXISTS posts_insert_policy ON public.posts;
        DROP POLICY IF EXISTS posts_update_policy ON public.posts;
        DROP POLICY IF EXISTS posts_delete_policy ON public.posts;

        CREATE POLICY posts_select_policy ON public.posts
        FOR SELECT USING (true);

        CREATE POLICY posts_insert_policy ON public.posts
        FOR INSERT WITH CHECK (auth.uid() = user_id);

        CREATE POLICY posts_update_policy ON public.posts
        FOR UPDATE USING (auth.uid() = user_id);

        CREATE POLICY posts_delete_policy ON public.posts
        FOR DELETE USING (auth.uid() = user_id);

        RAISE NOTICE 'Fixed posts table relationships and policies';
    ELSE
        RAISE NOTICE 'Table posts does not exist, skipping';
    END IF;
END
$$;

-- Fix foreign key relationships for comments table
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'comments') THEN
        -- Drop existing foreign key if it exists
        ALTER TABLE public.comments DROP CONSTRAINT IF EXISTS comments_user_id_fkey;

        -- Add new foreign key pointing to profiles
        ALTER TABLE public.comments
        ADD CONSTRAINT comments_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES public.profiles(id)
        ON DELETE CASCADE;

        -- Update RLS policies
        DROP POLICY IF EXISTS comments_select_policy ON public.comments;
        DROP POLICY IF EXISTS comments_insert_policy ON public.comments;
        DROP POLICY IF EXISTS comments_update_policy ON public.comments;
        DROP POLICY IF EXISTS comments_delete_policy ON public.comments;

        CREATE POLICY comments_select_policy ON public.comments
        FOR SELECT USING (true);

        CREATE POLICY comments_insert_policy ON public.comments
        FOR INSERT WITH CHECK (auth.uid() = user_id);

        CREATE POLICY comments_update_policy ON public.comments
        FOR UPDATE USING (auth.uid() = user_id);

        CREATE POLICY comments_delete_policy ON public.comments
        FOR DELETE USING (auth.uid() = user_id);

        RAISE NOTICE 'Fixed comments table relationships and policies';
    ELSE
        RAISE NOTICE 'Table comments does not exist, skipping';
    END IF;
END
$$;

-- Fix foreign key relationships for reel_comments table
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reel_comments') THEN
        -- Drop existing foreign key if it exists
        ALTER TABLE public.reel_comments DROP CONSTRAINT IF EXISTS reel_comments_user_id_fkey;

        -- Add new foreign key pointing to profiles
        ALTER TABLE public.reel_comments
        ADD CONSTRAINT reel_comments_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES public.profiles(id)
        ON DELETE CASCADE;

        -- Update RLS policies
        DROP POLICY IF EXISTS reel_comments_select_policy ON public.reel_comments;
        DROP POLICY IF EXISTS reel_comments_insert_policy ON public.reel_comments;
        DROP POLICY IF EXISTS reel_comments_update_policy ON public.reel_comments;
        DROP POLICY IF EXISTS reel_comments_delete_policy ON public.reel_comments;

        CREATE POLICY reel_comments_select_policy ON public.reel_comments
        FOR SELECT USING (true);

        CREATE POLICY reel_comments_insert_policy ON public.reel_comments
        FOR INSERT WITH CHECK (auth.uid() = user_id);

        CREATE POLICY reel_comments_update_policy ON public.reel_comments
        FOR UPDATE USING (auth.uid() = user_id);

        CREATE POLICY reel_comments_delete_policy ON public.reel_comments
        FOR DELETE USING (auth.uid() = user_id);

        RAISE NOTICE 'Fixed reel_comments table relationships and policies';
    ELSE
        RAISE NOTICE 'Table reel_comments does not exist, skipping';
    END IF;
END
$$;

-- Fix foreign key relationships for messages table
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'messages') THEN
        -- Drop existing foreign keys if they exist
        ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;
        ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_receiver_id_fkey;

        -- Add new foreign keys pointing to profiles
        ALTER TABLE public.messages
        ADD CONSTRAINT messages_sender_id_fkey
        FOREIGN KEY (sender_id)
        REFERENCES public.profiles(id)
        ON DELETE CASCADE;

        ALTER TABLE public.messages
        ADD CONSTRAINT messages_receiver_id_fkey
        FOREIGN KEY (receiver_id)
        REFERENCES public.profiles(id)
        ON DELETE CASCADE;

        -- Update RLS policies
        DROP POLICY IF EXISTS messages_select_policy ON public.messages;
        DROP POLICY IF EXISTS messages_insert_policy ON public.messages;
        DROP POLICY IF EXISTS messages_update_policy ON public.messages;
        DROP POLICY IF EXISTS messages_delete_policy ON public.messages;

        CREATE POLICY messages_select_policy ON public.messages
        FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

        CREATE POLICY messages_insert_policy ON public.messages
        FOR INSERT WITH CHECK (auth.uid() = sender_id);

        CREATE POLICY messages_update_policy ON public.messages
        FOR UPDATE USING (auth.uid() = receiver_id);

        CREATE POLICY messages_delete_policy ON public.messages
        FOR DELETE USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

        RAISE NOTICE 'Fixed messages table relationships and policies';
    ELSE
        RAISE NOTICE 'Table messages does not exist, skipping';
    END IF;
END
$$;

-- Fix foreign key relationships for follows table
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'follows') THEN
        -- Drop existing foreign keys if they exist
        ALTER TABLE public.follows DROP CONSTRAINT IF EXISTS follows_follower_id_fkey;
        ALTER TABLE public.follows DROP CONSTRAINT IF EXISTS follows_following_id_fkey;

        -- Add new foreign keys pointing to profiles
        ALTER TABLE public.follows
        ADD CONSTRAINT follows_follower_id_fkey
        FOREIGN KEY (follower_id)
        REFERENCES public.profiles(id)
        ON DELETE CASCADE;

        ALTER TABLE public.follows
        ADD CONSTRAINT follows_following_id_fkey
        FOREIGN KEY (following_id)
        REFERENCES public.profiles(id)
        ON DELETE CASCADE;

        -- Update RLS policies
        DROP POLICY IF EXISTS follows_select_policy ON public.follows;
        DROP POLICY IF EXISTS follows_insert_policy ON public.follows;
        DROP POLICY IF EXISTS follows_update_policy ON public.follows;
        DROP POLICY IF EXISTS follows_delete_policy ON public.follows;

        CREATE POLICY follows_select_policy ON public.follows
        FOR SELECT USING (true);

        CREATE POLICY follows_insert_policy ON public.follows
        FOR INSERT WITH CHECK (auth.uid() = follower_id);

        CREATE POLICY follows_update_policy ON public.follows
        FOR UPDATE USING (auth.uid() = follower_id);

        CREATE POLICY follows_delete_policy ON public.follows
        FOR DELETE USING (auth.uid() = follower_id);

        RAISE NOTICE 'Fixed follows table relationships and policies';
    ELSE
        RAISE NOTICE 'Table follows does not exist, skipping';
    END IF;
END
$$;

-- Fix foreign key relationships for likes table
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'likes') THEN
        -- Drop existing foreign key if it exists
        ALTER TABLE public.likes DROP CONSTRAINT IF EXISTS likes_user_id_fkey;

        -- Add new foreign key pointing to profiles
        ALTER TABLE public.likes
        ADD CONSTRAINT likes_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES public.profiles(id)
        ON DELETE CASCADE;

        -- Update RLS policies
        DROP POLICY IF EXISTS likes_select_policy ON public.likes;
        DROP POLICY IF EXISTS likes_insert_policy ON public.likes;
        DROP POLICY IF EXISTS likes_update_policy ON public.likes;
        DROP POLICY IF EXISTS likes_delete_policy ON public.likes;

        CREATE POLICY likes_select_policy ON public.likes
        FOR SELECT USING (true);

        CREATE POLICY likes_insert_policy ON public.likes
        FOR INSERT WITH CHECK (auth.uid() = user_id);

        CREATE POLICY likes_update_policy ON public.likes
        FOR UPDATE USING (auth.uid() = user_id);

        CREATE POLICY likes_delete_policy ON public.likes
        FOR DELETE USING (auth.uid() = user_id);

        RAISE NOTICE 'Fixed likes table relationships and policies';
    ELSE
        RAISE NOTICE 'Table likes does not exist, skipping';
    END IF;
END
$$;

-- Fix foreign key relationships for reel_likes table
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reel_likes') THEN
        -- Drop existing foreign key if it exists
        ALTER TABLE public.reel_likes DROP CONSTRAINT IF EXISTS reel_likes_user_id_fkey;

        -- Add new foreign key pointing to profiles
        ALTER TABLE public.reel_likes
        ADD CONSTRAINT reel_likes_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES public.profiles(id)
        ON DELETE CASCADE;

        -- Update RLS policies
        DROP POLICY IF EXISTS reel_likes_select_policy ON public.reel_likes;
        DROP POLICY IF EXISTS reel_likes_insert_policy ON public.reel_likes;
        DROP POLICY IF EXISTS reel_likes_update_policy ON public.reel_likes;
        DROP POLICY IF EXISTS reel_likes_delete_policy ON public.reel_likes;

        CREATE POLICY reel_likes_select_policy ON public.reel_likes
        FOR SELECT USING (true);

        CREATE POLICY reel_likes_insert_policy ON public.reel_likes
        FOR INSERT WITH CHECK (auth.uid() = user_id);

        CREATE POLICY reel_likes_update_policy ON public.reel_likes
        FOR UPDATE USING (auth.uid() = user_id);

        CREATE POLICY reel_likes_delete_policy ON public.reel_likes
        FOR DELETE USING (auth.uid() = user_id);

        RAISE NOTICE 'Fixed reel_likes table relationships and policies';
    ELSE
        RAISE NOTICE 'Table reel_likes does not exist, skipping';
    END IF;
END
$$;

-- Fix foreign key relationships for stories table
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stories') THEN
        -- Drop existing foreign key if it exists
        ALTER TABLE public.stories DROP CONSTRAINT IF EXISTS fk_stories_user;
        ALTER TABLE public.stories DROP CONSTRAINT IF EXISTS stories_user_id_fkey;

        -- Add new foreign key pointing to profiles with the specific name expected by the application
        ALTER TABLE public.stories
        ADD CONSTRAINT stories_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES public.profiles(id)
        ON DELETE CASCADE;

        -- Update RLS policies
        DROP POLICY IF EXISTS stories_select_policy ON public.stories;
        DROP POLICY IF EXISTS stories_insert_policy ON public.stories;
        DROP POLICY IF EXISTS stories_update_policy ON public.stories;
        DROP POLICY IF EXISTS stories_delete_policy ON public.stories;

        CREATE POLICY stories_select_policy ON public.stories
        FOR SELECT USING (true);

        CREATE POLICY stories_insert_policy ON public.stories
        FOR INSERT WITH CHECK (auth.uid() = user_id);

        CREATE POLICY stories_update_policy ON public.stories
        FOR UPDATE USING (auth.uid() = user_id);

        CREATE POLICY stories_delete_policy ON public.stories
        FOR DELETE USING (auth.uid() = user_id);

        RAISE NOTICE 'Fixed stories table relationships and policies';
    ELSE
        RAISE NOTICE 'Table stories does not exist, skipping';
    END IF;
END
$$;

-- Fix foreign key relationships for public_keys table
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'public_keys') THEN
        -- Drop existing foreign keys if they exist
        ALTER TABLE public.public_keys DROP CONSTRAINT IF EXISTS public_keys_user_id_fkey;
        ALTER TABLE public.public_keys DROP CONSTRAINT IF EXISTS fk_user_id;

        -- Add new foreign key pointing to profiles
        ALTER TABLE public.public_keys
        ADD CONSTRAINT public_keys_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES public.profiles(id)
        ON DELETE CASCADE;

        -- Update RLS policies
        DROP POLICY IF EXISTS public_keys_select_policy ON public.public_keys;
        DROP POLICY IF EXISTS public_keys_insert_policy ON public.public_keys;
        DROP POLICY IF EXISTS public_keys_update_policy ON public.public_keys;
        DROP POLICY IF EXISTS public_keys_delete_policy ON public.public_keys;

        CREATE POLICY public_keys_select_policy ON public.public_keys
        FOR SELECT USING (true);

        CREATE POLICY public_keys_insert_policy ON public.public_keys
        FOR INSERT WITH CHECK (auth.uid() = user_id);

        CREATE POLICY public_keys_update_policy ON public.public_keys
        FOR UPDATE USING (auth.uid() = user_id);

        CREATE POLICY public_keys_delete_policy ON public.public_keys
        FOR DELETE USING (auth.uid() = user_id);

        RAISE NOTICE 'Fixed public_keys table relationships and policies';
    ELSE
        RAISE NOTICE 'Table public_keys does not exist, skipping';
    END IF;
END
$$;

-- Commit the transaction
COMMIT;
