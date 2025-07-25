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
  Share,
  BackHandler,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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
  optimisticToggleLike,
} from "@/src/store/slices/reelsSlice";
import { Reel } from "@/types/type";
import { AppDispatch } from "@/src/store/store";
import { useDispatch as useReduxDispatch } from "react-redux";
import { router } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "@/src/context/ThemeContext";
import ThemedGradient from "@/components/ThemedGradient";

const { width, height } = Dimensions.get("window");
const REELS_PER_PAGE = 5;

const Reels = () => {
  const { colors, isDarkMode } = useTheme();
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
      return <ReelItem reel={item} isVisible={isVisible} />;
    },
    [visibleReelId]
  );

  if (!loading && reels.length === 0) {
    return (
      <ThemedGradient style={styles.container}>
        <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
        <SafeAreaView style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.text }]}>No tapes available</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
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
            <Text style={[styles.retryButtonText, { color: colors.background }]}>Retry</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </ThemedGradient>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
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
              color={colors.primary}
              style={styles.loader}
            />
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      />
      {loading && reels.length === 0 && (
        <View style={[styles.loadingOverlay, { backgroundColor: `${colors.background}CC` }]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
    </View>
  );
};

const ReelItem: React.FC<{
  reel: Reel;
  isVisible: boolean;
}> = ({ reel, isVisible }) => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const dispatch = useReduxDispatch<AppDispatch>();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showFullCaption, setShowFullCaption] = useState(false);
  const playerRef = useRef<any>(null);
  const isMounted = useRef(true);

  const player = useVideoPlayer(reel.video_url, (player) => {
    player.loop = true;
    player.muted = false;
    playerRef.current = player;
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

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (playerRef.current && isMounted.current) {
          try {
            playerRef.current.pause();
            setIsPlaying(false);
          } catch (error) {
            console.warn("Error pausing video on back press:", error);
          }
        }
        return false;
      }
    );

    return () => {
      isMounted.current = false;
      backHandler.remove();
      if (playerRef.current) {
        try {
          playerRef.current.pause();
          playerRef.current = null;
        } catch (error) {
          console.warn("Error cleaning up video player:", error);
        }
      }
    };
  }, []);

  useEffect(() => {
    if (!isMounted.current) return;

    try {
      if (isVisible && playerRef.current) {
        playerRef.current.play();
        setIsPlaying(true);
      } else if (playerRef.current) {
        playerRef.current.pause();
        setIsPlaying(false);
      }
    } catch (error) {
      console.warn("Error toggling player state:", error);
    }
  }, [isVisible]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", () => {
      if (isMounted.current && playerRef.current) {
        try {
          playerRef.current.pause();
          setIsPlaying(false);
        } catch (error) {
          console.warn("Error pausing video on navigation:", error);
        }
      }
    });

    return () => {
      unsubscribe();
      if (isMounted.current && playerRef.current) {
        try {
          playerRef.current.pause();
          setIsPlaying(false);
        } catch (error) {
          console.warn("Error pausing video on cleanup:", error);
        }
      }
    };
  }, [navigation]);

  const handleToggleLike = async () => {
    if (!reel.id || typeof reel.id !== "string" || reel.id === "undefined") {
      console.error("Invalid reel ID:", reel.id, "Reel:", reel);
      Alert.alert("Error", "Cannot like this reel due to an invalid ID.");
      return;
    }

    // Calculate new state for optimistic update
    const newIsLiked = !reel.is_liked;
    const newLikesCount = reel.is_liked ? reel.likes_count - 1 : reel.likes_count + 1;

    // Animate the like button
    scaleValues.like.value = withSpring(1.2, {}, () => {
      scaleValues.like.value = withSpring(1);
    });

    // Store original values in case we need to revert
    const originalIsLiked = reel.is_liked;
    const originalLikesCount = reel.likes_count;

    // Apply optimistic update
    dispatch(optimisticToggleLike({
      reelId: reel.id,
      is_liked: newIsLiked,
      likes_count: newLikesCount,
    }));

    try {
      // Make the actual API call
      await dispatch(
        toggleLike({
          reelId: reel.id,
          isLiked: originalIsLiked // Pass the original state, not the optimistically updated one
        })
      ).unwrap();

      console.log("Like toggled successfully for reel:", reel.id);
    } catch (error: any) {
      console.error("Error toggling like:", error);

      // Revert the optimistic update if the API call fails
      dispatch(optimisticToggleLike({
        reelId: reel.id,
        is_liked: originalIsLiked,
        likes_count: originalLikesCount,
      }));

      if (!error.message?.includes("duplicate key value")) {
        Alert.alert(
          "Error",
          `Failed to toggle like: ${error.message || "Unknown error"}`
        );
      }
    }
  };

  const handleShare = async () => {
    if (!isMounted.current) return;

    try {
      await Share.share({
        message: `Check out this reel: ${reel.caption}\n${reel.video_url}`,
      });
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

    if (playerRef.current) {
      try {
        playerRef.current.pause();
        setIsPlaying(false);
      } catch (error) {
        console.warn("Error pausing video before comment navigation:", error);
      }
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
    if (playerRef.current) {
      try {
        playerRef.current.muted = !isMuted;
      } catch (error) {
        console.warn("Error toggling mute:", error);
      }
    }
    scaleValues.mute.value = withSpring(1.2, {}, () => {
      scaleValues.mute.value = withSpring(1);
    });
  };

  const handlePlayPause = () => {
    if (!isMounted.current) return;

    try {
      if (isPlaying && playerRef.current) {
        playerRef.current.pause();
        setIsPlaying(false);
      } else if (playerRef.current) {
        playerRef.current.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.warn("Error toggling play/pause:", error);
    }
    scaleValues.playPause.value = withSpring(1.2, {}, () => {
      scaleValues.playPause.value = withSpring(1);
    });
  };

  const handleProfilePress = () => {
    if (!isMounted.current) return;

    console.log("Navigating to user profile with ID:", reel.user_id);
    if (playerRef.current) {
      try {
        playerRef.current.pause();
        setIsPlaying(false);
      } catch (error) {
        console.warn("Error pausing video before profile navigation:", error);
      }
    }
    router.push(`/userProfile/${reel.user_id}`);
  };

  const animatedStyles = {
    like: useAnimatedStyle(() => ({
      transform: [{ scale: scaleValues.like.value }],
    })),
    comment: useAnimatedStyle(() => ({
      transform: [{ scale: scaleValues.comment.value }],
    })),
    share: useAnimatedStyle(() => ({
      transform: [{ scale: scaleValues.share.value }],
    })),
    mute: useAnimatedStyle(() => ({
      transform: [{ scale: scaleValues.mute.value }],
    })),
    playPause: useAnimatedStyle(() => ({
      transform: [{ scale: scaleValues.playPause.value }],
    })),
  };

  const caption =
    reel.caption.length > 100 && !showFullCaption
      ? reel.caption.slice(0, 100) + "..."
      : reel.caption;

  return (
    <View style={[styles.reelContainer, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={["rgba(0,0,0,0.4)", "transparent"]}
        style={styles.headerGradient}
      >
        <SafeAreaView style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              if (playerRef.current) {
                try {
                  playerRef.current.pause();
                  setIsPlaying(false);
                } catch (error) {
                  console.warn("Error pausing video on back:", error);
                }
              }
              router.back();
            }}
            style={[
              styles.backButton,
              {
                backgroundColor: `${colors.primary}10`,
                borderColor: `${colors.primary}30`
              }
            ]}
          >
            <Feather name="arrow-left" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: "#FFFFFF" }]}>Tapes</Text>
          <View style={styles.headerRightPlaceholder} />
        </SafeAreaView>
      </LinearGradient>

      <VideoView
        player={player}
        style={styles.video}
        nativeControls={false}
        contentFit="contain"
      />

      <LinearGradient
        colors={["transparent", "rgba(0, 0, 0, 0.5)"]}
        style={styles.gradientOverlay}
      >
        <View style={styles.contentContainer}>
          <View style={styles.mainContent}>
            <Pressable
              style={[
                styles.userInfo,
                {
                  backgroundColor: `${colors.primary}05`,
                  borderColor: `${colors.primary}20`
                }
              ]}
              onPress={handleProfilePress}
            >
              <Image source={{ uri: reel.user.avatar_url || "https://via.placeholder.com/150" }} style={styles.avatar} />
              <Text style={[styles.username, { color: "white" }]}>@{reel.user.username}</Text>
            </Pressable>

            <View style={styles.captionContainer}>
              <Text style={[styles.caption, { color: "white" }]}>{caption}</Text>
              {reel.caption.length > 100 && (
                <TouchableOpacity
                  onPress={() => setShowFullCaption(!showFullCaption)}
                >
                  <Text style={[styles.showMore, { color: "white" }]}>
                    {showFullCaption ? "Show less" : "Show more"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.actions}>
            <View style={styles.actionWrapper}>
              <Animated.View style={[
                styles.actionButton,
                {
                  backgroundColor: `${colors.primary}05`,
                  borderColor: `${colors.primary}20`
                },
                animatedStyles.like
              ]}>
                <TouchableOpacity
                  onPress={handleToggleLike}
                  accessibilityLabel={`Like reel, ${reel.likes_count} likes`}
                >
                  <AntDesign
                    name={reel.is_liked ? "heart" : "hearto"}
                    size={28}
                    color={reel.is_liked ? colors.error : "white"}
                  />
                </TouchableOpacity>
              </Animated.View>
              <Text style={[styles.actionCount, { color: "white" }]}>{reel.likes_count}</Text>
            </View>

            <View style={styles.actionWrapper}>
              <Animated.View
                style={[
                  styles.actionButton,
                  {
                    backgroundColor: `${colors.primary}05`,
                    borderColor: `${colors.primary}20`
                  },
                  animatedStyles.comment
                ]}
              >
                <TouchableOpacity onPress={handleComment}>
                  <Feather name="message-circle" size={28} color="white" />
                </TouchableOpacity>
              </Animated.View>
              <Text style={[styles.actionCount, { color: "white" }]}>{reel.comments_count}</Text>
            </View>

            <Animated.View style={[
              styles.actionButton,
              {
                backgroundColor: `${colors.primary}05`,
                borderColor: `${colors.primary}20`
              },
              animatedStyles.share
            ]}>
              <TouchableOpacity onPress={handleShare}>
                <Feather name="share" size={28} color="white" />
              </TouchableOpacity>
            </Animated.View>

            <Animated.View style={[
              styles.actionButton,
              {
                backgroundColor: `${colors.primary}05`,
                borderColor: `${colors.primary}20`
              },
              animatedStyles.mute
            ]}>
              <TouchableOpacity onPress={handleMute}>
                <Feather
                  name={isMuted ? "volume-x" : "volume-2"}
                  size={28}
                  color="white"
                />
              </TouchableOpacity>
            </Animated.View>

            <Animated.View
              style={[
                styles.actionButton,
                {
                  backgroundColor: `${colors.primary}05`,
                  borderColor: `${colors.primary}20`
                },
                animatedStyles.playPause
              ]}
            >
              <TouchableOpacity onPress={handlePlayPause}>
                <Feather
                  name={isPlaying ? "pause" : "play"}
                  size={28}
                  color="white"
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
  },
  reelContainer: {
    width,
    height,
    justifyContent: "center",
    alignItems: "center",
  },
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
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Rubik-Bold",
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
    justifyContent: "center",
    alignItems: "center",
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
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  username: {
    fontSize: 16,
    fontFamily: "Rubik-Bold",
    marginLeft: 8,
  },
  captionContainer: {
    marginBottom: 16,
  },
  caption: {
    fontSize: 16,
    fontFamily: "Rubik-Regular",
    lineHeight: 22,
  },
  showMore: {
    fontSize: 14,
    fontFamily: "Rubik-Medium",
    marginTop: 4,
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
    borderRadius: 24,
    borderWidth: 1,
    width: 48,
    height: 48,
    justifyContent: "center",
  },
  actionCount: {
    fontSize: 14,
    fontFamily: "Rubik-Medium",
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
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
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontFamily: "Rubik-Medium",
  },
});

export default Reels;