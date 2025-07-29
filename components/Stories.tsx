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
  Dimensions,
  RefreshControl,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import Modal from "react-native-modal";
import StoryViewer from "./StoryViewer";
import CachedImage from "./CachedImage";
import AntDesign from "@expo/vector-icons/AntDesign";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";
import { storiesAPI } from "@/lib/storiesApi";
import { cacheManager } from "../lib/utils/cacheManager";
import DeleteModal from "./DeleteModal";
import StorySelectionModal from "./StorySelectionModal";
import { useTheme } from "@/src/context/ThemeContext";
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/src/store/store';
import {
  setStories,
  setLoading,
  setError,
  showStorySelectionModal,
  hideStorySelectionModal,
  showDeleteModal,
  hideDeleteModal,
  showStoryViewer,
  hideStoryViewer,
  showPreviewModal,
  hidePreviewModal,
  showLoadingModal,
  hideLoadingModal,
  clearCroppedImage,
  removeStory,
} from '@/src/store/slices/storiesSlice';
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

interface GroupedStory {
  user_id: string;
  user: {
    username: string;
    avatar: string;
  };
  stories: Story[];
  hasUnviewed: boolean;
  latestStory: Story;
}

interface StoryProps {
  groupedStory: GroupedStory;
  isYourStory?: boolean;
}

