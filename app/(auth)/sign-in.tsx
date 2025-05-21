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
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "@/lib/supabase";
import { useDispatch } from "react-redux";
import { setUser } from "@/src/store/slices/authSlice";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";

const SignIn = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const dispatch = useDispatch();

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
        const { data: userProfile, error: profileError } = await supabase
          .from("profiles")
          .select("id, username, avatar_url")
          .eq("id", data.user.id)
          .single();

        if (profileError && profileError.code !== "PGRST116") {
          // Error other than "no rows found"
          throw new Error("Failed to fetch user profile");
        }

        if (!userProfile || !userProfile.username) {
          // No profile or empty username - redirect to create profile
          router.replace("/(root)/create-profile");
          return;
        }

        // User has a profile - proceed normally
        const userData = {
          id: userProfile.id,
          username: userProfile.username,
          avatar: userProfile.avatar_url,
        };
        await AsyncStorage.setItem("user", JSON.stringify(userData));
        dispatch(setUser(userData));
        router.replace("/(root)/(tabs)/home");
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

    setIsLoading(true);
    try {
      // Increment attempt counter
      attempts.count += 1;
      attempts.timestamp = now;
      await AsyncStorage.setItem(rateLimitKey, JSON.stringify(attempts));

      // Use a secure, validated redirect URL
      const redirectUrl = 'https://klicktape.com/reset-password.html';

      const { error } = await supabase.auth.resetPasswordForEmail(sanitizedEmail, {
        redirectTo: redirectUrl,
      });

      if (error) throw error;

      Alert.alert(
        "Success",
        "Password reset instructions sent to your email. Please check your inbox and follow the link to reset your password."
      );
    } catch (error) {
      Alert.alert(
        "Error",
        error.message || "Failed to process request. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={["#000000", "#1a1a1a", "#2a2a2a"]}
      style={styles.container}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Please sign in to continue</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email or Mobile Number</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Enter your password"
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
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
                  color="rgba(255, 215, 0, 0.7)"
                />
              </TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity
            style={styles.forgotLink}
            onPress={handleForgotPassword}
          >
            <Text style={styles.linkText}>Forgot Password?</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={onSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>Login</Text>
            )}
          </TouchableOpacity>
          <View style={styles.signUpContainer}>
            <Text style={styles.signUpText}>Don't have an account?</Text>
            <Link href="/sign-up" style={styles.signUpLink}>
              <Text style={styles.linkText}>Sign Up</Text>
            </Link>
          </View>
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  card: {
    width: "90%",
    maxWidth: 400,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
  },
  title: {
    fontSize: 32,
    color: "#FFD700",
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.7)",
    marginBottom: 20,
  },
  inputGroup: { width: "100%", marginBottom: 16 },
  label: { fontSize: 14, color: "#ffffff", marginBottom: 6 },
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
  forgotLink: { alignSelf: "flex-end", marginBottom: 16 },
  linkText: { fontSize: 14, color: "#FFD700" },
  button: {
    width: "100%",
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#FFD700",
    alignItems: "center",
    marginBottom: 16,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { fontSize: 16, color: "#000000", fontWeight: "bold" },
  signUpContainer: { flexDirection: "row", justifyContent: "center" },
  signUpText: { fontSize: 14, color: "rgba(255, 255, 255, 0.7)" },
  signUpLink: { marginLeft: 4 },
  passwordContainer: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.3)",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    color: "#ffffff",
    fontSize: 16,
  },
  eyeButton: {
    padding: 12,
  },
});

export default SignIn;
