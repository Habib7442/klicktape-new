-- =====================================================
-- DATABASE SCHEMA FIX FOR PROFILE UTILITIES
-- Adds missing columns and ensures compatibility
-- =====================================================

-- Add missing is_active column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT FALSE;

-- Update existing profiles to have is_active = true if they have username and gender
UPDATE profiles 
SET is_active = TRUE 
WHERE username IS NOT NULL 
  AND username != '' 
  AND gender IS NOT NULL;

-- Ensure all profiles have anonymous_room_name
UPDATE profiles 
SET anonymous_room_name = 'Anonymous' || substr(md5(id::text), 1, 6)
WHERE anonymous_room_name IS NULL OR anonymous_room_name = '';

-- =====================================================
-- ENHANCED PROFILE CREATION TRIGGER
-- =====================================================

-- Drop existing trigger and function to recreate them
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS create_user_profile();

-- Create enhanced profile creation function that matches actual schema
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
    generated_username TEXT;
    generated_room_name TEXT;
    counter INTEGER := 1;
BEGIN
    -- Generate a unique username based on email
    IF NEW.email IS NOT NULL THEN
        generated_username := split_part(NEW.email, '@', 1);
        -- Clean username: remove special characters, limit length
        generated_username := regexp_replace(generated_username, '[^a-zA-Z0-9_]', '_', 'g');
        generated_username := substring(generated_username from 1 for 20);
        
        -- Ensure username is unique by appending counter if needed
        WHILE EXISTS (SELECT 1 FROM profiles WHERE username = generated_username) LOOP
            generated_username := substring(split_part(NEW.email, '@', 1) from 1 for 15) || '_' || counter::text;
            counter := counter + 1;
            
            -- Prevent infinite loop
            IF counter > 1000 THEN
                generated_username := 'user_' || substr(NEW.id::text, 1, 8);
                EXIT;
            END IF;
        END LOOP;
    ELSE
        -- Fallback to user ID-based username
        generated_username := 'user_' || substr(NEW.id::text, 1, 8);
    END IF;
    
    -- Generate anonymous room name
    generated_room_name := 'Anonymous' || substr(md5(NEW.id::text), 1, 6);
    
    -- Insert profile with actual schema columns only
    INSERT INTO public.profiles (
        id,
        email,
        username,
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
    
    -- Log successful profile creation
    RAISE NOTICE 'Profile created for user % with username %', NEW.id, generated_username;
    
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
-- PROFILE COMPLETION FUNCTIONS
-- =====================================================

-- Function to check if a profile is complete (matches actual schema)
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
        profile_record.id IS NOT NULL AND
        profile_record.username IS NOT NULL AND
        profile_record.username != '' AND
        profile_record.gender IS NOT NULL AND
        profile_record.account_type IS NOT NULL
    );
END;
$$;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check profiles table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if trigger is working
SELECT 
    tgname as trigger_name,
    tgenabled as enabled,
    tgrelid::regclass as table_name
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';

-- Test profile completion function
SELECT 
    id,
    username,
    gender,
    account_type,
    is_active,
    is_profile_complete(id) as complete
FROM profiles
LIMIT 5;

-- =====================================================
-- NOTES
-- =====================================================

/*
This fix:

1. ADDS MISSING COLUMNS:
   - is_active column for profile completion tracking

2. UPDATES EXISTING DATA:
   - Sets is_active = true for profiles with username and gender
   - Generates anonymous_room_name for profiles missing it

3. FIXES TRIGGER FUNCTION:
   - Uses only columns that exist in actual schema
   - Removes references to full_name column
   - Maintains all functionality with correct column names

4. PROVIDES VERIFICATION:
   - Queries to check table structure
   - Test functions for profile completion
   - Trigger status verification

After running this script:
- Profile utilities will work without column errors
- Automatic profile creation will function correctly
- Profile completion checking will work properly
*/
