import React, { useState, useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { Redirect } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useSupabaseFetch } from "@/hooks/useSupabaseFetch";
import { useDispatch } from "react-redux";
import { setUser } from "@/src/store/slices/authSlice";
import AsyncStorage from "@react-native-async-storage/async-storage";
import SplashScreen from "@/components/SplashScreen";

const Page = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);
  const [showSplash, setShowSplash] = useState(false);
  const { checkProfile } = useSupabaseFetch();
  const dispatch = useDispatch();

  // Function to initialize authentication
  const initializeAuth = async () => {
    if (!supabase) {
      console.error("Supabase client is not initialized");
      setIsLoading(false);
      return;
    }

    // First check existing session
    const {
      data: { session },
    } = await supabase.auth.getSession();
    await verifyAuthState(session);

    // Then subscribe to auth changes
    supabase.auth.onAuthStateChange(
      async (_event, session) => {
        await verifyAuthState(session);
      }
    );
  };

  const verifyAuthState = async (session: any) => {
    const signedIn = !!session;
    setIsSignedIn(signedIn);

    if (signedIn && session?.user?.email) {
      // Get user profile data and store in Redux and AsyncStorage
      try {
        if (!supabase) {
          console.error("Supabase client is not initialized");
          setIsLoading(false);
          return;
        }

        const { data: userProfile, error } = await supabase
          .from("profiles")
          .select("id, username, avatar_url")
          .eq("id", session.user.id)
          .single();

        console.log("User profile check:", {
          hasProfile: !!userProfile,
          username: userProfile?.username,
          id: session.user.id,
          email: session.user.email
        });

        if (!error && userProfile) {
          const userData = {
            id: userProfile.id,
            username: userProfile.username,
            avatar: userProfile.avatar_url,
          };
          await AsyncStorage.setItem("user", JSON.stringify(userData));
          dispatch(setUser(userData));
        }

        const profileExists = await checkProfile(session.user.email, session.user.id);
        console.log("Profile exists check:", profileExists);
        setHasProfile(profileExists);
      } catch (error) {
        console.error("Error fetching user profile:", error);
      }
    } else {
      setHasProfile(false);
    }
    setIsLoading(false);
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

  return hasProfile ? (
    <Redirect href="/(root)/(tabs)/home" />
  ) : (
    <Redirect href="/(root)/create-profile" />
  );
};

export default Page;
