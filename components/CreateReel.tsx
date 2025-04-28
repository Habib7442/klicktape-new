
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
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useVideoPlayer, VideoView } from "expo-video";
import * as VideoThumbnails from "expo-video-thumbnails";
import {
  AntDesign,
  Feather,
  FontAwesome5,
  MaterialIcons,
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

const { width } = Dimensions.get("window");
const VIDEO_ASPECT_RATIO = 9 / 16;
const MAX_FILE_SIZE_MB = 10; // 10MB file size limit

const CreateReel = () => {
  const [video, setVideo] = useState<string | null>(null);
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [music, setMusic] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [facing, setFacing] = useState<CameraType>("back");
  const [cameraMode, setCameraMode] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] =
    useMicrophonePermissions();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const cameraRef = useRef<CameraView>(null);
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [cameraReady, setCameraReady] = useState(false);

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

      const cameraStatus = await requestCameraPermission();
      const microphoneStatus = await requestMicrophonePermission();
      const libraryStatus =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      setPermissionsGranted(
        cameraStatus.granted &&
          microphoneStatus.granted &&
          libraryStatus.granted
      );
    };

    checkPermissions();
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
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
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
      setIsRecording(true);

      const recording = await cameraRef.current.recordAsync({
        maxDuration: 30,
        quality: "720p",
        mute: false,
        videoBitrate: 1000000, // 1Mbps to reduce file size
        codec: "h264",
      });

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
    } catch (error) {
      console.error("Recording error:", error);
      Alert.alert("Error", "Failed to record video. Please try again.");
    } finally {
      setIsRecording(false);
      setLoading(false);
    }
  };

  const stopRecording = async () => {
    if (cameraRef.current && isRecording) {
      try {
        await cameraRef.current.stopRecording();
      } catch (error) {
        console.error("Error stopping recording:", error);
        Alert.alert("Error", "Failed to stop recording.");
      } finally {
        setIsRecording(false);
      }
    }
  };

  const handleCameraReady = () => {
    setCameraReady(true);
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

  return (
    <LinearGradient
      colors={["#000000", "#1a1a1a", "#2a2a2a"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        scrollEnabled={true}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose}>
            <AntDesign name="close" size={24} color="#FFD700" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Reel</Text>
          <TouchableOpacity
            onPress={handlePost}
            disabled={!video || !thumbnail || loading}
            style={[
              styles.postButton,
              (!video || !thumbnail || loading) && styles.disabledButton,
            ]}
          >
            <Text style={styles.postButtonText}>
              {loading ? "Uploading..." : "Share"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.videoContainer}>
          {cameraMode ? (
            <CameraView
              ref={cameraRef}
              style={styles.camera}
              facing={facing}
              video
              audio
              mode="video"
              isActive={cameraMode}
              zoom={0}
              enableZoomGesture={false}
              onCameraReady={handleCameraReady}
              resizeMode="cover"
            >
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={styles.flipButton}
                  onPress={toggleCameraFacing}
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
                  onPress={isRecording ? stopRecording : startRecording}
                  disabled={loading || !cameraReady}
                >
                  <View
                    style={[
                      styles.innerRecordButton,
                      { backgroundColor: isRecording ? "#00FF00" : "#FF0000" },
                    ]}
                  />
                </TouchableOpacity>
              </View>
            </CameraView>
          ) : !video ? (
            <View style={styles.optionsContainer}>
              <TouchableOpacity style={styles.uploadButton} onPress={pickVideo}>
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
                onPress={() => setCameraMode(true)}
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
          ) : (
            <View style={styles.previewContainer}>
              <VideoView
                player={player}
                style={styles.preview}
                nativeControls
                contentFit="contain"
              />
              <TouchableOpacity style={styles.changeVideo} onPress={pickVideo}>
                <Feather name="refresh-ccw" size={20} color="#FFD700" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.formContainer}>
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
          </View>
        </View>

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
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  permissionScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 215, 0, 0.2)",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Rubik-Bold",
    color: "#ffffff",
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
  postButtonText: {
    color: "#000000",
    fontFamily: "Rubik-Medium",
    fontSize: 14,
  },
  disabledButton: {
    opacity: 0.5,
    backgroundColor: "rgba(255, 215, 0, 0.5)",
  },
  videoContainer: {
    width,
    height: width / VIDEO_ASPECT_RATIO,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.1)",
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
  },
  recordButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 3,
    justifyContent: "center",
    alignItems: "center",
  },
  innerRecordButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  uploadButton: {
    width: "45%",
    aspectRatio: 1,
    margin: 10,
  },
  uploadGradient: {
    flex: 1,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.3)",
  },
  uploadText: {
    color: "#ffffff",
    fontSize: 18,
    marginTop: 10,
    fontFamily: "Rubik-Medium",
  },
  fileSizeText: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 12,
    marginTop: 5,
    fontFamily: "Rubik-Regular",
  },
  previewContainer: {
    width: "100%",
    height: "100%",
    position: "relative",
  },
  preview: {
    width,
    height: width / VIDEO_ASPECT_RATIO,
  },
  changeVideo: {
    position: "absolute",
    right: 16,
    top: 16,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    padding: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.3)",
  },
  formContainer: {
    padding: 16,
  },
  inputContainer: {
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.3)",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "rgba(255, 215, 0, 0.1)",
    color: "#ffffff",
    fontFamily: "Rubik-Regular",
    minHeight: 100,
    textAlignVertical: "top",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#ffffff",
    fontFamily: "Rubik-Regular",
  },
  progressContainer: {
    width: "80%",
    height: 20,
    marginTop: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 10,
    overflow: "hidden",
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
  },
  optionsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    paddingHorizontal: 20,
  },
  permissionContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    width: "80%",
  },
  permissionTitle: {
    fontSize: 22,
    color: "#ffffff",
    marginBottom: 20,
    fontFamily: "Rubik-Bold",
  },
  permissionText: {
    fontSize: 16,
    color: "#ffffff",
    marginBottom: 16,
    textAlign: "center",
    fontFamily: "Rubik-Regular",
  },
  permissionList: {
    marginBottom: 30,
    alignSelf: "flex-start",
    paddingLeft: 20,
  },
  permissionItem: {
    fontSize: 16,
    color: "#ffffff",
    marginVertical: 5,
    fontFamily: "Rubik-Regular",
  },
  permissionButton: {
    backgroundColor: "#FFD700",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    marginTop: 20,
  },
  permissionButtonText: {
    color: "#000000",
    fontSize: 16,
    fontFamily: "Rubik-Medium",
  },
});

export default CreateReel;
