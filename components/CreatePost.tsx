import * as ImageManipulator from "expo-image-manipulator";
import * as Location from "expo-location";
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  SafeAreaView,
  Modal,
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Feather, MaterialIcons, FontAwesome5, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Carousel from "react-native-reanimated-carousel";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { postsAPI } from "@/lib/postsApi";
import { notificationsAPI } from "@/lib/notificationsApi";
import * as Haptics from 'expo-haptics';
import ThemedGradient from "@/components/ThemedGradient";
import { useTheme } from "@/src/context/ThemeContext";

const TAB_BAR_HEIGHT = 90;
const TAB_BAR_MARGIN = 24;
const EMOJIS = ["😊", "😂", "❤️", "👍", "🎉", "🔥", "🌟", "💖", "😍", "🤩", "👏", "✨", "🙌", "💯", "🥰", "😎", "🤗", "💕", "👌", "🌈"];
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const CreatePost = ({ onPostCreated }: { onPostCreated: () => void }) => {
  const { colors, isDarkMode } = useTheme();

  // User and content state
  const [userId, setUserId] = useState<string | null>(null);
  const [media, setMedia] = useState<Array<{ uri: string; type: 'image' }>>([]);
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState<string | null>(null);
  const [taggedUsers, setTaggedUsers] = useState<Array<{ id: string; username: string }>>([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ id: string; username: string; avatar: string }>>([]);
  const [isTagging, setIsTagging] = useState(false);
  const [step, setStep] = useState<"select" | "edit" | "details">("select");
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  const scaleValue = new Animated.Value(1);

  const filters = [
    { name: "Original", filter: null },
    { name: "Clarendon", filter: { brightness: 1.1, contrast: 1.2, saturation: 1.1 } },
    { name: "Juno", filter: { contrast: 1.1, saturation: 1.2 } },
    { name: "Ludwig", filter: { brightness: 1.05, contrast: 1.05 } },
    { name: "Valencia", filter: { brightness: 1.08, contrast: 0.98, saturation: 1.1 } },
    { name: "Sepia", filter: { sepia: 1 } },
    { name: "Negative", filter: { contrast: -1, brightness: -1 } },
  ];

  useEffect(() => {
    const fetchUser = async () => {
      if (!supabase) {
        console.error("Supabase client is not initialized");
        alert("Failed to initialize. Please try again later.");
        return;
      }

      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        console.error("Error fetching user:", error);
        alert("Failed to authenticate. Please sign in again.");
        return;
      }
      if (user) {
        setUserId(user.id);
        // Sync user with profiles table
        try {
          const { data: existingUser } = await supabase
            .from("profiles")
            .select("id")
            .eq("user_id", user.id)
            .single();

          if (!existingUser) {
            const username = `user_${Math.random().toString(36).substring(2, 10)}`;
            await supabase.from("profiles").insert({
              user_id: user.id,
              username,
              avatar_url: "",
            });
          }
        } catch (syncError) {
          console.error("Error syncing user with profiles:", syncError);
          alert("Failed to sync user profile. Please try again.");
        }
      }
    };
    fetchUser();
  }, []);

  const compressImage = async (uri: string) => {
    try {
      const manipResult = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1080 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );

      const fileInfo = await fetch(manipResult.uri);
      const blob = await fileInfo.blob();

      if (blob.size > 1048576) {
        return await ImageManipulator.manipulateAsync(
          manipResult.uri,
          [{ resize: { width: 720 } }],
          { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG }
        );
      }

      return manipResult;
    } catch (error) {
      console.error("Error compressing image:", error);
      throw error;
    }
  };

  const applyFilter = async (filter: any) => {
    if (media.length === 0 || activeMediaIndex >= media.length) return;

    try {
      let manipResult;
      if (filter) {
        manipResult = await ImageManipulator.manipulateAsync(
          media[activeMediaIndex].uri,
          [],
          filter
        );
      } else {
        const originalUri = media[activeMediaIndex].uri;
        manipResult = await ImageManipulator.manipulateAsync(originalUri, [], {});
      }

      const newMedia = [...media];
      newMedia[activeMediaIndex] = { ...newMedia[activeMediaIndex], uri: manipResult.uri };
      setMedia(newMedia);
    } catch (error) {
      console.error("Error applying filter:", error);
      alert("Failed to apply filter. Please try again.");
    }
  };

  const pickMedia = useCallback(async () => {
    try {
      // Provide haptic feedback when starting media selection
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Request permissions if needed
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          "Permission Required",
          "Please allow access to your photo library to select images.",
          [{ text: "OK", style: "default" }]
        );
        return;
      }

      // Show loading indicator
      setLoading(true);

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        allowsMultipleSelection: true,
        quality: 1,
        selectionLimit: 10,
        exif: false,
      });

      if (!result.canceled) {
        // Process and compress images with progress updates
        const totalImages = result.assets.length;
        const processedMedia = [];

        for (let i = 0; i < result.assets.length; i++) {
          const asset = result.assets[i];
          setUploadProgress((i / totalImages) * 100);
          const compressed = await compressImage(asset.uri);
          processedMedia.push({ uri: compressed.uri, type: 'image' as const });
        }

        setMedia((prev) => [...prev, ...processedMedia]);
        setStep("edit");

        // Success feedback
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        // Cancelled feedback
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    } catch (error) {
      console.error("Error picking media:", error);
      Alert.alert("Error", "Failed to load images. Please try again.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  }, []);

  const getLocation = useCallback(async () => {
    try {
      // Provide haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Show location modal
      setShowLocationModal(true);

      // Request location permission
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          "Permission Required",
          "Please allow access to your location to add it to your post.",
          [{ text: "OK", style: "default" }]
        );
        setShowLocationModal(false);
        return;
      }

      // Show loading indicator
      setLoading(true);

      // Get current location with better accuracy
      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 5000,
      });

      // Get address from coordinates
      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (reverseGeocode[0]) {
        const { city, region, country } = reverseGeocode[0];
        const locationString = [city, region, country].filter(Boolean).join(", ");
        setLocation(locationString);

        // Success feedback
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert("Location Error", "Could not determine your location. Please try again.");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (error) {
      console.error("Error getting location:", error);
      Alert.alert(
        "Location Error",
        "Failed to get your location. Please check your connection and try again."
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
      setShowLocationModal(false);
    }
  }, []);

  const searchUsers = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const results = await postsAPI.searchUsers(query);
      setSearchResults(results);
    } catch (error) {
      console.error("Error searching users:", error);
      alert("Failed to search users. Please try again.");
    }
  };

  const handleTagUser = (user: { id: string; username: string }) => {
    if (!taggedUsers.some(u => u.id === user.id)) {
      setTaggedUsers([...taggedUsers, user]);
    }
    setSearchQuery("");
  };

  const removeTaggedUser = (userId: string) => {
    setTaggedUsers(taggedUsers.filter(user => user.id !== userId));
  };

  const handlePost = useCallback(async () => {
    // Validate user is signed in
    if (!userId) {
      Alert.alert("Authentication Required", "Please sign in to create a post");
      return;
    }

    // Validate media is selected
    if (media.length === 0) {
      Alert.alert("Media Required", "Please select at least one image for your post");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    // Confirm post creation
    if (caption.trim() === "") {
      Alert.alert(
        "Add Caption?",
        "You haven't added a caption to your post. Do you want to continue without a caption?",
        [
          {
            text: "Add Caption",
            style: "cancel",
            onPress: () => {
              // Focus on caption input
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
          },
          {
            text: "Continue",
            onPress: () => createPost()
          }
        ]
      );
    } else {
      createPost();
    }
  }, [userId, media, caption, taggedUsers, location]);

  // Separate function to handle the actual post creation
  const createPost = async () => {
    try {
      // Start loading and provide feedback
      setLoading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Prepare image files with proper metadata
      const imageFiles = media.map((item, index) => ({
        uri: item.uri,
        name: `image_${Date.now()}_${index}.jpg`,
        type: 'image/jpeg',
        size: 0,
      }));

      // Track upload progress
      let currentProgress = 0;
      const progressInterval = setInterval(() => {
        if (currentProgress < 90) {
          currentProgress += 5;
          setUploadProgress(currentProgress);
        }
      }, 300);

      // Create the post
      const postData = await postsAPI.createPost(imageFiles, caption, userId, location);

      // Send notifications to tagged users
      if (taggedUsers.length > 0) {
        await Promise.all(
          taggedUsers.map(async (user) => {
            try {
              await notificationsAPI.createNotification(
                user.id,
                "mention",
                userId,
                postData.id
              );
            } catch (error) {
              console.error(`Failed to create notification for user ${user.id}:`, error);
            }
          })
        );
      }

      // Complete progress animation
      clearInterval(progressInterval);
      setUploadProgress(100);

      // Reset state
      setMedia([]);
      setCaption("");
      setActiveMediaIndex(0);
      setLocation(null);
      setTaggedUsers([]);
      setStep("select");

      // Success feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Notify parent component and close
      onPostCreated();
      onClose();
    } catch (error: any) {
      console.error("Post creation error:", error);

      // Error feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        "Post Creation Failed",
        error.message || "Failed to create your post. Please try again."
      );
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const handlePressIn = () => {
    Animated.spring(scaleValue, { toValue: 0.95, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleValue, { toValue: 1, useNativeDriver: true }).start();
  };

  const onClose = () => {
    router.replace("/home");
  };

  const removeMedia = (index: number) => {
    setMedia((prev) => prev.filter((_, i) => i !== index));
    if (activeMediaIndex >= index && activeMediaIndex > 0) {
      setActiveMediaIndex((prev) => prev - 1);
    }
    if (media.length === 1) {
      setStep("select");
    }
  };

  const insertEmoji = (emoji: string) => {
    setCaption(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const renderCarouselItem = ({
    item,
    index,
  }: {
    item: { uri: string; type: 'image' };
    index: number;
  }) => (
    <View style={styles.carouselItem}>
      <Image source={{ uri: item.uri }} style={styles.carouselImage} />
      <TouchableOpacity
        style={styles.removeImageButton}
        onPress={() => removeMedia(index)}
      >
        <Feather name="x-circle" size={24} color="#FFD700" />
      </TouchableOpacity>
    </View>
  );

  const renderEditScreen = () => (
    <View style={styles.editContainer}>
      <ScrollView
        style={styles.mainContentArea}
        contentContainerStyle={styles.mainContentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.carouselContainer}>
          <Carousel
            loop={false}
            width={SCREEN_WIDTH - 20}
            height={SCREEN_HEIGHT - 350}
            data={media}
            onSnapToItem={(index) => setActiveMediaIndex(index)}
            renderItem={renderCarouselItem}
          />
          {media.length > 1 && (
            <View style={styles.pagination}>
              {media.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.paginationDot,
                    index === activeMediaIndex && styles.paginationDotActive,
                  ]}
                />
              ))}
            </View>
          )}
          <TouchableOpacity style={styles.addMoreButton} onPress={pickMedia}>
            <Feather name="plus-circle" size={24} color="#FFD700" />
          </TouchableOpacity>
        </View>

        <View style={styles.filterSection}>
          <Text style={styles.filterSectionTitle}>Apply Filters</Text>
          <ScrollView horizontal style={styles.filterContainer} showsHorizontalScrollIndicator={false}>
            {filters.map((filter, index) => (
              <TouchableOpacity
                key={index}
                style={styles.filterOption}
                onPress={() => applyFilter(filter.filter)}
              >
                <Image
                  source={{ uri: media[activeMediaIndex]?.uri || '' }}
                  style={styles.filterThumbnail}
                />
                <Text style={styles.filterName}>{filter.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Add padding at the bottom to ensure content isn't hidden behind the next button */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      <View style={[styles.nextButtonContainer, {
        backgroundColor: colors.backgroundSecondary,
        borderTopColor: isDarkMode ? 'rgba(128, 128, 128, 0.2)' : 'rgba(128, 128, 128, 0.2)'
      }]}>
        <TouchableOpacity
          style={[styles.nextButton, {
            backgroundColor: isDarkMode ? '#808080' : '#606060',
            shadowOpacity: 0
          }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setStep("details");
          }}
        >
          <Feather name="arrow-right" size={20} color="#FFFFFF" style={styles.nextButtonIcon} />
          <Text style={[styles.nextButtonText, { color: "#FFFFFF" }]}>Next</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderDetailsScreen = () => (
    <View style={styles.detailsScreenContainer}>
      {/* Image Preview Section */}
      <View style={styles.imagePreviewSection}>
        <View style={styles.imagePreviewContainer}>
          <Image
            source={{ uri: media[activeMediaIndex]?.uri }}
            style={styles.previewImage}
            resizeMode="cover"
          />
          {media.length > 1 && (
            <View style={styles.mediaCountBadge}>
              <Text style={styles.mediaCountText}>+{media.length - 1}</Text>
            </View>
          )}
        </View>

        {media.length > 1 && (
          <View style={styles.thumbnailsContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.thumbnailsScroll}
            >
              {media.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => setActiveMediaIndex(index)}
                  style={[
                    styles.thumbnailWrapper,
                    index === activeMediaIndex && styles.activeThumbnail
                  ]}
                >
                  <Image
                    source={{ uri: item.uri }}
                    style={styles.thumbnailImage}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      {/* Caption Section */}
      <View style={styles.captionSection}>
        <Text style={styles.sectionTitle}>Caption</Text>
        <View style={styles.captionContainer}>
          <TextInput
            style={styles.captionInput}
            placeholder="Write a caption..."
            placeholderTextColor="rgba(255, 215, 0, 0.5)"
            multiline
            value={caption}
            onChangeText={setCaption}
          />
          <TouchableOpacity
            style={styles.emojiButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowEmojiPicker(!showEmojiPicker);
            }}
          >
            <Feather name="smile" size={24} color="#FFD700" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Options Section */}
      <View style={styles.optionsSection}>
        <Text style={styles.sectionTitle}>Options</Text>
        <View style={styles.optionsContainer}>
          <TouchableOpacity
            style={styles.optionButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setIsTagging(!isTagging);
            }}
          >
            <Feather name="user-plus" size={20} color="#FFD700" />
            <Text style={styles.optionText}>Tag People</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optionButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              getLocation();
            }}
          >
            <Feather name="map-pin" size={20} color="#FFD700" />
            <Text style={styles.optionText}>Add Location</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tagging Section */}
      {isTagging && (
        <View style={styles.taggingSection}>
          <Text style={styles.sectionTitle}>Tag People</Text>
          <View style={styles.taggingContainer}>
            <View style={styles.searchInputContainer}>
              <Feather name="search" size={16} color="#FFD700" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search users..."
                placeholderTextColor="rgba(255, 215, 0, 0.5)"
                value={searchQuery}
                onChangeText={(text) => {
                  setSearchQuery(text);
                  searchUsers(text);
                }}
              />
            </View>
            {searchResults.length > 0 && (
              <ScrollView style={styles.searchResults}>
                {searchResults.map((user) => (
                  <TouchableOpacity
                    key={user.id}
                    style={styles.userResult}
                    onPress={() => handleTagUser(user)}
                  >
                    <Text style={styles.username}>@{user.username}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      )}

      {/* Location Tag */}
      {location && (
        <View style={styles.locationSection}>
          <Text style={styles.sectionTitle}>Location</Text>
          <View style={styles.locationTag}>
            <Feather name="map-pin" size={16} color="#FFD700" />
            <Text style={styles.locationText}>{location}</Text>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setLocation(null);
              }}
              style={styles.removeLocationButton}
            >
              <Feather name="x" size={16} color="#FFD700" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Tagged Users */}
      {taggedUsers.length > 0 && (
        <View style={styles.taggedUsersSection}>
          <Text style={styles.sectionTitle}>Tagged Users</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.taggedUsersContainer}
          >
            {taggedUsers.map(user => (
              <View key={user.id} style={styles.taggedUser}>
                <Text style={styles.taggedUsername}>@{user.username}</Text>
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    removeTaggedUser(user.id);
                  }}
                  style={styles.removeTagButton}
                >
                  <Feather name="x" size={14} color="#FFD700" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Spacer to push the button to the bottom */}
      <View style={{ flex: 1 }} />
    </View>
  );

  return (
    <ThemedGradient style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === "ios" ? TAB_BAR_HEIGHT + TAB_BAR_MARGIN : 0}
      >
        <View style={[styles.header, {
          borderBottomColor: `${colors.primary}20`,
          backgroundColor: `${colors.backgroundSecondary}90`
        }]}>
          <TouchableOpacity
            onPress={() => {
              if (step !== "select") {
                setMedia([]);
                setStep("select");
              } else {
                onClose();
              }
            }}
            style={[styles.headerIconButton, {
              backgroundColor: isDarkMode ? 'rgba(128, 128, 128, 0.2)' : 'rgba(128, 128, 128, 0.1)',
              borderColor: isDarkMode ? 'rgba(128, 128, 128, 0.5)' : 'rgba(128, 128, 128, 0.3)'
            }]}
          >
            <Feather name={step === "select" ? "x" : "arrow-left"} size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={[styles.headerText, { color: colors.text }]}>Create Post</Text>
          <View style={{ width: 60 }} />
        </View>

        {step === "select" && (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.content}>
              <TouchableOpacity
                style={[styles.mediaPicker, {
                  backgroundColor: isDarkMode ? 'rgba(128, 128, 128, 0.1)' : 'rgba(128, 128, 128, 0.1)',
                  borderColor: isDarkMode ? 'rgba(128, 128, 128, 0.3)' : 'rgba(128, 128, 128, 0.3)'
                }]}
                onPress={pickMedia}
              >
                <Feather name="image" size={40} color={isDarkMode ? '#808080' : '#606060'} />
                <Text style={[styles.mediaPickerText, { color: colors.text }]}>Tap to select images</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}

        {step === "edit" && renderEditScreen()}

        {step === "details" && (
          <View style={styles.detailsWrapper}>
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              {renderDetailsScreen()}
            </ScrollView>

            {/* Share Post Button at extreme bottom */}
            <View style={[styles.shareButtonContainer, {
              backgroundColor: colors.backgroundSecondary,
              borderTopColor: isDarkMode ? 'rgba(128, 128, 128, 0.2)' : 'rgba(128, 128, 128, 0.2)'
            }]}>
              <TouchableOpacity
                style={[styles.shareButton, {
                  backgroundColor: isDarkMode ? '#808080' : '#606060',
                  shadowOpacity: 0
                }]}
                onPress={handlePost}
                disabled={loading}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
              >
                <Animated.View style={{ transform: [{ scale: scaleValue }], flexDirection: 'row', alignItems: 'center' }}>
                  <Feather name="upload" size={20} color="#FFFFFF" style={styles.shareButtonIcon} />
                  <Text style={[styles.shareButtonText, { color: "#FFFFFF" }]}>Share Post</Text>
                </Animated.View>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>

      {showEmojiPicker && (
        <View style={[styles.emojiPickerContainer, {
          backgroundColor: colors.backgroundSecondary,
          borderColor: isDarkMode ? 'rgba(128, 128, 128, 0.3)' : 'rgba(128, 128, 128, 0.3)'
        }]}>
          <TouchableOpacity
            style={[styles.closeEmojiPicker, {
              backgroundColor: `${colors.backgroundTertiary}`,
              borderColor: isDarkMode ? 'rgba(128, 128, 128, 0.3)' : 'rgba(128, 128, 128, 0.3)'
            }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowEmojiPicker(false);
            }}
          >
            <Feather name="x" size={20} color={isDarkMode ? '#808080' : '#606060'} />
          </TouchableOpacity>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 5, paddingVertical: 5 }}
          >
            {EMOJIS.map((emoji, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.emojiItem, {
                  backgroundColor: isDarkMode ? 'rgba(128, 128, 128, 0.1)' : 'rgba(128, 128, 128, 0.1)',
                  borderColor: isDarkMode ? 'rgba(128, 128, 128, 0.2)' : 'rgba(128, 128, 128, 0.2)'
                }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  insertEmoji(emoji);
                }}
              >
                <Text style={styles.emojiText}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {loading && (
        <View style={[styles.loadingOverlay, { backgroundColor: `${colors.overlay}` }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.primary }]}>Creating your post...</Text>
        </View>
      )}
    </ThemedGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: Platform.OS === "ios" ? 100 : 80, // Add padding to ensure content doesn't get hidden behind the share button
  },
  // Details Screen Styles
  detailsScreenContainer: {
    flex: 1,
    padding: 16,
    backgroundColor: "#000",
  },
  // Image Preview Section
  imagePreviewSection: {
    marginBottom: 20,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.2)",
  },
  imagePreviewContainer: {
    position: "relative",
    width: "100%",
    height: 300,
    borderRadius: 12,
    overflow: "hidden",
  },
  previewImage: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
  },
  mediaCountBadge: {
    position: "absolute",
    bottom: 10,
    right: 10,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.3)",
  },
  mediaCountText: {
    color: "#FFD700",
    fontSize: 12,
    fontWeight: "bold",
  },
  thumbnailsContainer: {
    padding: 10,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 215, 0, 0.2)",
  },
  thumbnailsScroll: {
    paddingVertical: 5,
  },
  thumbnailWrapper: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 10,
    borderWidth: 2,
    borderColor: "transparent",
    overflow: "hidden",
  },
  activeThumbnail: {
    borderColor: "#FFD700",
  },
  thumbnailImage: {
    width: "100%",
    height: "100%",
  },
  // Section Styles
  sectionTitle: {
    color: "#FFD700",
    fontSize: 16,
    fontFamily: "Rubik-Medium",
    marginBottom: 10,
    fontWeight: "bold",
  },
  // Caption Section
  captionSection: {
    marginBottom: 20,
  },
  captionContainer: {
    position: "relative",
    marginBottom: 10,
  },
  captionInput: {
    backgroundColor: "rgba(255, 215, 0, 0.1)",
    borderRadius: 12,
    padding: 15,
    paddingRight: 50,
    color: "white",
    minHeight: 120,
    textAlignVertical: "top",
    fontSize: 16,
    fontFamily: "Rubik-Regular",
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.3)",
  },
  emojiButton: {
    position: "absolute",
    right: 10,
    bottom: 10,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 20,
    padding: 8,
  },

  // Options Section
  optionsSection: {
    marginBottom: 20,
  },
  optionsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  optionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 215, 0, 0.1)",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.3)",
  },
  optionText: {
    color: "#FFD700",
    marginLeft: 8,
    fontFamily: "Rubik-Regular",
    fontSize: 14,
  },

  // Tagging Section
  taggingSection: {
    marginBottom: 20,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.2)",
  },
  taggingContainer: {
    position: "relative",
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 25,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.3)",
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 40,
    color: "white",
    fontFamily: "Rubik-Regular",
  },
  searchResults: {
    marginTop: 10,
    maxHeight: 150,
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.2)",
  },
  userResult: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 215, 0, 0.1)",
  },
  username: {
    color: "white",
    fontFamily: "Rubik-Regular",
    fontSize: 14,
  },

  // Location Section
  locationSection: {
    marginBottom: 20,
  },
  locationTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 215, 0, 0.1)",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.3)",
  },
  locationText: {
    color: "#FFD700",
    marginLeft: 10,
    flex: 1,
    fontFamily: "Rubik-Regular",
  },
  removeLocationButton: {
    padding: 5,
  },

  // Tagged Users Section
  taggedUsersSection: {
    marginBottom: 20,
  },
  taggedUsersContainer: {
    paddingVertical: 5,
  },
  taggedUser: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 215, 0, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.3)",
  },
  taggedUsername: {
    color: "#FFD700",
    marginRight: 8,
    fontFamily: "Rubik-Regular",
  },
  removeTagButton: {
    padding: 4,
  },

  // Share Button Styles
  detailsWrapper: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  shareButtonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 15,
    backgroundColor: "#1a1a1a",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 215, 0, 0.2)",
    width: '100%',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10, // Ensure it stays on top
    paddingBottom: Platform.OS === "ios" ? 30 : 15, // Extra padding for iOS
  },
  shareButton: {
    backgroundColor: "#FFD700",
    borderRadius: 30,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  shareButtonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "bold",
    fontFamily: "Rubik-Medium",
  },
  shareButtonIcon: {
    marginRight: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 215, 0, 0.2)",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  headerText: {
    fontSize: 18,
    fontFamily: "Rubik-Medium",
    color: "#ffffff",
  },
  headerIconButton: {
    padding: 10,
    borderRadius: 50,
    borderWidth: 1.5,
  },
  mediaPickerText: {
    marginTop: 12,
    color: "#ffffff",
    fontSize: 16,
    fontFamily: "Rubik-Regular",
  },
  postButtonText: {
    color: "#000000",
    fontSize: 14,
    fontFamily: "Rubik-Medium",
  },
  postButton: {
    backgroundColor: "#FFD700",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  disabledButton: {
    backgroundColor: "rgba(255, 215, 0, 0.5)",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  editContainer: {
    flex: 1,
    backgroundColor: "#000",
    paddingBottom: 0,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between', // This will push the next button to the bottom
  },
  mainContentArea: {
    flex: 1,
  },
  mainContentContainer: {
    paddingBottom: 80, // Add padding to ensure content isn't hidden behind the next button
    flexGrow: 1, // Ensure the content can grow to fill the available space
  },
  bottomSpacer: {
    height: 20, // Extra space at the bottom
  },
  mediaPicker: {
    height: 300,
    backgroundColor: "rgba(255, 215, 0, 0.1)",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.3)",
    borderStyle: "dashed",
  },
  carouselContainer: {
    height: SCREEN_HEIGHT - 350, // Reduced height to make room for filters
    width: SCREEN_WIDTH - 20, // Account for horizontal margins
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    position: "relative",
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.2)",
    marginBottom: 15,
    marginHorizontal: 10,
    marginTop: 10,
  },
  carouselItem: {
    width: SCREEN_WIDTH - 20, // Match container width
    height: SCREEN_HEIGHT - 350, // Match container height
    justifyContent: "center",
    alignItems: "center",
  },
  carouselImage: {
    width: "100%",
    height: "100%",
    resizeMode: "contain",
  },
  removeImageButton: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    borderRadius: 20,
    padding: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.3)",
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    bottom: 10,
    left: 0,
    right: 0,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255, 215, 0, 0.5)",
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: "#FFD700",
  },
  addMoreButton: {
    position: "absolute",
    bottom: 10,
    right: 10,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    borderRadius: 20,
    padding: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.3)",
  },
  filterContainer: {
    flexGrow: 0,
    paddingVertical: 10,
    paddingHorizontal: 5,
    backgroundColor: "#1a1a1a",
    borderRadius: 10,
    marginBottom: 5,
  },
  filterOption: {
    width: 85,
    marginHorizontal: 8,
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.2)",
  },
  filterThumbnail: {
    width: 65,
    height: 65,
    borderRadius: 8,
    marginBottom: 8,
    resizeMode: "cover",
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.3)",
  },
  filterName: {
    color: "#FFD700",
    fontFamily: "Rubik-Regular",
    fontSize: 12,
    textAlign: "center",
    fontWeight: "500",
  },
  filterSection: {
    marginTop: 10,
    marginBottom: 20, // Increased bottom margin
    paddingHorizontal: 15,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderRadius: 12,
    marginHorizontal: 10,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.2)",
  },
  filterSectionTitle: {
    color: "#FFD700",
    fontSize: 14,
    fontFamily: "Rubik-Medium",
    marginBottom: 5,
  },
  nextButtonContainer: {
    paddingHorizontal: 15,
    paddingTop: 15,
    paddingBottom: 15,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 215, 0, 0.2)",
    backgroundColor: "#1a1a1a",
    width: '100%',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10, // Ensure it stays on top
  },
  nextButton: {
    backgroundColor: "#FFD700",
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 25,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  nextButtonText: {
    color: "#000",
    fontSize: 16,
    fontFamily: "Rubik-Medium",
    fontWeight: "bold",
  },
  nextButtonIcon: {
    marginRight: 8,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    color: '#FFD700',
    fontFamily: 'Rubik-Medium',
  },
  emojiPickerContainer: {
    position: 'absolute',
    bottom: Platform.OS === "ios" ? 80 : 60,
    left: 0,
    right: 0,
    height: 70,
    backgroundColor: '#1a1a1a',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    zIndex: 100,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 10,
  },
  emojiItem: {
    padding: 10,
    marginHorizontal: 5,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  emojiText: {
    fontSize: 24,
  },
  closeEmojiPicker: {
    position: 'absolute',
    top: 5,
    right: 5,
    zIndex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 15,
    padding: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
});

export default CreatePost;