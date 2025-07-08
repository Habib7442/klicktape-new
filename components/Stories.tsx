import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Animated,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import Modal from "react-native-modal";
import StoryViewer from "./StoryViewer";
import AntDesign from "@expo/vector-icons/AntDesign";
import { generateUsername, supabase } from "../lib/supabase";
import { cacheManager } from "../lib/utils/cacheManager";
import { storiesAPI } from "@/lib/storiesApi";
import { LinearGradient } from "expo-linear-gradient";
import DeleteModal from "./DeleteModal";
import { useTheme } from "@/src/context/ThemeContext";
import ThemedGradient from "@/components/ThemedGradient";

interface Story {
  id: string;
  user_id: string;
  image_url: string;
  caption?: string;
  created_at: string;
  expires_at: string;
  viewed_by: string[];
  user: {
    username: string;
    avatar: string;
  };
}

interface StoryProps {
  image: string;
  username: string;
  isYourStory?: boolean;
}

const StoryItem = ({
  image,
  username,
  isYourStory,
  onPress,
  onDelete,
}: StoryProps & {
  onPress?: () => void;
  onDelete?: () => void;
}) => {
  const { colors } = useTheme();

  return (
    <TouchableOpacity style={styles.storyContainer} onPress={onPress}>
      <View style={[
        styles.storyImageContainer,
        { borderColor: 'rgba(128, 128, 128, 0.7)' }
      ]}>
        <Image source={{ uri: image }} style={styles.storyImage} />
        {isYourStory && (
          <TouchableOpacity
            style={[
              styles.deleteButton,
              {
                backgroundColor: `${colors.backgroundSecondary}E0`,
                borderColor: colors.cardBorder
              }
            ]}
            onPress={onDelete}
          >
            <AntDesign name="delete" size={14} color={colors.error} />
          </TouchableOpacity>
        )}
      </View>
      <Text
        className="font-rubik-medium"
        style={[styles.usernameText, { color: colors.text }]}
      >
        {isYourStory ? "Your Story" : username}
      </Text>
    </TouchableOpacity>
  );
};

