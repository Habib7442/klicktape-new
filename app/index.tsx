import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ActivityIndicator, View } from "react-native";

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

const Page = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);

  const checkProfile = async (
    email: string,
    retryCount = 0
  ): Promise<boolean> => {
    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("username")
        .eq("email", email)
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 = no rows found
        console.error("Profile check error:", error);
        return false;
      }

      // Check if username exists and is not empty
      const profileValid =
        !!profile?.username && profile.username.trim() !== "";
      return profileValid;
    } catch (error) {
      console.error("Error checking profile:", error);
      if (retryCount < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
        return checkProfile(email, retryCount + 1);
      }
      return false;
    }
  };

  const verifyAuthState = async (session: any) => {
    const signedIn = !!session;
    setIsSignedIn(signedIn);

    if (signedIn && session?.user?.email) {
      const profileExists = await checkProfile(session.user.email);
      setHasProfile(profileExists);
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
    return <Redirect href="/(auth)/welcome" />;
  }

  return hasProfile ? (
    <Redirect href="/welcome-main" />
  ) : (
    <Redirect href="/create-profile" />
  );
};

export default Page;
