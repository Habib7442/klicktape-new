import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Picker } from "@react-native-picker/picker";
import { supabase } from "@/lib/supabase";
import * as FileSystem from "expo-file-system";
import * as Network from "expo-network";
import ThemedGradient from "@/components/ThemedGradient";
import { useTheme } from "@/src/context/ThemeContext";

const EditProfile = () => {
  const { colors, isDarkMode } = useTheme();
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState("");
  const [newAvatar, setNewAvatar] = useState(""); // Track newly selected avatar
  const [gender, setGender] = useState("");
  const [accountType, setAccountType] = useState("personal");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false); // Track image upload state
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();

  // Fetch the current user's ID from Supabase Auth
  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
          throw new Error("User not authenticated");
        }
        setUserId(user.id);
      } catch (error) {
        console.error("Error getting user:", error);
        Alert.alert("Error", "You must be logged in to edit your profile.");
        router.replace("/sign-in");
      }
    };
    getUser();
  }, []);

  const getUserProfile = async (userId: string) => {
    try {
      const { data: user, error } = await supabase
        .from("profiles")
        .select("username, avatar_url, account_type, gender, bio")
        .eq("id", userId)
        .single();

      if (error || !user) throw new Error("User not found");
      return user;
    } catch (error) {
      throw new Error(`Failed to fetch user profile: ${error.message}`);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchUserProfile();
    }
  }, [userId]);

  const fetchUserProfile = async () => {
    try {
      if (!userId) throw new Error("User ID not available");
      const profile = await getUserProfile(userId);
      setUsername(profile.username || "");
      setBio(profile.bio || "");
      setAvatar(profile.avatar_url || "");
      setNewAvatar(""); // Reset new avatar on profile load
      setGender(profile.gender || "");
      setAccountType(profile.account_type || "personal");
    } catch (error) {
      console.error("Error fetching profile:", error);
      Alert.alert("Error", "Failed to load profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert("Permission Required", "You need to grant camera roll permissions to change your profile picture.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0].uri) {
        setUploadingImage(true);

        // Store the local URI for preview
        setNewAvatar(result.assets[0].uri);

        Alert.alert(
          "Image Selected",
          "Your new profile picture is ready. Don't forget to click 'Save Changes' to update your profile.",
          [
            { text: "OK" }
          ]
        );
      }
    } catch (error: any) {
      console.error("Error selecting image:", error);
      Alert.alert("Error", `Failed to select image: ${error.message}`);
    } finally {
      setUploadingImage(false);
    }
  };

  const uploadAvatar = async (): Promise<string> => {
    if (!newAvatar || !userId) return "";

    try {
      setUploadingImage(true);

      // Check network connectivity
      const networkState = await Network.getNetworkStateAsync();
      if (!networkState.isConnected || !networkState.isInternetReachable) {
        throw new Error("No internet connection. Please check your network and try again.");
      }

      // Read the image file as base64 using expo-file-system
      let base64 = await FileSystem.readAsStringAsync(newAvatar, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Remove data URI prefix if present (e.g., "data:image/jpeg;base64,")
      if (base64.startsWith("data:image")) {
        base64 = base64.split(",")[1];
      }

      // Convert base64 to ArrayBuffer
      const byteString = atob(base64);
      const arrayBuffer = new ArrayBuffer(byteString.length);
      const uint8Array = new Uint8Array(arrayBuffer);
      for (let i = 0; i < byteString.length; i++) {
        uint8Array[i] = byteString.charCodeAt(i);
      }

      // Create a file name with folder path
      const fileName = `updated_avatars/avatar_${userId}_${Date.now()}.jpg`;

      // Upload the ArrayBuffer to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, arrayBuffer, {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (uploadError) {
        console.error("Upload error details:", uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Get the public URL of the uploaded image
      const { data: publicUrlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      if (!publicUrlData?.publicUrl) {
        throw new Error("Failed to get public URL for the uploaded image");
      }

      return publicUrlData.publicUrl;
    } catch (error: any) {
      console.error("Error uploading image:", error);
      throw error;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async () => {
    try {
      if (!userId) throw new Error("User ID not available");
      setUpdating(true);

      let avatarUrl = avatar;

      // If there's a new avatar selected, upload it first
      if (newAvatar) {
        avatarUrl = await uploadAvatar();
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          username,
          bio,
          avatar_url: avatarUrl,
          gender,
          account_type: accountType,
        })
        .eq("id", userId);

      if (error) throw new Error(`Profile update failed: ${error.message}`);

      // Update local state with the new avatar if it was uploaded
      if (avatarUrl) {
        setAvatar(avatarUrl);
        setNewAvatar("");
      }

      Alert.alert("Success", "Profile updated successfully");
      router.back();
    } catch (error: any) {
      console.error("Error updating profile:", error);
      Alert.alert("Error", `Failed to update profile: ${error.message}`);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <ThemedGradient style={styles.container}>
      <View style={[styles.header, { borderBottomColor: `${colors.primary}20` }]}>
        <Text style={[styles.headerTitle, { color: colors.primary }]}>Edit Profile</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="x" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <View style={[styles.card, {
          backgroundColor: `${colors.backgroundSecondary}90`,
          borderColor: `${colors.primary}20`
        }]}>
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={pickImage}
            disabled={uploadingImage}
          >
            <Image
              source={{ uri: newAvatar || avatar || "https://via.placeholder.com/150" }}
              style={[styles.avatar, { borderColor: colors.primary }]}
            />
            <View style={[styles.avatarOverlay, {
              backgroundColor: `${colors.backgroundTertiary}E6`,
              borderColor: `${colors.primary}30`
            }]}>
              {uploadingImage ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Feather name="camera" size={24} color={colors.primary} />
              )}
            </View>
          </TouchableOpacity>

          {newAvatar && (
            <Text style={[styles.previewText, { color: colors.primary }]}>
              New profile picture selected (click Save Changes to update)
            </Text>
          )}

          <Text style={[styles.label, { color: colors.text }]}>Username</Text>
          <TextInput
            style={[styles.input, {
              backgroundColor: `${colors.primary}10`,
              borderColor: `${colors.primary}30`,
              color: colors.primary
            }]}
            value={username}
            onChangeText={setUsername}
            placeholder="Enter username"
            placeholderTextColor={`${colors.primary}50`}
          />

          <Text style={[styles.label, { color: colors.text }]}>Bio</Text>
          <TextInput
            style={[
              styles.input,
              styles.bioInput,
              {
                backgroundColor: `${colors.primary}10`,
                borderColor: `${colors.primary}30`,
                color: colors.primary
              }
            ]}
            value={bio}
            onChangeText={setBio}
            placeholder="Tell us about yourself"
            placeholderTextColor={`${colors.primary}50`}
            multiline
          />

          <Text style={[styles.label, { color: colors.text }]}>Gender</Text>
          <View style={[styles.pickerContainer, {
            backgroundColor: "#000000",
            borderColor: `${colors.primary}30`
          }]}>
            <Picker
              selectedValue={gender}
              onValueChange={setGender}
              style={[styles.picker, { color: "#FFFFFF" }]}
              dropdownIconColor={colors.primary}
            >
              <Picker.Item label="Select Gender" value="" color="black" />
              <Picker.Item label="Male" value="male" color="black" />
              <Picker.Item label="Female" value="female" color="black" />
              <Picker.Item label="Other" value="other" color="black" />
            </Picker>
          </View>

          <Text style={[styles.label, { color: colors.text }]}>Account Type</Text>
          <View style={[styles.pickerContainer, {
            backgroundColor: "#000000",
            borderColor: `${colors.primary}30`
          }]}>
            <Picker
              selectedValue={accountType}
              onValueChange={setAccountType}
              style={[styles.picker, { color: "#FFFFFF" }]}
              dropdownIconColor={colors.primary}
            >
              <Picker.Item label="Personal" value="personal" color="black" />
              <Picker.Item label="Business" value="business" color="black" />
              <Picker.Item label="Creator" value="creator" color="black" />
            </Picker>
          </View>

          <TouchableOpacity
            style={[
              styles.saveButton,
              {
                backgroundColor: colors.primary,
                shadowOpacity: 0
              },
              (updating || uploadingImage) && styles.saveButtonDisabled
            ]}
            onPress={handleSave}
            disabled={updating || uploadingImage}
          >
            {updating || uploadingImage ? (
              <ActivityIndicator color={isDarkMode ? "#000000" : "#FFFFFF"} />
            ) : (
              <Text style={[styles.saveButtonText, { color: isDarkMode ? "#000000" : "#FFFFFF" }]}>
                Save Changes
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </ThemedGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Rubik-Bold",
  },
  card: {
    borderRadius: 12,
    padding: 20,
    marginTop: 20,
    borderWidth: 1,
  },
  label: {
    fontSize: 16,
    fontFamily: "Rubik-Medium",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
    fontFamily: "Rubik-Regular",
  },
  bioInput: {
    height: 100,
    textAlignVertical: "top",
  },
  saveButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: "Rubik-Medium",
  },
  avatarContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
  },
  avatarOverlay: {
    position: "absolute",
    bottom: 0,
    right: 0,
    padding: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 16,
    overflow: "hidden",
  },
  picker: {
    height: 50,
  },
  pickerItem: {
    fontSize: 16,
    fontFamily: "Rubik-Regular",
  },
  previewText: {
    textAlign: "center",
    marginBottom: 16,
    fontFamily: "Rubik-Medium",
    fontSize: 14,
  },
});

export default EditProfile;