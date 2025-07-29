import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Modal from 'react-native-modal';
import { AntDesign, Feather } from '@expo/vector-icons';
import { useTheme } from '@/src/context/ThemeContext';
import { supabase } from '@/lib/supabase';
import { messagesAPI } from '@/lib/messagesApi';
import ThemedGradient from './ThemedGradient';
import CachedImage from './CachedImage';
import socketService from '@/lib/socketService';
import { SafeAreaView } from 'react-native-safe-area-context';

interface User {
  id: string;
  username: string;
  avatar_url: string;
  full_name?: string;
}

interface Conversation {
  userId: string;
  username: string;
  avatar: string;
  lastMessage: string;
  timestamp: string;
}

interface Post {
  id: string;
  caption: string;
  image_urls: string[];
  user: {
    username: string;
  };
}

interface Reel {
  id: string;
  caption: string;
  video_url: string;
  thumbnail_url?: string;
  user: {
    username: string;
  };
}

interface ShareToChatModalProps {
  isVisible: boolean;
  onClose: () => void;
  post?: Post | null;
  reel?: Reel | null;
  onShareSuccess: () => void;
}

const ShareToChatModal: React.FC<ShareToChatModalProps> = ({
  isVisible,
  onClose,
  post,
  reel,
  onShareSuccess,
}) => {
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [recentConversations, setRecentConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    if (isVisible) {
      initializeModal();
      setSearchQuery('');
      setSearchResults([]);
    } else {
      // Reset state when modal closes
      setRecentConversations([]);
      setLoadingConversations(false);
      setCurrentUserId(null);
    }
  }, [isVisible]);

  // Separate useEffect to fetch conversations when currentUserId is available
  useEffect(() => {
    if (currentUserId && isVisible) {
      fetchRecentConversations();
    }
  }, [currentUserId, isVisible]);

  const initializeModal = async () => {
    await getCurrentUser();
  };

  const getCurrentUser = async () => {
    try {
      if (!supabase) {
        console.error('Supabase client not initialized');
        return;
      }
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    } catch (error) {
      console.error('Error getting current user:', error);
    }
  };

  const fetchRecentConversations = async () => {
    if (!currentUserId) return;

    setLoadingConversations(true);
    try {
      const messages = await messagesAPI.getUserConversations(currentUserId);

      // Group messages by conversation partner
      const conversationMap = new Map<string, any>();

      messages.documents.forEach((message: any) => {
        const partnerId = message.sender_id === currentUserId
          ? message.receiver_id
          : message.sender_id;

        if (!conversationMap.has(partnerId)) {
          const partner = message.sender_id === currentUserId
            ? message.receiver
            : message.sender;

          conversationMap.set(partnerId, {
            userId: partnerId,
            username: partner.username,
            avatar: partner.avatar_url || 'https://via.placeholder.com/50',
            lastMessage: messagesAPI.getMessagePreview(message.content, message.message_type),
            timestamp: message.created_at,
          });
        }
      });

      setRecentConversations(Array.from(conversationMap.values()));
    } catch (error) {
      console.error('Error fetching recent conversations:', error);
      setRecentConversations([]);
    } finally {
      setLoadingConversations(false);
    }
  };

  const searchUsers = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      if (!supabase) {
        console.error('Supabase client not initialized');
        setSearchResults([]);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, full_name')
        .ilike('username', `%${query}%`)
        .neq('id', currentUserId) // Exclude current user
        .limit(20);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    searchUsers(text);
  };

  const shareContentToChat = async (recipientId: string, recipientUsername: string) => {
    if ((!post && !reel) || !currentUserId) return;

    setSharing(true);
    try {
      let sharedContent;
      let messageType;

      if (post) {
        // Create shared post message content
        sharedContent = JSON.stringify({
          type: 'shared_post',
          post_id: post.id,
          post_caption: post.caption,
          post_image: post.image_urls[0],
          post_owner: post.user.username,
          shared_by: currentUserId,
          shared_at: new Date().toISOString(),
        });
        messageType = 'shared_post' as const;
      } else if (reel) {
        // Create shared reel message content
        sharedContent = JSON.stringify({
          type: 'shared_reel',
          reel_id: reel.id,
          reel_caption: reel.caption,
          reel_video_url: reel.video_url,
          reel_thumbnail: reel.thumbnail_url,
          reel_owner: reel.user.username,
          shared_by: currentUserId,
          shared_at: new Date().toISOString(),
        });
        messageType = 'shared_reel' as const;
      } else {
        return;
      }

      // Send via Socket.IO for real-time delivery
      const socketMessage = {
        sender_id: currentUserId,
        receiver_id: recipientId,
        content: sharedContent,
        is_read: false,
        message_type: messageType,
      };

      // Send via Socket.IO
      socketService.sendMessage({
        ...socketMessage,
        id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        created_at: new Date().toISOString(),
        status: 'sent',
      });

      // Save to database in background
      messagesAPI.sendMessage(
        currentUserId,
        recipientId,
        sharedContent,
        messageType
      ).catch(dbError => console.error("Database save error:", dbError));

      const contentType = post ? 'Post' : 'Reel';
      Alert.alert(
        'Success',
        `${contentType} shared with ${recipientUsername}`,
        [{ text: 'OK', onPress: onShareSuccess }]
      );

      onClose();
    } catch (error) {
      console.error('Error sharing post:', error);
      Alert.alert('Error', 'Failed to share post. Please try again.');
    } finally {
      setSharing(false);
    }
  };

  const renderUserItem = ({ item }: { item: User }) => (
    <TouchableOpacity
      style={[styles.userItem, { backgroundColor: colors.backgroundSecondary }]}
      onPress={() => shareContentToChat(item.id, item.username)}
      disabled={sharing}
    >
      <CachedImage
        uri={item.avatar_url || 'https://via.placeholder.com/50'}
        style={styles.avatar}
        showLoader={true}
        fallbackUri="https://via.placeholder.com/50"
      />
      <View style={styles.userInfo}>
        <Text className="font-rubik-bold" style={[styles.username, { color: colors.text }]}>
          {item.username}
        </Text>
        {item.full_name && (
          <Text className="font-rubik-regular" style={[styles.fullName, { color: colors.textSecondary }]}>
            {item.full_name}
          </Text>
        )}
      </View>
      <Feather name="send" size={20} color={colors.primary} />
    </TouchableOpacity>
  );

  const renderConversationItem = ({ item }: { item: Conversation }) => (
    <TouchableOpacity
      style={[styles.userItem, { backgroundColor: colors.backgroundSecondary }]}
      onPress={() => shareContentToChat(item.userId, item.username)}
      disabled={sharing}
    >
      <CachedImage
        uri={item.avatar}
        style={styles.avatar}
        showLoader={true}
        fallbackUri="https://via.placeholder.com/50"
      />
      <View style={styles.userInfo}>
        <Text className="font-rubik-bold" style={[styles.username, { color: colors.text }]}>
          {item.username}
        </Text>
        <Text 
          className="font-rubik-regular" 
          style={[styles.lastMessage, { color: colors.textSecondary }]}
          numberOfLines={1}
        >
          {item.lastMessage}
        </Text>
      </View>
      <Feather name="send" size={20} color={colors.primary} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1 }}>
    <Modal
      isVisible={isVisible}
      style={styles.modal}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      backdropOpacity={0.5}
      onBackButtonPress={onClose}
      onBackdropPress={onClose}
    >
      <ThemedGradient style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: `${colors.primary}20` }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <AntDesign name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text className="font-rubik-bold" style={[styles.title, { color: colors.text }]}>
            Share to Chat
          </Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Search Input */}
        <View style={[styles.searchContainer, { backgroundColor: colors.backgroundSecondary }]}>
          <Feather name="search" size={20} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search users..."
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={handleSearch}
          />
        </View>

        {/* Content */}
        <View style={styles.content}>
          {searchQuery.length > 0 ? (
            // Search Results
            <>
              <Text className="font-rubik-medium" style={[styles.sectionTitle, { color: colors.text }]}>
                Search Results
              </Text>
              {loading ? (
                <ActivityIndicator size="small" color={colors.primary} style={styles.loader} />
              ) : (
                <FlatList
                  data={searchResults}
                  renderItem={renderUserItem}
                  keyExtractor={(item) => item.id}
                  showsVerticalScrollIndicator={false}
                  ListEmptyComponent={
                    <Text className="font-rubik-regular" style={[styles.emptyText, { color: colors.textSecondary }]}>
                      No users found
                    </Text>
                  }
                />
              )}
            </>
          ) : (
            // Recent Conversations
            <>
              <Text className="font-rubik-medium" style={[styles.sectionTitle, { color: colors.text }]}>
                Recent Conversations
              </Text>
              {loadingConversations ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text className="font-rubik-regular" style={[{ color: colors.textSecondary, marginLeft: 10, fontSize: 14 }]}>
                    Loading conversations...
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={recentConversations}
                  renderItem={renderConversationItem}
                  keyExtractor={(item) => item.userId}
                  showsVerticalScrollIndicator={false}
                  ListEmptyComponent={
                    !loadingConversations ? (
                      <Text className="font-rubik-regular" style={[styles.emptyText, { color: colors.textSecondary }]}>
                        No recent conversations
                      </Text>
                    ) : null
                  }
                />
              )}
            </>
          )}
        </View>

        {sharing && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text className="font-rubik-medium" style={[styles.loadingText, { color: colors.text }]}>
              Sharing post...
            </Text>
          </View>
        )}
      </ThemedGradient>
    </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  modal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  container: {
    height: '80%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 20,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 25,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 15,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    marginBottom: 8,
    borderRadius: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  username: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  fullName: {
    fontSize: 14,
    marginTop: 2,
  },
  lastMessage: {
    fontSize: 14,
    marginTop: 2,
  },
  loader: {
    marginVertical: 20,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
});

export default ShareToChatModal;
