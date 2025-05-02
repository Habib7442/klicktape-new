import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";

export default function SettingsScreen() {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to delete your account? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setIsDeleting(true);
              const {
                data: { user },
              } = await supabase.auth.getUser();
              if (user?.id) {
                // Delete all user's stories
                await supabase.from("stories").delete().eq("user_id", user.id);

                // Delete all user's posts and associated data
                await supabase.from("comments").delete().eq("user_id", user.id);
                await supabase.from("likes").delete().eq("user_id", user.id);
                await supabase.from("posts").delete().eq("user_id", user.id);

                // Delete all user's messages
                await supabase
                  .from("messages")
                  .delete()
                  .eq("sender_id", user.id);
                await supabase
                  .from("messages")
                  .delete()
                  .eq("receiver_id", user.id);

                // Delete all user's notifications
                await supabase
                  .from("notifications")
                  .delete()
                  .eq("recipient_id", user.id);
                await supabase
                  .from("notifications")
                  .delete()
                  .eq("sender_id", user.id);

                // Delete user's profile data
                await supabase.from("profiles").delete().eq("id", user.id);
                await supabase.from("users").delete().eq("id", user.id);

                // Delete user's storage files
                const { data: storageData } = await supabase.storage
                  .from("avatars")
                  .list(`user_avatars/${user.id}`);

                if (storageData) {
                  await Promise.all(
                    storageData.map((file) =>
                      supabase.storage
                        .from("avatars")
                        .remove([`user_avatars/${user.id}/${file.name}`])
                    )
                  );
                }

                // Finally delete the authentication user
                await supabase.auth.signOut();
              }
              router.replace("/sign-in");
            } catch (error) {
              console.error("Error deleting account:", error);
              Alert.alert(
                "Error",
                "Failed to delete account. Please try again."
              );
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handleSignOut = async () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace("/sign-in");
        },
      },
    ]);
  };

  return (
    <LinearGradient
      colors={["#000000", "#1a1a1a", "#2a2a2a"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Feather name="arrow-left" size={24} color="#FFD700" />
          </TouchableOpacity>
          <Text className="font-rubik-bold" style={styles.title}>
            Settings
          </Text>
        </View>

        <ScrollView
          style={styles.container}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          <View style={styles.section}>
            <Text className="font-rubik-bold" style={styles.sectionTitle}>
              Account
            </Text>
            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => router.push("/edit-profile")}
            >
              <Feather name="user" size={22} color="#FFD700" />
              <Text className="font-rubik-regular" style={styles.settingText}>
                Edit Profile
              </Text>
              <Feather
                name="chevron-right"
                size={22}
                color="rgba(255, 215, 0, 0.7)"
              />
            </TouchableOpacity>
            {/* <TouchableOpacity style={styles.settingItem}>
              <Feather name="lock" size={22} color="#FFD700" />
              <Text className="font-rubik-regular" style={styles.settingText}>Privacy</Text>
              <Feather name="chevron-right" size={22} color="rgba(255, 215, 0, 0.7)" />
            </TouchableOpacity> */}
          </View>

          <View style={styles.section}>
            <Text className="font-rubik-bold" style={styles.sectionTitle}>
              Preferences
            </Text>
            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => router.push("/notifications")}
            >
              <Feather name="bell" size={22} color="#FFD700" />
              <Text className="font-rubik-regular" style={styles.settingText}>
                Notifications
              </Text>
              <Feather
                name="chevron-right"
                size={22}
                color="rgba(255, 215, 0, 0.7)"
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingItem}>
              <Feather name="eye" size={22} color="#FFD700" />
              <Text className="font-rubik-regular" style={styles.settingText}>
                Appearance
              </Text>
              <Feather
                name="chevron-right"
                size={22}
                color="rgba(255, 215, 0, 0.7)"
              />
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text className="font-rubik-bold" style={styles.sectionTitle}>
              Support
            </Text>
            <TouchableOpacity style={styles.settingItem}>
              <Feather name="help-circle" size={22} color="#FFD700" />
              <Text className="font-rubik-regular" style={styles.settingText}>
                Help Center
              </Text>
              <Feather
                name="chevron-right"
                size={22}
                color="rgba(255, 215, 0, 0.7)"
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingItem}>
              <Feather name="file-text" size={22} color="#FFD700" />
              <Text className="font-rubik-regular" style={styles.settingText}>
                Terms of Service
              </Text>
              <Feather
                name="chevron-right"
                size={22}
                color="rgba(255, 215, 0, 0.7)"
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingItem}>
              <Feather name="shield" size={22} color="#FFD700" />
              <Text className="font-rubik-regular" style={styles.settingText}>
                Privacy Policy
              </Text>
              <Feather
                name="chevron-right"
                size={22}
                color="rgba(255, 215, 0, 0.7)"
              />
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text className="font-rubik-bold" style={styles.sectionTitle}>
              Account Actions
            </Text>
            <TouchableOpacity
              style={styles.signOutButton}
              onPress={handleSignOut}
            >
              <Feather name="log-out" size={22} color="#FFD700" />
              <Text className="font-rubik-medium" style={styles.signOutText}>
                Sign Out
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDeleteAccount}
              disabled={isDeleting}
            >
              <Feather name="trash-2" size={22} color="#FFD700" />
              <Text
                className="font-rubik-medium"
                style={styles.deleteButtonText}
              >
                {isDeleting ? "Deleting Account..." : "Delete Account"}
              </Text>
            </TouchableOpacity>
          </View>

          <Text className="font-rubik-regular" style={styles.versionText}>
            Version 1.0.0
          </Text>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "rgba(255, 215, 0, 0.05)",
  },
  backButton: {
    padding: 8,
    marginRight: 16,
    backgroundColor: "rgba(255, 215, 0, 0.2)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.3)",
  },
  title: {
    fontSize: 24,
    color: "#ffffff",
  },
  container: {
    flex: 1,
    padding: 20,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 215, 0, 0.1)",
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.2)",
  },
  deleteButtonText: {
    color: "#ffffff",
    fontSize: 16,
    marginLeft: 12,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    color: "#FFD700",
    marginBottom: 12,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 215, 0, 0.1)",
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.2)",
  },
  settingText: {
    flex: 1,
    fontSize: 16,
    color: "#ffffff",
    marginLeft: 12,
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 215, 0, 0.1)",
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.2)",
  },
  signOutText: {
    color: "#ffffff",
    fontSize: 16,
    marginLeft: 12,
  },
  versionText: {
    textAlign: "center",
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 14,
    marginTop: 20,
  },
});
