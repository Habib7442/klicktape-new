/**
 * Enhanced Stories Component with Multiple Stories Support
 * Fixes Issues #4 and #5 from bug documentation
 */

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
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import Modal from "react-native-modal";
import StoryViewerEnhanced from "./StoryViewerEnhanced";
import AntDesign from "@expo/vector-icons/AntDesign";
import { supabase } from "../lib/supabase";
import { storiesAPIEnhanced } from "@/lib/storiesApiEnhanced";
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
  story_order: number;
  duration: number;
  story_type: string;
  user: {
    username: string;
    avatar: string;
  };
  is_viewed?: boolean;
}

interface StoriesFeed {
  user_id: string;
  username: string;
  avatar_url: string;
  story_count: number;
  latest_story_time: string;
  has_unviewed: boolean;
  stories: Story[];
}

interface StoryItemProps {
  userStories: StoriesFeed;
  isYourStory?: boolean;
  onPress?: () => void;
  onDelete?: () => void;
}

const StoryItem = ({
  userStories,
  isYourStory,
  onPress,
  onDelete,
}: StoryItemProps) => {
  const { colors } = useTheme();
  
  // Get the latest story for preview
  const latestStory = userStories.stories[0];
  const hasUnviewed = userStories.has_unviewed;

  return (
    <TouchableOpacity style={styles.storyContainer} onPress={onPress}>
      <View style={[
        styles.storyImageContainer,
        { 
          borderColor: hasUnviewed ? colors.primary : 'rgba(128, 128, 128, 0.7)',
          borderWidth: hasUnviewed ? 3 : 2,
        }
      ]}>
        <Image 
          source={{ uri: latestStory.image_url }} 
          style={styles.storyImage} 
        />
        
        {/* Story count indicator for multiple stories */}
        {userStories.story_count > 1 && (
          <View style={[
            styles.storyCountBadge,
            { backgroundColor: colors.primary }
          ]}>
            <Text style={styles.storyCountText}>
              {userStories.story_count}
            </Text>
          </View>
        )}
        
        {/* Delete button for user's own stories */}
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
        
        {/* Unviewed indicator */}
        {hasUnviewed && !isYourStory && (
          <View style={[
            styles.unviewedIndicator,
            { backgroundColor: colors.primary }
          ]} />
        )}
      </View>
      
      <Text
        className="font-rubik-medium"
        style={[styles.usernameText, { color: colors.text }]}
        numberOfLines={1}
      >
        {isYourStory ? "Your Story" : userStories.username}
      </Text>
      
      {/* Story count text for multiple stories */}
      {userStories.story_count > 1 && (
        <Text
          className="font-rubik-regular"
          style={[styles.storyCountLabel, { color: colors.textTertiary }]}
        >
          {userStories.story_count} stories
        </Text>
      )}
    </TouchableOpacity>
  );
};

