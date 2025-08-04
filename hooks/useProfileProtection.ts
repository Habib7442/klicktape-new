import { useEffect } from 'react';
import { router } from 'expo-router';
import { checkProfileCompletion } from '@/lib/profileUtils';
import { authManager } from '@/lib/authManager';
import { supabase } from '@/lib/supabase';

/**
 * Hook to protect routes that require a complete profile
 * Redirects to create-profile if profile is incomplete
 */
export const useProfileProtection = () => {
  useEffect(() => {
    const checkAndRedirect = async () => {
      try {
        // Get current user
        let user;
        try {
          user = await authManager.getCurrentUser();
        } catch (error) {
          console.error("❌ Error getting user from auth manager:", error);
          // Fallback to direct Supabase call
          const { data: { user: supabaseUser } } = await supabase.auth.getUser();
          user = supabaseUser;
        }

        if (!user) {
          console.warn("⚠️ No authenticated user found, redirecting to welcome");
          router.replace("/(auth)/welcome");
          return;
        }

        // Check profile completion
        try {
          const completionStatus = await checkProfileCompletion(user.id);
          console.log("🔍 Profile protection check:", completionStatus);
          
          if (!completionStatus.exists || !completionStatus.isComplete) {
            console.log("❌ Profile incomplete, redirecting to create-profile");
            router.replace("/(root)/create-profile");
            return;
          }
          
          console.log("✅ Profile complete, allowing access");
        } catch (profileError) {
          console.error("❌ Error checking profile completion:", profileError);
          // If profile check fails, redirect to create-profile for safety
          router.replace("/(root)/create-profile");
          return;
        }
      } catch (error) {
        console.error("❌ Error in profile protection:", error);
        router.replace("/(root)/create-profile");
      }
    };

    checkAndRedirect();
  }, []);
};
