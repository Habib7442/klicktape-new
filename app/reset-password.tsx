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

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const params = useLocalSearchParams();

  // Get the access token from the URL if it exists
  // This will be present if user is coming from a password reset email link
  const accessToken = params.access_token;

  useEffect(() => {
    // If there's an access token in the URL, set the session
    if (accessToken) {
      setSession(accessToken);
    }
    // Remove the else clause - we don't want to check session when coming from email link
  }, [accessToken]);

  const setSession = async (token: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.setSession({
        access_token: token,
        refresh_token: "", 
      });

      if (error) throw error;

      if (!data.session) {
        throw new Error("Session not established");
      }
    } catch (error) {
      console.error("Session error:", error);
      Alert.alert(
        "Error",
        "Invalid or expired reset link. Please request a new password reset.",
        [{ text: "OK", onPress: () => router.replace("/sign-in") }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  // We can remove the checkSession function entirely as it's no longer needed
  const checkSession = async () => {
    setIsLoading(true);
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) throw error;
      if (!session) {
        Alert.alert(
          "Password Reset",
          "To reset your password, please use the 'Forgot Password' option on the sign in screen.",
          [{ text: "OK", onPress: () => router.replace("/sign-in") }]
        );
      }
    } catch (error) {
      console.error("Session check error:", error);
      Alert.alert("Error", "Failed to verify session. Please try again.", [
        { text: "OK", onPress: () => router.replace("/sign-in") },
      ]);
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
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) throw error;

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
    } catch (error) {
      console.error("Reset password error:", error);
      Alert.alert(
        "Error",
        error.message || "Failed to reset password. Please try again."
      );
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
