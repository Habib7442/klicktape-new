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
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Picker } from "@react-native-picker/picker";
import { supabase } from "@/lib/supabase";
import * as FileSystem from "expo-file-system";
import * as Network from "expo-network";

const EditProfile = () => {
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

  const uploadAvatar = async () => {
    if (!newAvatar || !userId) return null;
    
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
      const { data, error: uploadError } = await supabase.storage
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
    <LinearGradient
      colors={["#000000", "#1a1a1a", "#2a2a2a"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="x" size={24} color="#FFD700" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFD700" />
        </View>
      ) : (
        <View style={styles.card}>
          <TouchableOpacity 
            style={styles.avatarContainer} 
            onPress={pickImage}
            disabled={uploadingImage}
          >
            <Image
              source={{ uri: newAvatar || avatar || "https://via.placeholder.com/150" }}
              style={styles.avatar}
            />
            <View style={styles.avatarOverlay}>
              {uploadingImage ? (
                <ActivityIndicator size="small" color="#FFD700" />
              ) : (
                <Feather name="camera" size={24} color="#FFD700" />
              )}
            </View>
          </TouchableOpacity>

          {newAvatar && (
            <Text style={styles.previewText}>
              New profile picture selected (click Save Changes to update)
            </Text>
          )}

          <Text style={styles.label}>Username</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            placeholder="Enter username"
            placeholderTextColor="rgba(255, 215, 0, 0.5)"
          />

          <Text style={styles.label}>Bio</Text>
          <TextInput
            style={[styles.input, styles.bioInput]}
            value={bio}
            onChangeText={setBio}
            placeholder="Tell us about yourself"
            placeholderTextColor="rgba(255, 215, 0, 0.5)"
            multiline
          />

          <Text style={styles.label}>Gender</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={gender}
              onValueChange={setGender}
              style={styles.picker}
              dropdownIconColor="#FFD700"
            >
              <Picker.Item label="Select Gender" value="" color="#ffffff" style={styles.pickerItem} />
              <Picker.Item label="Male" value="male" color="#ffffff" style={styles.pickerItem} />
              <Picker.Item label="Female" value="female" color="#ffffff" style={styles.pickerItem} />
              <Picker.Item label="Other" value="other" color="#ffffff" style={styles.pickerItem} />
            </Picker>
          </View>

          <Text style={styles.label}>Account Type</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={accountType}
              onValueChange={setAccountType}
              style={styles.picker}
              dropdownIconColor="#FFD700"
            >
              <Picker.Item label="Personal" value="personal" color="#ffffff" style={styles.pickerItem} />
              <Picker.Item label="Business" value="business" color="#ffffff" style={styles.pickerItem} />
              <Picker.Item label="Creator" value="creator" color="#ffffff" style={styles.pickerItem} />
            </Picker>
          </View>

          <TouchableOpacity
            style={[styles.saveButton, (updating || uploadingImage) && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={updating || uploadingImage}
          >
            {updating || uploadingImage ? (
              <ActivityIndicator color="#000000" />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </LinearGradient>
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
    borderBottomColor: "rgba(255, 215, 0, 0.2)",
  },
  headerTitle: {
    fontSize: 20,
    color: "#FFD700",
    fontFamily: "Rubik-Bold",
  },
  card: {
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 12,
    padding: 20,
    marginTop: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.2)",
  },
  label: {
    fontSize: 16,
    fontFamily: "Rubik-Medium",
    color: "#ffffff",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.3)",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
    fontFamily: "Rubik-Regular",
    backgroundColor: "rgba(255, 215, 0, 0.1)",
    color: "#FFD700",
  },
  bioInput: {
    height: 100,
    textAlignVertical: "top",
  },
  saveButton: {
    backgroundColor: "#FFD700",
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
    color: "#000000",
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
    borderColor: "#FFD700",
  },
  avatarOverlay: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    padding: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.3)",
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.3)",
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: "#000000",
    overflow: "hidden",
  },
  picker: {
    color: "#FFD700",
    height: 50,
  },
  pickerItem: {
    backgroundColor: "#000000",
    color: "#ffffff",
    fontSize: 16,
    fontFamily: "Rubik-Regular",
  },
  previewText: {
    color: "#FFD700",
    textAlign: "center",
    marginBottom: 16,
    fontFamily: "Rubik-Medium",
    fontSize: 14,
  },
});

export default EditProfile;