-- Fix foreign key relationships between tables and profiles
-- This script adds proper foreign key constraints to connect tables to the profiles table

-- Start a transaction to ensure all operations succeed or fail together
BEGIN;

-- Fix notifications table foreign keys
DO $$
BEGIN
    -- Check if the notifications table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
        -- Drop existing foreign keys if they exist
        ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_sender_id_fkey;
        ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_recipient_id_fkey;
        
        -- Add proper foreign keys to profiles table
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
        
        RAISE NOTICE 'Fixed foreign keys for notifications table';
    ELSE
        RAISE NOTICE 'Notifications table does not exist, skipping';
    END IF;
END
$$;

-- Fix reels table foreign keys
DO $$
BEGIN
    -- Check if the reels table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reels') THEN
        -- Drop existing foreign keys if they exist
        ALTER TABLE public.reels DROP CONSTRAINT IF EXISTS reels_user_id_fkey;
        
        -- Add proper foreign key to profiles table
        ALTER TABLE public.reels 
        ADD CONSTRAINT reels_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES public.profiles(id)
        ON DELETE CASCADE;
        
        RAISE NOTICE 'Fixed foreign key for reels table';
    ELSE
        RAISE NOTICE 'Reels table does not exist, skipping';
    END IF;
END
$$;

-- Fix posts table foreign keys
DO $$
BEGIN
    -- Check if the posts table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'posts') THEN
        -- Drop existing foreign keys if they exist
        ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_user_id_fkey;
        ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS fk_posts_user;
        
        -- Add proper foreign key to profiles table
        ALTER TABLE public.posts 
        ADD CONSTRAINT fk_posts_user
        FOREIGN KEY (user_id)
        REFERENCES public.profiles(id)
        ON DELETE CASCADE;
        
        RAISE NOTICE 'Fixed foreign key for posts table';
    ELSE
        RAISE NOTICE 'Posts table does not exist, skipping';
    END IF;
END
$$;

-- Fix comments table foreign keys
DO $$
BEGIN
    -- Check if the comments table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'comments') THEN
        -- Drop existing foreign keys if they exist
        ALTER TABLE public.comments DROP CONSTRAINT IF EXISTS comments_user_id_fkey;
        
        -- Add proper foreign key to profiles table
        ALTER TABLE public.comments 
        ADD CONSTRAINT comments_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES public.profiles(id)
        ON DELETE CASCADE;
        
        RAISE NOTICE 'Fixed foreign key for comments table';
    ELSE
        RAISE NOTICE 'Comments table does not exist, skipping';
    END IF;
END
$$;

-- Fix likes table foreign keys
DO $$
BEGIN
    -- Check if the likes table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'likes') THEN
        -- Drop existing foreign keys if they exist
        ALTER TABLE public.likes DROP CONSTRAINT IF EXISTS likes_user_id_fkey;
        
        -- Add proper foreign key to profiles table
        ALTER TABLE public.likes 
        ADD CONSTRAINT likes_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES public.profiles(id)
        ON DELETE CASCADE;
        
        RAISE NOTICE 'Fixed foreign key for likes table';
    ELSE
        RAISE NOTICE 'Likes table does not exist, skipping';
    END IF;
END
$$;

-- Fix bookmarks table foreign keys
DO $$
BEGIN
    -- Check if the bookmarks table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bookmarks') THEN
        -- Drop existing foreign keys if they exist
        ALTER TABLE public.bookmarks DROP CONSTRAINT IF EXISTS bookmarks_user_id_fkey;
        
        -- Add proper foreign key to profiles table
        ALTER TABLE public.bookmarks 
        ADD CONSTRAINT bookmarks_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES public.profiles(id)
        ON DELETE CASCADE;
        
        RAISE NOTICE 'Fixed foreign key for bookmarks table';
    ELSE
        RAISE NOTICE 'Bookmarks table does not exist, skipping';
    END IF;
END
$$;

-- Fix follows table foreign keys
DO $$
BEGIN
    -- Check if the follows table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'follows') THEN
        -- Drop existing foreign keys if they exist
        ALTER TABLE public.follows DROP CONSTRAINT IF EXISTS follows_follower_id_fkey;
        ALTER TABLE public.follows DROP CONSTRAINT IF EXISTS follows_following_id_fkey;
        
        -- Add proper foreign keys to profiles table
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
        
        RAISE NOTICE 'Fixed foreign keys for follows table';
    ELSE
        RAISE NOTICE 'Follows table does not exist, skipping';
    END IF;
END
$$;

-- Fix reel_comments table foreign keys
DO $$
BEGIN
    -- Check if the reel_comments table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reel_comments') THEN
        -- Drop existing foreign keys if they exist
        ALTER TABLE public.reel_comments DROP CONSTRAINT IF EXISTS reel_comments_user_id_fkey;
        
        -- Add proper foreign key to profiles table
        ALTER TABLE public.reel_comments 
        ADD CONSTRAINT reel_comments_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES public.profiles(id)
        ON DELETE CASCADE;
        
        RAISE NOTICE 'Fixed foreign key for reel_comments table';
    ELSE
        RAISE NOTICE 'Reel_comments table does not exist, skipping';
    END IF;
END
$$;

-- Fix reel_likes table foreign keys
DO $$
BEGIN
    -- Check if the reel_likes table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reel_likes') THEN
        -- Drop existing foreign keys if they exist
        ALTER TABLE public.reel_likes DROP CONSTRAINT IF EXISTS reel_likes_user_id_fkey;
        
        -- Add proper foreign key to profiles table
        ALTER TABLE public.reel_likes 
        ADD CONSTRAINT reel_likes_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES public.profiles(id)
        ON DELETE CASCADE;
        
        RAISE NOTICE 'Fixed foreign key for reel_likes table';
    ELSE
        RAISE NOTICE 'Reel_likes table does not exist, skipping';
    END IF;
END
$$;

-- Commit the transaction
COMMIT;

-- Refresh the PostgreSQL schema cache to ensure relationships are recognized
SELECT pg_catalog.pg_reload_conf();
