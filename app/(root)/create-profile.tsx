import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Image,
  Platform,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { supabase, generateAnonymousRoomName } from "@/lib/supabase";
import { router } from "expo-router";

import { useTheme } from "@/src/context/ThemeContext";
import ThemedGradient from "@/components/ThemedGradient";

type Gender = "male" | "female";

// Default avatar paths in storage
const defaultAvatars: Record<Gender, string> = {
  male: "defaults/male_avatar.jpg",
  female: "defaults/female_avatar.jpg",
};

const CreateProfile = () => {
  const { colors, isDarkMode } = useTheme();

  // Form state
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [gender, setGender] = useState<Gender | "">("");
  const [accountType, setAccountType] = useState<"personal" | "business">(
    "personal"
  );
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Validation state
  const [fullNameError, setFullNameError] = useState("");
  const [isFullNameValid, setIsFullNameValid] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const [isUsernameValid, setIsUsernameValid] = useState(false);

  useEffect(() => {
    // Set status bar style
    StatusBar.setBarStyle(isDarkMode ? "light-content" : "dark-content");
    if (Platform.OS === "android") {
      StatusBar.setBackgroundColor(colors.background, true);
    }
  }, [isDarkMode, colors.background]);

  // Full name validation
  useEffect(() => {
    validateFullName(fullName);
  }, [fullName]);

  // Username validation
  useEffect(() => {
    validateUsername(username);
  }, [username]);

  const validateFullName = (value: string) => {
    if (!value.trim()) {
      setFullNameError("");
      setIsFullNameValid(false);
      return;
    }

    if (value.trim().length < 2) {
      setFullNameError("Full name must be at least 2 characters");
      setIsFullNameValid(false);
      return;
    }

    if (value.trim().length > 50) {
      setFullNameError("Full name must be less than 50 characters");
      setIsFullNameValid(false);
      return;
    }

    // Allow letters, spaces, hyphens, and apostrophes
    if (!/^[a-zA-Z\s\-']+$/.test(value)) {
      setFullNameError("Full name can only contain letters, spaces, hyphens, and apostrophes");
      setIsFullNameValid(false);
      return;
    }

    setFullNameError("");
    setIsFullNameValid(true);
  };

  const validateUsername = async (value: string) => {
    if (!value.trim()) {
      setUsernameError("");
      setIsUsernameValid(false);
      return;
    }

    if (value.length < 3) {
      setUsernameError("Username must be at least 3 characters");
      setIsUsernameValid(false);
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(value)) {
      setUsernameError(
        "Username can only contain letters, numbers, and underscores"
      );
      setIsUsernameValid(false);
      return;
    }
      if (!supabase) {
      Alert.alert("Error", "Unable to connect to the service");
      return;
    }

    try {
      const { data } = await supabase
        .from("profiles")
        .select("username")
        .eq("username", value.trim())
        .single();

      if (data) {
        setUsernameError("Username is already taken");
        setIsUsernameValid(false);
      } else {
        setUsernameError("");
        setIsUsernameValid(true);
      }
    } catch (error) {
      // Username is available (no data found)
      setUsernameError("");
      setIsUsernameValid(true);
    }
  };

  const pickImage = async () => {
    try {
      setUploadingImage(true);

      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please grant camera roll permissions to upload a profile picture."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        const uploadedUrl = await uploadAvatar(imageUri);
        if (uploadedUrl) {
          setAvatarUrl(uploadedUrl);
        }
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image. Please try again.");
    } finally {
      setUploadingImage(false);
    }
  };

  const uploadAvatar = async (uri: string) => {
    if (!supabase) throw new Error("Database connection not available");

    // Get the current user ID for the folder path (required by RLS policy)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error("User not authenticated");
    }

    let normalizedUri =
      Platform.OS === "android" && !uri.startsWith("file://")
        ? `file://${uri}`
        : uri;
    const fileExt = uri.split(".").pop()?.toLowerCase() || "jpg";
    const fileName = `${Date.now()}.${fileExt}`;
    // Use user ID as folder name to comply with RLS policy
    const filePath = `${user.id}/${fileName}`;

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

  const handleUseDefaultAvatar = (selectedGender: Gender) => {
    try {
      const defaultUrl = getDefaultAvatarUrl(selectedGender);
      setAvatarUrl(defaultUrl);
      Alert.alert("Default Avatar Set", `Default ${selectedGender} avatar has been selected.`);
    } catch (error) {
      console.error("Error setting default avatar:", error);
      Alert.alert("Error", "Failed to set default avatar. You can upload a custom one instead.");
    }
  };

  const handleCreateProfile = async () => {
    if (!isFullNameValid || !fullName.trim()) {
      Alert.alert("Invalid Full Name", "Please enter a valid full name.");
      return;
    }

    if (!isUsernameValid || !username.trim()) {
      Alert.alert("Invalid Username", "Please enter a valid username.");
      return;
    }

    if (!gender) {
      Alert.alert("Gender Required", "Please select your gender.");
      return;
    }

    if (!supabase) {
      Alert.alert("Error", "Unable to connect to the service");
      return;
    }

    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not found");

      // Generate an anonymous room name
      const anonymousRoomName = generateAnonymousRoomName();

      const { error } = await supabase.from("profiles").upsert(
        {
          id: user.id,
          email: user.email,
          name: fullName.trim(),
          username: username.trim(),
          gender,
          avatar_url: avatarUrl,
          account_type: accountType,
          anonymous_room_name: anonymousRoomName,
          is_active: true, // Mark profile as complete
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

      if (error) throw error;

      console.log("✅ Profile completed successfully for user:", user.id);

      // Navigate to home
      router.replace("/(root)/(tabs)/home");
    } catch (error: any) {
      console.error("Error creating profile:", error);
      Alert.alert(
        "Error",
        error.message || "Failed to create profile. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.replace("/(auth)/welcome");
    } catch (error) {
      console.error("Error logging out:", error);
      Alert.alert("Error", "Failed to logout. Please try again.");
    }
  };

  const isFormValid = isFullNameValid && fullName.trim() && isUsernameValid && username.trim() && gender;

  // Removed unused handleSignOut function

  return (
    <ThemedGradient style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar
          barStyle={isDarkMode ? "light-content" : "dark-content"}
          backgroundColor={colors.background}
        />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text
              className="font-rubik-bold"
              style={[styles.headerTitle, { color: colors.text }]}
            >
              Complete Your Profile
            </Text>
            <Text
              className="font-rubik-regular"
              style={[styles.headerSubtitle, { color: colors.textSecondary }]}
            >
              Tell us a bit about yourself
            </Text>
          </View>

          {/* Logout Button */}
          <TouchableOpacity
            onPress={handleLogout}
            style={[
              styles.logoutButton,
              {
                backgroundColor: isDarkMode
                  ? "rgba(128, 128, 128, 0.1)"
                  : "rgba(128, 128, 128, 0.1)",
                borderColor: isDarkMode
                  ? "rgba(128, 128, 128, 0.3)"
                  : "rgba(128, 128, 128, 0.3)",
              },
            ]}
          >
            <Feather name="log-out" size={16} color={colors.text} />
            <Text
              className="font-rubik-bold"
              style={[styles.logoutButtonText, { color: colors.text }]}
            >
              Logout
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <TouchableOpacity
              style={[
                styles.avatarContainer,
                {
                  backgroundColor: colors.cardBackground,
                  borderColor: colors.cardBorder,
                },
              ]}
              onPress={pickImage}
              disabled={uploadingImage}
            >
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatar} />
              ) : (
                <View
                  style={[
                    styles.avatarPlaceholder,
                    { backgroundColor: colors.backgroundSecondary },
                  ]}
                >
                  <Feather
                    name="camera"
                    size={32}
                    color={colors.textTertiary}
                  />
                </View>
              )}

              {uploadingImage && (
                <View style={styles.uploadingOverlay}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              )}

              <View
                style={[styles.cameraIcon, { backgroundColor: colors.primary }]}
              >
                <Feather name="camera" size={16} color="white" />
              </View>
            </TouchableOpacity>

            <Text
              className="font-rubik-medium"
              style={[styles.avatarLabel, { color: colors.textSecondary }]}
            >
              Add Profile Picture
            </Text>
          </View>

          {/* Full Name Section */}
          <View style={styles.inputSection}>
            <Text
              className="font-rubik-semibold"
              style={[styles.inputLabel, { color: colors.text }]}
            >
              Full Name *
            </Text>
            <View style={[
              styles.inputContainer,
              {
                backgroundColor: colors.backgroundSecondary,
                borderColor: fullNameError ? colors.error :
                           isFullNameValid && fullName ? colors.success : colors.textTertiary,
              }
            ]}>
              <TextInput
                className="font-rubik-medium"
                style={[styles.textInput, { color: colors.text }]}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter your full name"
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="words"
                autoCorrect={false}
                maxLength={50}
              />
              {isFullNameValid && fullName && (
                <Feather name="check-circle" size={20} color={colors.success} />
              )}
            </View>
            {fullNameError ? (
              <Text
                className="font-rubik-medium"
                style={[styles.errorText, { color: colors.error }]}
              >
                {fullNameError}
              </Text>
            ) : null}
          </View>

          {/* Username Section */}
          <View style={styles.inputSection}>
            <Text
              className="font-rubik-semibold"
              style={[styles.inputLabel, { color: colors.text }]}
            >
              Username *
            </Text>
            <View
              style={[
                styles.inputContainer,
                {
                  backgroundColor: colors.cardBackground,
                  borderColor: usernameError
                    ? colors.error
                    : isUsernameValid && username
                    ? colors.success
                    : colors.cardBorder,
                },
              ]}
            >
              <TextInput
                className="font-rubik-medium"
                style={[styles.textInput, { color: colors.text }]}
                value={username}
                onChangeText={setUsername}
                placeholder="Enter your username"
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={30}
              />
              {isUsernameValid && username && (
                <Feather name="check-circle" size={20} color={colors.success} />
              )}
            </View>
            {usernameError ? (
              <Text
                className="font-rubik-medium"
                style={[styles.errorText, { color: colors.error }]}
              >
                {usernameError}
              </Text>
            ) : null}
          </View>
          {/* Gender Section */}
          <View style={styles.inputSection}>
            <Text
              className="font-rubik-semibold"
              style={[styles.inputLabel, { color: colors.text }]}
            >
              Gender *
            </Text>
            <View style={styles.genderContainer}>
              <TouchableOpacity
                style={[
                  styles.genderOption,
                  {
                    backgroundColor:
                      gender === "male"
                        ? colors.primary
                        : colors.cardBackground,
                    borderColor:
                      gender === "male" ? colors.primary : colors.cardBorder,
                  },
                ]}
                onPress={() => setGender("male")}
              >
                <MaterialCommunityIcons
                  name="gender-male"
                  size={24}
                  color={gender === "male" ? "white" : colors.textSecondary}
                />
                <Text
                  className="font-rubik-semibold"
                  style={[
                    styles.genderText,
                    { color: gender === "male" ? "white" : colors.text },
                  ]}
                >
                  Male
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.genderOption,
                  {
                    backgroundColor:
                      gender === "female"
                        ? colors.primary
                        : colors.cardBackground,
                    borderColor:
                      gender === "female" ? colors.primary : colors.cardBorder,
                  },
                ]}
                onPress={() => setGender("female")}
              >
                <MaterialCommunityIcons
                  name="gender-female"
                  size={24}
                  color={gender === "female" ? "white" : colors.textSecondary}
                />
                <Text
                  className="font-rubik-semibold"
                  style={[
                    styles.genderText,
                    { color: gender === "female" ? "white" : colors.text },
                  ]}
                >
                  Female
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          {/* Account Type Section */}
          <View style={styles.inputSection}>
            <Text
              className="font-rubik-semibold"
              style={[styles.inputLabel, { color: colors.text }]}
            >
              Account Type
            </Text>
            <View style={styles.accountTypeContainer}>
              <TouchableOpacity
                style={[
                  styles.accountTypeOption,
                  {
                    backgroundColor:
                      accountType === "personal"
                        ? colors.primary
                        : colors.cardBackground,
                    borderColor:
                      accountType === "personal"
                        ? colors.primary
                        : colors.cardBorder,
                  },
                ]}
                onPress={() => setAccountType("personal")}
              >
                <Feather
                  name="user"
                  size={20}
                  color={
                    accountType === "personal" ? "white" : colors.textSecondary
                  }
                />
                <Text
                  className="font-rubik-semibold"
                  style={[
                    styles.accountTypeText,
                    {
                      color: accountType === "personal" ? "white" : colors.text,
                    },
                  ]}
                >
                  Personal
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.accountTypeOption,
                  {
                    backgroundColor:
                      accountType === "business"
                        ? colors.primary
                        : colors.cardBackground,
                    borderColor:
                      accountType === "business"
                        ? colors.primary
                        : colors.cardBorder,
                  },
                ]}
                onPress={() => setAccountType("business")}
              >
                <Feather
                  name="briefcase"
                  size={20}
                  color={
                    accountType === "business" ? "white" : colors.textSecondary
                  }
                />
                <Text
                  className="font-rubik-semibold"
                  style={[
                    styles.accountTypeText,
                    {
                      color: accountType === "business" ? "white" : colors.text,
                    },
                  ]}
                >
                  Business
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        {/* Create Profile Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.createButton,
              {
                backgroundColor: isFormValid
                  ? colors.primary
                  : colors.backgroundSecondary,
                opacity: isFormValid ? 1 : 0.6,
              },
            ]}
            onPress={handleCreateProfile}
            disabled={!isFormValid || loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Text
                  className="font-rubik-bold"
                  style={styles.createButtonText}
                >
                  Complete Profile
                </Text>
                <Feather name="arrow-right" size={20} color="white" />
              </>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </ThemedGradient>
  );
};

export default CreateProfile;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 30,
    alignItems: "center",
  },
  headerContent: {
    alignItems: "center",
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    marginBottom: 8,
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: 16,
    textAlign: "center",
    opacity: 0.8,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  logoutButtonText: {
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  avatarSection: {
    alignItems: "center",
    marginBottom: 40,
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    marginBottom: 12,
  },
  avatar: {
    width: 114,
    height: 114,
    borderRadius: 57,
  },
  avatarPlaceholder: {
    width: 114,
    height: 114,
    borderRadius: 57,
    justifyContent: "center",
    alignItems: "center",
  },
  uploadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 57,
    justifyContent: "center",
    alignItems: "center",
  },
  cameraIcon: {
    position: "absolute",
    bottom: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarLabel: {
    fontSize: 14,
  },
  inputSection: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },
  genderContainer: {
    flexDirection: "row",
    gap: 12,
  },
  genderOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    gap: 8,
  },
  genderText: {
    fontSize: 16,
  },
  accountTypeContainer: {
    flexDirection: "row",
    gap: 12,
  },
  accountTypeOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    gap: 8,
  },
  accountTypeText: {
    fontSize: 16,
  },
  buttonContainer: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    paddingTop: 10,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  createButtonText: {
    color: "white",
    fontSize: 18,
  },
});
