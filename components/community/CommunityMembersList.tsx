import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/src/context/ThemeContext';
import { communitiesAPI, CommunityMember } from '@/lib/communitiesApi';

interface CommunityMembersListProps {
  communityId: string;
  currentUserRole?: 'admin' | 'moderator' | 'member';
  currentUserId?: string | null;
  onMemberPress?: (member: CommunityMember) => void;
}

export default function CommunityMembersList({
  communityId,
  currentUserRole,
  currentUserId,
  onMemberPress
}: CommunityMembersListProps) {
  const { colors, isDarkMode } = useTheme();
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'all' | 'admin' | 'moderator' | 'member'>('all');



  useEffect(() => {
    loadMembers();
  }, [communityId, selectedRole]);

  const loadMembers = async () => {
    try {
      setLoading(true);
      const roleFilter = selectedRole === 'all' ? undefined : selectedRole;
      // Ensure communityId is a string
      const communityIdString = Array.isArray(communityId) ? communityId[0] : String(communityId);
      const membersData = await communitiesAPI.getCommunityMembers(communityIdString, roleFilter);
      setMembers(membersData);
    } catch (error) {
      console.error('Error loading members:', error);
      Alert.alert('Error', 'Failed to load community members');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadMembers();
    setRefreshing(false);
  };

  const handleMemberAction = (member: CommunityMember, action: 'promote' | 'demote' | 'remove') => {
    const actionText = action === 'promote' ? 'promote' : action === 'demote' ? 'demote' : 'remove';
    const actionDescription = action === 'promote'
      ? `promote ${member.user?.username} to ${member.role === 'member' ? 'moderator' : 'admin'}?`
      : action === 'demote'
      ? `demote ${member.user?.username} to ${member.role === 'admin' ? 'moderator' : 'member'}?`
      : `remove ${member.user?.username} from this community?`;

    Alert.alert(
      `${actionText.charAt(0).toUpperCase() + actionText.slice(1)} Member`,
      `Are you sure you want to ${actionDescription}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: actionText.charAt(0).toUpperCase() + actionText.slice(1),
          style: action === 'remove' ? 'destructive' : 'default',
          onPress: () => performMemberAction(member, action),
        },
      ]
    );
  };

  const performMemberAction = async (member: CommunityMember, action: 'promote' | 'demote' | 'remove') => {
    try {
      console.log(`Performing ${action} action on member:`, {
        memberId: member.user_id,
        currentRole: member.role,
        username: member.user?.username,
        communityId: communityId,
        communityIdType: typeof communityId,
        fullMemberObject: member
      });

      // Ensure communityId is a string
      const communityIdString = Array.isArray(communityId) ? communityId[0] : String(communityId);

      console.log('Using communityId:', communityIdString);

      switch (action) {
        case 'promote':
          await communitiesAPI.promoteMember(communityIdString, member.user_id, member.role as 'member' | 'moderator');
          break;
        case 'demote':
          await communitiesAPI.demoteMember(communityIdString, member.user_id, member.role as 'admin' | 'moderator');
          break;
        case 'remove':
          await communitiesAPI.removeMember(communityIdString, member.user_id);
          break;
      }

      console.log(`${action} action completed successfully`);

      // Force refresh the members list to show updated data
      setLoading(true);
      await loadMembers();
      setLoading(false);

      Alert.alert('Success', `Member ${action}d successfully!`);
      await loadMembers(); // Refresh the list
    } catch (error: any) {
      console.error(`Error ${action}ing member:`, error);
      Alert.alert('Error', error.message || `Failed to ${action} member`);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return '#dc3545'; // Red
      case 'moderator':
        return '#fd7e14'; // Orange
      default:
        return colors.textSecondary; // Gray
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return '#dc3545'; // Red
      case 'moderator':
        return '#fd7e14'; // Orange
      default:
        return '#6c757d'; // Dark gray for member
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return 'shield';
      case 'moderator':
        return 'star';
      default:
        return 'user';
    }
  };

  const canManageMember = (member: CommunityMember) => {
    // Users cannot manage themselves
    if (currentUserId && member.user_id === currentUserId) {
      return false;
    }

    if (currentUserRole === 'admin') {
      return member.role !== 'admin'; // Admins can manage moderators and members (but not other admins)
    }
    if (currentUserRole === 'moderator') {
      return member.role === 'member'; // Moderators can only manage members
    }
    return false; // Regular members can't manage anyone
  };

  const renderRoleFilter = () => (
    <View style={styles.filterContainer}>
      {(['all', 'admin', 'moderator', 'member'] as const).map((role) => (
        <TouchableOpacity
          key={role}
          onPress={() => setSelectedRole(role)}
          style={[
            styles.filterButton,
            {
              backgroundColor: selectedRole === role
                ? (isDarkMode ? 'rgba(128, 128, 128, 0.3)' : 'rgba(128, 128, 128, 0.2)')
                : 'transparent',
              borderColor: isDarkMode ? 'rgba(128, 128, 128, 0.3)' : 'rgba(128, 128, 128, 0.2)',
            },
          ]}
        >
          <Text
            style={[
              styles.filterButtonText,
              {
                color: selectedRole === role ? colors.text : colors.textSecondary,
                fontFamily: selectedRole === role ? 'Rubik-Bold' : 'Rubik-Medium',
              },
            ]}
          >
            {role.charAt(0).toUpperCase() + role.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderMember = ({ item }: { item: CommunityMember }) => (
      <TouchableOpacity
        style={[styles.memberCard, {
          backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
          borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        }]}
        onPress={() => onMemberPress?.(item)}
      >
      {/* Avatar */}
      {item.user?.avatar_url ? (
        <Image source={{ uri: item.user.avatar_url }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatarPlaceholder, {
          backgroundColor: isDarkMode ? 'rgba(128, 128, 128, 0.3)' : 'rgba(128, 128, 128, 0.2)',
        }]}>
          <Feather name="user" size={20} color="#FFFFFF" />
        </View>
      )}

      {/* Member Info - Takes up remaining space */}
      <View style={styles.memberInfo}>
        <View style={styles.memberHeader}>
          <Text style={[styles.memberName, { color: colors.text }]}>
            {item.user?.name || item.user?.username || 'Unknown User'}
          </Text>
        </View>

        <Text style={[styles.username, { color: colors.textSecondary }]}>
          @{item.user?.username || 'unknown'}
        </Text>

        <Text style={[styles.joinDate, { color: colors.textTertiary }]}>
          Joined {new Date(item.joined_at).toLocaleDateString()}
        </Text>
      </View>

      {/* Role Badge and Actions - Right aligned */}
      <View style={styles.memberRightSection}>
        <View style={[styles.roleBadge, { backgroundColor: getRoleBadgeColor(item.role) }]}>
          <Feather name={getRoleIcon(item.role) as any} size={12} color="#FFFFFF" />
          <Text style={styles.roleBadgeText}>{item.role}</Text>
        </View>

        {canManageMember(item) && (
          <View style={styles.memberActions}>
          {/* Promote button - Admins can promote members to moderator, moderators to admin */}
          {((item.role === 'member' && (currentUserRole === 'admin' || currentUserRole === 'moderator')) ||
            (item.role === 'moderator' && currentUserRole === 'admin')) && (
            <TouchableOpacity
              onPress={() => handleMemberAction(item, 'promote')}
              style={[styles.actionButton, {
                backgroundColor: isDarkMode ? 'rgba(40, 167, 69, 0.2)' : 'rgba(40, 167, 69, 0.1)',
                borderColor: 'rgba(40, 167, 69, 0.3)',
              }]}
            >
              <Feather name="arrow-up" size={16} color="#28a745" />
            </TouchableOpacity>
          )}

          {/* Demote button - Only admins can demote moderators */}
          {item.role === 'moderator' && currentUserRole === 'admin' && (
            <TouchableOpacity
              onPress={() => handleMemberAction(item, 'demote')}
              style={[styles.actionButton, {
                backgroundColor: isDarkMode ? 'rgba(255, 193, 7, 0.2)' : 'rgba(255, 193, 7, 0.1)',
                borderColor: 'rgba(255, 193, 7, 0.3)',
              }]}
            >
              <Feather name="arrow-down" size={16} color="#ffc107" />
            </TouchableOpacity>
          )}

          {/* Remove button - Available for all manageable members */}
          <TouchableOpacity
            onPress={() => handleMemberAction(item, 'remove')}
            style={[styles.actionButton, {
              backgroundColor: isDarkMode ? 'rgba(220, 53, 69, 0.2)' : 'rgba(220, 53, 69, 0.1)',
              borderColor: 'rgba(220, 53, 69, 0.3)',
            }]}
          >
            <Feather name="user-minus" size={16} color="#dc3545" />
          </TouchableOpacity>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>
          Loading members...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderRoleFilter()}

      <FlatList
        data={members}
        renderItem={renderMember}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.membersList, { paddingBottom: 100 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Feather name="users" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No members found
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
              {selectedRole === 'all'
                ? 'This community has no members yet'
                : `No ${selectedRole}s in this community`
              }
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterButtonText: {
    fontSize: 14,
  },
  membersList: {
    paddingHorizontal: 16,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberInfo: {
    flex: 1,
    marginRight: 12,
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  memberRightSection: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  memberName: {
    fontSize: 16,
    fontFamily: 'Rubik-Bold',
    flex: 1,
    marginRight: 8,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  roleBadgeText: {
    fontSize: 12,
    fontFamily: 'Rubik-Bold',
    color: '#FFFFFF',
    textTransform: 'capitalize',
  },
  username: {
    fontSize: 14,
    fontFamily: 'Rubik-Medium',
    marginBottom: 2,
  },
  joinDate: {
    fontSize: 12,
    fontFamily: 'Rubik-Regular',
  },
  memberActions: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Rubik-Medium',
    marginTop: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 64,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: 'Rubik-Bold',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: 'Rubik-Regular',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
});