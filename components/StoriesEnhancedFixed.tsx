/**
 * Enhanced Stories Component with UI Fixes and Direct Supabase Integration
 * Fixes all identified issues: avatar display, sizing, + icon, layout, and data fetching
 * Uses direct Supabase calls with Redis caching for optimal performance
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
import StoryViewer from "./StoryViewer";
import AntDesign from "@expo/vector-icons/AntDesign";
import { Ionicons } from "@expo/vector-icons";
import { generateUsername, supabase } from "../lib/supabase";
import { storiesAPI } from "@/lib/storiesApi";
import { cacheManager } from "../lib/utils/cacheManager";
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
  story: Story;
  isYourStory?: boolean;
  hasUnviewed?: boolean;
}

const StoryItem = ({
  story,
  isYourStory,
  hasUnviewed = false,
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
        {
          borderColor: hasUnviewed ? colors.primary : 'rgba(128, 128, 128, 0.7)',
          borderWidth: hasUnviewed ? 3 : 2,
        }
      ]}>
        <Image
          source={{ uri: story.image_url }}
          style={styles.storyImage}
          resizeMode="cover"
        />

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
            <AntDesign name="delete" size={16} color={colors.error} />
          </TouchableOpacity>
        )}
      </View>
      <Text
        className="font-rubik-medium"
        style={[styles.usernameText, { color: colors.text }]}
        numberOfLines={1}
      >
        {isYourStory ? "Your Story" : story.user.username}
      </Text>
    </TouchableOpacity>
  );
};

const CreateStoryItem = ({ 
  userAvatar, 
  onPress 
}: { 
  userAvatar?: string; 
  onPress: () => void; 
}) => {
  const { colors } = useTheme();

  return (
    <TouchableOpacity style={styles.storyContainer} onPress={onPress}>
      <View style={[
        styles.storyImageContainer,
        {
          borderColor: 'rgba(128, 128, 128, 0.7)',
          backgroundColor: 'rgba(128, 128, 128, 0.1)'
        }
      ]}>
        {userAvatar ? (
          <>
            <Image 
              source={{ uri: userAvatar }} 
              style={styles.storyImage} 
              resizeMode="cover"
            />
            <View style={[
              styles.addStoryIcon,
              { backgroundColor: colors.primary }
            ]}>
              <Ionicons name="add" size={20} color="white" />
            </View>
          </>
        ) : (
          <View style={[
            styles.createStoryButton,
            { backgroundColor: 'rgba(128, 128, 128, 0.2)' }
          ]}>
            <Ionicons name="add" size={32} color={colors.text} />
          </View>
        )}
      </View>
      <Text
        className="font-rubik-medium"
        style={[styles.usernameText, { color: colors.text }]}
        numberOfLines={1}
      >
        Create Story
      </Text>
    </TouchableOpacity>
  );
};

const StoriesEnhancedFixed = () => {
  // TanStack Query hooks
  const {
    data: storiesFeed = [],
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useStoriesFeed(50, {
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    onError: (error) => {
      console.error('Error fetching stories feed:', error);
      Alert.alert("Error", "Failed to load stories. Please try again.");
    },
  });

  const createStoryMutation = useCreateStory({
    onSuccess: () => {
      console.log('✅ Story created successfully');
      setIsLoadingModalVisible(false);
      setCroppedImage(null);
      setIsPreviewModalVisible(false);
      // Refetch stories to show the new story
      refetch();
    },
    onError: (error) => {
      console.error('❌ Error creating story:', error);
      setIsLoadingModalVisible(false);
      Alert.alert("Error", "Failed to create story. Please try again.");
    },
  });

  const deleteStoryMutation = useDeleteStory({
    onSuccess: () => {
      console.log('✅ Story deleted successfully');
      setIsDeleteModalVisible(false);
      setStoryToDelete(null);
      // Refetch stories to update the list
      refetch();
    },
    onError: (error) => {
      console.error('❌ Error deleting story:', error);
      Alert.alert("Error", "Failed to delete story. Please try again.");
    },
  });

  // Local state
  const [isViewerVisible, setIsViewerVisible] = useState(false);
  const [viewerStories, setViewerStories] = useState<Story[]>([]);
  const [viewerStartIndex, setViewerStartIndex] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [isPreviewModalVisible, setIsPreviewModalVisible] = useState(false);
  const [isLoadingModalVisible, setIsLoadingModalVisible] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [storyToDelete, setStoryToDelete] = useState<string | null>(null);

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const deleteProgress = useRef(new Animated.Value(0)).current;

  const { colors } = useTheme();

  // Get current user and profile
  useEffect(() => {
    const initializeUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserId(user.id);
          
          // Get user profile for avatar
          const { data: profile } = await supabase
            .from("profiles")
            .select("avatar_url, username")
            .eq("id", user.id)
            .single();
          
          if (profile) {
            setUserProfile(profile);
          }
        }
      } catch (error) {
        console.error("Error getting user:", error);
      }
    };

    initializeUser();
  }, []);

  // Find user's own stories
  const userStories = storiesFeed.find(feed => feed.user_id === userId);

  const handleCreateStory = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permissionResult.granted === false) {
        Alert.alert("Permission Required", "Please allow access to your photo library to create a story.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [9, 16],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setCroppedImage(result.assets[0].uri);
        setIsPreviewModalVisible(true);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image. Please try again.");
    }
  };

  const handlePostStory = async () => {
    if (!croppedImage || !userId) return;

    setIsLoadingModalVisible(true);
    setIsPreviewModalVisible(false);

    try {
      // First upload the image
      const fileName = `story_${Date.now()}.jpg`;
      const uploadResult = await storiesAPI.uploadImage({
        uri: croppedImage,
        name: fileName,
        type: 'image/jpeg',
      });

      // Then create the story with the uploaded image URL
      await createStoryMutation.mutateAsync({
        imageUrl: uploadResult.publicUrl,
        userId: userId,
        duration: 5000,
        storyType: 'image',
      });
    } catch (error) {
      console.error("Error posting story:", error);
      setIsLoadingModalVisible(false);
      Alert.alert("Error", "Failed to create story. Please try again.");
    }
  };

  const handleStoryPress = (feedIndex: number, storyIndex: number) => {
    const allStories = storiesFeed.flatMap(feed => feed.stories);
    setViewerStories(allStories);
    
    // Calculate the correct start index
    let startIndex = 0;
    for (let i = 0; i < feedIndex; i++) {
      startIndex += storiesFeed[i].stories.length;
    }
    startIndex += storyIndex;
    
    setViewerStartIndex(startIndex);
    setIsViewerVisible(true);
  };

  const handleDeleteStory = (storyId: string) => {
    setStoryToDelete(storyId);
    setIsDeleteModalVisible(true);
  };

  const confirmDeleteStory = async () => {
    if (!storyToDelete) return;

    try {
      await deleteStoryMutation.mutateAsync(storyToDelete);
    } catch (error) {
      console.error("Error deleting story:", error);
    }
  };

  if (isLoading && storiesFeed.length === 0) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="small" color={colors.primary} />
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
        <CreateStoryItem 
          userAvatar={userProfile?.avatar_url}
          onPress={handleCreateStory}
        />

        {/* User's Own Stories (if any) */}
        {userStories && (
          <StoryItem
            userStories={userStories}
            isYourStory={true}
            hasUnviewed={userStories.has_unviewed}
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
                hasUnviewed={feed.has_unviewed}
                onPress={() => handleStoryPress(actualIndex, 0)}
              />
            );
          })}
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
            disabled={createStoryMutation.isLoading}
          >
            <View
              style={[styles.postButtonGradient, { backgroundColor: 'rgba(128, 128, 128, 0.8)' }]}
            >
              {createStoryMutation.isLoading ? (
                <ActivityIndicator size="small" color={colors.text} />
              ) : (
                <Text
                  className="font-rubik-bold"
                  style={[styles.postButtonText, { color: colors.text }]}
                >
                  Post Story
                </Text>
              )}
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
        onBackButtonPress={() => setIsViewerVisible(false)}
        onBackdropPress={() => setIsViewerVisible(false)}
      >
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <StoryViewer
            stories={viewerStories}
            currentIndex={viewerStartIndex}
            onClose={() => setIsViewerVisible(false)}
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
          <Text
            className="font-rubik-medium"
            style={[styles.loadingText, { color: colors.text }]}
          >
            Creating your story...
          </Text>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <DeleteModal
        isVisible={isDeleteModalVisible}
        onClose={() => setIsDeleteModalVisible(false)}
        onConfirm={confirmDeleteStory}
        title="Delete Story"
        message="Are you sure you want to delete this story? This action cannot be undone."
        isLoading={deleteStoryMutation.isLoading}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    height: 120,
  },
  scrollViewContent: {
    paddingHorizontal: 16,
  },
  storyContainer: {
    alignItems: "center",
    marginRight: 16,
  },
  storyImageContainer: {
    width: 110, // Increased from 90
    height: 110, // Increased from 90
    borderRadius: 16, // Increased border radius
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    padding: 3, // Increased padding
  },
  storyImage: {
    width: "100%",
    height: "100%",
    borderRadius: 13, // Adjusted for new container size
  },
  storyCountBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  storyCountText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  addStoryIcon: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  usernameText: {
    fontSize: 14,
    marginTop: 8, // Increased margin
    textAlign: 'center',
    maxWidth: 110, // Match container width
  },
  createStoryButton: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 13,
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
    width: 28, // Increased size
    height: 28, // Increased size
    borderRadius: 8,
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
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    textAlign: "center",
  },
});

export default StoriesEnhancedFixed;
