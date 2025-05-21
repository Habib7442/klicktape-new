-- Security Policies for Klicktape
-- This script sets up Row Level Security (RLS) policies for all tables

-- Enable RLS on all tables
DO $$
DECLARE
    table_exists BOOLEAN;
BEGIN
    -- Check and enable RLS for profiles
    SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'profiles'
    ) INTO table_exists;
    IF table_exists THEN
        EXECUTE 'ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;';
        RAISE NOTICE 'Enabled RLS on public.profiles';
    ELSE
        RAISE NOTICE 'Table public.profiles does not exist, skipping';
    END IF;

    -- Check and enable RLS for posts
    SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'posts'
    ) INTO table_exists;
    IF table_exists THEN
        EXECUTE 'ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;';
        RAISE NOTICE 'Enabled RLS on public.posts';
    ELSE
        RAISE NOTICE 'Table public.posts does not exist, skipping';
    END IF;

    -- Check and enable RLS for post_likes
    SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'post_likes'
    ) INTO table_exists;
    IF table_exists THEN
        EXECUTE 'ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;';
        RAISE NOTICE 'Enabled RLS on public.post_likes';
    ELSE
        RAISE NOTICE 'Table public.post_likes does not exist, skipping';
    END IF;

    -- Check and enable RLS for post_comments
    SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'post_comments'
    ) INTO table_exists;
    IF table_exists THEN
        EXECUTE 'ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;';
        RAISE NOTICE 'Enabled RLS on public.post_comments';
    ELSE
        RAISE NOTICE 'Table public.post_comments does not exist, skipping';
    END IF;

    -- Check and enable RLS for reels
    SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'reels'
    ) INTO table_exists;
    IF table_exists THEN
        EXECUTE 'ALTER TABLE public.reels ENABLE ROW LEVEL SECURITY;';
        RAISE NOTICE 'Enabled RLS on public.reels';
    ELSE
        RAISE NOTICE 'Table public.reels does not exist, skipping';
    END IF;

    -- Check and enable RLS for reel_likes
    SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'reel_likes'
    ) INTO table_exists;
    IF table_exists THEN
        EXECUTE 'ALTER TABLE public.reel_likes ENABLE ROW LEVEL SECURITY;';
        RAISE NOTICE 'Enabled RLS on public.reel_likes';
    ELSE
        RAISE NOTICE 'Table public.reel_likes does not exist, skipping';
    END IF;

    -- Check and enable RLS for reel_comments
    SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'reel_comments'
    ) INTO table_exists;
    IF table_exists THEN
        EXECUTE 'ALTER TABLE public.reel_comments ENABLE ROW LEVEL SECURITY;';
        RAISE NOTICE 'Enabled RLS on public.reel_comments';
    ELSE
        RAISE NOTICE 'Table public.reel_comments does not exist, skipping';
    END IF;

    -- Check and enable RLS for follows
    SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'follows'
    ) INTO table_exists;
    IF table_exists THEN
        EXECUTE 'ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;';
        RAISE NOTICE 'Enabled RLS on public.follows';
    ELSE
        RAISE NOTICE 'Table public.follows does not exist, skipping';
    END IF;

    -- Check and enable RLS for notifications
    SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'notifications'
    ) INTO table_exists;
    IF table_exists THEN
        EXECUTE 'ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;';
        RAISE NOTICE 'Enabled RLS on public.notifications';
    ELSE
        RAISE NOTICE 'Table public.notifications does not exist, skipping';
    END IF;

    -- Check and enable RLS for messages
    SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'messages'
    ) INTO table_exists;
    IF table_exists THEN
        EXECUTE 'ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;';
        RAISE NOTICE 'Enabled RLS on public.messages';
    ELSE
        RAISE NOTICE 'Table public.messages does not exist, skipping';
    END IF;

    -- Check and enable RLS for rooms
    SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'rooms'
    ) INTO table_exists;
    IF table_exists THEN
        EXECUTE 'ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;';
        RAISE NOTICE 'Enabled RLS on public.rooms';
    ELSE
        RAISE NOTICE 'Table public.rooms does not exist, skipping';
    END IF;

    -- Check and enable RLS for room_participants
    SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'room_participants'
    ) INTO table_exists;
    IF table_exists THEN
        EXECUTE 'ALTER TABLE public.room_participants ENABLE ROW LEVEL SECURITY;';
        RAISE NOTICE 'Enabled RLS on public.room_participants';
    ELSE
        RAISE NOTICE 'Table public.room_participants does not exist, skipping';
    END IF;

    -- Check and enable RLS for public_keys
    SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'public_keys'
    ) INTO table_exists;
    IF table_exists THEN
        EXECUTE 'ALTER TABLE public.public_keys ENABLE ROW LEVEL SECURITY;';
        RAISE NOTICE 'Enabled RLS on public.public_keys';
    ELSE
        RAISE NOTICE 'Table public.public_keys does not exist, skipping';
    END IF;
END
$$;

