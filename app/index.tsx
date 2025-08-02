import React, { useState, useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { Redirect } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useDispatch } from "react-redux";
import { setUser } from "@/src/store/slices/authSlice";
import AsyncStorage from "@react-native-async-storage/async-storage";
import SplashScreen from "@/components/SplashScreen";
import { checkProfileCompletion, getUserProfileData, getAuthRedirectPath } from "@/lib/profileUtils";


const Page = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [redirectPath, setRedirectPath] = useState<string | null>(null);
  const [showSplash, setShowSplash] = useState(false);
  const dispatch = useDispatch();

  // Function to initialize authentication
  const initializeAuth = async () => {
    if (!supabase) {
      console.error("Supabase client is not initialized");
      setIsLoading(false);
      return;
    }

    try {
      // First check existing session with error handling
      const {
        data: { session },
        error
      } = await supabase.auth.getSession();

      if (error) {
        console.warn('⚠️ Session check error (non-critical):', error.message);
        // Continue with null session instead of failing
      }

      await verifyAuthState(session);

      // Then subscribe to auth changes
      supabase.auth.onAuthStateChange(
        async (event, session) => {
          console.log('🔐 Auth state change event:', event);

          // Don't interfere with password reset flow
          if (event === 'PASSWORD_RECOVERY') {
            console.log('🔑 Password recovery event detected, skipping auth verification');
            return;
          }

          await verifyAuthState(session);
        }
      );
    } catch (error) {
      console.error('❌ Auth initialization error:', error);
      // Continue with no session instead of crashing
      setIsSignedIn(false);
      setRedirectPath(null);
      setIsLoading(false);
    }
  };

  const verifyAuthState = async (session: any) => {
    try {
      const signedIn = !!session;
      setIsSignedIn(signedIn);

      if (signedIn && session?.user?.email) {
        try {
          if (!supabase) {
            console.error("Supabase client is not initialized");
            setIsLoading(false);
            return;
          }

          console.log("🔐 Verifying auth state for user:", session.user.id);

          // Get user profile data for Redux store
          const profileData = await getUserProfileData(session.user.id);

          if (profileData) {
            await AsyncStorage.setItem("user", JSON.stringify(profileData));
            dispatch(setUser({
              id: profileData.id,
              username: profileData.username || '',
            }));
            console.log("✅ User data stored in Redux and AsyncStorage");
          }

          // Determine where to redirect the user
          const redirectPath = await getAuthRedirectPath(session.user.id, session.user.email);
          setRedirectPath(redirectPath);

          console.log("🧭 Redirect path determined:", redirectPath);
        } catch (error) {
          console.error("❌ Error in auth state verification:", error);
          // Default to create-profile for safety
          setRedirectPath('/(root)/create-profile');
        }
      } else {
        setRedirectPath(null);
      }
    } catch (error) {
      console.error("❌ Error in verifyAuthState:", error);
      setIsSignedIn(false);
      setRedirectPath(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Always show splash screen on app launch
    setShowSplash(true);
  }, []);

  // Handle splash screen display
  if (showSplash) {
    return (
      <SplashScreen
        onFinish={() => {
          setShowSplash(false);
          setIsLoading(true);
          initializeAuth();
        }}
      />
    );
  }

  // Handle loading state
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Handle authentication routing
  if (!isSignedIn) {
    return <Redirect href="/(auth)/welcome" />;
  }

  // Redirect based on profile completion status
  if (redirectPath) {
    console.log("🚀 Redirecting to:", redirectPath);
    return <Redirect href={redirectPath as any} />;
  }

  // Fallback to create-profile if no redirect path determined
  return <Redirect href="/(root)/create-profile" />;
};

export default Page;
