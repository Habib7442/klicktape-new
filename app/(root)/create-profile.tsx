import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Image,
  TextInput,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { supabase, generateUsername, generateAnonymousRoomName } from "@/lib/supabase";
import { router } from "expo-router";

// Define types
type Gender = "male" | "female" | "other";
type AccountType = "personal" | "creator" | "business";

// Default avatars for each gender
const defaultAvatars = {
  male: "default/male_avatar.jpg",
  female: "default/female_avatar.jpg",
  other: "default/neutral_avatar.jpg",
};

const CreateProfile = () => {
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [accountType, setAccountType] = useState("personal");
  const [username, setUsername] = useState("");
  const [gender, setGender] = useState<Gender | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");

  useEffect(() => {
    const fetchUser = async () => {
      if (!supabase) return;

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.email) {
        setEmail(user.email);
        const { data: profile } = await supabase
          .from("profiles")
          .select("username, gender, avatar_url, account_type, anonymous_room_name")
          .eq("email", user.email)
          .single();
        if (profile) {
          setUsername(profile.username || generateUsername());
          setGender(profile.gender as Gender || null);
          setAvatarUri(profile.avatar_url || null);
          setAccountType(profile.account_type as AccountType || "personal");
          // No need to set anonymous_room_name to state since we don't display it
        } else {
          setUsername(generateUsername());
          // anonymous_room_name will be generated when saving the profile
        }
      }
    };
    fetchUser();
  }, []);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Denied",
        "Please allow access to your photo library."
      );
      return;
    }
    let result = await ImagePicker.launchImageLibraryAsync({
      // Using string value instead of deprecated enum
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) setAvatarUri(result.assets[0].uri);
  };

  const uploadAvatar = async (uri: string) => {
    if (!supabase) throw new Error("Database connection not available");

    let normalizedUri =
      Platform.OS === "android" && !uri.startsWith("file://")
        ? `file://${uri}`
        : uri;
    const fileExt = uri.split(".").pop()?.toLowerCase() || "jpg";
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `user_avatars/${fileName}`;
    const formData = new FormData();
    formData.append("file", {
      uri: normalizedUri,
      name: fileName,
      type: `image/${fileExt === "jpg" ? "jpeg" : fileExt}`,
    } as any);
    const { error } = await supabase.storage
      .from("avatars")
      .upload(filePath, formData, {
        contentType: `image/${fileExt === "jpg" ? "jpeg" : fileExt}`,
        upsert: true,
      });
    if (error) throw new Error(`Upload failed: ${error.message}`);
    return filePath;
  };

  const getDefaultAvatarUrl = (selectedGender: Gender) => {
    if (!supabase) throw new Error("Database connection not available");

    return supabase.storage
      .from("avatars")
      .getPublicUrl(defaultAvatars[selectedGender]).data.publicUrl;
  };

  const handleSubmit = async () => {
    if (!email || !username.trim() || !gender) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }
    if (!supabase) {
      Alert.alert("Error", "Database connection not available");
      return;
    }

    setIsLoading(true);
    try {
      const { data: existingProfiles } = await supabase
        .from("profiles")
        .select("username")
        .eq("username", username)
        .neq("email", email);
      if (existingProfiles?.length)
        throw new Error("Username is already taken");

      let avatarUrl = avatarUri
        ? supabase.storage
            .from("avatars")
            .getPublicUrl(await uploadAvatar(avatarUri)).data.publicUrl
        : getDefaultAvatarUrl(gender);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not found");

      // Generate an anonymous room name
      const anonymousRoomName = generateAnonymousRoomName();

      const { error } = await supabase
        .from("profiles")
        .upsert(
          {
            id: user.id,
            email: user.email,
            username: username.trim(),
            gender,
            avatar_url: avatarUrl,
            account_type: accountType,
            anonymous_room_name: anonymousRoomName,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        );
      if (error) throw error;
      router.replace("/(root)/(tabs)/home");
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Removed unused handleSignOut function

  return (
    <LinearGradient
      colors={["#000000", "#1a1a1a", "#2a2a2a"]}
      style={styles.container}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Complete Your Profile</Text>
          <Text style={styles.subtitle}>Welcome to Klicktape</Text>

          {/* Sign Out Button at the top */}
          {/* <TouchableOpacity
            style={styles.signOutButton}
            onPress={handleSignOut}
            disabled={isLoading}
          >
            <Text style={styles.signOutButtonText}>Sign Out</Text>
          </TouchableOpacity> */}

          <View style={styles.avatarContainer}>
            <TouchableOpacity onPress={pickImage}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>+</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, styles.disabledInput]}
              value={email}
              editable={false}
              selectTextOnFocus={false}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your username"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              value={username}
              onChangeText={setUsername}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Gender</Text>
            <View style={styles.genderContainer}>
              {(["male", "female", "other"] as Gender[]).map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[
                    styles.genderButton,
                    gender === g && styles.genderButtonSelected,
                  ]}
                  onPress={() => setGender(g)}
                >
                  <Text
                    style={[
                      styles.genderText,
                      gender === g && styles.genderTextSelected,
                    ]}
                  >
                    {g.charAt(0).toUpperCase() + g.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Account Type</Text>
            <View style={styles.accountTypeContainer}>
              {(["personal", "creator", "business"] as AccountType[]).map(
                (type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.accountTypeButton,
                      accountType === type && styles.accountTypeButtonSelected,
                    ]}
                    onPress={() => setAccountType(type)}
                  >
                    <Text
                      style={[
                        styles.accountTypeText,
                        accountType === type && styles.accountTypeTextSelected,
                      ]}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </TouchableOpacity>
                )
              )}
            </View>
          </View>
          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>Complete Profile</Text>
            )}
          </TouchableOpacity>
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
  avatarContainer: { alignItems: "center", marginBottom: 24 },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: "#FFD700",
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFD700",
  },
  avatarText: { fontSize: 30, color: "#FFD700" },
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
  disabledInput: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    color: "rgba(255, 255, 255, 0.7)",
  },
  genderContainer: { flexDirection: "row", justifyContent: "space-between" },
  genderButton: {
    flex: 1,
    padding: 12,
    marginHorizontal: 4,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.2)",
    alignItems: "center",
  },
  genderButtonSelected: {
    backgroundColor: "rgba(255, 215, 0, 0.2)",
    borderColor: "rgba(255, 215, 0, 0.3)",
  },
  genderText: { fontSize: 14, color: "rgba(255, 255, 255, 0.7)" },
  genderTextSelected: { color: "#ffffff" },
  accountTypeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  accountTypeButton: {
    flex: 1,
    padding: 12,
    marginHorizontal: 4,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.2)",
    alignItems: "center",
  },
  accountTypeButtonSelected: {
    backgroundColor: "rgba(255, 215, 0, 0.2)",
    borderColor: "rgba(255, 215, 0, 0.3)",
  },
  accountTypeText: { fontSize: 14, color: "rgba(255, 255, 255, 0.7)" },
  accountTypeTextSelected: { color: "#ffffff" },
  button: {
    width: "100%",
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#FFD700",
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { fontSize: 16, color: "#000000", fontWeight: "bold" },
  signOutButton: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(255, 0, 0, 0.7)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  signOutButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "bold",
  },
});

export default CreateProfile;
