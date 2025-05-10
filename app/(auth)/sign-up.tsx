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
import { Feather } from "@expo/vector-icons";
import ThemedGradient from "@/components/ThemedGradient";
import { useTheme } from "@/src/context/ThemeContext";

const SignUp = () => {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { colors } = useTheme();

  const onSubmit = async () => {
    // Validate input fields
    if (
      !email ||
      !password ||
      !name ||
      password.length < 6 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      Alert.alert(
        "Error",
        "Please fill in all fields with a valid email and password (min 6 characters)"
      );
      return;
    }

    setIsLoading(true);

    try {
      if (!supabase) {
        throw new Error("Supabase client is not initialized");
      }

      // First, check if the email already exists in the profiles table
      console.log("Checking if email exists in profiles table:", email);
      const { data: existingProfiles, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (profileError) {
        console.error("Error checking profiles table:", profileError);
        // Continue with signup even if there's an error checking profiles
      } else if (existingProfiles) {
        console.log("Email already exists in profiles table:", email);
        Alert.alert(
          "Email Already Registered",
          "This email address is already registered. Please use a different email or sign in."
        );
        setIsLoading(false);
        return;
      }

      // If we get here, the email doesn't exist in profiles table
      // Attempt to sign up
      console.log("Email check passed, attempting to sign up with email:", email);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: "klicktape://verify-email",
          data: {
            full_name: name,
            name: name,
          },
        },
      });

      if (error) {
        console.log("Signup error:", error.message);

        // Check if the error indicates the email is already registered
        if (
          error.message.includes("already registered") ||
          error.message.includes("already in use") ||
          error.message.includes("already exists") ||
          error.message.includes("User already exists") ||
          error.message.includes("email address is already taken")
        ) {
          console.log("Email already exists (from signup error):", email);
          Alert.alert(
            "Email Already Registered",
            "This email address is already registered. Please use a different email or sign in."
          );
        } else {
          // Handle other errors
          Alert.alert("Error", error.message || "Failed to create account. Please try again.");
        }
        setIsLoading(false);
        return;
      }

      if (data.user) {
        // Create a profile record with the user's name
        try {
          await supabase.from("profiles").insert({
            id: data.user.id,
            username: email.split("@")[0], // Default username from email
            full_name: name,
            email: email, // Store the email in the profiles table
            avatar_url: null,
            is_active: false,
            created_at: new Date().toISOString(),
          });
        } catch (profileError) {
          console.error("Error creating profile:", profileError);
          // Continue even if profile creation fails
        }

        Alert.alert(
          "Success",
          "Account created! Check your email for verification.",
          [{ text: "OK", onPress: () => router.replace("/sign-in") }]
        );
      } else {
        throw new Error("No user data returned after signup");
      }
    } catch (error: any) {
      console.error("Signup error:", error);
      Alert.alert("Error", error.message || "An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ThemedGradient style={styles.container}>
      <View style={[styles.overlay, { backgroundColor: `${colors.background}80` }]}>
        <View style={[styles.card, { backgroundColor: `${colors.backgroundSecondary}90` }]}>
          <Text style={[styles.title, { color: colors.primary }]}>Create Account</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Please sign up to continue</Text>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Full Name</Text>
            <TextInput
              style={[styles.input, {
                color: colors.text,
                borderColor: `${colors.primary}30`,
                backgroundColor: `${colors.backgroundTertiary}80`
              }]}
              placeholder="Enter your full name"
              placeholderTextColor={`${colors.textTertiary}80`}
              value={name}
              onChangeText={setName}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Email</Text>
            <TextInput
              style={[styles.input, {
                color: colors.text,
                borderColor: `${colors.primary}30`,
                backgroundColor: `${colors.backgroundTertiary}80`
              }]}
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
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={onSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>Sign Up</Text>
            )}
          </TouchableOpacity>
          <View style={styles.signInContainer}>
            <Text style={[styles.signInText, { color: colors.textSecondary }]}>Already have an account?</Text>
            <Link href="/sign-in" style={styles.signInLink}>
              <Text style={[styles.linkText, { color: colors.primary }]}>Sign In</Text>
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
  signInContainer: {
    flexDirection: "row",
    justifyContent: "center"
  },
  signInText: {
    fontSize: 14
  },
  signInLink: {
    marginLeft: 4
  },
  linkText: {
    fontSize: 14
  },
});

export default SignUp;