const StoriesEnhanced = () => {
  const { colors } = useTheme();
  
  // State management
  const [storiesFeed, setStoriesFeed] = useState<StoriesFeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  
  // Story viewer state
  const [isViewerVisible, setIsViewerVisible] = useState(false);
  const [viewerUserIndex, setViewerUserIndex] = useState(0);
  const [viewerStoryIndex, setViewerStoryIndex] = useState(0);
  
  // Story creation state
  const [isPreviewModalVisible, setIsPreviewModalVisible] = useState(false);
  const [isLoadingModalVisible, setIsLoadingModalVisible] = useState(false);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState("Processing...");
  
  // Delete modal state
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [storyToDelete, setStoryToDelete] = useState<string | null>(null);
  
  // Animation
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Get current user
  useEffect(() => {
    getCurrentUser();
  }, []);

  // Fetch stories on mount and when user changes
  useEffect(() => {
    if (userId) {
      fetchStoriesFeed();
    }
  }, [userId]);

  const getCurrentUser = async () => {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        console.error("Error getting user:", error);
        return;
      }

      setUserId(user?.id || null);
    } catch (error) {
      console.error("Error getting current user:", error);
    }
  };

  const fetchStoriesFeed = async () => {
    try {
      setLoading(true);
      
      // Use enhanced API with caching
      const feed = await storiesAPIEnhanced.getStoriesFeed(50);
      
      setStoriesFeed(feed);
    } catch (error) {
      console.error("Error fetching stories feed:", error);
      Alert.alert("Error", "Failed to load stories. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStory = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please grant camera roll permissions to upload stories."
        );
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [9, 16], // Story aspect ratio
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setCroppedImage(result.assets[0].uri);
        setIsPreviewModalVisible(true);
      }
    } catch (error) {
      console.error("Error selecting image:", error);
      Alert.alert("Error", "Failed to select image. Please try again.");
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

      // Upload image
      const file = {
        uri: croppedImage,
        type: "image/jpeg",
        name: `story_${Date.now()}.jpg`,
      };

      setLoadingMessage("Uploading image...");
      const { publicUrl } = await storiesAPIEnhanced.uploadImage(file);

      setLoadingMessage("Finalizing your story...");
      await storiesAPIEnhanced.createStory(publicUrl, userId);
      
      // Refresh stories feed
      await fetchStoriesFeed();

      setLoadingMessage("Story created successfully!");
      setTimeout(() => {
        setIsLoadingModalVisible(false);
        setCroppedImage(null);
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
      }, 3000);
    }
  };

  const handleStoryPress = (userIndex: number, storyIndex: number = 0) => {
    setViewerUserIndex(userIndex);
    setViewerStoryIndex(storyIndex);

    // Start animation
    scaleAnim.setValue(0.8);
    setIsViewerVisible(true);
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      bounciness: 10,
    }).start();
  };

  const handleDeleteStory = (storyId: string) => {
    setStoryToDelete(storyId);
    setIsDeleteModalVisible(true);
  };

  const confirmDeleteStory = async () => {
    if (!storyToDelete) return;

    try {
      const success = await storiesAPIEnhanced.deleteStory(storyToDelete);
      
      if (success) {
        await fetchStoriesFeed();
        Alert.alert("Success", "Story deleted successfully");
      } else {
        Alert.alert("Error", "Failed to delete story");
      }
    } catch (error) {
      console.error("Error deleting story:", error);
      Alert.alert("Error", "Failed to delete story");
    } finally {
      setIsDeleteModalVisible(false);
      setStoryToDelete(null);
    }
  };

  // Get user's own stories
  const userStories = storiesFeed.find(feed => feed.user_id === userId);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollViewContent}
      >
        {/* Create Story Button */}
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

        {/* User's Own Stories (if any) */}
        {userStories && (
          <StoryItem
            userStories={userStories}
            isYourStory={true}
            onPress={() => {
              const userIndex = storiesFeed.findIndex(feed => feed.user_id === userId);
              handleStoryPress(userIndex, 0);
            }}
            onDelete={() => {
              if (userStories.stories.length > 0) {
                handleDeleteStory(userStories.stories[0].id);
              }
            }}
          />
        )}

        {/* Other Users' Stories */}
        {storiesFeed
          .filter(feed => feed.user_id !== userId)
          .map((feed, index) => {
            const actualIndex = storiesFeed.findIndex(f => f.user_id === feed.user_id);
            return (
              <StoryItem
                key={feed.user_id}
                userStories={feed}
                isYourStory={false}
                onPress={() => handleStoryPress(actualIndex, 0)}
              />
            );
          })}
      </ScrollView>

      {/* Story Viewer Modal */}
      <Modal
        isVisible={isViewerVisible}
        style={styles.modal}
        animationIn="fadeIn"
        animationOut="fadeOut"
        backdropOpacity={1}
        onBackButtonPress={() => {
          setIsViewerVisible(false);
          fetchStoriesFeed(); // Refresh to update view status
        }}
        onBackdropPress={() => {
          setIsViewerVisible(false);
          fetchStoriesFeed(); // Refresh to update view status
        }}
      >
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <StoryViewerEnhanced
            storiesFeed={storiesFeed}
            initialUserIndex={viewerUserIndex}
            initialStoryIndex={viewerStoryIndex}
            onClose={() => {
              setIsViewerVisible(false);
              fetchStoriesFeed(); // Refresh to update view status
            }}
          />
        </Animated.View>
      </Modal>

      {/* Story Preview Modal */}
      <Modal
        isVisible={isPreviewModalVisible}
        style={styles.modal}
        onBackButtonPress={() => setIsPreviewModalVisible(false)}
        onBackdropPress={() => setIsPreviewModalVisible(false)}
      >
        <View style={styles.previewContainer}>
          {croppedImage && (
            <Image source={{ uri: croppedImage }} style={styles.previewImage} />
          )}
          <View style={styles.previewActions}>
            <TouchableOpacity
              style={[styles.previewButton, styles.cancelButton]}
              onPress={() => setIsPreviewModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.previewButton, styles.postButton, { backgroundColor: colors.primary }]}
              onPress={handlePostStory}
            >
              <Text style={styles.postButtonText}>Post Story</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Loading Modal */}
      <Modal isVisible={isLoadingModalVisible} style={styles.modal}>
        <View style={styles.loadingModalContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            {loadingMessage}
          </Text>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <DeleteModal
        isVisible={isDeleteModalVisible}
        title="Delete Story"
        desc="story"
        cancel={() => {
          setIsDeleteModalVisible(false);
          setStoryToDelete(null);
        }}
        confirm={confirmDeleteStory}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
  },
  loadingContainer: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollViewContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  storyContainer: {
    alignItems: "center",
    width: 80,
  },
  storyImageContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  storyImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  storyCountBadge: {
    position: "absolute",
    top: -5,
    right: -5,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  storyCountText: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
  },
  deleteButton: {
    position: "absolute",
    top: -5,
    right: -5,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  unviewedIndicator: {
    position: "absolute",
    bottom: -2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "white",
  },
  createStoryButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  createStoryText: {
    fontSize: 32,
    fontWeight: "300",
  },
  usernameText: {
    fontSize: 12,
    marginTop: 6,
    textAlign: "center",
  },
  storyCountLabel: {
    fontSize: 10,
    marginTop: 2,
    textAlign: "center",
  },
  modal: {
    margin: 0,
  },
  previewContainer: {
    flex: 1,
    backgroundColor: "black",
    justifyContent: "center",
    alignItems: "center",
  },
  previewImage: {
    width: "90%",
    height: "70%",
    borderRadius: 12,
  },
  previewActions: {
    flexDirection: "row",
    gap: 20,
    marginTop: 30,
  },
  previewButton: {
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  cancelButton: {
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  postButton: {
    // backgroundColor set inline
  },
  cancelButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  postButtonText: {
    color: "black",
    fontSize: 16,
    fontWeight: "600",
  },
  loadingModalContainer: {
    backgroundColor: "rgba(0,0,0,0.8)",
    padding: 30,
    borderRadius: 12,
    alignItems: "center",
    alignSelf: "center",
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    textAlign: "center",
  },
});

export default StoriesEnhanced;