-- Create a function to check if a user is authenticated
CREATE OR REPLACE FUNCTION public.is_authenticated()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.role() = 'authenticated';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to check if a user owns a record
CREATE OR REPLACE FUNCTION public.auth_user_owns_record(record_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.uid() = record_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to check if a user is following another user
CREATE OR REPLACE FUNCTION public.is_following(target_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.follows
    WHERE follower_id = auth.uid() AND following_id = target_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to check if a post is public or from a followed user
CREATE OR REPLACE FUNCTION public.can_view_post(post_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- User can view their own posts
  IF auth.uid() = post_user_id THEN
    RETURN TRUE;
  END IF;

  -- User can view posts from users they follow
  IF public.is_following(post_user_id) THEN
    RETURN TRUE;
  END IF;

  -- Check if the post is public (assuming there's a is_public column)
  -- RETURN EXISTS (
  --   SELECT 1 FROM public.posts
  --   WHERE user_id = post_user_id AND is_public = TRUE
  -- );

  -- For now, all posts are viewable
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PROFILES TABLE POLICIES
DO $$
DECLARE
    table_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'profiles'
    ) INTO table_exists;

    IF table_exists THEN
        -- Everyone can read public profile information
        EXECUTE 'DROP POLICY IF EXISTS profiles_read_policy ON public.profiles';
        EXECUTE 'CREATE POLICY profiles_read_policy ON public.profiles
                 FOR SELECT USING (TRUE)';

        -- Users can only update their own profile
        EXECUTE 'DROP POLICY IF EXISTS profiles_update_policy ON public.profiles';
        EXECUTE 'CREATE POLICY profiles_update_policy ON public.profiles
                 FOR UPDATE USING (auth.uid() = id)';

        -- Only the user can insert their own profile
        EXECUTE 'DROP POLICY IF EXISTS profiles_insert_policy ON public.profiles';
        EXECUTE 'CREATE POLICY profiles_insert_policy ON public.profiles
                 FOR INSERT WITH CHECK (auth.uid() = id)';

        -- Users cannot delete profiles
        EXECUTE 'DROP POLICY IF EXISTS profiles_delete_policy ON public.profiles';
        EXECUTE 'CREATE POLICY profiles_delete_policy ON public.profiles
                 FOR DELETE USING (FALSE)';

        RAISE NOTICE 'Created policies for public.profiles';
    ELSE
        RAISE NOTICE 'Table public.profiles does not exist, skipping policies';
    END IF;
END
$$;

-- POSTS TABLE POLICIES
DO $$
DECLARE
    table_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'posts'
    ) INTO table_exists;

    IF table_exists THEN
        -- Users can read posts from themselves or users they follow
        EXECUTE 'DROP POLICY IF EXISTS posts_read_policy ON public.posts';
        EXECUTE 'CREATE POLICY posts_read_policy ON public.posts
                 FOR SELECT USING (public.can_view_post(user_id))';

        -- Users can only insert their own posts
        EXECUTE 'DROP POLICY IF EXISTS posts_insert_policy ON public.posts';
        EXECUTE 'CREATE POLICY posts_insert_policy ON public.posts
                 FOR INSERT WITH CHECK (auth.uid() = user_id)';

        -- Users can only update their own posts
        EXECUTE 'DROP POLICY IF EXISTS posts_update_policy ON public.posts';
        EXECUTE 'CREATE POLICY posts_update_policy ON public.posts
                 FOR UPDATE USING (auth.uid() = user_id)';

        -- Users can only delete their own posts
        EXECUTE 'DROP POLICY IF EXISTS posts_delete_policy ON public.posts';
        EXECUTE 'CREATE POLICY posts_delete_policy ON public.posts
                 FOR DELETE USING (auth.uid() = user_id)';

        RAISE NOTICE 'Created policies for public.posts';
    ELSE
        RAISE NOTICE 'Table public.posts does not exist, skipping policies';
    END IF;
END
$$;

-- POST_LIKES TABLE POLICIES
DO $$
DECLARE
    table_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'post_likes'
    ) INTO table_exists;

    IF table_exists THEN
        -- Everyone can read post likes
        EXECUTE 'DROP POLICY IF EXISTS post_likes_read_policy ON public.post_likes';
        EXECUTE 'CREATE POLICY post_likes_read_policy ON public.post_likes
                 FOR SELECT USING (TRUE)';

        -- Users can only insert their own likes
        EXECUTE 'DROP POLICY IF EXISTS post_likes_insert_policy ON public.post_likes';
        EXECUTE 'CREATE POLICY post_likes_insert_policy ON public.post_likes
                 FOR INSERT WITH CHECK (auth.uid() = user_id)';

        -- Users cannot update likes
        EXECUTE 'DROP POLICY IF EXISTS post_likes_update_policy ON public.post_likes';
        EXECUTE 'CREATE POLICY post_likes_update_policy ON public.post_likes
                 FOR UPDATE USING (FALSE)';

        -- Users can only delete their own likes
        EXECUTE 'DROP POLICY IF EXISTS post_likes_delete_policy ON public.post_likes';
        EXECUTE 'CREATE POLICY post_likes_delete_policy ON public.post_likes
                 FOR DELETE USING (auth.uid() = user_id)';

        RAISE NOTICE 'Created policies for public.post_likes';
    ELSE
        RAISE NOTICE 'Table public.post_likes does not exist, skipping policies';
    END IF;
END
$$;

-- REELS TABLE POLICIES (similar to posts)
DO $$
DECLARE
    table_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'reels'
    ) INTO table_exists;

    IF table_exists THEN
        -- Users can read all reels
        EXECUTE 'DROP POLICY IF EXISTS reels_read_policy ON public.reels';
        EXECUTE 'CREATE POLICY reels_read_policy ON public.reels
                 FOR SELECT USING (TRUE)';

        -- Users can only insert their own reels
        EXECUTE 'DROP POLICY IF EXISTS reels_insert_policy ON public.reels';
        EXECUTE 'CREATE POLICY reels_insert_policy ON public.reels
                 FOR INSERT WITH CHECK (auth.uid() = user_id)';

        -- Users can only update their own reels
        EXECUTE 'DROP POLICY IF EXISTS reels_update_policy ON public.reels';
        EXECUTE 'CREATE POLICY reels_update_policy ON public.reels
                 FOR UPDATE USING (auth.uid() = user_id)';

        -- Users can only delete their own reels
        EXECUTE 'DROP POLICY IF EXISTS reels_delete_policy ON public.reels';
        EXECUTE 'CREATE POLICY reels_delete_policy ON public.reels
                 FOR DELETE USING (auth.uid() = user_id)';

        RAISE NOTICE 'Created policies for public.reels';
    ELSE
        RAISE NOTICE 'Table public.reels does not exist, skipping policies';
    END IF;