const Stories = () => {
  const { colors } = useTheme();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStoryIndex, setSelectedStoryIndex] = useState<number>(-1);
  const [isViewerVisible, setIsViewerVisible] = useState(false);
  const [isLoadingModalVisible, setIsLoadingModalVisible] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [isWarningModalVisible, setIsWarningModalVisible] = useState(false);
  const [storyToDelete, setStoryToDelete] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState(0);
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache
  const [userId, setUserId] = useState<string | null>(null);
  const [deleteProgress] = useState(new Animated.Value(0));
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [isPreviewModalVisible, setIsPreviewModalVisible] = useState(false);
  const [viewerStories, setViewerStories] = useState<Story[]>([]);
  const [viewerStartIndex, setViewerStartIndex] = useState(0);
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  // Initialize user session
  useEffect(() => {
    const initializeUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        await syncUserWithSupabase(user.id);
      }
    };
    initializeUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_IN" && session?.user) {
          setUserId(session.user.id);
          syncUserWithSupabase(session.user.id);
        } else if (event === "SIGNED_OUT") {
          setUserId(null);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Sync user with Supabase users table
  const syncUserWithSupabase = async (userId: string) => {
    try {
      const { data: existingUser } = await supabase
        .from("profiles")
        .select("id, avatar_url")
        .eq("id", userId)
        .single();

      if (!existingUser) {
        const username = generateUsername();
        const { error } = await supabase.from("profiles").insert({  // Changed from 'users' to 'profiles'
          id: userId,
          username,
          avatar_url: "", // Changed from 'avatar' to 'avatar_url' to match your schema
        });
        if (error) {
          throw new Error(`Failed to sync user: ${error.message}`);
        }
      } else {
        // Update avatar if it exists in profiles but not in users
        const { data: profile } = await supabase
          .from("profiles")
          .select("avatar_url")
          .eq("id", userId)
          .single();
        if (profile?.avatar_url && !existingUser.avatar_url) {
          const { error } = await supabase
            .from("profiles")
            .update({ avatar: profile.avatar_url })
            .eq("id", userId);
          if (error) {
            console.error("Error updating avatar in users:", error);
          }
        }
      }
    } catch (error) {
      console.error("Error syncing user with Supabase:", error);
    }
  };

  // Fetch stories with cache
  useEffect(() => {
    const loadStoriesWithCache = async () => {
      const now = Date.now();
      if (now - lastFetchTime > CACHE_DURATION) {
        await fetchStories();
        setLastFetchTime(now);
      }
    };

    loadStoriesWithCache();

    const interval = setInterval(() => {
      loadStoriesWithCache();
    }, 60000);
    return () => clearInterval(interval);
  }, [lastFetchTime]);

  const handleCreateStory = async () => {
    try {
      if (!userId) {
        alert("Please sign in to create a story");
        return;
      }

      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        alert("Permission to access camera roll is required!");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        // Removed the aspect ratio constraint to allow free-form cropping
      });

      if (!result.canceled && result.assets[0].uri) {
        const resolveUri = async (uri: string) => {
          const newUri = `${FileSystem.cacheDirectory}${Date.now()}.jpg`;
          await FileSystem.copyAsync({ from: uri, to: newUri });
          return newUri;
        };

        let normalizedUri = result.assets[0].uri;
        if (Platform.OS === "android" && !normalizedUri.startsWith("file://")) {
          normalizedUri = `file://${normalizedUri}`;
        }

        const croppedUri = await resolveUri(normalizedUri);
        setCroppedImage(croppedUri);
        setIsPreviewModalVisible(true);
      }
    } catch (error: any) {
      console.error("Error selecting image:", error);
      setLoadingMessage(
        error.message.includes("No content provided")
          ? "Error: Failed to select image. Try a different image."
          : "Error: " + (error.message || "Failed to select image")
      );
      setTimeout(() => {
        setIsLoadingModalVisible(false);
      }, 2000);
    }
  };

  const handlePostStory = async () => {
    if (!croppedImage || !userId) return;

    try {
      // Check if user exists in profiles
      const { data: userProfile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", userId)
        .single();

      if (profileError || !userProfile) {
        throw new Error("User profile not found. Please complete your profile first.");
      }

      setIsPreviewModalVisible(false);
      setLoadingMessage("Creating your story...");
      setIsLoadingModalVisible(true);
      setLoading(true);

      const file = {
        uri: croppedImage,
        type: "image/jpeg",
        name: `story_${Date.now()}.jpg`,
      };

      setLoadingMessage("Uploading image...");
      const { publicUrl } = await storiesAPI.uploadImage(file);

      setLoadingMessage("Processing...");
      const userStories = await storiesAPI.getUserStories(userId);
      if (userStories && userStories.length > 0) {
        for (const story of userStories) {
          await storiesAPI.deleteStory(story.id);
        }
      }

      setLoadingMessage("Finalizing your story...");
      await storiesAPI.createStory(publicUrl, userId);
      await fetchStories();

      setLoadingMessage("Story created successfully!");
      setTimeout(() => {
        setIsLoadingModalVisible(false);
      }, 1000);
    } catch (error: any) {
      console.error("Error creating story:", error);
      setLoadingMessage(
        error.message.includes("No content provided")
          ? "Error: Failed to upload image. Try a different image or check your network."
          : error.message.includes("Network request failed")
          ? "Error: Network issue. Check your connection and try again."
          : error.message.includes("not authenticated")
          ? "Error: Please sign in to upload a story."
          : "Error: " + (error.message || "Failed to create story")
      );
      setTimeout(() => {
        setIsLoadingModalVisible(false);
      }, 2000);
    } finally {
      setLoading(false);
      setCroppedImage(null);
    }
  };

  const fetchStories = async () => {
    try {
      setLoading(true);
      const fetchedStories = await storiesAPI.getActiveStories();
      console.log("Fetched stories:", fetchedStories);
      if (fetchedStories && fetchedStories.length > 0) {
        setStories(fetchedStories);
        await cacheManager.set("stories", {
          data: fetchedStories,
          timestamp: Date.now(),
        });
      } else {
        setStories([]);
      }
    } catch (error) {
      console.error("Error fetching stories:", error);
      const cachedStories = await cacheManager.get("stories");
      if (cachedStories) {
        setStories(cachedStories.data);
      } else {
        setStories([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const startDeleteProgress = () => {
    deleteProgress.setValue(0);
    Animated.timing(deleteProgress, {
      toValue: 1,
      duration: 2000,
      useNativeDriver: false,
    }).start();
  };

  const handleDeleteStory = (storyId: string) => {
    setStoryToDelete(storyId);
    setIsWarningModalVisible(true);  // Only show modal when delete is clicked
  };

  const confirmDeleteStory = async () => {
    if (!storyToDelete) return;

    try {
      setIsWarningModalVisible(false);
      setLoadingMessage("Deleting your story...");
      setIsLoadingModalVisible(true);
      setLoading(true);
      startDeleteProgress();

      await storiesAPI.deleteStory(storyToDelete);
      setStories((prev) => prev.filter((story) => story.id !== storyToDelete));
      await fetchStories();

      setLoadingMessage("Story deleted successfully!");
    } catch (error: any) {
      console.error("Error deleting story:", error);
      setLoadingMessage(
        error.message.includes("don't have permission")
          ? "Error: You can only delete your own stories"
          : error.message.includes("not authenticated")
          ? "Error: Please sign in to delete stories"
          : "Error: " + (error.message || "Failed to delete story")
      );
      await fetchStories();
    } finally {
      setTimeout(() => {
        setIsLoadingModalVisible(false);
        setLoading(false);
        setStoryToDelete(null);
      }, 2000);
    }
  };

  const cancelDeleteStory = () => {
    setIsWarningModalVisible(false);
    setStoryToDelete(null);
  };

  const handleStoryPress = (index: number) => {
    const clickedStory = stories[index];

    // Filter stories to show only the clicked user's stories
    const userStories = stories.filter(
      (story) => story.user_id === clickedStory.user_id
    );

    // Find the index of the clicked story within the user's stories
    const userStoryIndex = userStories.findIndex(
      (story) => story.id === clickedStory.id
    );

    setViewerStories(userStories);
    setViewerStartIndex(userStoryIndex);

    // Start animation
    scaleAnim.setValue(0.8);
    setIsViewerVisible(true);
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      bounciness: 10,
    }).start();
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollViewContent}
      >
        <TouchableOpacity
          style={styles.storyContainer}
          onPress={handleCreateStory}
        >
          <View
            style={[
              styles.storyImageContainer,
              {
                borderColor: 'rgba(128, 128, 128, 0.7)',
                backgroundColor: 'rgba(128, 128, 128, 0.1)'
              }
            ]}
          >
            <View style={[
              styles.createStoryButton,
              { backgroundColor: 'rgba(128, 128, 128, 0.2)' }
            ]}>
              <Text
                className="font-rubik-medium"
                style={[styles.createStoryText, { color: colors.text }]}
              >
                +
              </Text>
            </View>
          </View>
          <Text
            className="font-rubik-medium"
            style={[styles.usernameText, { color: colors.text }]}
          >
            Create Story
          </Text>
        </TouchableOpacity>

        {stories.map((story, index) => (
          <StoryItem
            key={story.id}
            image={story.image_url}
            username={story.user.username}
            isYourStory={story.user_id === userId}
            onPress={() => handleStoryPress(index)}
            onDelete={() => handleDeleteStory(story.id)}
          />
        ))}
      </ScrollView>

      {/* Preview Modal */}
      <Modal
        isVisible={isPreviewModalVisible}
        style={styles.previewModal}
        animationIn="fadeIn"
        animationOut="fadeOut"
        backdropOpacity={0.9}
      >
        <ThemedGradient style={styles.previewContainer}>
          <View style={[styles.previewHeader, { borderBottomColor: `${colors.primary}20` }]}>
            <TouchableOpacity onPress={() => setIsPreviewModalVisible(false)}>
              <AntDesign name="close" size={24} color={colors.primary} />
            </TouchableOpacity>
            <Text
              className="font-rubik-bold"
              style={[styles.previewTitle, { color: colors.primary }]}
            >
              Preview Story
            </Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.imagePreviewContainer}>
            {croppedImage && (
              <Image
                source={{ uri: croppedImage }}
                style={[styles.imagePreview, { borderColor: 'rgba(128, 128, 128, 0.3)' }]}
                resizeMode="contain"
              />
            )}
          </View>

          <TouchableOpacity
            style={[styles.postButton, { backgroundColor: 'rgba(128, 128, 128, 0.1)' }]}
            onPress={handlePostStory}
          >
            <View
              style={[styles.postButtonGradient, { backgroundColor: 'rgba(128, 128, 128, 0.8)' }]}
            >
              <Text
                className="font-rubik-bold"
                style={[styles.postButtonText, { color: colors.text }]}
              >
                Post Story
              </Text>
            </View>
          </TouchableOpacity>
        </ThemedGradient>
      </Modal>

      {/* Story Viewer Modal */}
      <Modal
        isVisible={isViewerVisible}
        style={styles.modal}
        animationIn="fadeIn"
        animationOut="fadeOut"
        backdropOpacity={1}
        onBackButtonPress={() => {
          setIsViewerVisible(false);
          fetchStories();
        }}
        onBackdropPress={() => {
          setIsViewerVisible(false);
          fetchStories();
        }}
      >
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <StoryViewer
            stories={viewerStories}
            currentIndex={viewerStartIndex}
            onClose={() => {
              setIsViewerVisible(false);
              fetchStories();
            }}
          />
        </Animated.View>
      </Modal>

      {/* Loading Modal */}
      <Modal
        isVisible={isLoadingModalVisible}
        style={styles.loadingModal}
        backdropOpacity={0.5}
        animationIn="fadeIn"
        animationOut="fadeOut"
      >
        <View style={[
          styles.loadingModalContent,
          {
            backgroundColor: `${colors.backgroundSecondary}E6`,
            borderColor: `${colors.primary}30`
          }
        ]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Animated.View
            style={[
              styles.progressBar,
              {
                backgroundColor: `${colors.primary}30`,
                width: deleteProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0%", "100%"],
                }),
              },
            ]}
          />
          <Text
            className="font-rubik-medium"
            style={[styles.loadingText, { color: colors.text }]}
          >
            {loadingMessage}
          </Text>
        </View>
      </Modal>

      {/* Delete Warning Modal */}

      <DeleteModal
        isVisible={isWarningModalVisible}
        title="Delete Story"
        desc="story"
        cancel={() => {
          setIsWarningModalVisible(false);
          setStoryToDelete(null);
        }}
        confirm={async () => {
          if (storyToDelete) {
            await confirmDeleteStory();
            setIsWarningModalVisible(false);
          }
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  scrollViewContent: {
    paddingHorizontal: 16,
  },
  storyContainer: {
    alignItems: "center",
    marginRight: 16,
  },
  storyImageContainer: {
    width: 90,
    height: 90,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    padding: 2,
  },
  storyImage: {
    width: "100%",
    height: "100%",
    borderRadius: 10,
  },
  usernameText: {
    fontSize: 14,
    marginTop: 5,
  },
  createStoryButton: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
  },
  createStoryText: {
    fontSize: 24,
    fontWeight: "bold",
  },
  modal: {
    margin: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  previewModal: {
    margin: 0,
    justifyContent: "flex-end",
  },
  previewContainer: {
    flex: 1,
    paddingTop: Platform.OS === "ios" ? 50 : 20,
  },
  previewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
  },
  previewTitle: {
    fontSize: 18,
  },
  imagePreviewContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  imagePreview: {
    width: "100%",
    height: "100%",
    borderRadius: 10,
    borderWidth: 1,
  },
  postButton: {
    margin: 20,
    borderRadius: 25,
    overflow: "hidden",
  },
  postButtonGradient: {
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  postButtonText: {
    fontSize: 16,
  },
  deleteButton: {
    position: "absolute",
    top: -5,
    right: -5,
    width: 24,
    height: 24,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
  },
  loadingModal: {
    margin: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingModalContent: {
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
    minWidth: 250,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    width: "100%",
    marginVertical: 10,
    overflow: "hidden",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    textAlign: "center",
  },
  warningModal: {
    margin: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  warningModalContent: {
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
    minWidth: 300,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
  },
  warningTitle: {
    fontSize: 20,
    marginBottom: 10,
  },
  warningText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  warningButtonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  warningButton: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    marginHorizontal: 5,
  },
  cancelButton: {
    borderWidth: 1,
  },
  deleteButtonModal: {
    borderWidth: 1,
  },
  warningButtonText: {
    fontSize: 16,
  },
});

export default Stories;
