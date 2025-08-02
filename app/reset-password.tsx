import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "@/lib/supabase";
import * as Linking from "expo-linking";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const params = useLocalSearchParams();

  // Get the access token from the URL if it exists
  // This will be present if user is coming from a password reset email link via Expo deep link
  const accessToken = Array.isArray(params.access_token) ? params.access_token[0] : params.access_token;
  const refreshToken = Array.isArray(params.refresh_token) ? params.refresh_token[0] : params.refresh_token;

  useEffect(() => {
    console.log('🔗 Reset password screen opened via deep link');
    console.log('📋 All params:', JSON.stringify(params, null, 2));
    console.log('🔑 Access token:', accessToken);
    console.log('🔑 Access token length:', accessToken?.length);
    console.log('🔄 Refresh token:', refreshToken);
    console.log('🔄 Refresh token length:', refreshToken?.length);

    // Try to get tokens from the initial URL if params are empty
    const checkInitialURL = async () => {
      try {
        const initialUrl = await Linking.getInitialURL();
        console.log('🔗 Initial URL:', initialUrl);

        // Also listen for URL changes (in case app is already open)
        const handleUrlChange = (url: string) => {
          console.log('🔗 URL changed:', url);
          processUrl(url);
        };

        const subscription = Linking.addEventListener('url', handleUrlChange);

        // Process the initial URL
        if (initialUrl) {
          processUrl(initialUrl);
        }

        // Cleanup subscription
        return () => subscription?.remove();
      } catch (error) {
        console.log('⚠️ Could not setup URL handling:', error.message);
      }
    };

    const processUrl = (urlString: string) => {
      try {
        if (!urlString || accessToken) return; // Skip if we already have a token

        const url = new URL(urlString);

        // Check for errors in the URL (like expired links)
        const error = url.searchParams.get('error') || url.hash.match(/error=([^&]+)/)?.[1];
        const errorCode = url.searchParams.get('error_code') || url.hash.match(/error_code=([^&]+)/)?.[1];
        const errorDescription = url.searchParams.get('error_description') || url.hash.match(/error_description=([^&]+)/)?.[1];

        if (error) {
          console.log('❌ Error in reset URL:', error);
          console.log('❌ Error code:', errorCode);
          console.log('❌ Error description:', decodeURIComponent(errorDescription || ''));

          let errorMessage = "This password reset link is invalid or expired.";
          if (errorCode === 'otp_expired') {
            errorMessage = "This password reset link has expired. Please request a new password reset.";
          }

          Alert.alert(
            "Reset Link Expired",
            errorMessage + " Please go back to the sign-in screen and request a new password reset.",
            [{ text: "OK", onPress: () => router.replace("/sign-in") }]
          );
          return;
        }

        // Check both query parameters and hash parameters
        let urlAccessToken = url.searchParams.get('access_token');
        let urlRefreshToken = url.searchParams.get('refresh_token');

        // If not in query params, check the hash
        if (!urlAccessToken && url.hash) {
          const hashParams = new URLSearchParams(url.hash.substring(1));
          urlAccessToken = hashParams.get('access_token');
          urlRefreshToken = hashParams.get('refresh_token');
          console.log('🔍 Found tokens in URL hash');
        }

        console.log('🔍 URL access token:', urlAccessToken?.substring(0, 20) + '...');
        console.log('🔍 URL refresh token:', urlRefreshToken?.substring(0, 20) + '...');

        if (urlAccessToken) {
          console.log('✅ Access token found in URL, setting session...');
          setSession(urlAccessToken, urlRefreshToken);
          return;
        }
      } catch (error) {
        console.log('⚠️ Could not parse URL:', error.message);
      }
    };

    // Start the URL checking process
    const cleanup = checkInitialURL();

    // If there's an access token in params, set the session
    if (accessToken && accessToken.length > 0) {
      console.log('✅ Access token found in params, setting session...');
      setSession(accessToken, refreshToken);
    } else if (!accessToken) {
      // Only show error if we don't have tokens and no URL processing is happening
      setTimeout(() => {
        if (!accessToken) {
          console.log('❌ No access token found after URL processing, redirecting to sign-in...');
          console.log('❌ Params received:', Object.keys(params));
          Alert.alert(
            "Invalid Reset Link",
            "This password reset link is invalid or expired. Please request a new password reset from the sign-in screen.",
            [{ text: "OK", onPress: () => router.replace("/sign-in") }]
          );
        }
      }, 2000); // Wait 2 seconds for URL processing
    }

    // Cleanup function
    return () => {
      if (cleanup && typeof cleanup === 'function') {
        cleanup();
      }
    };
  }, [accessToken, refreshToken]);

  const setSession = async (token: string, refresh_token?: string) => {
    setIsLoading(true);
    try {
      if (!supabase) {
        throw new Error("Supabase client not available");
      }

      console.log('🔄 Setting session with tokens...');
      console.log('🔑 Token length:', token?.length);
      console.log('🔄 Refresh token length:', refresh_token?.length);
      console.log('🔑 Token preview:', token?.substring(0, 50) + '...');

      const { data, error } = await supabase.auth.setSession({
        access_token: token,
        refresh_token: refresh_token || "",
      });

      if (error) {
        console.error('❌ Session error:', error);
        throw error;
      }

      if (!data.session) {
        console.error('❌ No session data returned');
        throw new Error("Session not established");
      }

      console.log('✅ Session established successfully for password reset');
      console.log('👤 User ID:', data.session.user?.id);

      // Session is now ready for password update
    } catch (error) {
      console.error("❌ Failed to establish session:", error);
      Alert.alert(
        "Invalid Reset Link",
        "This password reset link is invalid or expired. Please request a new password reset from the sign-in screen.",
        [{ text: "OK", onPress: () => router.replace("/sign-in") }]
      );
    } finally {
      setIsLoading(false);
    }
  };



  const onSubmit = async () => {
    if (!password || !confirmPassword) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters long");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    setIsLoading(true);
    try {
      if (!supabase) {
        throw new Error("Supabase client not available");
      }

      // Check if we have a valid session before attempting password update
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('❌ Session check error:', sessionError);
        throw new Error("Session expired. Please request a new password reset.");
      }

      if (!session) {
        console.error('❌ No active session found');
        throw new Error("Session expired. Please request a new password reset.");
      }

      console.log('🔄 Updating password for user:', session.user.id);
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        console.error('❌ Password update error:', error);
        throw error;
      }

      console.log('✅ Password updated successfully');

      // Sign out the user after successful password reset
      await supabase.auth.signOut();

      Alert.alert(
        "Success",
        "Password reset successfully! Please sign in with your new password.",
        [
          {
            text: "OK",
            onPress: () => router.replace("/sign-in"),
          },
        ]
      );
    } catch (error: any) {
      console.error("❌ Reset password error:", error);

      // Handle specific error cases
      if (error?.message?.includes("session") || error?.message?.includes("expired")) {
        Alert.alert(
          "Session Expired",
          "Your password reset session has expired. Please request a new password reset from the sign-in screen.",
          [{ text: "OK", onPress: () => router.replace("/sign-in") }]
        );
      } else {
        Alert.alert(
          "Error",
          error?.message || "Failed to reset password. Please try again."
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={["#000000", "#1a1a1a", "#2a2a2a"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View style={styles.overlay}>
        <View style={styles.formContainer}>
          <Text className="font-rubik-bold" style={styles.title}>
            Reset Password
          </Text>

          <View style={styles.inputGroup}>
            <Text className="font-rubik-medium" style={styles.label}>
              New Password
            </Text>
            <TextInput
              className="font-rubik-medium"
              style={styles.input}
              placeholder="Enter your new password"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text className="font-rubik-medium" style={styles.label}>
              Confirm Password
            </Text>
            <TextInput
              className="font-rubik-medium"
              style={styles.input}
              placeholder="Confirm your new password"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={onSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="font-rubik-medium" style={styles.buttonText}>
                Reset Password
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  formContainer: {
    width: "90%",
    maxWidth: 400,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    padding: 24,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: 40,
    color: "#FFD700",
    textAlign: "center",
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: "#ffffff",
    marginBottom: 6,
  },
  input: {
    width: "100%",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.3)",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    color: "#ffffff",
    fontSize: 16,
  },
  button: {
    width: "100%",
    padding: 16,
    borderRadius: 12,
    backgroundColor: "rgba(255, 215, 0, 0.2)",
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.3)",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    fontSize: 16,
    color: "#ffffff",
  },
});

export default ResetPassword;
