/**
 * Enhanced Stories Component with UI Fixes and Direct Supabase Integration
 * Fixes all identified issues: avatar display, sizing, + icon, layout, and data fetching
 * Uses direct Supabase calls with Redis caching for optimal performance
 */

import React, { useEffect, useState, useRef, useCallback } from "react";
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
  TextInput,
  KeyboardAvoidingView,
  SafeAreaView,
  StatusBar,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import Modal from "react-native-modal";
import StoryViewer from "./StoryViewer";
import CachedImage from "./CachedImage";
import AntDesign from "@expo/vector-icons/AntDesign";
import { Ionicons, Feather } from "@expo/vector-icons";
import { VideoView, useVideoPlayer } from "expo-video";
import { supabase } from "../lib/supabase";
import { debounce } from "../lib/utils/debounce";
import {
  FILE_SIZE_LIMITS,
  generateCompressedThumbnail,
  showCompressionOptions,
  getFileInfo,
  formatFileSize,
  showFileSizeError,
  showStorageLimits
} from "../lib/utils/videoCompression";


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
  video_url?: string;
  thumbnail_url?: string;
  story_type?: 'image' | 'video';
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
          uri={latestStory.story_type === 'video' ? (latestStory.thumbnail_url || latestStory.image_url) : latestStory.image_url}
          style={styles.storyImage}
          showLoader={true}
          fallbackUri="https://via.placeholder.com/150"
        />

        {/* Video indicator for video stories */}
        {latestStory.story_type === 'video' && (
          <View style={styles.videoIndicator}>
            <Feather name="play" size={16} color="white" />
          </View>
        )}

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

interface StoriesProps {
  refreshTrigger?: number;
}

