import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, StyleSheet } from "react-native";
import { Link, router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "@/lib/supabase";

const SignUp = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async () => {
    if (!email || !password || password.length < 6 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Alert.alert("Error", "Please fill in all fields with a valid email and password (min 6 characters)");
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: "klicktape://verify-email" } });
      if (error) throw error;
      if (data.user) {
        Alert.alert("Success", "Account created! Check your email for verification.", [{ text: "OK", onPress: () => router.replace("/sign-in") }]);
      } else {
        throw new Error("No user data returned after signup");
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to create account. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LinearGradient colors={["#000000", "#1a1a1a", "#2a2a2a"]} style={styles.container}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Please sign up to continue</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput style={styles.input} placeholder="Enter your full name" placeholderTextColor="rgba(255, 255, 255, 0.5)" value={email} onChangeText={setEmail} />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput style={styles.input} placeholder="Enter your email" placeholderTextColor="rgba(255, 255, 255, 0.5)" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput style={styles.input} placeholder="Enter your password" placeholderTextColor="rgba(255, 255, 255, 0.5)" secureTextEntry value={password} onChangeText={setPassword} />
          </View>
          <TouchableOpacity style={[styles.button, isLoading && styles.buttonDisabled]} onPress={onSubmit} disabled={isLoading}>
            {isLoading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.buttonText}>Sign Up</Text>}
          </TouchableOpacity>
          <View style={styles.signInContainer}>
            <Text style={styles.signInText}>Already have an account?</Text>
            <Link href="/sign-in" style={styles.signInLink}>
              <Text style={styles.linkText}>Sign In</Text>
            </Link>
          </View>
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  overlay: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0, 0, 0, 0.5)" },
  card: {
    width: "90%",
    maxWidth: 400,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
  },
  title: { fontSize: 32, color: "#FFD700", fontWeight: "bold", marginBottom: 8 },
  subtitle: { fontSize: 14, color: "rgba(255, 255, 255, 0.7)", marginBottom: 20 },
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
  button: {
    width: "100",
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#FFD700",
    alignItems: "center",
    marginBottom: 16,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { fontSize: 16, color: "#000000", fontWeight: "bold" },
  signInContainer: { flexDirection: "row", justifyContent: "center" },
  signInText: { fontSize: 14, color: "rgba(255, 255, 255, 0.7)" },
  signInLink: { marginLeft: 4 },
  linkText: { fontSize: 14, color: "#FFD700" },
});

export default SignUp;