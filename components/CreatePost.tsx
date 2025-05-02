import * as ImageManipulator from "expo-image-manipulator";
import * as Location from "expo-location";
import React, { useState, useEffect, useRef } from "react";
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
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Carousel from "react-native-reanimated-carousel";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { postsAPI } from "@/lib/postsApi";
import { notificationsAPI } from "@/lib/notificationsApi";

const TAB_BAR_HEIGHT = 90;
const TAB_BAR_MARGIN = 24;
const EMOJIS = ["😊", "😂", "❤️", "👍", "🎉", "🔥", "🌟", "💖", "😍", "🤩"];
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const CreatePost = ({ onPostCreated }: { onPostCreated: () => void }) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [media, setMedia] = useState<Array<{ uri: string; type: 'image' }>>([]);
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [location, setLocation] = useState<string | null>(null);
  const [taggedUsers, setTaggedUsers] = useState<Array<{ id: string; username: string }>>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ id: string; username: string; avatar: string }>>([]);
  const [isTagging, setIsTagging] = useState(false);
  const [step, setStep] = useState<"select" | "edit" | "details">("select");

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
      setUserId(user?.id || null);
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
        // If no filter (Original), revert to the original compressed image
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

  const pickMedia = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      allowsMultipleSelection: true,
      quality: 1,
    });

    if (!result.canceled) {
      const processedMedia = await Promise.all(
        result.assets.map(async (asset) => {
          const compressed = await compressImage(asset.uri);
          return { uri: compressed.uri, type: 'image' as const };
        })
      );
      setMedia((prev) => [...prev, ...processedMedia]);
      setStep("edit");
    }
  };

  const getLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission to access location was denied');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (reverseGeocode[0]) {
        const { city, region, country } = reverseGeocode[0];
        setLocation(`${city}, ${region}, ${country}`);
      }
    } catch (error) {
      console.error("Error getting location:", error);
      alert("Failed to get location. Please try again.");
    }
  };

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

  const handlePost = async () => {
    if (!userId) {
      alert("Please sign in to create a post");
      return;
    }

    if (media.length === 0) {
      alert("Please select at least one image");
      return;
    }

    try {
      setLoading(true);

      const imageFiles = media.map((item, index) => ({
        uri: item.uri,
        name: `image_${Date.now()}_${index}.jpg`,
        type: 'image/jpeg',
        size: 0,
      }));

      const postData = await postsAPI.createPost(imageFiles, caption, userId);

      if (taggedUsers.length > 0) {
        await Promise.all(
          taggedUsers.map(async (user) => {
            try {
              await notificationsAPI.createNotification(
                user.id, // recipient_id (or receiver_id if not renamed)
                "mention",
                userId, // sender_id
                postData.id
              );
            } catch (error) {
              console.error(`Failed to create notification for user ${user.id}:`, error);
            }
          })
        );
      }

      setMedia([]);
      setCaption("");
      setActiveMediaIndex(0);
      setLocation(null);
      setTaggedUsers([]);
      setStep("select");

      onPostCreated();
      onClose();
    } catch (error: any) {
      console.error("Post creation error:", error);
      alert(error.message || "Failed to create post");
    } finally {
      setLoading(false);
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
      <View style={styles.carouselContainer}>
        <Carousel
          loop={false}
          width={SCREEN_WIDTH}
          height={SCREEN_HEIGHT - 200}
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

      <ScrollView horizontal style={styles.filterContainer}>
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

      <TouchableOpacity
        style={styles.nextButton}
        onPress={() => setStep("details")}
      >
        <Text style={styles.nextButtonText}>Next</Text>
      </TouchableOpacity>
    </View>
  );

  const renderDetailsScreen = () => (
    <View style={styles.content}>
      <View style={styles.carouselContainer}>
        <Carousel
          loop={false}
          width={SCREEN_WIDTH}
          height={SCREEN_HEIGHT - 300}
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
      </View>

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
          onPress={() => setShowEmojiPicker(!showEmojiPicker)}
        >
          <Feather name="smile" size={24} color="#FFD700" />
        </TouchableOpacity>
      </View>

      <View style={styles.optionsContainer}>
        <TouchableOpacity
          style={styles.optionButton}
          onPress={() => setIsTagging(!isTagging)}
        >
          <Feather name="user-plus" size={20} color="#FFD700" />
          <Text style={styles.optionText}>Tag People</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.optionButton}
          onPress={getLocation}
        >
          <Feather name="map-pin" size={20} color="#FFD700" />
          <Text style={styles.optionText}>Add Location</Text>
        </TouchableOpacity>
      </View>

      {isTagging && (
        <View style={styles.taggingContainer}>
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
      )}

      {location && (
        <View style={styles.locationTag}>
          <Feather name="map-pin" size={16} color="#FFD700" />
          <Text style={styles.locationText}>{location}</Text>
          <TouchableOpacity onPress={() => setLocation(null)}>
            <Feather name="x" size={16} color="#FFD700" />
          </TouchableOpacity>
        </View>
      )}

      {taggedUsers.length > 0 && (
        <View style={styles.taggedUsersContainer}>
          <Text style={styles.taggedUsersTitle}>Tagged:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {taggedUsers.map(user => (
              <View key={user.id} style={styles.taggedUser}>
                <Text style={styles.taggedUsername}>@{user.username}</Text>
                <TouchableOpacity onPress={() => removeTaggedUser(user.id)}>
                  <Feather name="x" size={14} color="#FFD700" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );

  return (
    <LinearGradient
      colors={["#000000", "#1a1a1a", "#2a2a2a"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === "ios" ? TAB_BAR_HEIGHT + TAB_BAR_MARGIN : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={() => {
              if (step !== "select") {
                setMedia([]);
                setStep("select");
              } else {
                onClose();
              }
            }}>
              <Feather name={step === "select" ? "x" : "arrow-left"} size={24} color="#FFD700" />
            </TouchableOpacity>
            <Text style={styles.headerText}>Create Post</Text>
            {step === "details" ? (
              <TouchableOpacity
                onPress={handlePost}
                disabled={media.length === 0 || loading}
                style={[styles.postButton, media.length === 0 && styles.disabledButton]}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
              >
                <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
                  <Text style={styles.postButtonText}>Post</Text>
                </Animated.View>
              </TouchableOpacity>
            ) : (
              <View style={{ width: 60 }} />
            )}
          </View>

          {step === "select" && (
            <View style={styles.content}>
              <TouchableOpacity style={styles.mediaPicker} onPress={pickMedia}>
                <Feather name="image" size={40} color="rgba(255, 215, 0, 0.7)" />
                <Text style={styles.mediaPickerText}>Tap to select images</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === "edit" && renderEditScreen()}
          {step === "details" && renderDetailsScreen()}
        </ScrollView>
      </KeyboardAvoidingView>

      {showEmojiPicker && (
        <View style={styles.emojiPickerContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {EMOJIS.map((emoji, index) => (
              <TouchableOpacity
                key={index}
                style={styles.emojiItem}
                onPress={() => insertEmoji(emoji)}
              >
                <Text style={styles.emojiText}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity
            style={styles.closeEmojiPicker}
            onPress={() => setShowEmojiPicker(false)}
          >
            <Feather name="x" size={24} color="#FFD700" />
          </TouchableOpacity>
        </View>
      )}

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#FFD700" />
          <Text style={styles.loadingText}>Creating your post...</Text>
        </View>
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: TAB_BAR_HEIGHT + TAB_BAR_MARGIN + 20,
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
    height: SCREEN_HEIGHT - 200,
    width: SCREEN_WIDTH,
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
  },
  carouselItem: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT - 200,
    justifyContent: "center",
    alignItems: "center",
  },
  carouselImage: {
    width: "100%",
    height: "100%",
    resizeMode: "contain", // Changed to "contain" to avoid cropping while ensuring full visibility
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
    backgroundColor: "#1a1a1a",
  },
  filterOption: {
    width: 80,
    marginHorizontal: 8,
    alignItems: "center",
  },
  filterThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginBottom: 5,
    resizeMode: "cover",
  },
  filterName: {
    color: "#FFFFFF",
    fontFamily: "Rubik-Regular",
    fontSize: 12,
    textAlign: "center",
  },
  nextButton: {
    position: "absolute",
    bottom: 20,
    right: 20,
    backgroundColor: "#FFD700",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  nextButtonText: {
    color: "#000",
    fontSize: 16,
    fontFamily: "Rubik-Medium",
  },
  captionContainer: {
    marginTop: 16,
    position: 'relative',
  },
  captionInput: {
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: "top",
    padding: 12,
    paddingRight: 40,
    backgroundColor: "rgba(255, 215, 0, 0.1)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.3)",
    color: "#ffffff",
    fontFamily: "Rubik-Regular",
  },
  emojiButton: {
    position: 'absolute',
    right: 10,
    bottom: 10,
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
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  optionText: {
    marginLeft: 8,
    color: '#FFD700',
    fontFamily: 'Rubik-Regular',
  },
  taggingContainer: {
    marginTop: 10,
  },
  searchInput: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 8,
    padding: 10,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  searchResults: {
    maxHeight: 150,
    marginTop: 5,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
  },
  userResult: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 215, 0, 0.1)',
  },
  username: {
    color: '#FFFFFF',
    fontFamily: 'Rubik-Regular',
  },
  locationTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    padding: 8,
    borderRadius: 20,
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  locationText: {
    marginLeft: 8,
    marginRight: 8,
    color: '#FFD700',
    fontFamily: 'Rubik-Regular',
  },
  taggedUsersContainer: {
    marginTop: 12,
  },
  taggedUsersTitle: {
    color: '#FFD700',
    fontFamily: 'Rubik-Medium',
    marginBottom: 8,
  },
  taggedUser: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  taggedUsername: {
    color: '#FFD700',
    fontFamily: 'Rubik-Regular',
    marginRight: 8,
  },
  emojiPickerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: '#1a1a1a',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 215, 0, 0.3)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  emojiItem: {
    padding: 10,
  },
  emojiText: {
    fontSize: 24,
  },
  closeEmojiPicker: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1,
  },
});

export default CreatePost;