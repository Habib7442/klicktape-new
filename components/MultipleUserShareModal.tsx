import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  TextInput,
  Alert,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { Feather, AntDesign } from '@expo/vector-icons';
import { useTheme } from '@/src/context/ThemeContext';
import { supabase } from '@/lib/supabase';
import { messagesAPI } from '@/lib/messagesApi';
import { socketService } from '@/lib/socketService';
import CachedImage from './CachedImage';

const { width, height } = Dimensions.get('window');

interface User {
  id: string;
  username: string;
  full_name?: string;
  avatar_url?: string;
}

interface Conversation {
  userId: string;
  username: string;
  avatar: string;
  lastMessage: string;
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
  thumbnail_url: string;
  user: {
    username: string;
  };
}

interface MultipleUserShareModalProps {
  isVisible: boolean;
  onClose: () => void;
  post?: Post;
  reel?: Reel;
  onShareSuccess?: () => void;
}

const MultipleUserShareModal: React.FC<MultipleUserShareModalProps> = ({
  isVisible,
  onClose,
  post,
  reel,
  onShareSuccess,
}) => {
  const { colors, isDarkMode } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [recentConversations, setRecentConversations] = useState<Conversation[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    if (isVisible) {
      getCurrentUser();
      loadRecentConversations();
    } else {
      // Reset state when modal closes
      setSearchQuery('');
      setSearchResults([]);
      setSelectedUsers([]);
    }
  }, [isVisible]);

  const getCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    } catch (error) {
      console.error('Error getting current user:', error);
    }
  };

  const loadRecentConversations = async () => {
    setLoadingConversations(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: conversations, error } = await supabase.rpc(
        'get_user_conversations',
        { user_id_param: user.id, limit_param: 20 }
      );

      if (error) throw error;

      const formattedConversations: Conversation[] = conversations.map((conv: any) => {
        let lastMessage = conv.last_message || 'No messages yet';
        let messageType = 'text';

        // Detect message type from JSON content
        try {
          if (lastMessage.startsWith('{') && lastMessage.includes('type')) {
            const messageData = JSON.parse(lastMessage);
            if (messageData.type === 'shared_post') {
              messageType = 'shared_post';
            } else if (messageData.type === 'shared_reel') {
              messageType = 'shared_reel';
            }
          }
        } catch (error) {
          // If parsing fails, treat as text
        }

        // Use the message preview function with detected type
        lastMessage = messagesAPI.getMessagePreview(lastMessage, messageType);

        return {
          userId: conv.other_user_id,
          username: conv.other_username,
          avatar: conv.other_avatar_url || 'https://via.placeholder.com/50',
          lastMessage,
        };
      });

      setRecentConversations(formattedConversations);
    } catch (error) {
      console.error('Error loading recent conversations:', error);
    } finally {
      setLoadingConversations(false);
    }
  };

  const searchUsers = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: users, error } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .neq('id', user.id)
        .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
        .limit(20);

      if (error) throw error;

      setSearchResults(users || []);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchUsers(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, searchUsers]);

  const toggleUserSelection = (user: User) => {
    setSelectedUsers(prev => {
      const isSelected = prev.some(u => u.id === user.id);
      if (isSelected) {
        return prev.filter(u => u.id !== user.id);
      } else {
        return [...prev, user];
      }
    });
  };

  const isUserSelected = (userId: string) => {
    return selectedUsers.some(u => u.id === userId);
  };

  const shareToMultipleUsers = async () => {
    if (selectedUsers.length === 0) {
      Alert.alert('No Recipients', 'Please select at least one user to share with.');
      return;
    }

    if (!currentUserId) {
      Alert.alert('Error', 'Unable to identify current user.');
      return;
    }

    setSharing(true);
    try {
      let sharedContent;
      let messageType;

      if (post) {
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

      // Share to all selected users
      const sharePromises = selectedUsers.map(async (user) => {
        // Send via Socket.IO for real-time delivery
        const socketMessage = {
          sender_id: currentUserId,
          receiver_id: user.id,
          content: sharedContent,
          is_read: false,
          message_type: messageType,
        };

        socketService.sendMessage({
          ...socketMessage,
          id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
          created_at: new Date().toISOString(),
          status: 'sent',
        });

        // Save to database in background
        return messagesAPI.sendMessage(
          currentUserId,
          user.id,
          sharedContent,
          messageType
        ).catch(dbError => console.error(`Database save error for ${user.username}:`, dbError));
      });

      await Promise.all(sharePromises);

      const contentType = post ? 'Post' : 'Reel';
      const userCount = selectedUsers.length;
      const userNames = selectedUsers.length <= 3 
        ? selectedUsers.map(u => u.username).join(', ')
        : `${selectedUsers.slice(0, 2).map(u => u.username).join(', ')} and ${selectedUsers.length - 2} others`;

      Alert.alert(
        'Success!',
        `${contentType} shared with ${userCount} ${userCount === 1 ? 'user' : 'users'}: ${userNames}`,
        [{ text: 'OK', onPress: () => {
          onClose();
          onShareSuccess?.();
        }}]
      );
    } catch (error) {
      console.error('Error sharing to multiple users:', error);
      Alert.alert('Error', 'Failed to share content to some users. Please try again.');
    } finally {
      setSharing(false);
    }
  };

  const removeSelectedUser = (userId: string) => {
    setSelectedUsers(prev => prev.filter(u => u.id !== userId));
  };

  return (
    <SafeAreaView className="flex-1">
      <Modal
        visible={isVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Feather name="x" size={24} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                Share to Multiple Users
              </Text>
              <TouchableOpacity 
                onPress={shareToMultipleUsers}
                disabled={selectedUsers.length === 0 || sharing}
                style={[styles.shareButton, { 
                  backgroundColor: selectedUsers.length > 0 && !sharing ? colors.primary : colors.textSecondary + '40'
                }]}
              >
                <Text style={[styles.shareButtonText, { 
                  color: selectedUsers.length > 0 && !sharing ? 'white' : colors.textSecondary
                }]}>
                  {sharing ? 'Sharing...' : `Share (${selectedUsers.length})`}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Selected Users Display */}
            {selectedUsers.length > 0 && (
              <View style={styles.selectedUsersContainer}>
                <Text style={[styles.selectedUsersTitle, { color: colors.text }]}>
                  Selected ({selectedUsers.length}):
                </Text>
                <FlatList
                  horizontal
                  data={selectedUsers}
                  keyExtractor={(item) => item.id}
                  showsHorizontalScrollIndicator={false}
                  renderItem={({ item }) => (
                    <View style={[styles.selectedUserItem, { backgroundColor: colors.backgroundSecondary }]}>
                      <CachedImage
                        uri={item.avatar_url || 'https://via.placeholder.com/40'}
                        style={styles.selectedUserAvatar}
                        showLoader={true}
                        fallbackUri="https://via.placeholder.com/40"
                      />
                      <Text style={[styles.selectedUserName, { color: colors.text }]} numberOfLines={1}>
                        {item.username}
                      </Text>
                      <TouchableOpacity
                        onPress={() => removeSelectedUser(item.id)}
                        style={styles.removeButton}
                      >
                        <AntDesign name="close" size={14} color={colors.textSecondary} />
                      </TouchableOpacity>
                    </View>
                  )}
                />
              </View>
            )}

            {/* Search Input */}
            <View style={[styles.searchContainer, { backgroundColor: colors.backgroundSecondary }]}>
              <Feather name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search users..."
                placeholderTextColor={colors.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
              />
            </View>

            {/* Content */}
            <FlatList
              data={searchQuery ? searchResults : recentConversations}
              keyExtractor={(item) => searchQuery ? (item as User).id : (item as Conversation).userId}
              renderItem={({ item }) => {
                if (searchQuery) {
                  const user = item as User;
                  const isSelected = isUserSelected(user.id);
                  return (
                    <TouchableOpacity
                      style={[styles.userItem, {
                        backgroundColor: isSelected ? colors.primary + '20' : colors.backgroundSecondary,
                        borderColor: isSelected ? colors.primary : 'transparent',
                        borderWidth: isSelected ? 1 : 0,
                      }]}
                      onPress={() => toggleUserSelection(user)}
                      disabled={sharing}
                    >
                      <CachedImage
                        uri={user.avatar_url || 'https://via.placeholder.com/50'}
                        style={styles.avatar}
                        showLoader={true}
                        fallbackUri="https://via.placeholder.com/50"
                      />
                      <View style={styles.userInfo}>
                        <Text className="font-rubik-bold" style={[styles.username, { color: colors.text }]}>
                          {user.username}
                        </Text>
                        {user.full_name && (
                          <Text className="font-rubik-regular" style={[styles.fullName, { color: colors.textSecondary }]}>
                            {user.full_name}
                          </Text>
                        )}
                      </View>
                      <View style={[styles.selectionIndicator, {
                        backgroundColor: isSelected ? colors.primary : 'transparent',
                        borderColor: colors.textSecondary,
                      }]}>
                        {isSelected && <AntDesign name="check" size={16} color="white" />}
                      </View>
                    </TouchableOpacity>
                  );
                } else {
                  const conversation = item as Conversation;
                  const isSelected = isUserSelected(conversation.userId);
                  return (
                    <TouchableOpacity
                      style={[styles.userItem, {
                        backgroundColor: isSelected ? colors.primary + '20' : colors.backgroundSecondary,
                        borderColor: isSelected ? colors.primary : 'transparent',
                        borderWidth: isSelected ? 1 : 0,
                      }]}
                      onPress={() => toggleUserSelection({
                        id: conversation.userId,
                        username: conversation.username,
                        avatar_url: conversation.avatar,
                      })}
                      disabled={sharing}
                    >
                      <CachedImage
                        uri={conversation.avatar}
                        style={styles.avatar}
                        showLoader={true}
                        fallbackUri="https://via.placeholder.com/50"
                      />
                      <View style={styles.userInfo}>
                        <Text className="font-rubik-bold" style={[styles.username, { color: colors.text }]}>
                          {conversation.username}
                        </Text>
                        <Text
                          className="font-rubik-regular"
                          style={[styles.lastMessage, { color: colors.textSecondary }]}
                          numberOfLines={1}
                        >
                          {conversation.lastMessage}
                        </Text>
                      </View>
                      <View style={[styles.selectionIndicator, {
                        backgroundColor: isSelected ? colors.primary : 'transparent',
                        borderColor: colors.textSecondary,
                      }]}>
                        {isSelected && <AntDesign name="check" size={16} color="white" />}
                      </View>
                    </TouchableOpacity>
                  );
                }
              }}
              ListEmptyComponent={() => (
                <View style={styles.emptyContainer}>
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    {searchQuery ? 'No users found' : loadingConversations ? 'Loading...' : 'No recent conversations'}
                  </Text>
                </View>
              )}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    height: height * 0.85,
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
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 10,
  },
  shareButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 80,
  },
  shareButtonText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  selectedUsersContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  selectedUsersTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  selectedUserItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    minWidth: 100,
  },
  selectedUserAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  selectedUserName: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  removeButton: {
    marginLeft: 8,
    padding: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginVertical: 15,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 25,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Rubik-Regular',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    marginHorizontal: 20,
    marginVertical: 2,
    borderRadius: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  fullName: {
    fontSize: 14,
  },
  lastMessage: {
    fontSize: 14,
  },
  selectionIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
});

export default MultipleUserShareModal;
