/**
 * Enhanced Story Viewer with Auto-Play Sequence and Multiple Stories Support
 * Fixes Issues #4 and #5 from bug documentation
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Image,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  Text,
} from "react-native";
import { PanGestureHandler, State } from "react-native-gesture-handler";
import { AntDesign, Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { storiesAPIEnhanced } from "@/lib/storiesApiEnhanced";

const { width, height } = Dimensions.get("window");

interface Story {
  id: string;
  user_id: string;
  image_url: string;
  caption?: string;
  created_at: string;
  expires_at: string;
  viewed_by: string[];
  story_order: number;
  duration: number;
  story_type: string;
  user: {
    username: string;
    avatar: string;
  };
  is_viewed?: boolean;
}

interface StoriesFeed {
  user_id: string;
  username: string;
  avatar_url: string;
  story_count: number;
  latest_story_time: string;
  has_unviewed: boolean;
  stories: Story[];
}

interface StoryViewerEnhancedProps {
  storiesFeed: StoriesFeed[];
  initialUserIndex: number;
  initialStoryIndex: number;
  onClose: () => void;
}

const StoryViewerEnhanced = ({
  storiesFeed,
  initialUserIndex,
  initialStoryIndex,
  onClose,
}: StoryViewerEnhancedProps) => {
  // State management
  const [currentUserIndex, setCurrentUserIndex] = useState(initialUserIndex);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(initialStoryIndex);
  const [paused, setPaused] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Animation refs
  const progressAnims = useRef<Animated.Value[]>([]);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  // Timing refs
  const progressTimer = useRef<NodeJS.Timeout | null>(null);
  const viewStartTime = useRef<number>(Date.now());

  // Current data
  const currentUser = storiesFeed[currentUserIndex];
  const currentStory = currentUser?.stories[currentStoryIndex];
  const totalUsers = storiesFeed.length;

  // Initialize progress animations for current user's stories
  useEffect(() => {
    if (currentUser) {
      progressAnims.current = currentUser.stories.map(
        () => new Animated.Value(0)
      );
    }
  }, [currentUserIndex]);

  // Auto-play logic
  useEffect(() => {
    if (!paused && currentStory) {
      startStoryProgress();
      viewStartTime.current = Date.now();
    }
    
    return () => {
      if (progressTimer.current) {
        clearTimeout(progressTimer.current);
      }
    };
  }, [currentUserIndex, currentStoryIndex, paused]);

  const startStoryProgress = useCallback(() => {
    if (!currentStory || paused) return;

    const duration = currentStory.duration || 5000;
    const progressAnim = progressAnims.current[currentStoryIndex];
    
    if (progressAnim) {
      progressAnim.setValue(0);
      
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: duration,
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (finished && !paused) {
          handleNext();
        }
      });
    }
  }, [currentStory, currentStoryIndex, paused]);

  const markCurrentStoryViewed = useCallback(async () => {
    if (currentStory) {
      const viewDuration = Date.now() - viewStartTime.current;
      await storiesAPIEnhanced.markStoryViewed(currentStory.id, viewDuration);
    }
  }, [currentStory]);

  const handleNext = useCallback(async () => {
    // Mark current story as viewed
    await markCurrentStoryViewed();

    const currentUserStories = currentUser.stories;
    
    if (currentStoryIndex < currentUserStories.length - 1) {
      // Next story in current user's collection
      setCurrentStoryIndex(currentStoryIndex + 1);
    } else {
      // Move to next user's stories
      if (currentUserIndex < totalUsers - 1) {
        setCurrentUserIndex(currentUserIndex + 1);
        setCurrentStoryIndex(0);
      } else {
        // End of all stories
        onClose();
      }
    }
  }, [currentUserIndex, currentStoryIndex, totalUsers, currentUser, markCurrentStoryViewed, onClose]);

  const handlePrevious = useCallback(async () => {
    // Mark current story as viewed
    await markCurrentStoryViewed();

    if (currentStoryIndex > 0) {
      // Previous story in current user's collection
      setCurrentStoryIndex(currentStoryIndex - 1);
    } else {
      // Move to previous user's last story
      if (currentUserIndex > 0) {
        const prevUserIndex = currentUserIndex - 1;
        const prevUser = storiesFeed[prevUserIndex];
        setCurrentUserIndex(prevUserIndex);
        setCurrentStoryIndex(prevUser.stories.length - 1);
      }
    }
  }, [currentUserIndex, currentStoryIndex, storiesFeed, markCurrentStoryViewed]);

  const handleTap = useCallback((side: 'left' | 'right') => {
    if (side === 'left') {
      handlePrevious();
    } else {
      handleNext();
    }
  }, [handlePrevious, handleNext]);

  const handlePressIn = useCallback(() => {
    setPaused(true);
    // Pause all animations
    progressAnims.current.forEach(anim => anim.stopAnimation());
  }, []);

  const handlePressOut = useCallback(() => {
    setPaused(false);
    // Resume animation will be handled by useEffect
  }, []);

  const handleSwipeGesture = useCallback((event: any) => {
    if (event.nativeEvent.state === State.END) {
      const { translationY } = event.nativeEvent;
      
      if (translationY > 100) {
        // Swipe down to close
        onClose();
      } else if (translationY < -100) {
        // Swipe up for more options (future feature)
        console.log('Swipe up detected');
      }
    }
  }, [onClose]);

  if (!currentUser || !currentStory) {
    return null;
  }

  return (
    <PanGestureHandler onHandlerStateChange={handleSwipeGesture}>
      <View style={styles.container}>
        {/* Background Image */}
        <Image
          source={{ uri: currentStory.image_url }}
          style={styles.backgroundImage}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
        />

        {/* Dark Overlay */}
        <View style={styles.overlay} />

        {/* Progress Bars */}
        <View style={styles.progressContainer}>
          {currentUser.stories.map((_, index) => (
            <View key={index} style={styles.progressBarBackground}>
              <Animated.View
                style={[
                  styles.progressBar,
                  {
                    width: progressAnims.current[index]?.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["0%", "100%"],
                    }) || "0%",
                    opacity: index === currentStoryIndex ? 1 : 
                             index < currentStoryIndex ? 1 : 0.3,
                  },
                ]}
              />
            </View>
          ))}
        </View>

        {/* Header */}
        <LinearGradient
          colors={["rgba(0,0,0,0.6)", "transparent"]}
          style={styles.headerGradient}
        >
          <View style={styles.header}>
            <View style={styles.userInfo}>
              <Image
                source={{ 
                  uri: currentUser.avatar_url || "https://via.placeholder.com/32" 
                }}
                style={styles.avatar}
              />
              <View style={styles.userDetails}>
                <Text style={styles.username}>{currentUser.username}</Text>
                <Text style={styles.timeAgo}>
                  {new Date(currentStory.created_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Text>
              </View>
            </View>
            
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => setPaused(!paused)}
              >
                <Feather 
                  name={paused ? "play" : "pause"} 
                  size={20} 
                  color="white" 
                />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.actionButton}
                onPress={onClose}
              >
                <AntDesign name="close" size={20} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>

        {/* Story Content */}
        <Animated.View 
          style={[
            styles.storyContent,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }]
            }
          ]}
        >
          <Image
            source={{ uri: currentStory.image_url }}
            style={styles.storyImage}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Caption */}
        {currentStory.caption && (
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.6)"]}
            style={styles.captionGradient}
          >
            <Text style={styles.caption}>{currentStory.caption}</Text>
          </LinearGradient>
        )}

        {/* Touch Areas */}
        <View style={styles.touchContainer}>
          <TouchableOpacity
            style={styles.leftTouch}
            onPress={() => handleTap('left')}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            activeOpacity={1}
          />
          <TouchableOpacity
            style={styles.rightTouch}
            onPress={() => handleTap('right')}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            activeOpacity={1}
          />
        </View>

        {/* Story Counter */}
        <View style={styles.storyCounter}>
          <Text style={styles.counterText}>
            {currentStoryIndex + 1} / {currentUser.stories.length}
          </Text>
          <Text style={styles.userCounter}>
            User {currentUserIndex + 1} / {totalUsers}
          </Text>
        </View>

        {/* Loading Indicator */}
        {loading && (
          <View style={styles.loadingContainer}>
            <Animated.View
              style={[
                styles.loadingSpinner,
                {
                  transform: [{
                    rotate: fadeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '360deg'],
                    })
                  }]
                }
              ]}
            />
          </View>
        )}
      </View>
    </PanGestureHandler>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  backgroundImage: {
    position: 'absolute',
    width: width,
    height: height,
    opacity: 0.3,
  },
  overlay: {
    position: 'absolute',
    width: width,
    height: height,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  progressContainer: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    flexDirection: 'row',
    gap: 4,
    zIndex: 10,
  },
  progressBarBackground: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 1.5,
  },
  progressBar: {
    height: '100%',
    backgroundColor: 'white',
    borderRadius: 1.5,
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 80,
    paddingBottom: 20,
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  username: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  timeAgo: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 120,
    paddingBottom: 100,
  },
  storyImage: {
    width: width - 32,
    height: height - 240,
    borderRadius: 12,
  },
  captionGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 40,
    paddingBottom: 40,
    paddingHorizontal: 16,
  },
  caption: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  touchContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
  },
  leftTouch: {
    flex: 1,
  },
  rightTouch: {
    flex: 1,
  },
  storyCounter: {
    position: 'absolute',
    bottom: 60,
    right: 16,
    alignItems: 'flex-end',
  },
  counterText: {
    color: 'white',
    fontSize: 12,
    opacity: 0.8,
  },
  userCounter: {
    color: 'white',
    fontSize: 10,
    opacity: 0.6,
    marginTop: 2,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  loadingSpinner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
    borderTopColor: 'white',
  },
});

export default StoryViewerEnhanced;
