-- Enable User Deletion in Supabase
-- This script combines RLS policy updates and cascade delete configuration

-- PART 1: Update RLS policies to allow administrators to delete user data

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

-- PART 2: Add CASCADE DELETE to foreign key constraints

-- First-level cascades (tables directly referencing users)
DO $$
BEGIN
    -- Drop and recreate foreign keys with CASCADE DELETE for profiles table
    ALTER TABLE IF EXISTS public.profiles
        DROP CONSTRAINT IF EXISTS profiles_id_fkey;

    ALTER TABLE IF EXISTS public.profiles
        ADD CONSTRAINT profiles_id_fkey
        FOREIGN KEY (id)
        REFERENCES auth.users(id)
        ON DELETE CASCADE;

    -- Drop and recreate foreign keys with CASCADE DELETE for public_keys table
    ALTER TABLE IF EXISTS public.public_keys
        DROP CONSTRAINT IF EXISTS public_keys_user_id_fkey;

    ALTER TABLE IF EXISTS public.public_keys
        ADD CONSTRAINT public_keys_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES auth.users(id)
        ON DELETE CASCADE;

    -- Drop and recreate foreign keys with CASCADE DELETE for posts table
    ALTER TABLE IF EXISTS public.posts
        DROP CONSTRAINT IF EXISTS posts_user_id_fkey;

    ALTER TABLE IF EXISTS public.posts
        ADD CONSTRAINT posts_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES auth.users(id)
        ON DELETE CASCADE;

    -- Drop and recreate foreign keys with CASCADE DELETE for likes table
    ALTER TABLE IF EXISTS public.likes
        DROP CONSTRAINT IF EXISTS likes_user_id_fkey;

    ALTER TABLE IF EXISTS public.likes
        ADD CONSTRAINT likes_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES auth.users(id)
        ON DELETE CASCADE;

    -- Drop and recreate foreign keys with CASCADE DELETE for comments table
    ALTER TABLE IF EXISTS public.comments
        DROP CONSTRAINT IF EXISTS comments_user_id_fkey;

    ALTER TABLE IF EXISTS public.comments
        ADD CONSTRAINT comments_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES auth.users(id)
        ON DELETE CASCADE;

    -- Drop and recreate foreign keys with CASCADE DELETE for follows table
    ALTER TABLE IF EXISTS public.follows
        DROP CONSTRAINT IF EXISTS follows_follower_id_fkey;

    ALTER TABLE IF EXISTS public.follows
        ADD CONSTRAINT follows_follower_id_fkey
        FOREIGN KEY (follower_id)
        REFERENCES auth.users(id)
        ON DELETE CASCADE;

    ALTER TABLE IF EXISTS public.follows
        DROP CONSTRAINT IF EXISTS follows_following_id_fkey;

    ALTER TABLE IF EXISTS public.follows
        ADD CONSTRAINT follows_following_id_fkey
        FOREIGN KEY (following_id)
        REFERENCES auth.users(id)
        ON DELETE CASCADE;

    -- Drop and recreate foreign keys with CASCADE DELETE for messages table
    ALTER TABLE IF EXISTS public.messages
        DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;

    ALTER TABLE IF EXISTS public.messages
        ADD CONSTRAINT messages_sender_id_fkey
        FOREIGN KEY (sender_id)
        REFERENCES auth.users(id)
        ON DELETE CASCADE;

    ALTER TABLE IF EXISTS public.messages
        DROP CONSTRAINT IF EXISTS messages_receiver_id_fkey;

    ALTER TABLE IF EXISTS public.messages
        ADD CONSTRAINT messages_receiver_id_fkey
        FOREIGN KEY (receiver_id)
        REFERENCES auth.users(id)
        ON DELETE CASCADE;

    -- Drop and recreate foreign keys with CASCADE DELETE for notifications table
    ALTER TABLE IF EXISTS public.notifications
        DROP CONSTRAINT IF EXISTS notifications_sender_id_fkey;

    ALTER TABLE IF EXISTS public.notifications
        ADD CONSTRAINT notifications_sender_id_fkey
        FOREIGN KEY (sender_id)
        REFERENCES auth.users(id)
        ON DELETE CASCADE;

    ALTER TABLE IF EXISTS public.notifications
        DROP CONSTRAINT IF EXISTS notifications_recipient_id_fkey;

    ALTER TABLE IF EXISTS public.notifications
        ADD CONSTRAINT notifications_recipient_id_fkey
        FOREIGN KEY (recipient_id)
        REFERENCES auth.users(id)
        ON DELETE CASCADE;

    -- Drop and recreate foreign keys with CASCADE DELETE for reels table
    ALTER TABLE IF EXISTS public.reels
        DROP CONSTRAINT IF EXISTS reels_user_id_fkey;

    ALTER TABLE IF EXISTS public.reels
        ADD CONSTRAINT reels_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES auth.users(id)
        ON DELETE CASCADE;

    -- Drop and recreate foreign keys with CASCADE DELETE for room_participants table
    ALTER TABLE IF EXISTS public.room_participants
        DROP CONSTRAINT IF EXISTS room_participants_user_id_fkey;

    ALTER TABLE IF EXISTS public.room_participants
        ADD CONSTRAINT room_participants_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES auth.users(id)
        ON DELETE CASCADE;

    -- Drop and recreate foreign keys with CASCADE DELETE for bookmarks table
    ALTER TABLE IF EXISTS public.bookmarks
        DROP CONSTRAINT IF EXISTS bookmarks_user_id_fkey;

    ALTER TABLE IF EXISTS public.bookmarks
        ADD CONSTRAINT bookmarks_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES auth.users(id)
        ON DELETE CASCADE;
