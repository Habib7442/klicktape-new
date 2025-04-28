import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Image,
  Pressable,
  SafeAreaView,
  Share,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { useVideoPlayer, VideoView } from "expo-video";
import { LinearGradient } from "expo-linear-gradient";
import NetInfo from "@react-native-community/netinfo";
import { AntDesign, Feather } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import {
  fetchReels,
  resetReels,
  selectHasMore,
  selectLoading,
  selectReels,
  toggleLike,
} from "@/src/store/slices/reelsSlice";
import { Reel } from "@/types/type";
import { AppDispatch } from "@/src/store/store";
import { useDispatch as useReduxDispatch } from "react-redux";
import { router } from "expo-router";

const { width, height } = Dimensions.get("window");
const REELS_PER_PAGE = 5;

const Reels = () => {
  const dispatch = useReduxDispatch<AppDispatch>();
  const reels = useSelector(selectReels);
  const loading = useSelector(selectLoading);
  const hasMore = useSelector(selectHasMore);
  const [refreshing, setRefreshing] = useState(false);
  const [visibleReelId, setVisibleReelId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    const checkAndFetch = async () => {
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        Alert.alert(
          "No Internet",
          "Please check your network connection and try again."
        );
        return;
      }
      dispatch(
        fetchReels({ offset: 0, limit: REELS_PER_PAGE, forceRefresh: false })
      );
    };
    checkAndFetch();
  }, [dispatch]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    dispatch(resetReels());
    dispatch(
      fetchReels({ offset: 0, limit: REELS_PER_PAGE, forceRefresh: true })
    )
      .unwrap()
      .catch((error) => {
        console.error("Error refreshing reels:", error);
        Alert.alert("Error", "Failed to refresh reels. Please try again.");
      })
      .finally(() => setRefreshing(false));
  }, [dispatch]);

  const loadMoreReels = useCallback(() => {
    if (!loading && hasMore) {
      dispatch(
        fetchReels({
          offset: reels.length,
          limit: REELS_PER_PAGE,
          forceRefresh: false,
        })
      );
    }
  }, [dispatch, loading, hasMore, reels.length]);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: any[] }) => {
      if (viewableItems.length > 0) {
        const visibleItem = viewableItems[0].item as Reel;
        setVisibleReelId(visibleItem.id);
      }
    },
    []
  );

  const viewabilityConfig = {
    itemVisiblePercentThreshold: 80,
    minimumViewTime: 500,
  };

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: height,
      offset: height * index,
      index,
    }),
    []
  );

  const renderReel = useCallback(
    ({ item }: { item: Reel }) => {
      const isVisible = item.id === visibleReelId;
      return (
        <ReelItem
          reel={item}
          isVisible={isVisible}
        />
      );
    },
    [dispatch, visibleReelId]
  );

  if (!loading && reels.length === 0) {
    return (
      <LinearGradient
        colors={["#000000", "#1a1a1a", "#2a2a2a"]}
        style={styles.container}
      >
        <SafeAreaView style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No reels available</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() =>
              dispatch(
                fetchReels({
                  offset: 0,
                  limit: REELS_PER_PAGE,
                  forceRefresh: true,
                })
              )
            }
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={reels}
        renderItem={renderReel}
        keyExtractor={(item) => item.id}
        pagingEnabled
        snapToInterval={height}
        snapToAlignment="start"
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        onEndReached={loadMoreReels}
        onEndReachedThreshold={0.5}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={getItemLayout}
        ListFooterComponent={
          loading && reels.length > 0 ? (
            <ActivityIndicator
              size="large"
              color="#FFD700"
              style={styles.loader}
            />
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FFD700"
          />
        }
      />
      {loading && reels.length === 0 && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#FFD700" />
        </View>
      )}
    </View>
  );
};