const StoryItem = ({
  groupedStory,
  isYourStory,
  onPress,
  onDelete,
  onLongPressDelete,
}: StoryProps & {
  onPress?: () => void;
  onDelete?: () => void;
  onLongPressDelete?: () => void;
}) => {
  const { colors } = useTheme();
  const { latestStory, hasUnviewed, stories } = groupedStory;

  return (
    <TouchableOpacity style={styles.storyContainer} onPress={onPress}>
      <View style={[
        styles.storyImageContainer,
        {
          borderColor: hasUnviewed ? colors.primary : 'rgba(128, 128, 128, 0.7)',
          borderWidth: hasUnviewed ? 3 : 2,
        }
      ]}>
        <CachedImage
          uri={latestStory.image_url}
          style={styles.storyImage}
          showLoader={true}
          fallbackUri="https://via.placeholder.com/150"
        />

        {/* Story count indicator for multiple stories */}
        {stories.length > 1 && (
          <View style={[
            styles.storyCountIndicator,
            { backgroundColor: `${colors.backgroundSecondary}E0` }
          ]}>
            <Text style={[styles.storyCountText, { color: colors.text }]}>
              {stories.length}
            </Text>
          </View>
        )}

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
            onLongPress={onLongPressDelete}
            delayLongPress={500}
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
        {isYourStory ? "Your Story" : groupedStory.user.username}
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
  const { colors, isDarkMode } = useTheme();

  return (
    <TouchableOpacity style={styles.storyContainer} onPress={onPress}>
      <View style={[
        styles.createStoryImageContainer,
        {
          borderColor: 'rgba(128, 128, 128, 0.7)',
          backgroundColor: 'rgba(128, 128, 128, 0.1)'
        }
      ]}>
        {userAvatar ? (
          <>
            <CachedImage
              uri={userAvatar}
              style={styles.createStoryImage}
              showLoader={true}
              fallbackUri="https://via.placeholder.com/150"
            />
            <View style={[
              styles.addStoryIcon,
              {
                backgroundColor: isDarkMode ? 'rgba(128, 128, 128, 0.8)' : 'rgba(128, 128, 128, 0.9)',
                borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 1)'
              }
            ]}>
              <Ionicons name="add" size={18} color={colors.text} />
            </View>
          </>
        ) : (
          <View style={[
            styles.createStoryButton,
            { backgroundColor: 'rgba(128, 128, 128, 0.2)' }
          ]}>
            <Ionicons name="add" size={28} color={colors.text} />
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

// Helper function to group stories by user
const groupStoriesByUser = (stories: Story[], currentUserId: string | null): { userGroupedStories: GroupedStory[], otherGroupedStories: GroupedStory[] } => {
  const grouped = stories.reduce((acc, story) => {
    const userId = story.user_id;
    if (!acc[userId]) {
      acc[userId] = [];
    }
    acc[userId].push(story);
    return acc;
  }, {} as Record<string, Story[]>);

  const userGroupedStories: GroupedStory[] = [];
  const otherGroupedStories: GroupedStory[] = [];

  Object.entries(grouped).forEach(([userId, userStories]) => {
    // Sort stories by creation date (newest first)
    const sortedStories = userStories.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    const groupedStory: GroupedStory = {
      user_id: userId,
      user: sortedStories[0].user,
      stories: sortedStories,
      latestStory: sortedStories[0],
      hasUnviewed: sortedStories.some(story =>
        currentUserId ? !story.viewed_by.includes(currentUserId) : true
      ),
    };

    if (userId === currentUserId) {
      userGroupedStories.push(groupedStory);
    } else {
      otherGroupedStories.push(groupedStory);
    }
  });

  return { userGroupedStories, otherGroupedStories };
};

const Stories = () => {
  const { isDarkMode } = useTheme();
  // Get screen dimensions for responsive design
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const isSmallDevice = screenHeight < 700; // Detect small devices

  // Redux state
  const dispatch = useDispatch();
  const {
    stories,
    loading,
    storySelectionModalVisible,
    groupedStoryToDelete,
    isDeleteModalVisible,
    storyToDelete,
    isViewerVisible,
    viewerStories,
    viewerStartIndex,
    isPreviewModalVisible,
    isLoadingModalVisible,
    croppedImage,
  } = useSelector((state: RootState) => state.stories);

  // Local state for user data
  const [userId, setUserId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const { colors } = useTheme();



  // Get current user and profile
  useEffect(() => {
    const initializeUser = async () => {
      if(!supabase) return;
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

  // Fetch stories with enhanced caching
  const fetchStories = async (skipCache = false) => {
    try {
      dispatch(setLoading(true));

      // Check cache first (unless skipping cache for refresh)
      if (!skipCache) {
        const cachedStories = cacheManager.get("stories");
        if (cachedStories) {
          console.log("📦 Loading stories from cache");
          console.log("Cache status:", cacheManager.getStatus("stories"));
          dispatch(setStories(cachedStories));
          dispatch(setLoading(false));
          return;
        }
      }

      console.log("🌐 Fetching stories from API");
      const fetchedStories = await storiesAPI.getActiveStories();
      console.log("✅ Fetched stories from API:", fetchedStories?.length || 0, "stories");

      if (fetchedStories && fetchedStories.length > 0) {
        dispatch(setStories(fetchedStories));
        cacheManager.set("stories", fetchedStories);
        console.log("💾 Stories cached successfully");
        console.log("Cache status after set:", cacheManager.getStatus("stories"));
      } else {
        dispatch(setStories([]));
      }
    } catch (error) {
      console.error("❌ Error fetching stories:", error);
      dispatch(setError(error instanceof Error ? error.message : 'Failed to fetch stories'));

      // Try to load from cache as fallback
      const cachedStories = cacheManager.get("stories");
      if (cachedStories) {
        console.log("🔄 Loading stories from cache as fallback");
        dispatch(setStories(cachedStories));
      } else {
        console.log("📭 No cached stories available");
        dispatch(setStories([]));
      }
    } finally {
      dispatch(setLoading(false));
    }
  };

  // Handle pull-to-refresh
  const handleRefresh = async () => {
    try {
      setRefreshing(true);

      // Clear cache to ensure fresh data
      cacheManager.remove("stories");
      console.log('🔄 Cache cleared for refresh');

      // Fetch fresh stories (skip cache)
      await fetchStories(true);

      console.log('✅ Stories refreshed successfully');
    } catch (error) {
      console.error("Error refreshing stories:", error);
      Alert.alert("Error", "Failed to refresh stories. Please try again.");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStories();
  }, []);

  // Group stories by user
  const { userGroupedStories, otherGroupedStories } = groupStoriesByUser(stories, userId);

  const handleCreateStory = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permissionResult.granted === false) {
        Alert.alert("Permission Required", "Please allow access to your photo library to create a story.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        // Remove fixed aspect ratio to allow free cropping
        quality: 1.0, // Maximum quality to prevent blur
        allowsMultipleSelection: false,
        exif: false, // Reduce file size without affecting visual quality
        base64: false, // Don't include base64 to save memory
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        dispatch(showPreviewModal(imageUri));
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image. Please try again.");
    }
  };

  const handlePostStory = async () => {
    if (!croppedImage || !userId) return;

    dispatch(showLoadingModal());
    dispatch(hidePreviewModal());

    try {
      // First upload the image
      const fileName = `story_${Date.now()}.jpg`;
      const uploadResult = await storiesAPI.uploadImage({
        uri: croppedImage,
        name: fileName,
        type: 'image/jpeg',
      });

      // Then create the story with the uploaded image URL
      await storiesAPI.createStory(uploadResult.publicUrl, userId);
      
      console.log('✅ Story created successfully');
      dispatch(hideLoadingModal());
      dispatch(clearCroppedImage());
      
      // Refresh stories to show the new story
      await fetchStories();
    } catch (error) {
      console.error("Error posting story:", error);
      dispatch(hideLoadingModal());
      Alert.alert("Error", "Failed to create story. Please try again.");
    }
  };

  const handleGroupedStoryPress = (groupedStory: GroupedStory) => {
    // Set the stories for the viewer to only include this user's stories
    dispatch(showStoryViewer({ stories: groupedStory.stories, startIndex: 0 }));
  };

  const handleDeleteGroupedStory = (groupedStory: GroupedStory, forceSelectionModal = false) => {
    // Always show selection modal if forced, or if user has multiple stories
    if (forceSelectionModal || groupedStory.stories.length > 1) {
      dispatch(showStorySelectionModal(groupedStory));
    } else {
      // If only one story and not forced, delete directly
      dispatch(showDeleteModal(groupedStory.latestStory.id));
    }
  };

  const confirmDeleteStory = async () => {
    if (!storyToDelete) return;

    try {
      await storiesAPI.deleteStory(storyToDelete);
      console.log('✅ Story deleted successfully');
      dispatch(hideDeleteModal());

      // Clear cache to ensure fresh data
      cacheManager.remove("stories");

      // Refresh stories to update the list
      await fetchStories();
    } catch (error) {
      console.error("Error deleting story:", error);
      Alert.alert("Error", "Failed to delete story. Please try again.");
    }
  };

  const handleDeleteIndividualStory = async (storyId: string) => {
    try {
      await storiesAPI.deleteStory(storyId);
      console.log('✅ Individual story deleted successfully');

      // Remove story from Redux state immediately
      dispatch(removeStory(storyId));

      // Clear cache to ensure fresh data
      cacheManager.remove("stories");
      console.log('🗑️ Cache cleared after story deletion');

      // Refresh stories to update the list
      await fetchStories();
    } catch (error) {
      console.error("Error deleting individual story:", error);
      Alert.alert("Error", "Failed to delete story. Please try again.");
    }
  };



  if (loading && stories.length === 0) {
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
            progressBackgroundColor={colors.backgroundSecondary}
          />
        }
      >
        {/* Create Story Button */}
        <CreateStoryItem 
          userAvatar={userProfile?.avatar_url}
          onPress={handleCreateStory}
        />

        {/* User's Own Stories (if any) */}
        {userGroupedStories.map((groupedStory) => (
          <StoryItem
            key={groupedStory.user_id}
            groupedStory={groupedStory}
            isYourStory={true}
            onPress={() => handleGroupedStoryPress(groupedStory)}
            onDelete={() => handleDeleteGroupedStory(groupedStory)}
            onLongPressDelete={() => handleDeleteGroupedStory(groupedStory, true)}
          />
        ))}

        {/* Other Users' Stories */}
        {otherGroupedStories.map((groupedStory) => (
          <StoryItem
            key={groupedStory.user_id}
            groupedStory={groupedStory}
            isYourStory={false}
            onPress={() => handleGroupedStoryPress(groupedStory)}
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
            <TouchableOpacity
              onPress={() => dispatch(hidePreviewModal())}
              style={[styles.headerIconButton, {
                backgroundColor: isDarkMode ? 'rgba(128, 128, 128, 0.2)' : 'rgba(128, 128, 128, 0.1)',
                borderColor: isDarkMode ? 'rgba(128, 128, 128, 0.5)' : 'rgba(128, 128, 128, 0.3)'
              }]}
            >
              <AntDesign name="close" size={20} color={colors.text} />
            </TouchableOpacity>
            <Text
              className="font-rubik-bold"
              style={[styles.previewTitle, { color: colors.text }]}
            >
              Preview Story
            </Text>
            <View style={{ width: 44 }} />
          </View>

          <View style={[
            styles.imagePreviewContainer,
            { minHeight: isSmallDevice ? 300 : 400 }
          ]}>
            {croppedImage ? (
              <Image
                  source={{
                    uri: croppedImage,
                    cache: 'force-cache' // Ensure high quality caching
                  }}
                  style={[
                    styles.imagePreview,
                    {
                      borderColor: colors.primary + '30',
                      width: screenWidth - 64, // Responsive width
                    }
                  ]}
                  resizeMode="cover"
                  fadeDuration={0}
                  onError={(error) => {
                    console.error('Image loading error:', error);
                  }}
                />
            ) : (
              <Text style={{ color: 'white' }}>No image selected</Text>
            )}
          </View>

          <TouchableOpacity
            style={[styles.postButton, {
              backgroundColor: isDarkMode ? 'rgba(128, 128, 128, 0.1)' : 'rgba(128, 128, 128, 0.1)',
              borderColor: isDarkMode ? 'rgba(128, 128, 128, 0.3)' : 'rgba(128, 128, 128, 0.3)'
            }]}
            onPress={handlePostStory}
          >
            <Text
              className="font-rubik-bold"
              style={[styles.postButtonText, { color: colors.text }]}
            >
              Post Story
            </Text>
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
        onBackButtonPress={() => dispatch(hideStoryViewer())}
        onBackdropPress={() => dispatch(hideStoryViewer())}
      >
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <StoryViewer
            stories={viewerStories}
            currentIndex={viewerStartIndex}
            onClose={() => dispatch(hideStoryViewer())}
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
        cancel={() => dispatch(hideDeleteModal())}
        confirm={confirmDeleteStory}
        title="Delete Story"
        desc="Are you sure you want to delete this story? This action cannot be undone."
      />

      {/* Story Selection Modal for Multiple Stories */}
      <StorySelectionModal
        isVisible={storySelectionModalVisible}
        groupedStory={groupedStoryToDelete}
        onClose={() => dispatch(hideStorySelectionModal())}
        onDeleteStory={handleDeleteIndividualStory}
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
    width: 90, // Fixed size for consistency
    height: 90, // Fixed size for consistency
    borderRadius: 14, // Consistent border radius
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    padding: 3,
  },
  createStoryImageContainer: {
    width: 90, // Same size as story items
    height: 90, // Same size as story items
    borderRadius: 14, // Same border radius
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    padding: 3,
  },
  storyImage: {
    width: "100%",
    height: "100%",
    borderRadius: 11, // Consistent with container size
  },
  createStoryImage: {
    width: "100%",
    height: "100%",
    borderRadius: 11, // Same as story image
  },
  storyCountIndicator: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyCountText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
  },
  addStoryIcon: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 24, // Slightly smaller
    height: 24, // Slightly smaller
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  usernameText: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    maxWidth: 90, // Match consistent container width
  },
  createStoryButton: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 11, // Adjusted for smaller container
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
    maxHeight: '100%', // Ensure it doesn't exceed screen height
  },
  previewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 10 : 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerIconButton: {
    padding: 12,
    borderRadius: 50,
    borderWidth: 1.5,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  imagePreviewContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 20,
    minHeight: 400, // Ensure minimum height for small devices
  },
  imagePreview: {
    width: '100%',
    height: 400,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  postButton: {
    marginHorizontal: 20,
    marginVertical: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    maxWidth: 300, // Limit width for better appearance on larger screens
    alignSelf: 'center',
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

export default Stories;
