
import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  Platform,
  Alert,
  Animated,
  StatusBar,
  SafeAreaView,
  Modal,
  Image,
  Easing,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useVideoPlayer, VideoView } from "expo-video";
import * as VideoThumbnails from "expo-video-thumbnails";
import {
  AntDesign,
  Feather,
  FontAwesome5,
  MaterialIcons,
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { supabase } from "../lib/supabase";
import { reelsAPI } from "../lib/reelsApi";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
  CameraView,
  CameraType,
  useCameraPermissions,
  useMicrophonePermissions,
} from "expo-camera";
import * as FileSystem from "expo-file-system";
import * as ScreenOrientation from "expo-screen-orientation";
import NetInfo from "@react-native-community/netinfo";
import * as Linking from "expo-linking";
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get("window");
const VIDEO_ASPECT_RATIO = 9 / 16;
const MAX_FILE_SIZE_MB = 10; // 10MB file size limit

const CreateReel = () => {
  // Content state
  const [video, setVideo] = useState<string | null>(null);
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [music, setMusic] = useState("");

  // UI state
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showTips, setShowTips] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Camera state
  const [facing, setFacing] = useState<CameraType>("back");
  const [cameraMode, setCameraMode] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] =
    useMicrophonePermissions();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const cameraRef = useRef<CameraView>(null);
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [flashMode, setFlashMode] = useState<'off' | 'on'>('off');

  // Initialize useVideoPlayer with null source when no video is selected
  const player = useVideoPlayer(video || null, (player) => {
    if (video) {
      player.loop = true;
      player.play();
    }
  });

  useEffect(() => {
    const checkPermissions = async () => {
      if (Platform.OS === "web") {
        setPermissionsGranted(true);
        return;
      }

      console.log("Checking camera and microphone permissions...");

      // Request camera permission
      const cameraStatus = await requestCameraPermission();
      console.log("Camera permission:", cameraStatus.granted ? "granted" : "denied");

      // Request microphone permission
      const microphoneStatus = await requestMicrophonePermission();
      console.log("Microphone permission:", microphoneStatus.granted ? "granted" : "denied");

      // Request media library permission
      const libraryStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log("Media library permission:", libraryStatus.granted ? "granted" : "denied");

      const allPermissionsGranted =
        cameraStatus.granted &&
        microphoneStatus.granted &&
        libraryStatus.granted;

      console.log("All permissions granted:", allPermissionsGranted ? "Yes" : "No");

      setPermissionsGranted(allPermissionsGranted);

      // Provide haptic feedback based on permission status
      if (allPermissionsGranted) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    };

    checkPermissions();

    // Clean up function
    return () => {
      // Clear any timers when component unmounts
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setRecordingTime(0);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording]);

  useEffect(() => {
    if (cameraMode) {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
    }
    return () => {
      ScreenOrientation.unlockAsync();
    };
  }, [cameraMode]);

  const checkFileSize = async (uri: string) => {
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) {
        throw new Error("File does not exist");
      }

      const fileSizeMB = fileInfo.size / (1024 * 1024);
      if (fileSizeMB > MAX_FILE_SIZE_MB) {
        throw new Error(
          `File size exceeds ${MAX_FILE_SIZE_MB}MB limit. Consider selecting a smaller video or enabling server-side compression.`
        );
      }

      return true;
    } catch (error) {
      console.error("Error checking file size:", error);
      throw error;
    }
  };

  const generateThumbnail = async (videoUri: string) => {
    try {
      const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
        time: 0,
        quality: 0.7,
      });

      return uri;
    } catch (error) {
      console.error("Error generating thumbnail:", error);
      throw new Error("Failed to generate thumbnail");
    }
  };

  const pickVideo = async () => {
    if (loading) return; // Prevent rapid state changes

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "videos",
        allowsEditing: true,
        quality: 0.7,
        videoMaxDuration: 30,
      });

      if (!result.canceled && result.assets[0].uri) {
        const uri = result.assets[0].uri.toLowerCase();
        if (!uri.endsWith(".mp4") && !uri.endsWith(".mov")) {
          throw new Error("Please select a valid video file (MP4 or MOV)");
        }

        setLoading(true);
        const videoUri = result.assets[0].uri;
        await checkFileSize(videoUri);
        const thumbnailUri = await generateThumbnail(videoUri);
        await checkFileSize(thumbnailUri);

        setVideo(videoUri);
        setThumbnail(thumbnailUri);
        if (player) {
          player.replace(videoUri);
          player.play();
        }
      }
    } catch (error) {
      console.error("Error picking video:", error);
      Alert.alert(
        "Error",
        error instanceof Error
          ? error.message
          : "Failed to pick video. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleCameraFacing = () => {
    setFacing((current) => (current === "back" ? "front" : "back"));
  };

  const startRecording = async () => {
    if (!cameraRef.current || isRecording || !cameraReady || loading) {
      return;
    }

    try {
      // Set recording state first
      setIsRecording(true);
      setRecordingTime(0);

      // Start a timer to track recording duration
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      console.log("Starting recording...");

      // Wait a moment before starting recording to ensure camera is ready
      setTimeout(async () => {
        try {
          if (cameraRef.current && isRecording) {
            const recording = await cameraRef.current.recordAsync();
            console.log("Recording completed:", recording);

            if (recording?.uri) {
              setLoading(true);
              const videoUri = recording.uri;
              await checkFileSize(videoUri);
              const thumbnailUri = await generateThumbnail(videoUri);
              await checkFileSize(thumbnailUri);

              setVideo(videoUri);
              setThumbnail(thumbnailUri);
              setCameraMode(false);
              if (player) {
                player.replace(videoUri);
                player.play();
              }
            } else {
              throw new Error("No video data received");
            }
          }
        } catch (error) {
          console.error("Recording error inside timeout:", error);
          Alert.alert("Error", "Failed to record video. Please try again.");
          setIsRecording(false);
        } finally {
          setLoading(false);
        }
      }, 300);
    } catch (error) {
      console.error("Recording error:", error);
      Alert.alert("Error", "Failed to record video. Please try again.");
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const stopRecording = () => {
    if (cameraRef.current && isRecording) {
      try {
        console.log("Stopping recording...");
        cameraRef.current.stopRecording();
      } catch (error) {
        console.error("Error stopping recording:", error);
        Alert.alert("Error", "Failed to stop recording.");
      } finally {
        setIsRecording(false);
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      }
    }
  };

  const handleCameraReady = () => {
    console.log("Camera is ready");
    setCameraReady(true);
    // Provide haptic feedback to indicate camera is ready
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const cleanupFile = async (uri: string) => {
    try {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    } catch (error) {
      console.error("Error cleaning up file:", error);
    }
  };

  const handleClose = () => {
    if (video && player) {
      try {
        player.pause();
      } catch (error) {
        console.warn("Error pausing player on close:", error);
      }
    }
    if (video) cleanupFile(video);
    if (thumbnail) cleanupFile(thumbnail);
    setVideo(null);
    setThumbnail(null);
    setCaption("");
    setMusic("");
    setCameraMode(false);
    setFacing("back");
    setIsRecording(false);
    setRecordingTime(0);
    setUploadProgress(0);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    router.back();
  };

  const handlePost = async () => {
    if (!video || !thumbnail) {
      Alert.alert(
        "Error",
        "Please select a video and thumbnail before posting."
      );
      return;
    }

    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      Alert.alert(
        "Error",
        "No internet connection. Please check your network and try again."
      );
      return;
    }

    setLoading(true);
    setUploadProgress(0);

    try {
      if (!supabase) throw new Error("Supabase client not initialized");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Upload video
      const videoFile = {
        uri: video,
        name: `video_${Date.now()}.mp4`,
        type: "video/mp4",
      };
      const videoUrl = await reelsAPI.uploadFile(videoFile);
      setUploadProgress(50);

      // Upload thumbnail
      const thumbnailFile = {
        uri: thumbnail,
        name: `thumbnail_${Date.now()}.jpg`,
        type: "image/jpeg",
      };
      const thumbnailUrl = await reelsAPI.uploadFile(thumbnailFile);
      setUploadProgress(100);

      await reelsAPI.createReel(videoUrl, caption, music, thumbnailUrl, user.id);

      // Cleanup temporary files
      await cleanupFile(video);
      await cleanupFile(thumbnail);

      router.push("/reels");
    } catch (error) {
      console.error("Error creating reel:", error);
      Alert.alert(
        "Error",
        error instanceof Error
          ? error.message
          : "Failed to create reel. Please try again."
      );
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  if (!permissionsGranted) {
    return (
      <LinearGradient
        colors={["#000000", "#1a1a1a", "#2a2a2a"]}
        style={styles.permissionScreen}
      >
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionTitle}>Permissions Required</Text>
          <Text style={styles.permissionText}>
            To create reels, we need access to:
          </Text>
          <View style={styles.permissionList}>
            <Text style={styles.permissionItem}>• Camera</Text>
            <Text style={styles.permissionItem}>• Microphone</Text>
            <Text style={styles.permissionItem}>• Media Library</Text>
          </View>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={() => {
              if (Platform.OS === "ios") {
                requestCameraPermission();
                requestMicrophonePermission();
                ImagePicker.requestMediaLibraryPermissionsAsync();
              } else {
                Linking.openSettings();
              }
            }}
          >
            <Text style={styles.permissionButtonText}>Grant Permissions</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  // Animation functions
  const animateScale = (toValue: number) => {
    Animated.spring(scaleAnim, {
      toValue,
      useNativeDriver: true,
      friction: 7,
      tension: 40
    }).start();
  };

  const handlePressIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    animateScale(0.95);
  };

  const handlePressOut = () => {
    animateScale(1);
  };

  // Render the tips modal
  const renderTipsModal = () => (
    <Modal
      visible={showTips}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowTips(false)}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowTips(false)}
      >
        <View style={styles.tipsContainer}>
          <Text style={styles.tipsTitle}>Tips for Great Reels</Text>

          <View style={styles.tipItem}>
            <FontAwesome5 name="lightbulb" size={20} color="#FFD700" />
            <Text style={styles.tipText}>Keep videos short and engaging (15-30 seconds)</Text>
          </View>

          <View style={styles.tipItem}>
            <FontAwesome5 name="music" size={20} color="#FFD700" />
            <Text style={styles.tipText}>Add trending music to increase visibility</Text>
          </View>

          <View style={styles.tipItem}>
            <FontAwesome5 name="hashtag" size={20} color="#FFD700" />
            <Text style={styles.tipText}>Use relevant hashtags in your caption</Text>
          </View>

          <View style={styles.tipItem}>
            <FontAwesome5 name="sun" size={20} color="#FFD700" />
            <Text style={styles.tipText}>Ensure good lighting for better quality</Text>
          </View>

          <TouchableOpacity
            style={styles.closeTipsButton}
            onPress={() => setShowTips(false)}
          >
            <Text style={styles.closeTipsText}>Got it</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  // Render the confirmation modal
  const renderConfirmationModal = () => (
    <Modal
      visible={showConfirmation}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowConfirmation(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.confirmationContainer}>
          <Text style={styles.confirmationTitle}>Share Reel?</Text>
          <Text style={styles.confirmationText}>
            Your reel will be visible to all users. Continue?
          </Text>

          <View style={styles.confirmationButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowConfirmation(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.confirmButton}
              onPress={() => {
                setShowConfirmation(false);
                handlePost();
              }}
            >
              <Text style={styles.confirmButtonText}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Render the recording timer
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={["#000000", "#1a1a1a", "#2a2a2a"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleClose}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
          >
            <AntDesign name="close" size={24} color="#FFD700" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>New Reel</Text>

          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              if (video && thumbnail) {
                setShowConfirmation(true);
              } else {
                Alert.alert("Missing Content", "Please select or record a video first.");
              }
            }}
            disabled={!video || !thumbnail || loading}
            style={[
              styles.postButton,
              (!video || !thumbnail || loading) && styles.disabledButton,
            ]}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
          >
            <Text style={styles.postButtonText}>
              {loading ? "Uploading..." : "Share"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Conditional rendering based on state */}
        {cameraMode ? (
          // Camera Mode
          <View style={styles.fullScreenContainer}>
            <View style={styles.cameraWrapper}>
              <CameraView
                ref={cameraRef}
                style={styles.camera}
                facing={facing}
                onCameraReady={handleCameraReady}
                mode="video"
              >
                {isRecording && (
                  <View style={styles.recordingIndicator}>
                    <View style={styles.recordingDot} />
                    <Text style={styles.recordingTime}>{formatTime(recordingTime)}</Text>
                  </View>
                )}

                <View style={styles.buttonContainer}>
                  <TouchableOpacity
                    style={styles.flipButton}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      toggleCameraFacing();
                    }}
                  >
                    <MaterialIcons
                      name="flip-camera-ios"
                      size={30}
                      color="white"
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.recordButton,
                      {
                        borderColor: isRecording ? "#00FF00" : "#FF0000",
                        backgroundColor: isRecording
                          ? "rgba(0, 255, 0, 0.2)"
                          : "rgba(255, 0, 0, 0.2)",
                      },
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      isRecording ? stopRecording() : startRecording();
                    }}
                    disabled={loading || !cameraReady}
                  >
                    <View
                      style={[
                        styles.innerRecordButton,
                        { backgroundColor: isRecording ? "#00FF00" : "#FF0000" },
                      ]}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.exitCameraButton}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setCameraMode(false);
                    }}
                  >
                    <AntDesign name="close" size={24} color="white" />
                  </TouchableOpacity>
                </View>
              </CameraView>
            </View>
          </View>
        ) : !video ? (
          // Select/Record Video Options
          <View style={styles.fullScreenContainer}>
            <View style={styles.optionsWrapper}>
              <View style={styles.optionsContainer}>
                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    pickVideo();
                  }}
                  onPressIn={handlePressIn}
                  onPressOut={handlePressOut}
                >
                  <LinearGradient
                    colors={["#1a1a1a", "#2a2a2a"]}
                    style={styles.uploadGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <FontAwesome5 name="video" size={32} color="#FFD700" />
                    <Text style={styles.uploadText}>Select Video</Text>
                    <Text style={styles.fileSizeText}>
                      Max {MAX_FILE_SIZE_MB}MB
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setCameraMode(true);
                  }}
                  onPressIn={handlePressIn}
                  onPressOut={handlePressOut}
                >
                  <LinearGradient
                    colors={["#1a1a1a", "#2a2a2a"]}
                    style={styles.uploadGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <FontAwesome5 name="camera" size={32} color="#FFD700" />
                    <Text style={styles.uploadText}>Record Video</Text>
                    <Text style={styles.fileSizeText}>Max 30 seconds</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : (
          // Video Preview and Caption
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.videoContainer}>
              <View style={styles.previewContainer}>
                <VideoView
                  player={player}
                  style={styles.preview}
                  contentFit="contain"
                />
                <View style={styles.videoControls}>
                  <TouchableOpacity
                    style={styles.videoControlButton}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      pickVideo();
                    }}
                  >
                    <Feather name="refresh-ccw" size={20} color="#FFD700" />
                    <Text style={styles.videoControlText}>Change</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.videoControlButton}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      if (player) {
                        player.play();
                      }
                    }}
                  >
                    <Feather
                      name="play"
                      size={20}
                      color="#FFD700"
                    />
                    <Text style={styles.videoControlText}>
                      Play
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={styles.formContainer}>
              <Text style={styles.sectionTitle}>Caption</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  placeholder="Write a caption..."
                  value={caption}
                  onChangeText={setCaption}
                  multiline
                  style={styles.input}
                  placeholderTextColor="rgba(255, 215, 0, 0.5)"
                  maxLength={150}
                />
                <Text style={styles.characterCount}>{caption.length}/150</Text>
              </View>

              <TouchableOpacity
                style={styles.tipsButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowTips(true);
                }}
              >
                <Feather name="info" size={16} color="#FFD700" />
                <Text style={styles.tipsButtonText}>Tips for great reels</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}

        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#FFD700" />
            <Text style={styles.loadingText}>Creating your reel...</Text>
            {uploadProgress > 0 && (
              <View style={styles.progressContainer}>
                <View
                  style={[styles.progressBar, { width: `${uploadProgress}%` }]}
                />
                <Text style={styles.progressText}>{uploadProgress}%</Text>
              </View>
            )}
          </View>
        )}

        {renderTipsModal()}
        {renderConfirmationModal()}
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  // Base Styles
  safeArea: {
    flex: 1,
    backgroundColor: "#000000",
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  fullScreenContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionsWrapper: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },

  // Header Styles
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 215, 0, 0.2)",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingTop: Platform.OS === 'android' ? 40 : 16,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Rubik-Bold",
    color: "#ffffff",
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  postButton: {
    backgroundColor: "#FFD700",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 1,
    borderColor: "#FFD700",
  },
  postButtonText: {
    color: "#000000",
    fontFamily: "Rubik-Medium",
    fontSize: 14,
    fontWeight: "bold",
  },
  disabledButton: {
    opacity: 0.5,
    backgroundColor: "rgba(255, 215, 0, 0.5)",
  },

  // Video Container Styles
  videoContainer: {
    width,
    height: width / VIDEO_ASPECT_RATIO,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.2)",
    marginBottom: 20,
    overflow: 'hidden',
  },

  // Camera Styles
  cameraWrapper: {
    width: '100%',
    height: '100%',
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 8,
  },
  camera: {
    flex: 1,
    width,
    height: width / VIDEO_ASPECT_RATIO,
  },
  buttonContainer: {
    flex: 1,
    backgroundColor: "transparent",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-end",
    marginBottom: 40,
  },
  flipButton: {
    position: "absolute",
    left: 30,
    bottom: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  exitCameraButton: {
    position: "absolute",
    right: 30,
    bottom: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
  },
  innerRecordButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  recordingIndicator: {
    position: 'absolute',
    top: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'center',
    width: 'auto',
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF0000',
    marginRight: 8,
  },
  recordingTime: {
    color: '#FFFFFF',
    fontFamily: 'Rubik-Medium',
    fontSize: 16,
  },

  // Upload Options Styles
  optionsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    paddingHorizontal: 20,
    alignItems: "center",
    height: "100%",
  },
  uploadButton: {
    width: "45%",
    aspectRatio: 1,
    margin: 10,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    maxWidth: 200,
    maxHeight: 200,
  },
  uploadGradient: {
    flex: 1,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.3)",
  },
  uploadText: {
    color: "#FFD700",
    fontSize: 18,
    marginTop: 12,
    fontFamily: "Rubik-Medium",
    textAlign: 'center',
  },
  fileSizeText: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 12,
    marginTop: 8,
    fontFamily: "Rubik-Regular",
    textAlign: 'center',
  },

  // Preview Styles
  previewContainer: {
    width: "100%",
    height: "100%",
    position: "relative",
    borderRadius: 8,
    overflow: 'hidden',
  },
  preview: {
    width,
    height: width / VIDEO_ASPECT_RATIO,
    backgroundColor: '#000',
  },
  videoControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 215, 0, 0.2)',
  },
  videoControlButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  videoControlText: {
    color: '#FFD700',
    fontFamily: 'Rubik-Regular',
    fontSize: 12,
    marginTop: 4,
  },

  // Form Styles
  formContainer: {
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Rubik-Medium',
    color: '#FFD700',
    marginBottom: 12,
  },
  inputContainer: {
    marginBottom: 16,
    position: 'relative',
  },
  input: {
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.3)",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: "rgba(255, 215, 0, 0.1)",
    color: "#ffffff",
    fontFamily: "Rubik-Regular",
    minHeight: 120,
    textAlignVertical: "top",
  },
  characterCount: {
    position: 'absolute',
    bottom: 8,
    right: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    fontFamily: 'Rubik-Regular',
  },
  tipsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  tipsButtonText: {
    color: '#FFD700',
    fontFamily: 'Rubik-Regular',
    fontSize: 14,
    marginLeft: 8,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipsContainer: {
    width: '85%',
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  tipsTitle: {
    fontSize: 20,
    fontFamily: 'Rubik-Bold',
    color: '#FFD700',
    marginBottom: 16,
    textAlign: 'center',
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  tipText: {
    color: '#FFFFFF',
    fontFamily: 'Rubik-Regular',
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
  },
  closeTipsButton: {
    backgroundColor: '#FFD700',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignSelf: 'center',
    marginTop: 16,
  },
  closeTipsText: {
    color: '#000000',
    fontFamily: 'Rubik-Medium',
    fontSize: 16,
  },
  confirmationContainer: {
    width: '85%',
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  confirmationTitle: {
    fontSize: 20,
    fontFamily: 'Rubik-Bold',
    color: '#FFD700',
    marginBottom: 12,
    textAlign: 'center',
  },
  confirmationText: {
    color: '#FFFFFF',
    fontFamily: 'Rubik-Regular',
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  confirmationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 12,
    borderRadius: 25,
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontFamily: 'Rubik-Medium',
    fontSize: 16,
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#FFD700',
    paddingVertical: 12,
    borderRadius: 25,
    marginLeft: 10,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#000000',
    fontFamily: 'Rubik-Medium',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Loading Styles
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    color: "#FFD700",
    fontFamily: "Rubik-Medium",
  },
  progressContainer: {
    width: "80%",
    height: 24,
    marginTop: 24,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#FFD700",
  },
  progressText: {
    position: "absolute",
    color: "#000000",
    fontFamily: "Rubik-Bold",
    alignSelf: "center",
    fontSize: 14,
  },

  // Permission Styles
  permissionScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  permissionContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    width: "85%",
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  permissionTitle: {
    fontSize: 24,
    color: "#FFD700",
    marginBottom: 20,
    fontFamily: "Rubik-Bold",
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: "#ffffff",
    marginBottom: 20,
    textAlign: "center",
    fontFamily: "Rubik-Regular",
    lineHeight: 22,
  },
  permissionList: {
    marginBottom: 30,
    alignSelf: "stretch",
    paddingLeft: 20,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  permissionItem: {
    fontSize: 16,
    color: "#ffffff",
    marginVertical: 6,
    fontFamily: "Rubik-Regular",
  },
  permissionButton: {
    backgroundColor: "#FFD700",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    marginTop: 20,
  },
  permissionButtonText: {
    color: "#000000",
    fontSize: 16,
    fontFamily: "Rubik-Medium",
    fontWeight: 'bold',
  },
});

export default CreateReel;
