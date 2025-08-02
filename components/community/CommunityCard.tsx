import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/src/context/ThemeContext';
import { Community, communitiesAPI } from '@/lib/communitiesApi';
import { router } from 'expo-router';

interface CommunityCardProps {
  community: Community;
  onJoinStatusChange?: () => void;
  showJoinButton?: boolean;
  onDelete?: () => void;
}

export default function CommunityCard({
  community,
  onJoinStatusChange,
  showJoinButton = true,
  onDelete
}: CommunityCardProps) {
  const { isDarkMode, colors } = useTheme();
  const [isJoining, setIsJoining] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  const isJoined = community.user_status === 'active';
  const isPending = community.user_status === 'pending';
  const isAdmin = community.user_role === 'admin';
  const isModerator = community.user_role === 'moderator';

  const handleJoinCommunity = async () => {
    if (isJoining || isJoined) return;

    setIsJoining(true);
    try {
      await communitiesAPI.joinCommunity(community.id);
      onJoinStatusChange?.();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeaveCommunity = async () => {
    if (isLeaving || !isJoined) return;

    Alert.alert(
      'Leave Community',
      `Are you sure you want to leave ${community.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            setIsLeaving(true);
            try {
              await communitiesAPI.leaveCommunity(community.id);
              onJoinStatusChange?.();
            } catch (error: any) {
              Alert.alert('Error', error.message);
            } finally {
              setIsLeaving(false);
            }
          },
        },
      ]
    );
  };

  const handlePress = () => {
    router.push(`/rooms/${community.id}`);
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Room',
      `Are you sure you want to delete "${community.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete?.(),
        },
      ]
    );
  };

  const getJoinButtonText = () => {
    if (isPending) return 'Pending';
    if (isJoined) return 'Joined';
    if (community.privacy_type === 'private') return 'Request';
    return 'Join';
  };

  const getJoinButtonStyle = () => {
    if (isPending) {
      return {
        backgroundColor: isDarkMode ? 'rgba(128, 128, 128, 0.3)' : 'rgba(128, 128, 128, 0.2)',
        borderColor: isDarkMode ? 'rgba(128, 128, 128, 0.5)' : 'rgba(128, 128, 128, 0.3)',
      };
    }
    if (isJoined) {
      return {
        backgroundColor: isDarkMode ? 'rgba(128, 128, 128, 0.3)' : 'rgba(128, 128, 128, 0.2)',
        borderColor: isDarkMode ? 'rgba(128, 128, 128, 0.5)' : 'rgba(128, 128, 128, 0.3)',
      };
    }
    return {
      backgroundColor: isDarkMode ? 'rgba(128, 128, 128, 0.2)' : 'rgba(128, 128, 128, 0.1)',
      borderColor: isDarkMode ? 'rgba(128, 128, 128, 0.3)' : 'rgba(128, 128, 128, 0.3)',
    };
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: isDarkMode ? 'rgba(40, 50, 50, 0.3)' : 'rgba(248, 249, 250, 0.8)',
          borderColor: isDarkMode ? 'rgba(128, 128, 128, 0.2)' : 'rgba(128, 128, 128, 0.2)',
        },
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {/* Community Header */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          {community.avatar_url ? (
            <Image source={{ uri: community.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: isDarkMode ? 'rgba(128, 128, 128, 0.5)' : 'rgba(128, 128, 128, 0.3)' }]}>
              <Feather name="users" size={20} color="#FFFFFF" />
            </View>
          )}
          {community.is_verified && (
            <View style={styles.verifiedBadge}>
              <Feather name="check" size={12} color="#FFFFFF" />
            </View>
          )}
        </View>

        <View style={styles.communityInfo}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
              {community.name}
            </Text>
            {(isAdmin || isModerator) && (
              <View style={[styles.roleBadge, { backgroundColor: isDarkMode ? 'rgba(128, 128, 128, 0.5)' : 'rgba(128, 128, 128, 0.3)' }]}>
                <Text style={styles.roleBadgeText}>
                  {isAdmin ? 'Admin' : 'Mod'}
                </Text>
              </View>
            )}
          </View>

          {community.category && (
            <Text style={[styles.category, { color: colors.textSecondary }]}>
              {community.category.name}
            </Text>
          )}
        </View>

        {/* Privacy Icon and Delete Button */}
        <View style={styles.actionIcons}>
          <Feather
            name={community.privacy_type === 'public' ? 'globe' : 'lock'}
            size={16}
            color={colors.textSecondary}
          />
          {isAdmin && (
            <TouchableOpacity
              onPress={handleDelete}
              style={[styles.deleteButton, { marginLeft: 8 }]}
            >
              <Feather name="trash-2" size={16} color="#dc3545" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Description */}
      <Text
        style={[styles.description, { color: colors.text }]}
        numberOfLines={2}
        ellipsizeMode="tail"
      >
        {community.description}
      </Text>

      {/* Stats */}
      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Feather name="users" size={14} color={colors.textSecondary} />
          <Text style={[styles.statText, { color: colors.textSecondary }]}>
            {community.members_count.toLocaleString()} members
          </Text>
        </View>

        <View style={styles.statItem}>
          <Feather name="message-square" size={14} color={colors.textSecondary} />
          <Text style={[styles.statText, { color: colors.textSecondary }]}>
            {community.posts_count.toLocaleString()} posts
          </Text>
        </View>

        {community.tags && community.tags.length > 0 && (
          <View style={styles.statItem}>
            <Feather name="hash" size={14} color={colors.textSecondary} />
            <Text style={[styles.statText, { color: colors.textSecondary }]}>
              {community.tags[0]}
            </Text>
          </View>
        )}
      </View>

      {/* Join/Leave Button */}
      {showJoinButton && (
        <View style={styles.buttonContainer}>
          {isJoined ? (
            <TouchableOpacity
              style={[styles.joinButton, getJoinButtonStyle()]}
              onPress={handleLeaveCommunity}
              disabled={isLeaving}
            >
              {isLeaving ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <>
                  <Feather name="check" size={16} color={colors.text} />
                  <Text style={[styles.joinButtonText, { color: colors.text }]}>
                    Joined
                  </Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.joinButton, getJoinButtonStyle()]}
              onPress={handleJoinCommunity}
              disabled={isJoining || isPending}
            >
              {isJoining ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <>
                  <Feather
                    name={isPending ? 'clock' : 'plus'}
                    size={16}
                    color={colors.text}
                  />
                  <Text style={[styles.joinButtonText, { color: colors.text }]}>
                    {getJoinButtonText()}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#1DA1F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  communityInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Rubik-Bold',
    flex: 1,
  },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#FFFFFF',
    fontFamily: 'Rubik-Medium',
  },
  category: {
    fontSize: 12,
    fontFamily: 'Rubik-Medium',
  },
  actionIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  deleteButton: {
    padding: 4,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
    fontFamily: 'Rubik-Medium',
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  statText: {
    fontSize: 12,
    marginLeft: 4,
    fontFamily: 'Rubik-Medium',
  },
  buttonContainer: {
    alignItems: 'flex-end',
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  joinButtonText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
    fontFamily: 'Rubik-Medium',
  },
});
