import * as ImageManipulator from "expo-image-manipulator";
import React, { useState, useEffect } from "react";
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

const TAB_BAR_HEIGHT = 90;
const TAB_BAR_MARGIN = 24;

const CreatePost = ({ onPostCreated }: { onPostCreated: () => void }) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const scaleValue = new Animated.Value(1);

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
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
        {
          compress: 0.7,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      const fileInfo = await fetch(manipResult.uri);
      const blob = await fileInfo.blob();

      if (blob.size > 1048576) {
        return await ImageManipulator.manipulateAsync(
          manipResult.uri,
          [{ resize: { width: 720 } }],
          {
            compress: 0.5,
            format: ImageManipulator.SaveFormat.JPEG,
          }
        );
      }

      return manipResult;
    } catch (error) {
      console.error("Error compressing image:", error);
      throw error;
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      allowsMultipleSelection: true,
      quality: 1,
    });

    if (!result.canceled) {
      const compressedImages = await Promise.all(
        result.assets.map(async (asset) => {
          const compressed = await compressImage(asset.uri);
          return compressed.uri;
        })
      );
      setImages((prev) => [...prev, ...compressedImages]);
    }
  };

  const handlePost = async () => {
    if (!userId) {
      alert("Please sign in to create a post");
      return;
    }

    if (images.length === 0) {
      alert("Please select at least one image");
      return;
    }

    try {
      setLoading(true);

      const imageFiles = images.map((uri, index) => ({
        uri,
        name: `image_${Date.now()}_${index}.jpg`, // Generate a unique name for each image
        type: "image/jpeg",
        size: 0, // Size is not used in the upload, but kept for compatibility
      }));

      await postsAPI.createPost(imageFiles, caption, userId);

      setImages([]);
      setCaption("");
      setActiveImageIndex(0);

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
    Animated.spring(scaleValue, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleValue, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const onClose = () => {
    router.replace("/home");
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    if (activeImageIndex >= index && activeImageIndex > 0) {
      setActiveImageIndex((prev) => prev - 1);
    }
  };

  const renderCarouselItem = ({
    item,
    index,
  }: {
    item: string;
    index: number;
  }) => (
    <View style={styles.carouselItem}>
      <Image source={{ uri: item }} style={styles.carouselImage} />
      <TouchableOpacity
        style={styles.removeImageButton}
        onPress={() => removeImage(index)}
      >
        <Feather name="x-circle" size={24} color="#FFD700" />
      </TouchableOpacity>
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
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={24} color="#FFD700" />
            </TouchableOpacity>
            <Text style={styles.headerText}>Create Post</Text>
            <TouchableOpacity
              onPress={handlePost}
              disabled={images.length === 0 || loading}
              style={[
                styles.postButton,
                images.length === 0 && styles.disabledButton,
              ]}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
            >
              <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
                <Text style={styles.postButtonText}>Post</Text>
              </Animated.View>
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            {images.length === 0 ? (
              <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
                <Feather name="image" size={40} color="rgba(255, 215, 0, 0.7)" />
                <Text style={styles.imagePickerText}>Tap to select images</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.carouselContainer}>
                <Carousel
                  loop={false}
                  width={Dimensions.get("window").width - 32}
                  height={300}
                  data={images}
                  onSnapToItem={(index) => setActiveImageIndex(index)}
                  renderItem={renderCarouselItem}
                />
                {images.length > 1 && (
                  <View style={styles.pagination}>
                    {images.map((_, index) => (
                      <View
                        key={index}
                        style={[
                          styles.paginationDot,
                          index === activeImageIndex && styles.paginationDotActive,
                        ]}
                      />
                    ))}
                  </View>
                )}
                <TouchableOpacity style={styles.addMoreButton} onPress={pickImage}>
                  <Feather name="plus-circle" size={24} color="#FFD700" />
                </TouchableOpacity>
              </View>
            )}

            <TextInput
              style={styles.captionInput}
              placeholder="Write a caption..."
              placeholderTextColor="rgba(255, 215, 0, 0.5)"
              multiline
              value={caption}
              onChangeText={setCaption}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#FFD700" />
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
  imagePickerText: {
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
  imagePicker: {
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
    height: 300,
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
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  carouselImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
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
  captionInput: {
    marginTop: 16,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: "top",
    padding: 12,
    backgroundColor: "rgba(255, 215, 0, 0.1)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.3)",
    color: "#ffffff",
    fontFamily: "Rubik-Regular",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
});

export default CreatePost;