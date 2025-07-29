import React, { useState, useEffect, useCallback, useMemo, memo } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { router } from "expo-router";
import { AntDesign } from "@expo/vector-icons";
import { messagesAPI } from "@/lib/messagesApi";
import { useTheme } from "@/src/context/ThemeContext";
import ThemedGradient from "@/components/ThemedGradient";
import LazyQueryProvider from "@/lib/query/LazyQueryProvider";
import { useConversations } from "@/lib/query/hooks/useChatQuery";
import { animationPerformanceUtils } from "@/lib/utils/animationPerformance";

// Memoized conversation item component for better performance
const ConversationItem = memo(({ item, colors, onPress }: {
  item: any;
  colors: any;
  onPress: () => void;
}) => (
  <TouchableOpacity
    style={[styles.userItem, {
      backgroundColor: colors.card,
      borderBottomColor: colors.cardBorder
    }]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <Image
      source={{ uri: item.avatar }}
      style={[styles.avatar, { borderColor: colors.cardBorder }]}
      {...animationPerformanceUtils.getOptimizedImageProps()}
    />
    <View style={styles.userInfo}>
      <Text className="font-rubik-bold" style={[styles.username, { color: colors.text }]}>
        {item.username}
      </Text>
      <Text
        className="font-rubik-medium"
        style={[styles.lastMessage, { color: colors.textSecondary }]}
        numberOfLines={1}
      >
        {item.lastMessage}
      </Text>
    </View>
  </TouchableOpacity>
));

// Wrapper component with LazyQueryProvider
export default function ChatList() {
  return (
    <LazyQueryProvider>
      <ChatListContent />
    </LazyQueryProvider>
  );
}

// Main chat list component
function ChatListContent() {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { colors, isDarkMode } = useTheme();

  // TanStack Query hook for conversations
  const { data: conversations = [], isLoading: loading, error } = useConversations(currentUserId || '');

  // Memoize current user fetching to prevent unnecessary re-renders
  const getCurrentUser = useCallback(async () => {
    try {
      if (!supabase) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    } catch (error) {
      console.error("Error getting current user:", error);
    }
  }, []);

  // Get current user ID
  useEffect(() => {
    getCurrentUser();
  }, [getCurrentUser]);



  // Optimized render function using memoized component
  const renderConversation = useCallback(({ item }: any) => (
    <ConversationItem
      item={item}
      colors={colors}
      onPress={() => router.push(`/chats/${item.userId}`)}
    />
  ), [colors, router]);

  // Memoize FlatList props for better performance
  const flatListProps = useMemo(() => ({
    ...animationPerformanceUtils.getOptimizedFlatListProps(80),
    extraData: `${isDarkMode}-${conversations.length}`,
  }), [isDarkMode, conversations.length]);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ThemedGradient style={styles.container}>
      <View style={[styles.header, {
        borderBottomColor: colors.cardBorder,
        backgroundColor: colors.backgroundSecondary
      }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backButton, {
            backgroundColor: isDarkMode ? 'rgba(128, 128, 128, 0.2)' : 'rgba(128, 128, 128, 0.1)',
            borderColor: isDarkMode ? 'rgba(128, 128, 128, 0.5)' : 'rgba(128, 128, 128, 0.3)'
          }]}
        >
          <AntDesign name="arrowleft" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text className="font-rubik-bold" style={[styles.title, { color: colors.text }]}>
          Messages
        </Text>
      </View>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.emptyContainer}>
          <Text className="font-rubik-medium" style={[styles.emptyText, { color: colors.textSecondary }]}>
            Failed to load conversations. Please try again.
          </Text>
        </View>
      ) : conversations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text className="font-rubik-medium" style={[styles.emptyText, { color: colors.textSecondary }]}>
            No messages yet
          </Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          renderItem={renderConversation}
          keyExtractor={(item) => item.userId}
          contentContainerStyle={styles.flatListContent}
          // Performance optimizations using memoized props
          {...flatListProps}
        />
      )}
      </ThemedGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  userItem: {
    flexDirection: "row",
    padding: 16,
    borderBottomWidth: 1,
    alignItems: "center",
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
  },
  userInfo: {
    flex: 1,
    marginLeft: 16,
  },
  username: {
    fontSize: 16,
    marginBottom: 4,
  },
  lastMessage: {
    fontSize: 14,
  },

  timestamp: {
    fontSize: 12,
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
  },
  flatListContent: {
    paddingBottom: 20,
  },
});