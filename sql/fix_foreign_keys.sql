-- Fix foreign key relationships for posts table
DO $$
BEGIN
    -- Check if the posts_user_id_fkey constraint exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'posts_user_id_fkey' 
        AND table_name = 'posts'
    ) THEN
        -- Drop the constraint that references the non-existent users table
        ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_user_id_fkey;
        RAISE NOTICE 'Dropped posts_user_id_fkey constraint';
    END IF;

    -- Check if the fk_posts_user constraint exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_posts_user' 
        AND table_name = 'posts'
    ) THEN
        -- Create the constraint to link posts.user_id to profiles.id
        ALTER TABLE public.posts 
        ADD CONSTRAINT fk_posts_user
        FOREIGN KEY (user_id)
        REFERENCES public.profiles(id)
        ON DELETE CASCADE;
        RAISE NOTICE 'Created fk_posts_user constraint';
    END IF;
END
$$;

-- Fix foreign key relationships for likes table
DO $$
BEGIN
    -- Check if the likes_user_id_fkey constraint exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'likes_user_id_fkey' 
        AND table_name = 'likes'
    ) THEN
        -- Drop the constraint that references the non-existent users table
        ALTER TABLE public.likes DROP CONSTRAINT IF EXISTS likes_user_id_fkey;
        RAISE NOTICE 'Dropped likes_user_id_fkey constraint';
    END IF;

    -- Create the constraint to link likes.user_id to profiles.id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_likes_user' 
        AND table_name = 'likes'
    ) THEN
        ALTER TABLE public.likes 
        ADD CONSTRAINT fk_likes_user
        FOREIGN KEY (user_id)
        REFERENCES public.profiles(id)
        ON DELETE CASCADE;
        RAISE NOTICE 'Created fk_likes_user constraint';
    END IF;
END
$$;

-- Fix foreign key relationships for comments table
DO $$
BEGIN
    -- Check if the comments_user_id_fkey constraint exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'comments_user_id_fkey' 
        AND table_name = 'comments'
    ) THEN
        -- Drop the constraint that references the non-existent users table
        ALTER TABLE public.comments DROP CONSTRAINT IF EXISTS comments_user_id_fkey;
        RAISE NOTICE 'Dropped comments_user_id_fkey constraint';
    END IF;

    -- Create the constraint to link comments.user_id to profiles.id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_comments_user' 
        AND table_name = 'comments'
    ) THEN
        ALTER TABLE public.comments 
        ADD CONSTRAINT fk_comments_user
        FOREIGN KEY (user_id)
        REFERENCES public.profiles(id)
        ON DELETE CASCADE;
        RAISE NOTICE 'Created fk_comments_user constraint';
    END IF;
END
$$;

-- Fix foreign key relationships for bookmarks table
DO $$
BEGIN
    -- Check if the bookmarks_user_id_fkey constraint exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'bookmarks_user_id_fkey' 
        AND table_name = 'bookmarks'
    ) THEN
        -- Drop the constraint that references the non-existent users table
        ALTER TABLE public.bookmarks DROP CONSTRAINT IF EXISTS bookmarks_user_id_fkey;
        RAISE NOTICE 'Dropped bookmarks_user_id_fkey constraint';
    END IF;

    -- Create the constraint to link bookmarks.user_id to profiles.id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_bookmarks_user' 
        AND table_name = 'bookmarks'
    ) THEN
        ALTER TABLE public.bookmarks 
        ADD CONSTRAINT fk_bookmarks_user
        FOREIGN KEY (user_id)
        REFERENCES public.profiles(id)
        ON DELETE CASCADE;
        RAISE NOTICE 'Created fk_bookmarks_user constraint';
    END IF;
END
$$;

-- Fix foreign key relationships for follows table
DO $$
BEGIN
    -- Check if the follows_follower_id_fkey constraint exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'follows_follower_id_fkey' 
        AND table_name = 'follows'
    ) THEN
        -- Drop the constraint that references the non-existent users table
        ALTER TABLE public.follows DROP CONSTRAINT IF EXISTS follows_follower_id_fkey;
        RAISE NOTICE 'Dropped follows_follower_id_fkey constraint';
    END IF;

    -- Check if the follows_following_id_fkey constraint exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'follows_following_id_fkey' 
        AND table_name = 'follows'
    ) THEN
        -- Drop the constraint that references the non-existent users table
        ALTER TABLE public.follows DROP CONSTRAINT IF EXISTS follows_following_id_fkey;
        RAISE NOTICE 'Dropped follows_following_id_fkey constraint';
    END IF;

    -- Create the constraints to link follows.follower_id and follows.following_id to profiles.id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_follows_follower' 
        AND table_name = 'follows'
    ) THEN
        ALTER TABLE public.follows 
        ADD CONSTRAINT fk_follows_follower
        FOREIGN KEY (follower_id)
        REFERENCES public.profiles(id)
        ON DELETE CASCADE;
        RAISE NOTICE 'Created fk_follows_follower constraint';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_follows_following' 
        AND table_name = 'follows'
    ) THEN
        ALTER TABLE public.follows 
        ADD CONSTRAINT fk_follows_following
        FOREIGN KEY (following_id)
        REFERENCES public.profiles(id)
        ON DELETE CASCADE;
        RAISE NOTICE 'Created fk_follows_following constraint';
    END IF;
END
$$;
