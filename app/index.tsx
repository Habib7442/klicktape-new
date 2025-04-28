import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ActivityIndicator, View } from "react-native";

const Page = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);

  useEffect(() => {
    // Check session and auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      const signedIn = !!session;
      setIsSignedIn(signedIn);

      if (signedIn && session?.user?.email) {
        // Check if user has a profile with a non-null, non-empty username
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("username")
          .eq("email", session.user.email)
          .single();

        console.log("Profile check (onAuthStateChange):", {
          email: session.user.email,
          profile,
          error,
        });

        if (error && error.code !== "PGRST116") {
          console.error("Profile check error:", error);
          setHasProfile(false); // Default to no profile on error
        } else {
          // Check if username is non-null and non-empty
          setHasProfile(!!profile?.username && profile.username.trim() !== "");
        }
      } else {
        setHasProfile(false);
      }

      setIsLoading(false);
    });

    // Initial check
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const signedIn = !!session;
      setIsSignedIn(signedIn);

      if (signedIn && session?.user?.email) {
        // Check if user has a profile with a non-null, non-empty username
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("username")
          .eq("email", session.user.email)
          .single();

        console.log("Profile check (getSession):", {
          email: session.user.email,
          profile,
          error,
        });

        if (error && error.code !== "PGRST116") {
          console.error("Profile check error:", error);
          setHasProfile(false); // Default to no profile on error
        } else {
          // Check if username is non-null and non-empty
          setHasProfile(!!profile?.username && profile.username.trim() !== "");
        }
      } else {
        setHasProfile(false);
      }

      setIsLoading(false);
    });

    return () => subscription?.unsubscribe(); // Cleanup
  }, []);

  console.log("Redirect state:", { isSignedIn, hasProfile, isLoading });

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
    <Redirect href="/(root)/(tabs)/home" />
  ) : (
    <Redirect href="/create-profile" />
  );
};

export default Page;
