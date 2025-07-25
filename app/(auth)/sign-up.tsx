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
import { e2eEncryption } from "@/lib/e2eEncryption";

const SignUp = () => {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const { colors } = useTheme();

  const onSubmit = async () => {
    // Validate name
    if (!name || name.trim().length === 0) {
      Alert.alert("Error", "Please enter your full name");
      return;
    }

    if (name.length > 100) {
      Alert.alert("Error", "Name is too long (maximum 100 characters)");
      return;
    }

    // Validate email with a more comprehensive regex
    if (!email || email.trim().length === 0) {
      Alert.alert("Error", "Please enter your email address");
      return;
    }

    // More comprehensive email validation
    const emailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    if (!emailRegex.test(email)) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }

    // Validate password
    if (!password) {
      Alert.alert("Error", "Please enter a password");
      return;
    }

    if (password.length < 8) {
      Alert.alert("Error", "Password must be at least 8 characters long");
      return;
    }

    // Check for password strength
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

    if (!(hasUpperCase && hasLowerCase && hasNumbers)) {
      Alert.alert(
        "Weak Password",
        "Your password should contain at least one uppercase letter, one lowercase letter, and one number"
      );
      return;
    }

    // Validate terms acceptance
    if (!acceptedTerms) {
      Alert.alert("Error", "Please accept the Terms and Conditions to continue");
      return;
    }

    // Recommend but don't require special characters
    if (!hasSpecialChar) {
      const continueWithWeakPassword = await new Promise((resolve) => {
        Alert.alert(
          "Password Recommendation",
          "For better security, consider adding special characters to your password. Do you want to continue anyway?",
          [
            { text: "Improve Password", onPress: () => resolve(false) },
            { text: "Continue", onPress: () => resolve(true) }
          ]
        );
      });

      if (!continueWithWeakPassword) {
        return;
      }
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
        console.log("✅ User created successfully:", data.user.id);

        // Note: Profile creation is now handled by database trigger
        // The user will be redirected to create-profile to complete their profile
        // after email verification and sign-in

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
              style={styles.input}
              placeholder="Enter your full name"
              placeholderTextColor={`${colors.textTertiary}80`}
              value={name}
              onChangeText={setName}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Email</Text>
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

          {/* Terms and Conditions Checkbox */}
          <View style={styles.termsContainer}>
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setAcceptedTerms(!acceptedTerms)}
            >
              <View style={[
                styles.checkbox,
                {
                  borderColor: colors.primary,
                  backgroundColor: acceptedTerms ? colors.primary : 'transparent'
                }
              ]}>
                {acceptedTerms && (
                  <Feather
                    name="check"
                    size={16}
                    color="#000000"
                  />
                )}
              </View>
            </TouchableOpacity>
            <View style={styles.termsTextContainer}>
              <Text style={[styles.termsText, { color: colors.textSecondary }]}>
                I agree to the{" "}
              </Text>
              <TouchableOpacity
                onPress={() => router.push("/(root)/terms-and-conditions")}
              >
                <Text style={[styles.termsLink, { color: colors.primary }]}>
                  Terms and Conditions
                </Text>
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
    borderColor: "rgba(255, 215, 0, 0.3)",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    color: "#ffffff",
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
  termsContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  checkboxContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  termsTextContainer: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
  },
  termsText: {
    fontSize: 14,
    lineHeight: 20,
  },
  termsLink: {
    fontSize: 14,
    lineHeight: 20,
    textDecorationLine: "underline",
  },
});

export default SignUp;