END
$$;

-- PUBLIC_KEYS TABLE POLICIES
DO $$
DECLARE
    table_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'public_keys'
    ) INTO table_exists;

    IF table_exists THEN
        -- Everyone can read public keys
        EXECUTE 'DROP POLICY IF EXISTS public_keys_read_policy ON public.public_keys';
        EXECUTE 'CREATE POLICY public_keys_read_policy ON public.public_keys
                 FOR SELECT USING (TRUE)';

        -- Users can only insert their own public key
        EXECUTE 'DROP POLICY IF EXISTS public_keys_insert_policy ON public.public_keys';
        EXECUTE 'CREATE POLICY public_keys_insert_policy ON public.public_keys
                 FOR INSERT WITH CHECK (auth.uid() = user_id)';

        -- Users can only update their own public key
        EXECUTE 'DROP POLICY IF EXISTS public_keys_update_policy ON public.public_keys';
        EXECUTE 'CREATE POLICY public_keys_update_policy ON public.public_keys
                 FOR UPDATE USING (auth.uid() = user_id)';

        -- Users cannot delete public keys
        EXECUTE 'DROP POLICY IF EXISTS public_keys_delete_policy ON public.public_keys';
        EXECUTE 'CREATE POLICY public_keys_delete_policy ON public.public_keys
                 FOR DELETE USING (FALSE)';

        RAISE NOTICE 'Created policies for public.public_keys';
    ELSE
        RAISE NOTICE 'Table public.public_keys does not exist, skipping policies';
    END IF;
END
$$;

-- MESSAGES TABLE POLICIES
DO $$
DECLARE
    table_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'messages'
    ) INTO table_exists;

    IF table_exists THEN
        -- Users can only read messages they sent or received
        EXECUTE 'DROP POLICY IF EXISTS messages_read_policy ON public.messages';
        EXECUTE 'CREATE POLICY messages_read_policy ON public.messages
                 FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id)';

        -- Users can only insert messages they are sending
        EXECUTE 'DROP POLICY IF EXISTS messages_insert_policy ON public.messages';
        EXECUTE 'CREATE POLICY messages_insert_policy ON public.messages
                 FOR INSERT WITH CHECK (auth.uid() = sender_id)';

        -- Users can only update message read status if they are the receiver
        EXECUTE 'DROP POLICY IF EXISTS messages_update_policy ON public.messages';
        EXECUTE 'CREATE POLICY messages_update_policy ON public.messages
                 FOR UPDATE USING (auth.uid() = receiver_id)';

        -- Users cannot delete messages
        EXECUTE 'DROP POLICY IF EXISTS messages_delete_policy ON public.messages';
        EXECUTE 'CREATE POLICY messages_delete_policy ON public.messages
                 FOR DELETE USING (FALSE)';

        RAISE NOTICE 'Created policies for public.messages';
    ELSE
        RAISE NOTICE 'Table public.messages does not exist, skipping policies';
    END IF;
END
$$;

-- Add more policies for other tables as needed