const ReelItem: React.FC<{
  reel: Reel;
  isVisible: boolean;
}> = ({ reel, isVisible }) => {
  const dispatch = useReduxDispatch<AppDispatch>();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showFullCaption, setShowFullCaption] = useState(false);
  const isMounted = useRef(true);

  const player = useVideoPlayer(reel.video_url, (player) => {
    player.loop = true;
    player.muted = false;
  });

  const scaleValues = {
    like: useSharedValue(1),
    comment: useSharedValue(1),
    share: useSharedValue(1),
    mute: useSharedValue(1),
    playPause: useSharedValue(1),
  };

  useEffect(() => {
    isMounted.current = true;
    if (player) {
      try {
        if (isVisible) {
          player.play();
          setIsPlaying(true);
        } else {
          player.pause();
          setIsPlaying(false);
        }
      } catch (error) {
        console.warn("Error toggling player state:", error);
      }
    }
    return () => {
      isMounted.current = false;
      try {
        player.pause();
      } catch (error) {
        console.warn("Error pausing player on unmount:", error);
      }
    };
  }, [isVisible, player]);

  const handleToggleLike = async () => {
    if (!reel.id || typeof reel.id !== "string" || reel.id === "undefined") {
      console.error("Invalid reel ID:", reel.id, "Reel:", reel);
      Alert.alert("Error", "Cannot like this reel due to an invalid ID.");
      return;
    }

    // Optimistically update the UI
    dispatch({
      type: "reels/toggleLike/fulfilled",
      payload: {
        reelId: reel.id,
        is_liked: !reel.is_liked,
        likes_count: reel.is_liked ? reel.likes_count - 1 : reel.likes_count + 1,
      },
    });

    try {
      const result = await dispatch(
        toggleLike({ reelId: reel.id, isLiked: reel.is_liked })
      ).unwrap();
      
      // Remove array destructuring since result is an object
      console.log("Like toggled successfully for reel:", reel.id, { ...result, reelId: reel.id });
      
      // Animate the like button
      scaleValues.like.value = withSpring(1.2, {}, () => {
        scaleValues.like.value = withSpring(1);
      });
    } catch (error: any) {
      console.error("Error toggling like:", error);
      // Revert the optimistic update on error
      dispatch({
        type: "reels/toggleLike/fulfilled",
        payload: {
          reelId: reel.id,
          is_liked: reel.is_liked,
          likes_count: reel.likes_count,
        },
      });
      
      // Only show alert for non-duplicate errors
      if (!error.message?.includes("duplicate key value")) {
        Alert.alert(
          "Error",
          `Failed to toggle like: ${error.message || "Unknown error"}`
        );
      }
    }
};

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out this reel: ${reel.caption}\n${reel.video_url}`,
      });
      if (!isMounted.current) return;

      scaleValues.share.value = withSpring(1.2, {}, () => {
        scaleValues.share.value = withSpring(1);
      });
    } catch (error) {
      console.error("Error sharing reel:", error);
    }
  };

  const handleComment = () => {
    if (!isMounted.current) return;

    scaleValues.comment.value = withSpring(1.2, {}, () => {
      scaleValues.comment.value = withSpring(1);
    });
    try {
      player.pause();
    } catch (err) {
      console.warn("Error pausing video before comment navigation:", err);
    }
    router.push({
      pathname: "/reels-comments-screen",
      params: {
        reelId: reel.id,
        reelOwnerUsername: reel.user.username,
      },
    });
  };

  const handleMute = () => {
    if (!isMounted.current) return;

    setIsMuted(!isMuted);
    try {
      player.muted = !isMuted;
    } catch (err) {
      console.warn("Error toggling mute:", err);
    }
    scaleValues.mute.value = withSpring(1.2, {}, () => {
      scaleValues.mute.value = withSpring(1);
    });
  };

  const handlePlayPause = () => {
    if (!isMounted.current) return;

    try {
      if (isPlaying) {
        player.pause();
      } else {
        player.play();
      }
    } catch (err) {
      console.warn("Error toggling play/pause:", err);
    }
    setIsPlaying(!isPlaying);
    scaleValues.playPause.value = withSpring(1.2, {}, () => {
      scaleValues.playPause.value = withSpring(1);
    });
  };

  const handleProfilePress = () => {
    if (!isMounted.current) return;

    console.log("Navigating to user profile with ID:", reel.userId);
    try {
      player.pause();
    } catch (err) {
      console.warn("Error pausing video before profile navigation:", err);
    }
    router.push(`/userProfile/${reel.userId}`);
  };

  const animatedStyles = {
    like: useAnimatedStyle(() => ({ transform: [{ scale: scaleValues.like.value }] })),
    comment: useAnimatedStyle(() => ({ transform: [{ scale: scaleValues.comment.value }] })),
    share: useAnimatedStyle(() => ({ transform: [{ scale: scaleValues.share.value }] })),
    mute: useAnimatedStyle(() => ({ transform: [{ scale: scaleValues.mute.value }] })),
    playPause: useAnimatedStyle(() => ({ transform: [{ scale: scaleValues.playPause.value }] })),
  };


  const caption = reel.caption.length > 100 && !showFullCaption
    ? reel.caption.slice(0, 100) + "..."
    : reel.caption;

  return (
    <View style={styles.reelContainer}>
      {/* Beautiful Header */}
      <LinearGradient
        colors={["rgba(0,0,0,0.8)", "transparent"]}
        style={styles.headerGradient}
      >
        <SafeAreaView style={styles.header}>
          <TouchableOpacity 
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Feather name="arrow-left" size={24} color="#FFD700" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Reels</Text>
          <View style={styles.headerRightPlaceholder} />
        </SafeAreaView>
      </LinearGradient>

      <VideoView
        player={player}
        style={styles.video}
        nativeControls={false}
        contentFit="cover"
        posterSource={reel.thumbnail_url ? { uri: reel.thumbnail_url } : undefined}
      />

      <LinearGradient
        colors={["transparent", "rgba(0, 0, 0, 0.9)"]}
        style={styles.gradientOverlay}
      >
        <View style={styles.contentContainer}>
          <View style={styles.mainContent}>
            <Pressable style={styles.userInfo} onPress={handleProfilePress}>
              <Image source={{ uri: reel.user.avatar }} style={styles.avatar} />
              <Text style={styles.username}>@{reel.user.username}</Text>
            </Pressable>

            <View style={styles.captionContainer}>
              <Text style={styles.caption}>{caption}</Text>
              {reel.caption.length > 100 && (
                <TouchableOpacity onPress={() => setShowFullCaption(!showFullCaption)}>
                  <Text style={styles.showMore}>
                    {showFullCaption ? "Show less" : "Show more"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.actions}>
            <View style={styles.actionWrapper}>
              <Animated.View style={[styles.actionButton, animatedStyles.like]}>
                <TouchableOpacity
                  onPress={handleToggleLike}
                  accessibilityLabel={`Like reel, ${reel.likes_count} likes`}
                >
                  <AntDesign
                    name={reel.is_liked ? "heart" : "hearto"}
                    size={28}
                    color={reel.is_liked ? "#FF0000" : "#ffffff"}
                  />
                </TouchableOpacity>
              </Animated.View>
              <Text style={styles.actionCount}>{reel.likes_count}</Text>
            </View>

            <View style={styles.actionWrapper}>
              <Animated.View style={[styles.actionButton, animatedStyles.comment]}>
                <TouchableOpacity onPress={handleComment}>
                  <Feather name="message-circle" size={28} color="#FFD700" />
                </TouchableOpacity>
              </Animated.View>
              <Text style={styles.actionCount}>{reel.comments_count}</Text>
            </View>

            <Animated.View style={[styles.actionButton, animatedStyles.share]}>
              <TouchableOpacity onPress={handleShare}>
                <Feather name="share" size={28} color="#FFD700" />
              </TouchableOpacity>
            </Animated.View>

            <Animated.View style={[styles.actionButton, animatedStyles.mute]}>
              <TouchableOpacity onPress={handleMute}>
                <Feather
                  name={isMuted ? "volume-x" : "volume-2"}
                  size={28}
                  color="#FFD700"
                />
              </TouchableOpacity>
            </Animated.View>

            <Animated.View style={[styles.actionButton, animatedStyles.playPause]}>
              <TouchableOpacity onPress={handlePlayPause}>
                <Feather
                  name={isPlaying ? "pause" : "play"}
                  size={28}
                  color="#FFD700"
                />
              </TouchableOpacity>
            </Animated.View>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  reelContainer: {
    width,
    height,
    backgroundColor: "#000",
  },
  // Header Styles
  headerGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingTop: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backButton: {
    backgroundColor: "rgba(255, 215, 0, 0.2)",
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.5)",
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Rubik-Bold",
    color: "#FFD700",
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  headerRightPlaceholder: {
    width: 36,
  },
  video: {
    width: "100%",
    height: "100%",
    backgroundColor: "black",
  },
  gradientOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "100%",
    padding: 16,
    paddingBottom: 80,
    justifyContent: "flex-end",
  },
  contentContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  mainContent: {
    flex: 1,
    marginRight: 16,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    backgroundColor: "rgba(255, 215, 0, 0.1)",
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.3)",
    alignSelf: "flex-start",
  },
  username: {
    fontSize: 16,
    fontFamily: "Rubik-Bold",
    color: "#20B2AA", // Teal color
    marginLeft: 8,
  },
  actions: {
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 16,
  },
  actionWrapper: {
    alignItems: "center",
    gap: 4,
  },
  actionButton: {
    alignItems: "center",
    padding: 8,
    backgroundColor: "rgba(255, 215, 0, 0.1)",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.3)",
    width: 48,
    height: 48,
    justifyContent: "center",
  },
  actionCount: {
    color: "#ffffff",
    fontSize: 14,
    fontFamily: "Rubik-Medium",
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  actionText: {
    color: "#ffffff",
    fontSize: 12,
    marginTop: 4,
    fontFamily: "Rubik-Regular",
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    textAlign: "center",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  loader: {
    marginVertical: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 18,
    fontFamily: "Rubik-Medium",
    color: "#ffffff",
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: "#FFD700",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontFamily: "Rubik-Medium",
    color: "#000000",
  },
});

export default Reels;