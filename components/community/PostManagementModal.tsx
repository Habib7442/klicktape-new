import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/src/context/ThemeContext';
import { CommunityPost, communityPostsAPI } from '@/lib/communitiesApi';

interface PostManagementModalProps {
  visible: boolean;
  onClose: () => void;
  post: CommunityPost;
  userRole: 'admin' | 'moderator' | 'member' | null;
  onPostUpdate: () => void;
}

export default function PostManagementModal({
  visible,
  onClose,
  post,
  userRole,
  onPostUpdate
}: PostManagementModalProps) {
  const { colors, isDarkMode } = useTheme();

  const handlePinToggle = async () => {
    try {
      await communityPostsAPI.togglePinPost(post.id, !post.is_pinned);
      Alert.alert(
        'Success',
        `Post ${post.is_pinned ? 'unpinned' : 'pinned'} successfully!`
      );
      onPostUpdate();
      onClose();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update post');
    }
  };

  const handleAnnouncementToggle = async () => {
    try {
      await communityPostsAPI.toggleAnnouncementPost(post.id, !post.is_announcement);
      Alert.alert(
        'Success',
        `Post ${post.is_announcement ? 'removed from' : 'marked as'} announcement successfully!`
      );
      onPostUpdate();
      onClose();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update post');
    }
  };

  const handleVisibilityToggle = async () => {
    try {
      const isCurrentlyHidden = post.status === 'hidden';
      await communityPostsAPI.togglePostVisibility(post.id, !isCurrentlyHidden);
      Alert.alert(
        'Success',
        `Post ${isCurrentlyHidden ? 'shown' : 'hidden'} successfully!`
      );
      onPostUpdate();
      onClose();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update post');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await communityPostsAPI.deleteCommunityPost(post.id);
              Alert.alert('Success', 'Post deleted successfully!');
              onPostUpdate();
              onClose();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete post');
            }
          },
        },
      ]
    );
  };

  const canManagePost = userRole === 'admin' || userRole === 'moderator';

  if (!canManagePost) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.safeArea}>
          <View style={[styles.modalContainer, {
            backgroundColor: colors.background,
            borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
          }]}>
            {/* Header */}
            <View style={[styles.header, {
              borderBottomColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
            }]}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                Manage Post
              </Text>
              <TouchableOpacity onPress={onClose}>
                <Feather name="x" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Actions */}
            <View style={styles.actionsContainer}>
              {/* Pin/Unpin */}
              <TouchableOpacity
                style={[styles.actionItem, {
                  backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                }]}
                onPress={handlePinToggle}
              >
                <View style={styles.actionIcon}>
                  <Feather 
                    name={post.is_pinned ? "bookmark" : "bookmark"} 
                    size={20} 
                    color={post.is_pinned ? colors.primary : colors.textSecondary} 
                  />
                </View>
                <View style={styles.actionContent}>
                  <Text style={[styles.actionTitle, { color: colors.text }]}>
                    {post.is_pinned ? 'Unpin Post' : 'Pin Post'}
                  </Text>
                  <Text style={[styles.actionDescription, { color: colors.textSecondary }]}>
                    {post.is_pinned ? 'Remove from top of community' : 'Pin to top of community'}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Announcement */}
              <TouchableOpacity
                style={[styles.actionItem, {
                  backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                }]}
                onPress={handleAnnouncementToggle}
              >
                <View style={styles.actionIcon}>
                  <Feather
                    name="volume-2"
                    size={20}
                    color={post.is_announcement ? '#FFA500' : colors.textSecondary}
                  />
                </View>
                <View style={styles.actionContent}>
                  <Text style={[styles.actionTitle, { color: colors.text }]}>
                    {post.is_announcement ? 'Remove Announcement' : 'Mark as Announcement'}
                  </Text>
                  <Text style={[styles.actionDescription, { color: colors.textSecondary }]}>
                    {post.is_announcement ? 'Remove announcement status' : 'Highlight as important announcement'}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Hide/Show */}
              <TouchableOpacity
                style={[styles.actionItem, {
                  backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                }]}
                onPress={handleVisibilityToggle}
              >
                <View style={styles.actionIcon}>
                  <Feather 
                    name={post.status === 'hidden' ? "eye" : "eye-off"} 
                    size={20} 
                    color={post.status === 'hidden' ? colors.primary : '#DC3545'} 
                  />
                </View>
                <View style={styles.actionContent}>
                  <Text style={[styles.actionTitle, { color: colors.text }]}>
                    {post.status === 'hidden' ? 'Show Post' : 'Hide Post'}
                  </Text>
                  <Text style={[styles.actionDescription, { color: colors.textSecondary }]}>
                    {post.status === 'hidden' ? 'Make post visible to members' : 'Hide post from community'}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Delete Post */}
              <TouchableOpacity
                style={[styles.actionItem, {
                  backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                }]}
                onPress={handleDelete}
              >
                <View style={styles.actionIcon}>
                  <Feather
                    name="trash-2"
                    size={20}
                    color="#DC3545"
                  />
                </View>
                <View style={styles.actionContent}>
                  <Text style={[styles.actionTitle, { color: '#DC3545' }]}>
                    Delete Post
                  </Text>
                  <Text style={[styles.actionDescription, { color: colors.textSecondary }]}>
                    Permanently remove this post from the community
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  safeArea: {
    maxHeight: '50%',
  },
  modalContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Rubik',
  },
  actionsContainer: {
    padding: 20,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(128, 128, 128, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'Rubik',
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 14,
    fontFamily: 'Rubik',
  },
});
