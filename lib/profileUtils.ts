/**
 * Profile Utilities for Klicktape
 * Centralized logic for profile completion checking and management
 * No TanStack Query dependencies for initial load compatibility
 */

import { supabase } from './supabase';

export interface ProfileData {
  id: string;
  email: string;
  name: string | null;
  username: string | null;
  gender: string | null;
  account_type: string | null;
  avatar_url: string | null;
  bio: string | null;
  anonymous_room_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProfileCompletionStatus {
  exists: boolean;
  isComplete: boolean;
  missingFields: string[];
  profile: ProfileData | null;
}

/**
 * Check if a user's profile exists and is complete
 * A complete profile must have: username, gender, and account_type
 */
export const checkProfileCompletion = async (
  userId: string,
  email?: string
): Promise<ProfileCompletionStatus> => {
  try {
    console.log(`🔍 Checking profile completion for user: ${userId}`);
    
    // Query profile by user ID with all required fields
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, email, name, username, gender, account_type, avatar_url, bio, anonymous_room_name, is_active, created_at, updated_at')
      .eq('id', userId)
      .single();

    if (error) {
      console.log(`❌ Profile not found for user ${userId}:`, error.message);
      return {
        exists: false,
        isComplete: false,
        missingFields: ['profile_not_found'],
        profile: null,
      };
    }

    if (!profile) {
      console.log(`❌ No profile data returned for user ${userId}`);
      return {
        exists: false,
        isComplete: false,
        missingFields: ['profile_not_found'],
        profile: null,
      };
    }

    console.log(`✅ Profile found for user ${userId}:`, {
      username: profile.username,
      gender: profile.gender,
      account_type: profile.account_type,
      is_active: profile.is_active,
    });

    // Check required fields for profile completion
    const missingFields: string[] = [];
    
    if (!profile.username || profile.username.trim() === '') {
      missingFields.push('username');
    }
    
    if (!profile.gender) {
      missingFields.push('gender');
    }
    
    if (!profile.account_type) {
      missingFields.push('account_type');
    }

    const isComplete = missingFields.length === 0;

    console.log(`📊 Profile completion status:`, {
      exists: true,
      isComplete,
      missingFields,
    });

    return {
      exists: true,
      isComplete,
      missingFields,
      profile: profile as ProfileData,
    };
  } catch (error) {
    console.error(`❌ Error checking profile completion for user ${userId}:`, error);
    return {
      exists: false,
      isComplete: false,
      missingFields: ['error_checking_profile'],
      profile: null,
    };
  }
};

/**
 * Create a basic profile for a new user
 * This ensures a profile exists even if incomplete
 */
export const createBasicProfile = async (
  userId: string,
  email: string
): Promise<boolean> => {
  try {
    console.log(`🔧 Creating basic profile for user: ${userId}`);

    // Generate a basic username from email
    const baseUsername = email.split('@')[0]
      .replace(/[^a-zA-Z0-9_]/g, '_')
      .substring(0, 20);

    // Ensure username is unique
    let username = baseUsername;
    let counter = 1;

    while (true) {
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .single();

      if (!existingUser) break;

      username = `${baseUsername}_${counter}`;
      counter++;

      if (counter > 100) {
        // Fallback to user ID-based username
        username = `user_${userId.substring(0, 8)}`;
        break;
      }
    }

    // Generate anonymous room name
    const anonymousRoomName = `Anonymous${Math.random().toString(36).substring(2, 8)}`;

    const profileData = {
      id: userId,
      email: email,
      username: username,
      gender: null, // Will be set in create-profile
      account_type: 'personal', // Default value
      avatar_url: null,
      bio: null,
      anonymous_room_name: anonymousRoomName,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('profiles')
      .upsert(profileData, { onConflict: 'id' });

    if (error) {
      console.error(`❌ Error creating basic profile:`, error);
      return false;
    }

    console.log(`✅ Basic profile created successfully for user: ${userId}`);
    return true;
  } catch (error) {
    console.error(`❌ Error in createBasicProfile:`, error);
    return false;
  }
};

/**
 * Update profile completion status
 */
export const markProfileComplete = async (userId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      console.error(`❌ Error marking profile complete:`, error);
      return false;
    }

    console.log(`✅ Profile marked as complete for user: ${userId}`);
    return true;
  } catch (error) {
    console.error(`❌ Error in markProfileComplete:`, error);
    return false;
  }
};

/**
 * Get user profile data for Redux store
 */
export const getUserProfileData = async (userId: string) => {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, name, username, avatar_url, email')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      console.error(`❌ Error fetching profile data:`, error);
      return null;
    }

    return {
      id: profile.id,
      name: profile.name,
      username: profile.username,
      avatar: profile.avatar_url,
      email: profile.email,
    };
  } catch (error) {
    console.error(`❌ Error in getUserProfileData:`, error);
    return null;
  }
};

/**
 * Determine where to redirect user after authentication
 */
export const getAuthRedirectPath = async (
  userId: string,
  email?: string
): Promise<string> => {
  try {
    console.log(`🧭 Determining redirect path for user: ${userId}`);
    
    const completionStatus = await checkProfileCompletion(userId, email);
    
    if (!completionStatus.exists) {
      console.log(`➡️ No profile exists, redirecting to create-profile`);
      return '/(root)/create-profile';
    }
    
    if (!completionStatus.isComplete) {
      console.log(`➡️ Profile incomplete (missing: ${completionStatus.missingFields.join(', ')}), redirecting to create-profile`);
      return '/(root)/create-profile';
    }
    
    console.log(`➡️ Profile complete, redirecting to home`);
    return '/(root)/(tabs)/home';
  } catch (error) {
    console.error(`❌ Error determining redirect path:`, error);
    // Default to create-profile for safety
    return '/(root)/create-profile';
  }
};

export default {
  checkProfileCompletion,
  createBasicProfile,
  markProfileComplete,
  getUserProfileData,
  getAuthRedirectPath,
};
