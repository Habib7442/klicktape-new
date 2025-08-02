import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from "react-native";
import { Link, router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useDispatch } from "react-redux";
import { setUser } from "@/src/store/slices/authSlice";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import ThemedGradient from "@/components/ThemedGradient";
import { useTheme } from "@/src/context/ThemeContext";
import { getAuthRedirectPath, getUserProfileData } from "@/lib/profileUtils";

const SignIn = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isForgotPasswordLoading, setIsForgotPasswordLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const dispatch = useDispatch();
  const { colors } = useTheme();

  const onSubmit = async () => {
    // Validate email
    if (!email || email.trim().length === 0) {
      Alert.alert("Error", "Please enter your email address");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }

    // Validate password
    if (!password || password.trim().length === 0) {
      Alert.alert("Error", "Please enter your password");
      return;
    }

    // Check for Supabase client
    if (!supabase) {
      Alert.alert("Error", "Unable to connect to the service");
      return;
    }

    // Sanitize inputs
    const sanitizedEmail = email.trim().toLowerCase();

    setIsLoading(true);
    try {
      // Add rate limiting check
      const rateLimitKey = `signin_attempts_${sanitizedEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const storedAttempts = await AsyncStorage.getItem(rateLimitKey);
      const attempts = storedAttempts ? JSON.parse(storedAttempts) : { count: 0, timestamp: 0 };

      const now = Date.now();
      const oneHour = 60 * 60 * 1000;

      // Reset attempts if more than an hour has passed
      if (now - attempts.timestamp > oneHour) {
        attempts.count = 0;
        attempts.timestamp = now;
      }

      // Check if too many attempts
      if (attempts.count >= 5) {
        const timeLeft = Math.ceil((attempts.timestamp + oneHour - now) / 60000);
        Alert.alert(
          "Too Many Attempts",
          `You've made too many login attempts. Please try again in ${timeLeft} minutes.`
        );
        setIsLoading(false);
        return;
      }

      // Increment attempt counter
      attempts.count += 1;
      attempts.timestamp = now;
      await AsyncStorage.setItem(rateLimitKey, JSON.stringify(attempts));

      // Attempt to sign in
      const { data, error } = await supabase.auth.signInWithPassword({
        email: sanitizedEmail,
        password,
      });
      if (error) throw error;
      if (data.user && data.session) {
        console.log("🔐 Sign-in successful for user:", data.user.id);

        // Get user profile data for Redux store
        const profileData = await getUserProfileData(data.user.id);

        if (profileData) {
          await AsyncStorage.setItem("user", JSON.stringify(profileData));
          dispatch(setUser({
            id: profileData.id,
            username: profileData.username || '',
          }));
          console.log("✅ User data stored in Redux and AsyncStorage");
        }

        // Determine where to redirect the user based on profile completion
        const redirectPath = await getAuthRedirectPath(data.user.id, data.user.email);

        console.log("🧭 Redirecting to:", redirectPath);
        router.replace(redirectPath as any);
      } else {
        Alert.alert("Error", "Failed to sign in. Please try again.");
      }
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.message || "Failed to sign in. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    // Validate email
    if (!email || email.trim().length === 0) {
      Alert.alert("Error", "Please enter your email address");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }

    // Check for Supabase client
    if (!supabase) {
      Alert.alert("Error", "Unable to connect to the service");
      return;
    }

    // Sanitize input
    const sanitizedEmail = email.trim().toLowerCase();

    // Add rate limiting for password reset
    const rateLimitKey = `pwd_reset_${sanitizedEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const storedAttempts = await AsyncStorage.getItem(rateLimitKey);
    const attempts = storedAttempts ? JSON.parse(storedAttempts) : { count: 0, timestamp: 0 };

    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    // Reset attempts if more than a day has passed
    if (now - attempts.timestamp > oneDay) {
      attempts.count = 0;
      attempts.timestamp = now;
    }

    // Check if too many attempts (limit to 3 per day)
    if (attempts.count >= 3) {
      const timeLeft = Math.ceil((attempts.timestamp + oneDay - now) / (60 * 60 * 1000));
      Alert.alert(
        "Too Many Requests",
        `You've made too many password reset requests. Please try again in ${timeLeft} hours.`
      );
      return;
    }

    setIsForgotPasswordLoading(true);
    try {
      // Increment attempt counter
      attempts.count += 1;
      attempts.timestamp = now;
      await AsyncStorage.setItem(rateLimitKey, JSON.stringify(attempts));

      // Clear any existing session to ensure clean state for password reset
      await supabase.auth.signOut();

      // Use direct deep link to open app immediately (no web redirect needed)
      const redirectUrl = 'klicktape://reset-password';

      console.log('🔄 Sending password reset email to:', sanitizedEmail);
      const { error } = await supabase.auth.resetPasswordForEmail(sanitizedEmail, {
        redirectTo: redirectUrl,
      });

      if (error) {
        console.error('❌ Password reset error:', error);
        throw error;
      }

      console.log('✅ Password reset email sent successfully');
      Alert.alert(
        "Success",
        "Password reset instructions sent to your email. Please check your inbox and follow the link to reset your password."
      );
    } catch (error) {
      console.error('❌ Forgot password error:', error);
      Alert.alert(
        "Error",
        (error as Error)?.message || "Failed to process request. Please try again."
      );
    } finally {
      setIsForgotPasswordLoading(false);
    }
  };

  return (
    <ThemedGradient style={styles.container}>
      <View style={[styles.overlay, { backgroundColor: `${colors.background}80` }]}>
        <View style={[styles.card, { backgroundColor: `${colors.backgroundSecondary}90` }]}>
          <Text style={[styles.title, { color: colors.primary }]}>Welcome Back</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Please sign in to continue</Text>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Email or Mobile Number</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              placeholderTextColor={`${colors.textTertiary}80`}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Password</Text>
            <View style={[styles.passwordContainer, {
                borderColor: `${colors.primary}30`,
                backgroundColor: `${colors.backgroundTertiary}80`
              }]}>
              <TextInput
                style={[styles.passwordInput, { color: colors.text }]}
                placeholder="Enter your password"
                placeholderTextColor={`${colors.textTertiary}80`}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Feather
                  name={showPassword ? "eye" : "eye-off"}
                  size={20}
                  color={colors.primary}
                />
              </TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.forgotLink, isForgotPasswordLoading && styles.forgotLinkDisabled]}
            onPress={handleForgotPassword}
            disabled={isForgotPasswordLoading}
          >
            {isForgotPasswordLoading ? (
              <View style={styles.forgotLinkContent}>
                <ActivityIndicator size="small" color={colors.primary} style={styles.forgotLinkSpinner} />
                <Text style={[styles.linkText, { color: colors.primary, opacity: 0.7 }]}>Sending...</Text>
              </View>
            ) : (
              <Text style={[styles.linkText, { color: colors.primary }]}>Forgot Password?</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, (isLoading || isForgotPasswordLoading) && styles.buttonDisabled]}
            onPress={onSubmit}
            disabled={isLoading || isForgotPasswordLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>Login</Text>
            )}
          </TouchableOpacity>
          <View style={styles.signUpContainer}>
            <Text style={[styles.signUpText, { color: colors.textSecondary }]}>Don't have an account?</Text>
            <Link href="/sign-up" style={styles.signUpLink}>
              <Text style={[styles.linkText, { color: colors.primary }]}>Sign Up</Text>
            </Link>
          </View>
        </View>
      </View>
    </ThemedGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    width: "90%",
    maxWidth: 400,
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 20,
  },
  inputGroup: {
    width: "100%",
    marginBottom: 16
  },
  label: {
    fontSize: 14,
    marginBottom: 6
  },
  input: {
    width: "100%",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 16,
    borderColor: "rgba(255, 215, 0, 0.3)",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    color: "#ffffff",
  },
  forgotLink: {
    alignSelf: "flex-end",
    marginBottom: 16
  },
  forgotLinkDisabled: {
    opacity: 0.7
  },
  forgotLinkContent: {
    flexDirection: "row",
    alignItems: "center"
  },
  forgotLinkSpinner: {
    marginRight: 6
  },
  linkText: {
    fontSize: 14
  },
  button: {
    width: "100%",
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#FFD700",
    alignItems: "center",
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.7
  },
  buttonText: {
    fontSize: 16,
    color: "#000000",
    fontWeight: "bold"
  },
  signUpContainer: {
    flexDirection: "row",
    justifyContent: "center"
  },
  signUpText: {
    fontSize: 14
  },
  signUpLink: {
    marginLeft: 4
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
  },
  eyeButton: {
    padding: 12,
  },
});

export default SignIn;
