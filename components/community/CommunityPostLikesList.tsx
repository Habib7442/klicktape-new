import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "@/src/context/ThemeContext";
import CachedImage from "@/components/CachedImage";
import { communityPostsAPI } from "@/lib/communitiesApi";

interface LikeUser {
  user_id: string;
  username: string;
  avatar_url: string;
  created_at: string;
}

interface CommunityPostLikesListProps {
  postId: string;
  title: string;
}

export default function CommunityPostLikesList({
  postId,
  title,
}: CommunityPostLikesListProps) {
  const { isDarkMode, colors } = useTheme();
  const router = useRouter();
  const [likes, setLikes] = useState<LikeUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLikes();
  }, [postId]);

  const loadLikes = async () => {
    try {
      setLoading(true);
      const likesData = await communityPostsAPI.getCommunityPostLikes(postId);
      setLikes(likesData);
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUserPress = (userId: string) => {
    router.push(`/(root)/userProfile/${userId}`);
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const likeDate = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - likeDate.getTime()) / 1000);

    if (diffInSeconds < 60) return 'now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
    return likeDate.toLocaleDateString();
  };

  const renderLikeItem = ({ item }: { item: LikeUser }) => (
    <TouchableOpacity
      style={styles.likeItem}
      onPress={() => handleUserPress(item.user_id)}
      activeOpacity={0.7}
    >
      <View style={styles.userInfo}>
        {item.avatar_url ? (
          <CachedImage
            uri={item.avatar_url}
            style={styles.avatar}
            showLoader={true}
            loaderColor={colors.textSecondary}
            loaderSize="small"
          />
        ) : (
          <View style={[styles.avatarPlaceholder, {
            backgroundColor: isDarkMode ? 'rgba(128, 128, 128, 0.3)' : 'rgba(128, 128, 128, 0.2)'
          }]}>
            <Feather name="user" size={20} color="#FFFFFF" />
          </View>
        )}
        <View style={styles.userDetails}>
          <Text style={[styles.username, { color: colors.text }]}>
            {item.username}
          </Text>
          <Text style={[styles.timeAgo, { color: colors.textSecondary }]}>
            {formatTimeAgo(item.created_at)}
          </Text>
        </View>
      </View>
      <Feather name="chevron-right" size={20} color={colors.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { 
        borderBottomColor: isDarkMode ? 'rgba(128, 128, 128, 0.2)' : 'rgba(128, 128, 128, 0.2)' 
      }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {title}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading likes...
          </Text>
        </View>
      ) : (
        <FlatList
          data={likes}
          renderItem={renderLikeItem}
          keyExtractor={(item) => item.user_id}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Feather name="heart" size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No likes yet
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                Be the first to like this post
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Rubik-Bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: 'Rubik-Medium',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingVertical: 8,
  },
  likeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Rubik-Bold',
  },
  timeAgo: {
    fontSize: 14,
    fontFamily: 'Rubik-Medium',
    marginTop: 2,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: 'Rubik-Bold',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: 'Rubik-Medium',
    marginTop: 8,
    textAlign: 'center',
  },
});