const Stories: React.FC<StoriesProps> = ({ refreshTrigger }) => {
  const { isDarkMode } = useTheme();
  // Get screen dimensions for responsive design
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const isSmallDevice = screenHeight < 700; // Detect small devices

  // Video Preview Component using expo-video
  const VideoPreview = ({ videoUri, colors }: { videoUri: string; colors: any }) => {
    const player = useVideoPlayer(videoUri, (player) => {
      player.loop = true;
      player.muted = true;
      player.play();
    });

    return (
      <View style={styles.videoPreviewContainer}>
        <VideoView
          style={[
            styles.imagePreview,
            {
              borderColor: colors.primary + '30',
            }
          ]}
          player={player}
          contentFit="cover"
          allowsFullscreen={false}
          allowsPictureInPicture={false}
        />
        <View style={styles.videoIndicatorPreview}>
          <Feather name="play" size={16} color="white" />
        </View>
      </View>
    );
  };

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
  const [selectedMediaType, setSelectedMediaType] = useState<'image' | 'video'>('image');
  const [storyCaption, setStoryCaption] = useState<string>('');
  const [debouncedCaption, setDebouncedCaption] = useState<string>('');
  const isRefreshingRef = useRef(false);
  const isFetchingRef = useRef(false);

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const { colors } = useTheme();

  // Create debounced function for caption updates
  const debouncedCaptionUpdate = useRef(
    debounce((caption: string) => {
      setDebouncedCaption(caption);
    }, 300) // 300ms delay to prevent excessive re-renders
  ).current;

  // Handle caption input changes
  const handleCaptionChange = useCallback((text: string) => {
    setStoryCaption(text); // Update immediately for UI responsiveness
    debouncedCaptionUpdate(text); // Debounced update for other components
  }, [debouncedCaptionUpdate]);



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
    // Prevent multiple simultaneous fetch calls
    if (isFetchingRef.current) {
      console.log('🚫 Fetch already in progress, skipping...');
      return;
    }

    try {
      isFetchingRef.current = true;
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
      isFetchingRef.current = false;
    }
  };

  // Handle pull-to-refresh
  const handleRefresh = useCallback(async () => {
    // Prevent multiple simultaneous refresh calls
    if (isRefreshingRef.current) {
      console.log('🚫 Refresh already in progress, skipping...');
      return;
    }

    try {
      isRefreshingRef.current = true;
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
      isRefreshingRef.current = false;
    }
  }, []);

  useEffect(() => {
    fetchStories();
  }, []);

  // Handle refresh trigger from parent component
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      console.log('🔄 Stories refresh triggered by parent, trigger value:', refreshTrigger);
      handleRefresh();
    }
  }, [refreshTrigger, handleRefresh]);

  // Group stories by user
  const { userGroupedStories, otherGroupedStories } = groupStoriesByUser(stories, userId);

  const handleCreateStory = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permissionResult.granted === false) {
        Alert.alert("Permission Required", "Please allow access to your photo library to create a story.");
        return;
      }

      // Show media type selection alert
      Alert.alert(
        "Create Story",
        "Choose media type for your story",
        [
          {
            text: "Photo",
            onPress: () => selectMedia('image'),
          },
          {
            text: "Video",
            onPress: () => selectMedia('video'),
          },
          {
            text: "Cancel",
            style: "cancel",
          },
        ]
      );
    } catch (error) {
      console.error("Error creating story:", error);
      Alert.alert("Error", "Failed to create story. Please try again.");
    }
  };

  const selectMedia = async (mediaType: 'image' | 'video') => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: mediaType === 'image' ? ['images'] : ['videos'],
        allowsEditing: false, // Disable editing to prevent system compression
        quality: 1.0, // Maintain original quality for preview
        allowsMultipleSelection: false,
        exif: false,
        base64: false,
        videoMaxDuration: 30, // 30 seconds max for stories
      });

      if (!result.canceled && result.assets[0]) {
        const mediaUri = result.assets[0].uri;
        const selectedMediaType = result.assets[0].type === 'video' ? 'video' : 'image';

        // Validate file size before proceeding
        const fileSizeLimit = selectedMediaType === 'video'
          ? FILE_SIZE_LIMITS.STORIES_VIDEO
          : FILE_SIZE_LIMITS.STORIES_IMAGE;

        try {
          const fileInfo = await getFileInfo(mediaUri);
          console.log(`Selected ${selectedMediaType} size: ${formatFileSize(fileInfo.size)}`);

          if (fileInfo.sizeInMB > fileSizeLimit) {
            // Show detailed error with specific guidance
            showFileSizeError(
              fileInfo,
              fileSizeLimit,
              selectedMediaType,
              () => {
                // User wants to try again - reopen media picker
                selectMedia(mediaType);
              }
            );
          } else {
            // File size is acceptable
            dispatch(showPreviewModal(mediaUri));
            setSelectedMediaType(selectedMediaType);
          }
        } catch (sizeError) {
          console.error("Error checking file size:", sizeError);
          // If we can't check size, proceed anyway but warn user
          Alert.alert(
            "Warning",
            "Unable to verify file size. The upload may fail if the file is too large.",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Continue",
                onPress: () => {
                  dispatch(showPreviewModal(mediaUri));
                  setSelectedMediaType(selectedMediaType);
                }
              }
            ]
          );
        }
      }
    } catch (error) {
      console.error("Error selecting media:", error);
      Alert.alert("Error", "Failed to select media. Please try again.");
    }
  };

  const handlePostStory = async () => {
    if (!croppedImage || !userId) return;

    dispatch(showLoadingModal());
    dispatch(hidePreviewModal());

    try {
      let uploadResult;
      let thumbnailUrl;

      if (selectedMediaType === 'video') {
        // Check file size before upload
        const fileInfo = await getFileInfo(croppedImage);
        console.log(`Uploading video: ${formatFileSize(fileInfo.size)}`);

        if (fileInfo.sizeInMB > FILE_SIZE_LIMITS.STORIES_VIDEO) {
          console.warn(`Video size (${fileInfo.sizeInMB.toFixed(1)}MB) exceeds limit, but proceeding with upload...`);
        }

        // Generate compressed thumbnail for video
        let thumbnailUri;
        try {
          thumbnailUri = await generateCompressedThumbnail(croppedImage, 0.7);
          console.log('✅ Video thumbnail generated successfully');
        } catch (thumbnailError) {
          console.error("Error generating thumbnail:", thumbnailError);
          // Continue without thumbnail if generation fails
        }

        // Upload video
        const videoFileName = `story_${Date.now()}.mp4`;
        uploadResult = await storiesAPI.uploadVideo({
          uri: croppedImage, // This is actually the video URI
          name: videoFileName,
          type: 'video/mp4',
        });

        // Upload thumbnail if generated
        if (thumbnailUri) {
          try {
            const thumbnailFileName = `story_thumbnail_${Date.now()}.jpg`;
            const thumbnailUploadResult = await storiesAPI.uploadImage({
              uri: thumbnailUri,
              name: thumbnailFileName,
              type: 'image/jpeg',
            });
            thumbnailUrl = thumbnailUploadResult.publicUrl;
          } catch (thumbnailUploadError) {
            console.error("Error uploading thumbnail:", thumbnailUploadError);
            // Use video URL as fallback
            thumbnailUrl = uploadResult.publicUrl;
          }
        } else {
          // Use video URL as fallback
          thumbnailUrl = uploadResult.publicUrl;
        }
      } else {
        // Check image file size
        const fileInfo = await getFileInfo(croppedImage);
        console.log(`Uploading image: ${formatFileSize(fileInfo.size)}`);

        if (fileInfo.sizeInMB > FILE_SIZE_LIMITS.STORIES_IMAGE) {
          console.warn(`Image size (${fileInfo.sizeInMB.toFixed(1)}MB) exceeds limit, but proceeding with upload...`);
        }

        // Upload image
        const fileName = `story_${Date.now()}.jpg`;
        uploadResult = await storiesAPI.uploadImage({
          uri: croppedImage,
          name: fileName,
          type: 'image/jpeg',
        });
      }

      // Create the story with the uploaded media URL and caption
      await storiesAPI.createStory(
        uploadResult.publicUrl,
        userId,
        storyCaption || undefined, // Pass caption if provided
        undefined, // No shared content
        selectedMediaType, // Pass the media type
        selectedMediaType === 'video' ? thumbnailUrl : undefined // Pass thumbnail for videos
      );

      console.log('✅ Story created successfully');
      dispatch(hideLoadingModal());
      dispatch(clearCroppedImage());

      // Reset caption and media type
      setStoryCaption('');
      setSelectedMediaType('image');

      // Refresh stories to show the new story
      await fetchStories();
    } catch (error) {
      console.error("Error posting story:", error);
      dispatch(hideLoadingModal());

      // Show more specific error message
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      if (errorMessage.includes("exceeded the maximum allowed size")) {
        Alert.alert(
          "Upload Failed - File Too Large",
          `The file exceeds the 5MB limit for Stories.\n\nOptions:\n• Select a smaller file\n• Use Reels for videos up to 50MB\n• Compress the file before uploading\n\nTip: Record shorter videos (15-20 seconds) for Stories.`,
          [
            { text: "View Limits", onPress: () => showStorageLimits() },
            { text: "OK" }
          ]
        );
      } else {
        Alert.alert("Error", `Failed to create story: ${errorMessage}`);
      }
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
        animationIn="slideInUp"
        animationOut="slideOutDown"
        backdropOpacity={0.9}
        avoidKeyboard={true}
        useNativeDriverForBackdrop={true}
        hideModalContentWhileAnimating={true}
      >
        <View style={styles.safeAreaContainer}>
          <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
          <KeyboardAvoidingView
            style={styles.keyboardAvoidingView}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
          >
            <ThemedGradient style={styles.previewContainer}>

              {/* HEADER SECTION - Fixed at top */}
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
                <TouchableOpacity
                  onPress={() => showStorageLimits()}
                  style={[styles.headerIconButton, {
                    backgroundColor: isDarkMode ? 'rgba(128, 128, 128, 0.2)' : 'rgba(128, 128, 128, 0.1)',
                    borderColor: isDarkMode ? 'rgba(128, 128, 128, 0.5)' : 'rgba(128, 128, 128, 0.3)'
                  }]}
                >
                  <Feather name="info" size={16} color={colors.text} />
                </TouchableOpacity>
              </View>

              {/* MIDDLE SECTION - Content preview (flexible) */}
              <View style={styles.contentSection}>
                <View style={styles.imagePreviewContainer}>
                  {croppedImage ? (
                    selectedMediaType === 'video' ? (
                      <VideoPreview
                        videoUri={croppedImage}
                        colors={colors}
                      />
                    ) : (
                      <Image
                        source={{
                          uri: croppedImage,
                          cache: 'force-cache'
                        }}
                        style={[
                          styles.imagePreview,
                          {
                            borderColor: colors.primary + '30',
                          }
                        ]}
                        resizeMode="contain"
                        fadeDuration={0}
                        // Additional props for maximum quality
                        loadingIndicatorSource={undefined}
                        progressiveRenderingEnabled={true}
                        onError={(error) => {
                          console.error('Image loading error:', error);
                        }}
                      />
                    )
                  ) : (
                    <Text style={{ color: 'white' }}>No media selected</Text>
                  )}
                </View>
              </View>

              {/* FOOTER SECTION - Fixed at bottom */}
              <View style={styles.footerSection}>
                {/* Caption Input */}
                <View style={styles.captionContainer}>
                  <TextInput
                    style={[styles.captionInput, {
                      borderColor: colors.primary + '30',
                      color: colors.text,
                      backgroundColor: isDarkMode ? 'rgba(128, 128, 128, 0.1)' : 'rgba(128, 128, 128, 0.05)',
                    }]}
                    placeholder="Add a caption to your story..."
                    placeholderTextColor={colors.textSecondary}
                    value={storyCaption}
                    onChangeText={handleCaptionChange}
                    multiline={true}
                    maxLength={200}
                    textAlignVertical="top"
                  />
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
              </View>

            </ThemedGradient>
          </KeyboardAvoidingView>
        </View>
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
  videoIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
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
    justifyContent: "flex-end", // Align to bottom for full screen modal
    alignItems: "center",
  },
  safeAreaContainer: {
    flex: 1,
    backgroundColor: 'transparent',
    width: '100%', // Full width
    height: '100%', // Full height
  },
  keyboardAvoidingView: {
    flex: 1,
    width: '100%',
  },
  previewContainer: {
    flex: 1,
    width: '100%', // Full width
    height: '100%', // Full height
    justifyContent: 'flex-start',
  },
  previewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 25, // Account for status bar
    paddingBottom: 15,
    borderBottomWidth: 1,
    backgroundColor: 'transparent',
    minHeight: Platform.OS === 'ios' ? 90 : 65, // Fixed header height with status bar
    width: '100%',
  },
  contentSection: {
    flex: 1, // Takes remaining space between header and footer
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
  },
  footerSection: {
    backgroundColor: 'transparent',
    paddingBottom: Platform.OS === 'ios' ? 10 : 20, // Extra padding for safe area
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
    flex: 1, // Take available space in content section
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    width: '100%', // Full width
    maxHeight: '100%', // Ensure it doesn't overflow
  },
  imagePreview: {
    width: '100%', // Full width
    height: '100%',
    // Remove maxHeight constraint to allow full resolution
    // Remove aspectRatio to prevent unwanted scaling
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: 'transparent',
    overflow: 'hidden',
    alignSelf: 'center', // Center the preview
  },
  postButton: {
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 15,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
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
  videoPreviewContainer: {
    position: 'relative',
    width: '100%',
    height: '100%',
    maxHeight: 500,
    aspectRatio: 9/16, // Maintain story aspect ratio
    alignSelf: 'center', // Center the video container
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoIndicatorPreview: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captionContainer: {
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 10,
  },
  captionInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 50, // Compact height for footer
    maxHeight: 80, // Limit height to prevent overflow
    textAlignVertical: 'top',
    flexShrink: 1, // Allow input to shrink when keyboard appears
  },

});

export default Stories;
