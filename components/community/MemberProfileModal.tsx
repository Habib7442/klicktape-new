import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/src/context/ThemeContext';
import { CommunityMember } from '@/lib/communitiesApi';

interface MemberProfileModalProps {
  visible: boolean;
  onClose: () => void;
  member: CommunityMember | null;
  onViewFullProfile: () => void;
  canManage: boolean;
  onPromote?: () => void;
  onDemote?: () => void;
  onRemove?: () => void;
}

export default function MemberProfileModal({
  visible,
  onClose,
  member,
  onViewFullProfile,
  canManage,
  onPromote,
  onDemote,
  onRemove,
}: MemberProfileModalProps) {
  const { colors, isDarkMode } = useTheme();

  if (!member) return null;

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return '#dc3545';
      case 'moderator':
        return '#fd7e14';
      default:
        return colors.textSecondary;
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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, {
          borderBottomColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        }]}>
          <TouchableOpacity onPress={onClose}>
            <Feather name="x" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Member Profile
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content}>
          {/* Profile Section */}
          <View style={styles.profileSection}>
            {member.user?.avatar_url ? (
              <Image source={{ uri: member.user.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, {
                backgroundColor: isDarkMode ? 'rgba(128, 128, 128, 0.3)' : 'rgba(128, 128, 128, 0.2)',
              }]}>
                <Feather name="user" size={32} color="#FFFFFF" />
              </View>
            )}

            <View style={styles.profileInfo}>
              <Text style={[styles.memberName, { color: colors.text }]}>
                {member.user?.name || member.user?.username || 'Unknown User'}
              </Text>
              <Text style={[styles.username, { color: colors.textSecondary }]}>
                @{member.user?.username || 'unknown'}
              </Text>

              <View style={[styles.roleBadge, { backgroundColor: getRoleColor(member.role) }]}>
                <Feather name={getRoleIcon(member.role) as any} size={14} color="#FFFFFF" />
                <Text style={styles.roleBadgeText}>{member.role}</Text>
              </View>
            </View>
          </View>

          {/* Community Info */}
          <View style={[styles.infoSection, {
            backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
            borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
          }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Community Information
            </Text>

            <View style={styles.infoRow}>
              <Feather name="calendar" size={16} color={colors.textSecondary} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                Joined {new Date(member.joined_at).toLocaleDateString()}
              </Text>
            </View>

            {member.invited_by && (
              <View style={styles.infoRow}>
                <Feather name="user-plus" size={16} color={colors.textSecondary} />
                <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                  Invited by {member.invited_by}
                </Text>
              </View>
            )}

            <View style={styles.infoRow}>
              <Feather name="activity" size={16} color={colors.textSecondary} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                Status: {member.status}
              </Text>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actionsSection}>
            <TouchableOpacity
              onPress={onViewFullProfile}
              style={[styles.actionButton, {
                backgroundColor: isDarkMode ? 'rgba(128, 128, 128, 0.2)' : 'rgba(128, 128, 128, 0.1)',
                borderColor: isDarkMode ? 'rgba(128, 128, 128, 0.3)' : 'rgba(128, 128, 128, 0.2)',
              }]}
            >
              <Feather name="user" size={20} color={colors.text} />
              <Text style={[styles.actionButtonText, { color: colors.text }]}>
                View Full Profile
              </Text>
            </TouchableOpacity>

            {canManage && (
              <>
                {member.role === 'member' && onPromote && (
                  <TouchableOpacity
                    onPress={onPromote}
                    style={[styles.actionButton, {
                      backgroundColor: isDarkMode ? 'rgba(40, 167, 69, 0.2)' : 'rgba(40, 167, 69, 0.1)',
                      borderColor: 'rgba(40, 167, 69, 0.3)',
                    }]}
                  >
                    <Feather name="arrow-up" size={20} color="#28a745" />
                    <Text style={[styles.actionButtonText, { color: '#28a745' }]}>
                      Promote to Moderator
                    </Text>
                  </TouchableOpacity>
                )}

                {member.role === 'moderator' && onDemote && (
                  <TouchableOpacity
                    onPress={onDemote}
                    style={[styles.actionButton, {
                      backgroundColor: isDarkMode ? 'rgba(255, 193, 7, 0.2)' : 'rgba(255, 193, 7, 0.1)',
                      borderColor: 'rgba(255, 193, 7, 0.3)',
                    }]}
                  >
                    <Feather name="arrow-down" size={20} color="#ffc107" />
                    <Text style={[styles.actionButtonText, { color: '#ffc107' }]}>
                      Demote to Member
                    </Text>
                  </TouchableOpacity>
                )}

                {onRemove && (
                  <TouchableOpacity
                    onPress={onRemove}
                    style={[styles.actionButton, {
                      backgroundColor: isDarkMode ? 'rgba(220, 53, 69, 0.2)' : 'rgba(220, 53, 69, 0.1)',
                      borderColor: 'rgba(220, 53, 69, 0.3)',
                    }]}
                  >
                    <Feather name="user-minus" size={20} color="#dc3545" />
                    <Text style={[styles.actionButtonText, { color: '#dc3545' }]}>
                      Remove from Community
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
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
    padding: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Rubik-Bold',
    flex: 1,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 20,
    fontFamily: 'Rubik-Bold',
    marginBottom: 4,
  },
  username: {
    fontSize: 16,
    fontFamily: 'Rubik-Medium',
    marginBottom: 12,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    gap: 6,
  },
  roleBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Rubik-Bold',
    textTransform: 'capitalize',
  },
  infoSection: {
    margin: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Rubik-Bold',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  infoText: {
    fontSize: 14,
    fontFamily: 'Rubik-Medium',
    flex: 1,
  },
  actionsSection: {
    padding: 20,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  actionButtonText: {
    fontSize: 16,
    fontFamily: 'Rubik-Medium',
    flex: 1,
  },
});