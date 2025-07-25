-- =====================================================
-- USER REGISTRATION PROFILE CREATION FIX
-- Comprehensive solution for automatic profile creation
-- =====================================================

-- First, let's check the current profiles table structure
-- and add any missing columns that are referenced in the app

-- Add missing columns to profiles table if they don't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT FALSE;

-- Update the profiles table to ensure all necessary columns exist
-- (These should already exist based on the schema, but let's be safe)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gender gender_enum;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS account_type account_type DEFAULT 'personal';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS public_key TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS anonymous_room_name TEXT;

-- =====================================================
-- ENHANCED USER PROFILE CREATION FUNCTION
-- =====================================================

-- Drop the existing function and trigger to recreate them
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS create_user_profile();

-- Create enhanced profile creation function
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
    generated_username TEXT;
    generated_room_name TEXT;
    user_full_name TEXT;
BEGIN
    -- Extract full name from metadata
    user_full_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        'User'
    );
    
    -- Generate a unique username based on email or random string
    IF NEW.email IS NOT NULL THEN
        generated_username := split_part(NEW.email, '@', 1);
        -- Clean username: remove special characters, limit length
        generated_username := regexp_replace(generated_username, '[^a-zA-Z0-9_]', '_', 'g');
        generated_username := substring(generated_username from 1 for 20);
        
        -- Ensure username is unique by appending random suffix if needed
        WHILE EXISTS (SELECT 1 FROM profiles WHERE username = generated_username) LOOP
            generated_username := substring(split_part(NEW.email, '@', 1) from 1 for 15) || '_' || 
                                 substr(NEW.id::text, 1, 4);
        END LOOP;
    ELSE
        -- Fallback to user ID-based username
        generated_username := 'user_' || substr(NEW.id::text, 1, 8);
    END IF;
    
    -- Generate anonymous room name
    generated_room_name := 'Anonymous' || substr(md5(NEW.id::text), 1, 6);
    
    -- Insert profile with all necessary fields
    INSERT INTO public.profiles (
        id,
        email,
        username,
        full_name,
        created_at,
        updated_at,
        avatar_url,
        account_type,
        gender,
        bio,
        public_key,
        anonymous_room_name,
        is_active
    ) VALUES (
        NEW.id,
        NEW.email,
        generated_username,
        user_full_name,
        NOW(),
        NOW(),
        NULL, -- Will be set when user completes profile
        'personal'::account_type, -- Default account type
        NULL, -- Will be set when user completes profile
        NULL, -- Empty bio initially
        NULL, -- Will be generated when user completes profile
        generated_room_name,
        FALSE -- User needs to complete profile setup
    );
    
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Log the error but don't fail user creation
    RAISE WARNING 'Failed to create user profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION create_user_profile();

-- =====================================================
-- PROFILE COMPLETION FUNCTION
-- =====================================================

-- Function to check if a profile is complete
CREATE OR REPLACE FUNCTION is_profile_complete(user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    profile_record profiles%ROWTYPE;
BEGIN
    SELECT * INTO profile_record
    FROM profiles
    WHERE id = user_id_param;
    
    -- Profile is complete if it has username, gender, and account_type
    RETURN (
        profile_record.username IS NOT NULL AND
        profile_record.username != '' AND
        profile_record.gender IS NOT NULL AND
        profile_record.account_type IS NOT NULL
    );
END;
$$;

-- =====================================================
-- PROFILE UPDATE FUNCTION
-- =====================================================

-- Function to safely update profile with validation
CREATE OR REPLACE FUNCTION update_user_profile(
    user_id_param UUID,
    username_param TEXT DEFAULT NULL,
    full_name_param TEXT DEFAULT NULL,
    gender_param gender_enum DEFAULT NULL,
    account_type_param account_type DEFAULT NULL,
    bio_param TEXT DEFAULT NULL,
    avatar_url_param TEXT DEFAULT NULL,
    public_key_param TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    existing_username_count INTEGER;
BEGIN
    -- Check if username is already taken (if provided)
    IF username_param IS NOT NULL THEN
        SELECT COUNT(*) INTO existing_username_count
        FROM profiles
        WHERE username = username_param AND id != user_id_param;
        
        IF existing_username_count > 0 THEN
            RAISE EXCEPTION 'Username already taken';
        END IF;
    END IF;
    
    -- Update profile
    UPDATE profiles SET
        username = COALESCE(username_param, username),
        full_name = COALESCE(full_name_param, full_name),
        gender = COALESCE(gender_param, gender),
        account_type = COALESCE(account_type_param, account_type),
        bio = COALESCE(bio_param, bio),
        avatar_url = COALESCE(avatar_url_param, avatar_url),
        public_key = COALESCE(public_key_param, public_key),
        updated_at = NOW(),
        is_active = CASE 
            WHEN COALESCE(username_param, username) IS NOT NULL 
                 AND COALESCE(gender_param, gender) IS NOT NULL 
            THEN TRUE 
            ELSE is_active 
        END
    WHERE id = user_id_param;
    
    RETURN FOUND;
END;
$$;

-- =====================================================
-- CLEANUP AND MIGRATION
-- =====================================================

-- Update existing profiles that might be missing required fields
UPDATE profiles SET
    account_type = 'personal'::account_type
WHERE account_type IS NULL;

UPDATE profiles SET
    is_active = FALSE
WHERE is_active IS NULL;

-- Generate anonymous room names for existing users who don't have them
UPDATE profiles SET
    anonymous_room_name = 'Anonymous' || substr(md5(id::text), 1, 6)
WHERE anonymous_room_name IS NULL OR anonymous_room_name = '';

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check if the trigger is working
-- SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- Check profiles table structure
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'profiles' 
-- ORDER BY ordinal_position;

-- Test profile completion function
-- SELECT id, username, gender, account_type, is_profile_complete(id) as complete
-- FROM profiles
-- LIMIT 5;

-- =====================================================
-- NOTES FOR IMPLEMENTATION
-- =====================================================

/*
This fix addresses the following issues:

1. AUTOMATIC PROFILE CREATION:
   - Enhanced trigger function creates complete profile records
   - Handles all required fields with sensible defaults
   - Generates unique usernames and anonymous room names

2. FIELD COMPATIBILITY:
   - Adds missing columns (full_name, is_active) to profiles table
   - Ensures all app-referenced fields exist

3. ERROR HANDLING:
   - Robust exception handling in trigger
   - Profile creation doesn't fail user registration

4. PROFILE COMPLETION:
   - is_profile_complete() function to check profile status
   - update_user_profile() function for safe profile updates

5. DATA MIGRATION:
   - Updates existing profiles with missing data
   - Ensures backward compatibility

NEXT STEPS:
1. Run this SQL script on your Supabase database
2. Update the signup code to remove manual profile insertion
3. Test user registration flow
4. Verify profile completion flow works correctly
*/
