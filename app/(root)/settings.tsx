import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import DeleteModal from "@/components/DeleteModal";
import { useTheme } from "@/src/context/ThemeContext";
import useThemedStyles from "@/hooks/useThemedStyles";
import ThemedGradient from "@/components/ThemedGradient";

export default function SettingsScreen() {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const { colors, isDarkMode } = useTheme();

  // Create theme-aware styles
  const themedStyles = useThemedStyles((colors) => ({
    title: {
      fontSize: 24,
      color: colors.text,
    },
    sectionTitle: {
      fontSize: 18,
      color: colors.text,
      marginBottom: 16,
    },
    settingText: {
      flex: 1,
      marginLeft: 16,
      fontSize: 16,
      color: colors.text,
    },
    versionText: {
      textAlign: "center",
      fontSize: 14,
      color: colors.textTertiary,
      marginTop: 20,
    },
  }));

  const handleDeleteAccount = () => {
    setIsDeleteModalVisible(true);
  };

  const handleCancelDelete = () => {
    setIsDeleteModalVisible(false);
  };

  const handleConfirmDelete = async () => {
    try {
      setIsDeleting(true);

      if (!supabase) {
        console.error("Supabase client is not initialized");
        setIsDeleting(false);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.id) {
        // Get user's posts for storage cleanup
        const { data: userPosts } = await supabase
          .from("posts")
          .select("id, image_urls")
          .eq("user_id", user.id);

        // Get user's reels for storage cleanup
        const { data: userReels } = await supabase
          .from("reels")
          .select("id, video_url, thumbnail_url")
          .eq("user_id", user.id);

        // Get user's stories for storage cleanup
        const { data: userStories } = await supabase
          .from("stories")
          .select("id, image_url")
          .eq("user_id", user.id);

        // Delete all user's reels and associated data
        await supabase.from("reel_comments").delete().eq("user_id", user.id);
        await supabase.from("reel_likes").delete().eq("user_id", user.id);
        await supabase.from("reel_likes").delete().eq("reel_id", userReels?.map(reel => reel.id) || []);
        await supabase.from("reel_comments").delete().eq("reel_id", userReels?.map(reel => reel.id) || []);
        await supabase.from("reels").delete().eq("user_id", user.id);

        // Delete all user's stories
        await supabase.from("stories").delete().eq("user_id", user.id);

        // Delete all user's posts and associated data
        await supabase.from("comments").delete().eq("user_id", user.id);
        await supabase.from("likes").delete().eq("user_id", user.id);
        await supabase.from("bookmarks").delete().eq("user_id", user.id);
        await supabase.from("bookmarks").delete().eq("post_id", userPosts?.map(post => post.id) || []);
        await supabase.from("comments").delete().eq("post_id", userPosts?.map(post => post.id) || []);
        await supabase.from("likes").delete().eq("post_id", userPosts?.map(post => post.id) || []);
        await supabase.from("posts").delete().eq("user_id", user.id);

        // Delete all user's messages and chat rooms
        await supabase.from("messages").delete().eq("sender_id", user.id);
        await supabase.from("messages").delete().eq("receiver_id", user.id);
        await supabase.from("room_participants").delete().eq("user_id", user.id);

        // Delete all user's notifications
        await supabase.from("notifications").delete().eq("recipient_id", user.id);
        await supabase.from("notifications").delete().eq("sender_id", user.id);

        // Delete user's profile data
        await supabase.from("profiles").delete().eq("id", user.id);

        // Try to delete from users table if it exists
        try {
          await supabase.from("users").delete().eq("id", user.id);
        } catch (error) {
          console.log("Users table might not exist, continuing with deletion process");
        }

        // Delete user's avatar storage files
        const { data: avatarStorageData } = await supabase.storage
          .from("avatars")
          .list(`user_avatars/${user.id}`);

        if (avatarStorageData && avatarStorageData.length > 0) {
          await Promise.all(
            avatarStorageData.map((file) =>
              supabase.storage
                .from("avatars")
                .remove([`user_avatars/${user.id}/${file.name}`])
            )
          );
        }

        // Delete user's post media files
        if (userPosts && userPosts.length > 0) {
          for (const post of userPosts) {
            if (post.image_urls && Array.isArray(post.image_urls)) {
              await Promise.all(
                post.image_urls.map(async (imageUrl: string) => {
                  try {
                    const filePath = imageUrl.split("/").slice(-2).join("/");
                    await supabase.storage.from("media").remove([filePath]);
                  } catch (error) {
                    console.error(`Failed to delete image ${imageUrl}:`, error);
                  }
                })
              );
            }
          }
        }

        // Delete user's reel media files
        if (userReels && userReels.length > 0) {
          for (const reel of userReels) {
            try {
              if (reel.video_url) {
                const videoPath = reel.video_url.split("/").slice(-2).join("/");
                await supabase.storage.from("media").remove([videoPath]);
              }
              if (reel.thumbnail_url) {
                const thumbnailPath = reel.thumbnail_url.split("/").slice(-2).join("/");
                await supabase.storage.from("media").remove([thumbnailPath]);
              }
            } catch (error) {
              console.error(`Failed to delete reel media:`, error);
            }
          }
        }

        // Delete user's story media files
        if (userStories && userStories.length > 0) {
          for (const story of userStories) {
            try {
              if (story.image_url) {
                const imagePath = story.image_url.split("/").slice(-2).join("/");
                await supabase.storage.from("stories").remove([imagePath]);
              }
            } catch (error) {
              console.error(`Failed to delete story media:`, error);
            }
          }
        }

        // Finally delete the authentication user using our Edge Function
        try {
          // Get the current session for the auth token
          const { data: sessionData } = await supabase.auth.getSession();

          if (!sessionData?.session?.access_token) {
            throw new Error("No valid session found");
          }

          console.log("Calling delete-user Edge Function");
          // Call our Edge Function to delete the user
          const { data: deleteData, error: deleteError } = await supabase.functions.invoke('delete-user', {
            headers: {
              Authorization: `Bearer ${sessionData.session.access_token}`
            }
          });

          if (deleteError) {
            console.error("Error calling delete-user function:", deleteError);

            // Show a more specific error message
            Alert.alert(
              "Account Deletion Issue",
              "There was a problem with the account deletion service. Your account data has been removed, but you'll need to sign out manually.",
              [{ text: "OK" }]
            );

            // Sign out the user anyway since their data is gone
            await supabase.auth.signOut();
            router.replace("/sign-in");
            return;
          }

          if (!deleteData?.success) {
            console.error("Delete user function did not return success:", deleteData);
            const errorDetails = deleteData?.details ? `: ${deleteData.details}` : '';

            // Show a more specific error message
            Alert.alert(
              "Account Deletion Issue",
              `There was a problem with the account deletion service${errorDetails}. Your account data has been removed, but you'll need to sign out manually.`,
              [{ text: "OK" }]
            );

            // Sign out the user anyway since their data is gone
            await supabase.auth.signOut();
            router.replace("/sign-in");
            return;
          }

          console.log("User deleted successfully via Edge Function");

          // Show success message only if we get here (successful deletion)
          Alert.alert(
            "Account Deleted",
            "Your account has been successfully deleted.",
            [
              {
                text: "OK",
                onPress: () => router.replace("/sign-in")
              }
            ]
          );
          return;
        } catch (error) {
          console.error("Error attempting to delete auth user:", error);

          // Show a more specific error message
          Alert.alert(
            "Account Deletion Issue",
            "There was a problem with the account deletion service. Your account data has been removed, but you'll need to sign out manually.",
            [{ text: "OK" }]
          );

          // Fallback to sign out if delete fails
          await supabase.auth.signOut();
          router.replace("/sign-in");
          return;
        }
      }
    } catch (error) {
      console.error("Error deleting account:", error);
      Alert.alert(
        "Error",
        "Failed to delete account. Please try again."
      );
    } finally {
      setIsDeleting(false);
      setIsDeleteModalVisible(false);
    }
  };

  const handleSignOut = async () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        onPress: async () => {
          try {
            if (!supabase) {
              console.error("Supabase client is not initialized");
              return;
            }
            await supabase.auth.signOut();
            router.replace("/sign-in");
          } catch (error) {
            console.error("Error signing out:", error);
            Alert.alert("Error", "Failed to sign out. Please try again.");
          }
        },
      },
    ]);
  };

  return (
    <ThemedGradient style={{ flex: 1 }}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={[styles.header, { backgroundColor: isDarkMode ? 'rgba(128, 128, 128, 0.05)' : 'rgba(128, 128, 128, 0.05)' }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.backButton, {
              backgroundColor: isDarkMode ? 'rgba(128, 128, 128, 0.2)' : 'rgba(128, 128, 128, 0.1)',
              borderColor: isDarkMode ? 'rgba(128, 128, 128, 0.3)' : 'rgba(128, 128, 128, 0.3)'
            }]}
          >
            <Feather name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text className="font-rubik-bold" style={[styles.title, { color: '#FFFFFF' }]}>
            Settings
          </Text>
        </View>

        <ScrollView
          style={styles.container}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          <View style={styles.section}>
            <Text className="font-rubik-bold" style={[styles.sectionTitle, { color: colors.text }]}>
              Account
            </Text>
            <TouchableOpacity
              style={[styles.settingItem, {
                backgroundColor: isDarkMode ? 'rgba(128, 128, 128, 0.1)' : 'rgba(128, 128, 128, 0.1)',
                borderColor: isDarkMode ? 'rgba(128, 128, 128, 0.2)' : 'rgba(128, 128, 128, 0.2)'
              }]}
              onPress={() => router.push("/edit-profile")}
            >
              <Feather name="user" size={22} color={colors.text} />
              <Text className="font-rubik-regular" style={[styles.settingText, { color: colors.text }]}>
                Edit Profile
              </Text>
              <Feather
                name="chevron-right"
                size={22}
                color={colors.text}
              />
            </TouchableOpacity>
            {/* <TouchableOpacity style={styles.settingItem}>
              <Feather name="lock" size={22} color="#FFD700" />
              <Text className="font-rubik-regular" style={styles.settingText}>Privacy</Text>
              <Feather name="chevron-right" size={22} color="rgba(255, 215, 0, 0.7)" />
            </TouchableOpacity> */}
          </View>

          <View style={styles.section}>
            <Text className="font-rubik-bold" style={[styles.sectionTitle, { color: colors.text }]}>
              Preferences
            </Text>
            <TouchableOpacity
              style={[styles.settingItem, {
                backgroundColor: isDarkMode ? 'rgba(128, 128, 128, 0.1)' : 'rgba(128, 128, 128, 0.1)',
                borderColor: isDarkMode ? 'rgba(128, 128, 128, 0.2)' : 'rgba(128, 128, 128, 0.2)'
              }]}
              onPress={() => router.push("/notifications")}
            >
              <Feather name="bell" size={22} color={colors.text} />
              <Text className="font-rubik-regular" style={[styles.settingText, { color: colors.text }]}>
                Notifications
              </Text>
              <Feather
                name="chevron-right"
                size={22}
                color={colors.text}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.settingItem, {
                backgroundColor: isDarkMode ? 'rgba(128, 128, 128, 0.1)' : 'rgba(128, 128, 128, 0.1)',
                borderColor: isDarkMode ? 'rgba(128, 128, 128, 0.2)' : 'rgba(128, 128, 128, 0.2)'
              }]}
              onPress={() => router.push("/appearance")}
            >
              <Feather name="eye" size={22} color={colors.text} />
              <Text className="font-rubik-regular" style={[styles.settingText, { color: colors.text }]}>
                Appearance
              </Text>
              <Feather
                name="chevron-right"
                size={22}
                color={colors.text}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text className="font-rubik-bold" style={[styles.sectionTitle, { color: colors.text }]}>
              Support
            </Text>
            <TouchableOpacity style={[styles.settingItem, {
              backgroundColor: isDarkMode ? 'rgba(128, 128, 128, 0.1)' : 'rgba(128, 128, 128, 0.1)',
              borderColor: isDarkMode ? 'rgba(128, 128, 128, 0.2)' : 'rgba(128, 128, 128, 0.2)'
            }]}>
              <Feather name="help-circle" size={22} color={colors.text} />
              <Text className="font-rubik-regular" style={[styles.settingText, { color: colors.text }]}>
                Help Center
              </Text>
              <Feather
                name="chevron-right"
                size={22}
                color={colors.text}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.settingItem, {
                backgroundColor: isDarkMode ? 'rgba(128, 128, 128, 0.1)' : 'rgba(128, 128, 128, 0.1)',
                borderColor: isDarkMode ? 'rgba(128, 128, 128, 0.2)' : 'rgba(128, 128, 128, 0.2)'
              }]}
              onPress={() => router.push("/terms-and-conditions")}
            >
              <Feather name="file-text" size={22} color={colors.text} />
              <Text className="font-rubik-regular" style={[styles.settingText, { color: colors.text }]}>
                Terms and Conditions
              </Text>
              <Feather
                name="chevron-right"
                size={22}
                color={colors.text}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.settingItem, {
                backgroundColor: isDarkMode ? 'rgba(128, 128, 128, 0.1)' : 'rgba(128, 128, 128, 0.1)',
                borderColor: isDarkMode ? 'rgba(128, 128, 128, 0.2)' : 'rgba(128, 128, 128, 0.2)'
              }]}
              onPress={() => router.push("/privacy-policy")}
            >
              <Feather name="shield" size={22} color={colors.text} />
              <Text className="font-rubik-regular" style={[styles.settingText, { color: colors.text }]}>
                Privacy Policy
              </Text>
              <Feather
                name="chevron-right"
                size={22}
                color={colors.text}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text className="font-rubik-bold" style={[styles.sectionTitle, { color: colors.text }]}>
              Account Actions
            </Text>
            <TouchableOpacity
              style={[styles.signOutButton, {
                backgroundColor: isDarkMode ? 'rgba(128, 128, 128, 0.1)' : 'rgba(128, 128, 128, 0.1)',
                borderColor: isDarkMode ? 'rgba(128, 128, 128, 0.2)' : 'rgba(128, 128, 128, 0.2)'
              }]}
              onPress={handleSignOut}
            >
              <Feather name="log-out" size={22} color={colors.text} />
              <Text className="font-rubik-medium" style={[styles.signOutText, { color: colors.text }]}>
                Sign Out
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.deleteButton, {
                backgroundColor: isDarkMode ? 'rgba(128, 128, 128, 0.1)' : 'rgba(128, 128, 128, 0.1)',
                borderColor: isDarkMode ? 'rgba(128, 128, 128, 0.2)' : 'rgba(128, 128, 128, 0.2)'
              }]}
              onPress={handleDeleteAccount}
              disabled={isDeleting}
            >
              <Feather name="trash-2" size={22} color="#FFFFFF" />
              <Text
                className="font-rubik-medium"
                style={[styles.deleteButtonText, { color: colors.text }]}
              >
                {isDeleting ? "Deleting Account..." : "Delete Account"}
              </Text>
              {isDeleting && (
                <ActivityIndicator
                  size="small"
                  color={colors.primary}
                  style={{ marginLeft: 10 }}
                />
              )}
            </TouchableOpacity>
          </View>

          <Text className="font-rubik-regular" style={[styles.versionText, { color: colors.textTertiary }]}>
            Version 1.0.0
          </Text>
        </ScrollView>
      </SafeAreaView>

      {/* Delete Account Confirmation Modal */}
      <DeleteModal
        isVisible={isDeleteModalVisible}
        title="Delete Account"
        desc="account"
        cancel={handleCancelDelete}
        confirm={handleConfirmDelete}
      />
    </ThemedGradient>
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
