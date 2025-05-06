import React, { useState, useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { Redirect } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useSupabaseFetch } from "@/hooks/useSupabaseFetch";
import { useDispatch } from "react-redux";
import { setUser } from "@/src/store/slices/authSlice";
import AsyncStorage from "@react-native-async-storage/async-storage";

const Page = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);
  const { checkProfile } = useSupabaseFetch();
  const dispatch = useDispatch();

  const verifyAuthState = async (session: any) => {
    const signedIn = !!session;
    setIsSignedIn(signedIn);

    if (signedIn && session?.user?.email) {
      // Get user profile data and store in Redux and AsyncStorage
      try {
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
    let isMounted = true;
    let authSubscription: any;

    const initializeAuth = async () => {
      // First check existing session
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (isMounted) await verifyAuthState(session);

      // Then subscribe to auth changes
      authSubscription = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (isMounted) await verifyAuthState(session);
        }
      ).data.subscription;
    };

    initializeAuth();

    return () => {
      isMounted = false;
      authSubscription?.unsubscribe();
    };
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!isSignedIn) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return hasProfile ? (
    <Redirect href="/(root)/(tabs)/home" />
  ) : (
    <Redirect href="/(root)/create-profile" />
  );
};

export default Page;