END
$$;

-- PART 3: Add CASCADE DELETE to second-level foreign key constraints

DO $$
BEGIN
    -- Post-related cascades

    -- Drop and recreate foreign keys with CASCADE DELETE for post_likes table
    ALTER TABLE IF EXISTS public.post_likes
        DROP CONSTRAINT IF EXISTS post_likes_post_id_fkey;

    ALTER TABLE IF EXISTS public.post_likes
        ADD CONSTRAINT post_likes_post_id_fkey
        FOREIGN KEY (post_id)
        REFERENCES public.posts(id)
        ON DELETE CASCADE;

    -- Drop and recreate foreign keys with CASCADE DELETE for post_comments table
    ALTER TABLE IF EXISTS public.post_comments
        DROP CONSTRAINT IF EXISTS post_comments_post_id_fkey;

    ALTER TABLE IF EXISTS public.post_comments
        ADD CONSTRAINT post_comments_post_id_fkey
        FOREIGN KEY (post_id)
        REFERENCES public.posts(id)
        ON DELETE CASCADE;

    -- Drop and recreate foreign keys with CASCADE DELETE for likes table
    ALTER TABLE IF EXISTS public.likes
        DROP CONSTRAINT IF EXISTS likes_post_id_fkey;

    ALTER TABLE IF EXISTS public.likes
        ADD CONSTRAINT likes_post_id_fkey
        FOREIGN KEY (post_id)
        REFERENCES public.posts(id)
        ON DELETE CASCADE;

    -- Drop and recreate foreign keys with CASCADE DELETE for comments table
    ALTER TABLE IF EXISTS public.comments
        DROP CONSTRAINT IF EXISTS comments_post_id_fkey;

    ALTER TABLE IF EXISTS public.comments
        ADD CONSTRAINT comments_post_id_fkey
        FOREIGN KEY (post_id)
        REFERENCES public.posts(id)
        ON DELETE CASCADE;

    -- Drop and recreate foreign keys with CASCADE DELETE for bookmarks table
    ALTER TABLE IF EXISTS public.bookmarks
        DROP CONSTRAINT IF EXISTS bookmarks_post_id_fkey;

    ALTER TABLE IF EXISTS public.bookmarks
        ADD CONSTRAINT bookmarks_post_id_fkey
        FOREIGN KEY (post_id)
        REFERENCES public.posts(id)
        ON DELETE CASCADE;

    -- Reel-related cascades

    -- Drop and recreate foreign keys with CASCADE DELETE for reel_likes table
    ALTER TABLE IF EXISTS public.reel_likes
        DROP CONSTRAINT IF EXISTS reel_likes_reel_id_fkey;

    ALTER TABLE IF EXISTS public.reel_likes
        ADD CONSTRAINT reel_likes_reel_id_fkey
        FOREIGN KEY (reel_id)
        REFERENCES public.reels(id)
        ON DELETE CASCADE;

    -- Drop and recreate foreign keys with CASCADE DELETE for reel_comments table
    ALTER TABLE IF EXISTS public.reel_comments
        DROP CONSTRAINT IF EXISTS reel_comments_reel_id_fkey;

    ALTER TABLE IF EXISTS public.reel_comments
        ADD CONSTRAINT reel_comments_reel_id_fkey
        FOREIGN KEY (reel_id)
        REFERENCES public.reels(id)
        ON DELETE CASCADE;

    -- Drop and recreate foreign keys with CASCADE DELETE for reel_views table
    ALTER TABLE IF EXISTS public.reel_views
        DROP CONSTRAINT IF EXISTS reel_views_reel_id_fkey;

    ALTER TABLE IF EXISTS public.reel_views
        ADD CONSTRAINT reel_views_reel_id_fkey
        FOREIGN KEY (reel_id)
        REFERENCES public.reels(id)
        ON DELETE CASCADE;

    -- Room-related cascades

    -- Drop and recreate foreign keys with CASCADE DELETE for room_messages table
    ALTER TABLE IF EXISTS public.room_messages
        DROP CONSTRAINT IF EXISTS room_messages_room_id_fkey;

    ALTER TABLE IF EXISTS public.room_messages
        ADD CONSTRAINT room_messages_room_id_fkey
        FOREIGN KEY (room_id)
        REFERENCES public.rooms(id)
        ON DELETE CASCADE;

    -- Drop and recreate foreign keys with CASCADE DELETE for room_participants table
    ALTER TABLE IF EXISTS public.room_participants
        DROP CONSTRAINT IF EXISTS room_participants_room_id_fkey;

    ALTER TABLE IF EXISTS public.room_participants
        ADD CONSTRAINT room_participants_room_id_fkey
        FOREIGN KEY (room_id)
        REFERENCES public.rooms(id)
        ON DELETE CASCADE;

    -- Comment-related cascades

    -- Drop and recreate foreign keys with CASCADE DELETE for comment_likes table
    ALTER TABLE IF EXISTS public.comment_likes
        DROP CONSTRAINT IF EXISTS comment_likes_comment_id_fkey;

    ALTER TABLE IF EXISTS public.comment_likes
        ADD CONSTRAINT comment_likes_comment_id_fkey
        FOREIGN KEY (comment_id)
        REFERENCES public.comments(id)
        ON DELETE CASCADE;

    -- Drop and recreate foreign keys with CASCADE DELETE for reel_comment_likes table
    ALTER TABLE IF EXISTS public.reel_comment_likes
        DROP CONSTRAINT IF EXISTS reel_comment_likes_comment_id_fkey;

    ALTER TABLE IF EXISTS public.reel_comment_likes
        ADD CONSTRAINT reel_comment_likes_comment_id_fkey
        FOREIGN KEY (comment_id)
        REFERENCES public.reel_comments(id)
        ON DELETE CASCADE;

    -- Handle nested comments (parent-child relationships)
    ALTER TABLE IF EXISTS public.comments
        DROP CONSTRAINT IF EXISTS comments_parent_comment_id_fkey;

    ALTER TABLE IF EXISTS public.comments
        ADD CONSTRAINT comments_parent_comment_id_fkey
        FOREIGN KEY (parent_comment_id)
        REFERENCES public.comments(id)
        ON DELETE CASCADE;

    ALTER TABLE IF EXISTS public.reel_comments
        DROP CONSTRAINT IF EXISTS reel_comments_parent_comment_id_fkey;

    ALTER TABLE IF EXISTS public.reel_comments
        ADD CONSTRAINT reel_comments_parent_comment_id_fkey
        FOREIGN KEY (parent_comment_id)
        REFERENCES public.reel_comments(id)
        ON DELETE CASCADE;
END
$$;