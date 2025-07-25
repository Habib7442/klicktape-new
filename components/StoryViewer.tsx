import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Image,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  Text,
} from "react-native";
import { AntDesign } from "@expo/vector-icons";

const { width, height } = Dimensions.get("window");

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

interface StoryViewerProps {
  stories: Story[];
  onClose: () => void;
  currentIndex: number;
}

const StoryViewer = ({ stories, onClose, currentIndex }: StoryViewerProps) => {
  const [progress] = useState(new Animated.Value(0));
  const [currentStoryIndex, setCurrentStoryIndex] = useState(currentIndex);
  const [paused, setPaused] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [hideInterface, setHideInterface] = useState(false);

  // Add this line to get the current story
  const currentStory = stories[currentStoryIndex];

  useEffect(() => {
    // Fade in animation when component mounts
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    if (!paused) {
      startProgress();
    }
    return () => {
      progress.stopAnimation();
      fadeAnim.stopAnimation();
    };
  }, [currentStoryIndex, paused]);

  const startProgress = () => {
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: 5000,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        nextStory();
      }
    });
  };

  const nextStory = () => {
    if (currentStoryIndex < stories.length - 1) {
      // Fade out current story
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setCurrentStoryIndex(currentStoryIndex + 1);
        // Fade in next story
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      });
    } else {
      onClose();
    }
  };

  const previousStory = () => {
    if (currentStoryIndex > 0) {
      // Fade out current story
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setCurrentStoryIndex(currentStoryIndex - 1);
        // Fade in previous story
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      });
    }
  };

  const handlePressIn = () => {
    setPaused(true);
    progress.stopAnimation();
    setHideInterface(true);
  };

  const handlePressOut = () => {
    setPaused(false);
    setHideInterface(false);
  };

  const handleTap = (direction: 'next' | 'previous') => {
    // Prevent closing on tap
    if (direction === 'next') {
      nextStory();
    } else {
      previousStory();
    }
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <Animated.View
        style={[
          styles.progressContainer,
          { opacity: hideInterface ? 0 : 1 }
        ]}
      >
        {stories.map((_, index) => (
          <View key={index} style={styles.progressBarBackground}>
            <Animated.View
              style={[
                styles.progressBar,
                {
                  width:
                    index === currentStoryIndex
                      ? progress.interpolate({
                          inputRange: [0, 1],
                          outputRange: ["0%", "100%"],
                        })
                      : index < currentStoryIndex
                      ? "100%"
                      : "0%",
                },
              ]}
            />
          </View>
        ))}
      </Animated.View>

      {/* User Info Header */}
      <Animated.View
        style={[
          styles.userInfoContainer,
          { opacity: hideInterface ? 0 : 1 }
        ]}
      >
        <Image
          source={{ uri: currentStory?.user.avatar || "https://via.placeholder.com/32" }}
          style={styles.avatar}
          onError={(e) => console.log("Avatar load error:", e.nativeEvent.error)}
        />
        <Text style={styles.username}>
          {currentStory?.user.username || "Unknown"}
        </Text>
        {/* Story count indicator */}
        {stories.length > 1 && (
          <Text style={styles.storyCount}>
            {currentStoryIndex + 1}/{stories.length}
          </Text>
        )}
        <View style={{ flex: 1 }} />
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <AntDesign name="close" size={24} color="white" />
        </TouchableOpacity>
      </Animated.View>

      <View style={styles.imageContainer}>
        <Image
          source={{ uri: currentStory?.image_url || "https://via.placeholder.com/300" }}
          style={styles.image}
          onError={(e) => console.log("Image load error:", e.nativeEvent.error)}
        />
      </View>

      <View style={styles.touchableContainer}>
        <TouchableOpacity
          style={styles.previousTouch}
          onPress={() => handleTap('previous')}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={1}
        />
        <TouchableOpacity
          style={styles.centerTouch}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={1}
        />
        <TouchableOpacity
          style={styles.nextTouch}
          onPress={() => handleTap('next')}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={1}
        />
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
    width: width,
    height: height,
  },
  progressContainer: {
    flexDirection: "row",
    position: "absolute",
    top: 60,
    zIndex: 1,
    width: "100%",
    paddingHorizontal: 10,
  },
  progressBarBackground: {
    flex: 1,
    height: 2,
    backgroundColor: "rgba(255,255,255,0.3)",
    marginHorizontal: 2,
    borderRadius: 1,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "white",
    borderRadius: 1,
  },
  imageContainer: {
    width: width,
    height: height,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: "black",
    overflow: 'hidden',
  },
  image: {
    width: width,
    height: height,
    resizeMode: "contain", // Show full image without cropping
    backgroundColor: "black",
  },
  userInfoContainer: {
    position: "absolute",
    top: 10,
    left: 10,
    right: 10,
    zIndex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "white",
  },
  username: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  storyCount: {
    color: "white",
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 8,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  closeButton: {
    padding: 8,
  },
  touchableContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
  },
  previousTouch: {
    flex: 1,
  },
  centerTouch: {
    flex: 3,
  },
  nextTouch: {
    flex: 2,
  },
});

export default StoryViewer;