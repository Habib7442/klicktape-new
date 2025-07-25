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
import GenreSelector, { Genre, GENRES } from "@/components/GenreSelector";
import HashtagInput from "@/components/HashtagInput";
import UserTagging, { TaggedUser } from "@/components/UserTagging";
import { generateCaptionFromImage, generateHashtagsFromText, improveCaptionWithAI } from "@/lib/geminiService";
import * as FileSystem from 'expo-file-system';

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
  const [taggedUsers, setTaggedUsers] = useState<TaggedUser[]>([]);
  const [collaborators, setCollaborators] = useState<TaggedUser[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<Genre | null>(null);
  const [hashtags, setHashtags] = useState<string[]>([]);

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

  const [showGenreSelector, setShowGenreSelector] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<any>(null);
  const [filteredPreviews, setFilteredPreviews] = useState<Record<string, string>>({});
  const [loadingPreviews, setLoadingPreviews] = useState(false);
  const [originalImageUris, setOriginalImageUris] = useState<Record<number, string>>({});
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [selectedTone, setSelectedTone] = useState<'casual' | 'professional' | 'funny' | 'inspirational' | 'trendy'>('casual');
  const [showToneSelector, setShowToneSelector] = useState(false);

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

  const imageFilters = [
    {
      name: 'Original',
      icon: 'image',
      transform: [],
    },
    {
      name: 'Square',
      icon: 'square',
      transform: 'square', // Special handling for square crop
    },
    {
      name: 'Rotate',
      icon: 'rotate-cw',
      transform: [
        {
          rotate: 90,
        },
      ],
    },
    {
      name: 'Flip H',
      icon: 'move-horizontal',
      transform: [
        {
          flip: ImageManipulator.FlipType.Horizontal,
        },
      ],
    },
    {
      name: 'Flip V',
      icon: 'move-vertical',
      transform: [
        {
          flip: ImageManipulator.FlipType.Vertical,
        },
      ],
    },
    {
      name: 'Small',
      icon: 'minimize-2',
      transform: [
        {
          resize: {
            width: 400,
          },
        },
      ],
    },
    {
      name: 'Medium',
      icon: 'circle',
      transform: [
        {
          resize: {
            width: 800,
          },
        },
      ],
    },
    {
      name: 'Large',
      icon: 'maximize-2',
      transform: [
        {
          resize: {
            width: 1200,
          },
        },
      ],
    },
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

  useEffect(() => {
    if (media.length > 0 && media[activeMediaIndex]) {
      // Reset to Original filter when changing images
      setSelectedFilter(imageFilters.find(f => f.name === 'Original') || imageFilters[0]);
      generateFilterPreviews(media[activeMediaIndex].uri);
    }
  }, [media, activeMediaIndex]);

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
        const newOriginalUris: Record<number, string> = {};

        for (let i = 0; i < result.assets.length; i++) {
          const asset = result.assets[i];
          setUploadProgress((i / totalImages) * 100);
          const compressed = await compressImage(asset.uri);
          const newIndex = media.length + i;
          processedMedia.push({ uri: compressed.uri, type: 'image' as const });
          // Store original URI for each image
          newOriginalUris[newIndex] = compressed.uri;
        }

        setMedia((prev) => [...prev, ...processedMedia]);
        setOriginalImageUris(prev => ({ ...prev, ...newOriginalUris }));
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

    // Validate genre is selected (MANDATORY)
    if (!selectedGenre) {
      Alert.alert(
        "Genre Required",
        "Please select a genre for your post. This helps other users discover your content.",
        [
          {
            text: "Select Genre",
            onPress: () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowGenreSelector(true);
            }
          }
        ]
      );
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
  }, [userId, media, caption, taggedUsers, location, selectedGenre]);

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

      // Create the post (userId is guaranteed to be non-null due to validation above)
      const postData = await postsAPI.createPost(
        imageFiles,
        caption,
        userId!,
        location,
        selectedGenre?.name || null,
        hashtags,
        taggedUsers.map(u => u.id),
        collaborators.map(u => u.id)
      );

      // Send notifications to tagged users
      if (taggedUsers.length > 0) {
        await Promise.all(
          taggedUsers.map(async (user) => {
            try {
              await notificationsAPI.createNotification(
                user.id,
                "mention",
                userId!,
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
      setCollaborators([]);
      setSelectedGenre(null);
      setHashtags([]);
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

  // Helper function to convert image URI to base64
  const convertImageToBase64 = async (imageUri: string): Promise<string> => {
    try {
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: 'base64'
      });
      return base64;
    } catch (error) {
      throw new Error('Failed to convert image to base64');
    }
  };

  // AI Caption Generation from Image
  const handleAIGeneration = async () => {
    if (!media.length) {
      Alert.alert('No Image', 'Please select an image first');
      return;
    }

    try {
      setIsGeneratingAI(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Convert image to base64
      const base64Image = await convertImageToBase64(media[activeMediaIndex].uri);

      // Create tone-aware prompt
      const tonePrompt = caption.trim()
        ? `Generate a ${selectedTone} caption based on this image. Current context: "${caption.trim()}"`
        : `Generate a ${selectedTone} caption for this image`;

      const result = await generateCaptionFromImage(
        base64Image,
        'image/jpeg',
        tonePrompt
      );

      // If we have an existing caption, improve it with the selected tone
      let finalCaption = result.caption;
      if (caption.trim()) {
        try {
          finalCaption = await improveCaptionWithAI(result.caption, selectedTone);
        } catch (error) {
          // If improvement fails, use the original generated caption
          console.warn('Caption improvement failed, using original:', error);
        }
      }

      // Update caption
      setCaption(finalCaption);

      // Add new hashtags, avoiding duplicates
      const newHashtags = [...new Set([...hashtags, ...result.hashtags])];
      setHashtags(newHashtags.slice(0, 30)); // Limit to 30 total

      // Set genre if not already selected and AI suggested one
      if (result.genre && !selectedGenre) {
        const genreMatch = GENRES.find(g =>
          g.name.toLowerCase() === result.genre?.toLowerCase()
        );
        if (genreMatch) setSelectedGenre(genreMatch);
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success! 🎉', `AI ${selectedTone} caption and hashtags generated!`);
    } catch (error: any) {
      console.error('AI Generation Error:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('AI Generation Failed', error.message || 'Please try again.');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // AI Hashtag Generation - Independent from Caption
  const handleHashtagGeneration = async () => {
    if (!media.length) {
      Alert.alert('No Image', 'Please select an image first');
      return;
    }

    try {
      setIsGeneratingAI(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      let result;

      if (caption.trim()) {
        // Generate hashtags from caption text
        result = await generateHashtagsFromText(
          caption,
          selectedGenre?.name,
          15
        );
      } else {
        // Generate hashtags from image using vision AI
        const base64Image = await convertImageToBase64(media[activeMediaIndex].uri);
        const visionResult = await generateCaptionFromImage(
          base64Image,
          'image/jpeg',
          'Analyze this image and generate relevant hashtags only. Focus on the content, mood, and visual elements.'
        );

        // Use the hashtags from vision result
        result = {
          hashtags: visionResult.hashtags,
          trending: visionResult.hashtags.slice(0, 5),
          relevant: visionResult.hashtags.slice(5)
        };
      }

      // Merge with existing hashtags, avoiding duplicates
      const newHashtags = [...new Set([...hashtags, ...result.hashtags])];
      setHashtags(newHashtags.slice(0, 30)); // Limit to 30 total

      const source = caption.trim() ? 'caption' : 'image';
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success! 🎉', `Generated ${result.hashtags.length} new hashtags from ${source}!`);
    } catch (error: any) {
      console.error('Hashtag Generation Error:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Hashtag Generation Failed', error.message || 'Please try again.');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // AI Caption Improvement
  const handleCaptionImprovement = async () => {
    if (!caption.trim()) {
      Alert.alert('No Caption', 'Please write a caption first');
      return;
    }

    try {
      setIsGeneratingAI(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const improved = await improveCaptionWithAI(caption, selectedTone);
      setCaption(improved);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success! ✨', `Caption improved with ${selectedTone} tone!`);
    } catch (error: any) {
      console.error('Caption Improvement Error:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Caption Improvement Failed', error.message || 'Please try again.');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const generateFilterPreviews = async (imageUri: string) => {
    setLoadingPreviews(true);
    const previews: Record<string, string> = {};

    try {
      for (const filter of imageFilters) {
        if (filter.name === 'Original') {
          previews[filter.name] = imageUri;
        } else {
          try {
            let actions = [];

            // Handle special cases
            if (filter.transform === 'square') {
              // For square crop, first resize to a square preview
              actions = [
                { resize: { width: 80, height: 80 } },
              ];
            } else if (Array.isArray(filter.transform)) {
              // For regular transformations, resize first then apply transform
              actions = [
                { resize: { width: 80, height: 80 } },
                ...filter.transform,
              ];
            }

            const result = await ImageManipulator.manipulateAsync(
              imageUri,
              actions,
              {
                compress: 0.7,
                format: ImageManipulator.SaveFormat.JPEG,
              }
            );
            previews[filter.name] = result.uri;
          } catch (filterError) {
            console.warn(`Error applying filter ${filter.name}:`, filterError);
            // Fallback to original for failed filters
            previews[filter.name] = imageUri;
          }
        }
      }
      setFilteredPreviews(previews);
    } catch (error) {
      console.error('Error generating filter previews:', error);
    } finally {
      setLoadingPreviews(false);
    }
  };

  const getImageDimensions = async (uri: string): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      Image.getSize(
        uri,
        (width, height) => resolve({ width, height }),
        (error) => reject(error)
      );
    });
  };

  const applyInlineFilter = async (filter: any) => {
    if (!media[activeMediaIndex]) return;

    try {
      if (filter.name === 'Original') {
        // Reset to original image
        const originalUri = originalImageUris[activeMediaIndex];
        if (originalUri) {
          setMedia(prev => prev.map((item, index) =>
            index === activeMediaIndex
              ? { ...item, uri: originalUri }
              : item
          ));
        }
        setSelectedFilter(filter);
        return;
      }

      // Get the original image URI to apply filter to
      const sourceUri = originalImageUris[activeMediaIndex] || media[activeMediaIndex].uri;

      let actions = [];

      // Handle special cases
      if (filter.transform === 'square') {
        // Get image dimensions for proper square crop
        const { width, height } = await getImageDimensions(sourceUri);
        const size = Math.min(width, height);
        const originX = (width - size) / 2;
        const originY = (height - size) / 2;

        actions = [
          {
            crop: {
              originX,
              originY,
              width: size,
              height: size,
            },
          },
        ];
      } else if (Array.isArray(filter.transform)) {
        actions = filter.transform;
      }

      const result = await ImageManipulator.manipulateAsync(
        sourceUri,
        actions,
        {
          compress: 0.8,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      setMedia(prev => prev.map((item, index) =>
        index === activeMediaIndex
          ? { ...item, uri: result.uri }
          : item
      ));
      setSelectedFilter(filter);
    } catch (error) {
      console.error('Error applying filter:', error);
      // Show user-friendly error message
      Alert.alert('Filter Error', 'Failed to apply filter. Please try again.');
    }
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
        <Feather name="x-circle" size={24} color={isDarkMode ? '#808080' : '#606060'} />
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
            <Feather name="plus-circle" size={24} color={isDarkMode ? '#808080' : '#606060'} />
          </TouchableOpacity>
        </View>

        {/* Inline Filter Selection */}
        <View style={styles.inlineFiltersContainer}>
          <Text style={[styles.filtersTitle, { color: colors.text }]}>
            Filters ({imageFilters.length} available)
          </Text>
          {loadingPreviews ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                Generating previews...
              </Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filtersScrollContainer}
            >
              {imageFilters.map((filter, index) => {
                const isSelected = selectedFilter?.name === filter.name;
                const previewUri = filteredPreviews[filter.name] || (media[activeMediaIndex]?.uri);

                return (
                  <TouchableOpacity
                    key={`${filter.name}-${index}`}
                    style={[
                      styles.filterItem,
                      {
                        borderColor: isSelected ? colors.primary : 'rgba(128, 128, 128, 0.3)',
                        backgroundColor: isSelected
                          ? `${colors.primary}20`
                          : 'rgba(128, 128, 128, 0.1)',
                      },
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      applyInlineFilter(filter);
                    }}
                  >
                    <View style={styles.filterPreviewContainer}>
                      {previewUri ? (
                        <Image
                          source={{ uri: previewUri }}
                          style={styles.filterPreview}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={[styles.filterPreview, { backgroundColor: colors.backgroundTertiary, justifyContent: 'center', alignItems: 'center' }]}>
                          <Feather name={filter.icon as any} size={20} color={colors.textSecondary} />
                        </View>
                      )}
                      {isSelected && (
                        <View style={[styles.selectedOverlay, { backgroundColor: `${colors.primary}40` }]}>
                          <Feather name="check" size={12} color={colors.primary} />
                        </View>
                      )}
                    </View>
                    <Text style={[styles.filterName, { color: colors.text }]} numberOfLines={1}>
                      {filter.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
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
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Caption</Text>
        <View style={styles.captionContainer}>
          <TextInput
            style={[styles.captionInput, {
              backgroundColor: isDarkMode ? 'rgba(128, 128, 128, 0.1)' : 'rgba(128, 128, 128, 0.1)',
              borderColor: isDarkMode ? 'rgba(128, 128, 128, 0.3)' : 'rgba(128, 128, 128, 0.3)',
              color: colors.text
            }]}
            placeholder="Write a caption..."
            placeholderTextColor={colors.textTertiary}
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
            <Feather name="smile" size={24} color={isDarkMode ? '#808080' : '#606060'} />
          </TouchableOpacity>
        </View>

        {/* AI Caption Generation Buttons */}
        <View style={styles.aiSection}>
          {/* Tone Selector */}
          <TouchableOpacity
            style={[styles.toneSelector, {
              backgroundColor: isDarkMode ? 'rgba(128, 128, 128, 0.1)' : 'rgba(128, 128, 128, 0.1)',
              borderColor: isDarkMode ? 'rgba(128, 128, 128, 0.3)' : 'rgba(128, 128, 128, 0.3)'
            }]}
            onPress={() => setShowToneSelector(!showToneSelector)}
          >
            <Feather name="sliders" size={14} color={isDarkMode ? '#808080' : '#606060'} />
            <Text style={[styles.toneSelectorText, { color: colors.text }]}>
              {selectedTone.charAt(0).toUpperCase() + selectedTone.slice(1)}
            </Text>
            <Feather name="chevron-down" size={14} color={colors.textSecondary} />
          </TouchableOpacity>

          {/* AI Caption Button */}
          <TouchableOpacity
            style={[styles.aiButton, {
              backgroundColor: isDarkMode ? '#808080' : '#606060',
              opacity: isGeneratingAI || !media.length ? 0.5 : 1
            }]}
            onPress={handleAIGeneration}
            disabled={isGeneratingAI || !media.length}
          >
            <Feather name="zap" size={16} color="#FFFFFF" />
            <Text style={[styles.aiButtonText, { color: '#FFFFFF' }]}>
              {isGeneratingAI ? 'Generating...' : 'AI Caption'}
            </Text>
          </TouchableOpacity>

          {/* Improve Caption Button */}
          <TouchableOpacity
            style={[styles.aiButton, {
              backgroundColor: isDarkMode ? '#808080' : '#606060',
              opacity: isGeneratingAI || !caption.trim() ? 0.5 : 1
            }]}
            onPress={handleCaptionImprovement}
            disabled={isGeneratingAI || !caption.trim()}
          >
            <Feather name="edit-3" size={16} color="#FFFFFF" />
            <Text style={[styles.aiButtonText, { color: '#FFFFFF' }]}>
              {isGeneratingAI ? 'Improving...' : 'Improve'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tone Selector Dropdown */}
        {showToneSelector && (
          <View style={[styles.toneDropdown, {
            backgroundColor: colors.backgroundSecondary,
            borderColor: isDarkMode ? 'rgba(128, 128, 128, 0.3)' : 'rgba(128, 128, 128, 0.3)'
          }]}>
            {(['casual', 'professional', 'funny', 'inspirational', 'trendy'] as const).map((tone) => (
              <TouchableOpacity
                key={tone}
                style={[styles.toneOption, {
                  backgroundColor: selectedTone === tone ? `${isDarkMode ? '#808080' : '#606060'}20` : 'transparent'
                }]}
                onPress={() => {
                  setSelectedTone(tone);
                  setShowToneSelector(false);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Text style={[styles.toneOptionText, {
                  color: selectedTone === tone ? colors.text : colors.textSecondary,
                  fontWeight: selectedTone === tone ? '600' : '400'
                }]}>
                  {tone.charAt(0).toUpperCase() + tone.slice(1)}
                </Text>
                {selectedTone === tone && (
                  <Feather name="check" size={16} color={colors.text} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Genre Selection */}
      <View style={styles.captionSection}>
        <View style={styles.sectionTitleContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Genre</Text>
          <Text style={[styles.requiredIndicator, { color: colors.error }]}>*</Text>
        </View>
        <TouchableOpacity
          style={[styles.genreButton, {
            backgroundColor: selectedGenre
              ? (isDarkMode ? 'rgba(128, 128, 128, 0.1)' : 'rgba(128, 128, 128, 0.1)')
              : (isDarkMode ? 'rgba(255, 100, 100, 0.1)' : 'rgba(255, 100, 100, 0.1)'),
            borderColor: selectedGenre
              ? (isDarkMode ? 'rgba(128, 128, 128, 0.3)' : 'rgba(128, 128, 128, 0.3)')
              : (isDarkMode ? 'rgba(255, 100, 100, 0.5)' : 'rgba(255, 100, 100, 0.5)'),
            borderWidth: selectedGenre ? 1 : 2
          }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowGenreSelector(true);
          }}
        >
          {selectedGenre ? (
            <>
              <View style={[styles.genreIconContainer, { backgroundColor: `${selectedGenre.color}20` }]}>
                <Feather name={selectedGenre.icon as any} size={20} color={selectedGenre.color} />
              </View>
              <Text style={[styles.genreButtonText, { color: colors.text }]}>{selectedGenre.name}</Text>
            </>
          ) : (
            <>
              <Feather name="tag" size={20} color={isDarkMode ? '#808080' : '#606060'} />
              <Text style={[styles.genreButtonText, { color: colors.textSecondary }]}>Select Genre</Text>
            </>
          )}
          <Feather name="chevron-right" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Hashtags Section */}
      <View style={styles.captionSection}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Hashtags</Text>
        <HashtagInput
          hashtags={hashtags}
          onHashtagsChange={setHashtags}
          placeholder="Add hashtags to reach more people..."
          maxHashtags={30}
        />

        {/* AI Hashtag Generation Button */}
        <TouchableOpacity
          style={[styles.aiHashtagButton, {
            backgroundColor: isDarkMode ? '#808080' : '#606060',
            opacity: isGeneratingAI || !media.length ? 0.5 : 1
          }]}
          onPress={handleHashtagGeneration}
          disabled={isGeneratingAI || !media.length}
        >
          <Feather name="hash" size={16} color="#FFFFFF" />
          <Text style={[styles.aiButtonText, { color: '#FFFFFF' }]}>
            {isGeneratingAI ? 'Generating...' : 'Generate AI Hashtags'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* User Tagging Section */}
      <View style={styles.captionSection}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Tag People & Collaborators</Text>
        <UserTagging
          taggedUsers={taggedUsers}
          collaborators={collaborators}
          onTaggedUsersChange={setTaggedUsers}
          onCollaboratorsChange={setCollaborators}
          maxTags={20}
          maxCollaborators={5}
        />
      </View>

      {/* Options Section */}
      <View style={styles.optionsSection}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Options</Text>
        <View style={styles.optionsContainer}>
          <TouchableOpacity
            style={[styles.optionButton, {
              backgroundColor: isDarkMode ? 'rgba(128, 128, 128, 0.1)' : 'rgba(128, 128, 128, 0.1)',
              borderColor: isDarkMode ? 'rgba(128, 128, 128, 0.3)' : 'rgba(128, 128, 128, 0.3)'
            }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setIsTagging(!isTagging);
            }}
          >
            <Feather name="user-plus" size={20} color={isDarkMode ? '#808080' : '#606060'} />
            <Text style={[styles.optionText, { color: colors.text }]}>Tag People</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.optionButton, {
              backgroundColor: isDarkMode ? 'rgba(128, 128, 128, 0.1)' : 'rgba(128, 128, 128, 0.1)',
              borderColor: isDarkMode ? 'rgba(128, 128, 128, 0.3)' : 'rgba(128, 128, 128, 0.3)'
            }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              getLocation();
            }}
          >
            <Feather name="map-pin" size={20} color={isDarkMode ? '#808080' : '#606060'} />
            <Text style={[styles.optionText, { color: colors.text }]}>Add Location</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tagging Section */}
      {isTagging && (
        <View style={[styles.taggingSection, {
          backgroundColor: isDarkMode ? 'rgba(128, 128, 128, 0.05)' : 'rgba(128, 128, 128, 0.05)',
          borderColor: isDarkMode ? 'rgba(128, 128, 128, 0.2)' : 'rgba(128, 128, 128, 0.2)'
        }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Tag People</Text>
          <View style={styles.taggingContainer}>
            <View style={[styles.searchInputContainer, {
              backgroundColor: isDarkMode ? 'rgba(128, 128, 128, 0.1)' : 'rgba(128, 128, 128, 0.1)',
              borderColor: isDarkMode ? 'rgba(128, 128, 128, 0.3)' : 'rgba(128, 128, 128, 0.3)'
            }]}>
              <Feather name="search" size={16} color={isDarkMode ? '#808080' : '#606060'} style={styles.searchIcon} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search users..."
                placeholderTextColor={colors.textTertiary}
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
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Location</Text>
          <View style={[styles.locationTag, {
            backgroundColor: isDarkMode ? 'rgba(128, 128, 128, 0.1)' : 'rgba(128, 128, 128, 0.1)',
            borderColor: isDarkMode ? 'rgba(128, 128, 128, 0.3)' : 'rgba(128, 128, 128, 0.3)'
          }]}>
            <Feather name="map-pin" size={16} color={isDarkMode ? '#808080' : '#606060'} />
            <Text style={[styles.locationText, { color: colors.text }]}>{location}</Text>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setLocation(null);
              }}
              style={styles.removeLocationButton}
            >
              <Feather name="x" size={16} color={isDarkMode ? '#808080' : '#606060'} />
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
                  <Feather name="x" size={14} color={isDarkMode ? '#808080' : '#606060'} />
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
                  backgroundColor: (!selectedGenre || loading)
                    ? (isDarkMode ? 'rgba(128, 128, 128, 0.3)' : 'rgba(128, 128, 128, 0.3)')
                    : (isDarkMode ? '#808080' : '#606060'),
                  shadowOpacity: 0
                }]}
                onPress={handlePost}
                disabled={loading || !selectedGenre}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
              >
                <Animated.View style={{ transform: [{ scale: scaleValue }], flexDirection: 'row', alignItems: 'center' }}>
                  <Feather
                    name={!selectedGenre ? "tag" : "upload"}
                    size={20}
                    color={(!selectedGenre || loading) ? "#999999" : "#FFFFFF"}
                    style={styles.shareButtonIcon}
                  />
                  <Text style={[styles.shareButtonText, {
                    color: (!selectedGenre || loading) ? "#999999" : "#FFFFFF"
                  }]}>
                    {!selectedGenre ? "Select Genre First" : "Share Post"}
                  </Text>
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

      {/* Genre Selector Modal */}
      <GenreSelector
        selectedGenre={selectedGenre}
        onGenreSelect={setSelectedGenre}
        visible={showGenreSelector}
        onClose={() => setShowGenreSelector(false)}
      />
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
    borderColor: "rgba(128, 128, 128, 0.2)",
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
    borderColor: "rgba(128, 128, 128, 0.3)",
  },
  mediaCountText: {
    fontSize: 12,
    fontWeight: "bold",
    fontFamily: "Rubik-Bold",
  },
  thumbnailsContainer: {
    padding: 10,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderTopWidth: 1,
    borderTopColor: "rgba(128, 128, 128, 0.2)",
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
    borderColor: "#808080",
  },
  thumbnailImage: {
    width: "100%",
    height: "100%",
  },
  // Section Styles
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Rubik-Medium",
    marginBottom: 10,
    fontWeight: "bold",
  },
  sectionTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  requiredIndicator: {
    fontSize: 18,
    fontFamily: "Rubik-Bold",
    marginLeft: 4,
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
    borderRadius: 12,
    padding: 15,
    paddingRight: 50,
    minHeight: 120,
    textAlignVertical: "top",
    fontSize: 16,
    fontFamily: "Rubik-Regular",
    borderWidth: 1,
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
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 25,
    borderWidth: 1,
  },
  optionText: {
    marginLeft: 8,
    fontFamily: "Rubik-Regular",
    fontSize: 14,
  },

  // Tagging Section
  taggingSection: {
    marginBottom: 20,
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
  },
  taggingContainer: {
    position: "relative",
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 25,
    paddingHorizontal: 15,
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontFamily: "Rubik-Regular",
  },
  searchResults: {
    marginTop: 10,
    maxHeight: 150,
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(128, 128, 128, 0.2)",
  },
  userResult: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(128, 128, 128, 0.1)",
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
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 25,
    borderWidth: 1,
  },
  locationText: {
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
    backgroundColor: "rgba(128, 128, 128, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "rgba(128, 128, 128, 0.3)",
  },
  taggedUsername: {
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
    borderTopColor: "rgba(128, 128, 128, 0.2)",
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
    borderBottomColor: "rgba(128, 128, 128, 0.2)",
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
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
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
    borderColor: "rgba(128, 128, 128, 0.2)",
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
    borderColor: "rgba(128, 128, 128, 0.3)",
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
    backgroundColor: "rgba(128, 128, 128, 0.5)",
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: "#808080",
  },
  addMoreButton: {
    position: "absolute",
    bottom: 10,
    right: 10,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    borderRadius: 20,
    padding: 8,
    borderWidth: 1,
    borderColor: "rgba(128, 128, 128, 0.3)",
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
    borderColor: "rgba(128, 128, 128, 0.2)",
  },
  filterThumbnail: {
    width: 65,
    height: 65,
    borderRadius: 8,
    marginBottom: 8,
    resizeMode: "cover",
    borderWidth: 1,
    borderColor: "rgba(128, 128, 128, 0.3)",
  },
  filterName: {
    fontFamily: "Rubik-Regular",
    fontSize: 12,
    textAlign: "center",
    fontWeight: "500",
  },

  genreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  genreIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  genreButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  nextButtonContainer: {
    paddingHorizontal: 15,
    paddingTop: 15,
    paddingBottom: 15,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "rgba(128, 128, 128, 0.2)",
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
    borderColor: 'rgba(128, 128, 128, 0.3)',
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
    borderColor: 'rgba(128, 128, 128, 0.3)',
  },
  inlineFiltersContainer: {
    marginTop: 15,
    marginBottom: 20,
    paddingHorizontal: 15,
    backgroundColor: 'rgba(128, 128, 128, 0.05)',
    borderRadius: 12,
    marginHorizontal: 10,
    paddingVertical: 15,
    borderWidth: 1,
    borderColor: 'rgba(128, 128, 128, 0.2)',
  },
  filtersTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    fontFamily: 'Rubik-Medium',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  filtersScrollContainer: {
    paddingVertical: 8,
  },
  filterItem: {
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 2,
    borderRadius: 12,
    padding: 8,
    minWidth: 70,
  },
  filterPreviewContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  filterPreview: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  selectedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // AI Generation Styles
  aiSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 6,
  },
  aiButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 4,
    minHeight: 36,
  },
  aiButtonText: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Rubik-Medium',
  },
  // Tone Selector Styles
  toneSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
    flex: 1,
    minHeight: 36,
  },
  toneSelectorText: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Rubik-Medium',
    flex: 1,
  },
  toneDropdown: {
    marginTop: 8,
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 4,
  },
  toneOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  toneOptionText: {
    fontSize: 14,
    fontFamily: 'Rubik-Regular',
  },
  // AI Hashtag Button
  aiHashtagButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 6,
    minHeight: 36,
  },
});

export default CreatePost;