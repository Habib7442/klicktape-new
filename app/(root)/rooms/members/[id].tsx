import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/src/context/ThemeContext';
import { communitiesAPI, Community, CommunityMember } from '@/lib/communitiesApi';
import { supabase } from '@/lib/supabase';
import CommunityMembersList from '@/components/community/CommunityMembersList';
import InviteMembersModal from '@/components/community/InviteMembersModal';
import MemberProfileModal from '@/components/community/MemberProfileModal';

export default function CommunityMembersScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { colors, isDarkMode } = useTheme();
  const [community, setCommunity] = useState<Community | null>(null);
  const [userMembership, setUserMembership] = useState<CommunityMember | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<CommunityMember | null>(null);
  const [showMemberModal, setShowMemberModal] = useState(false);

  useEffect(() => {
    if (id && typeof id === 'string') {
      loadCommunityData();
    }
  }, [id]);

  const loadCommunityData = async () => {
    if (!id || typeof id !== 'string') return;

    try {
      setLoading(true);

      // Load community details
      const communityData = await communitiesAPI.getCommunity(id);
      setCommunity(communityData);

      // Load user membership status
      try {
        // Get current authenticated user
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentUserId(user.id);
          const members = await communitiesAPI.getCommunityMembers(id);
          const currentUserMembership = members.find(member => member.user_id === user.id);
          setUserMembership(currentUserMembership);
        }
      } catch (error) {
        console.log("User not a member or error loading membership:", error);
        setUserMembership(null);
        setCurrentUserId(null);
      }

    } catch (error) {
      console.error("Error loading community data:", error);
      Alert.alert("Error", "Failed to load community information");
    } finally {
      setLoading(false);
    }
  };

  const handleMemberPress = (member: CommunityMember) => {
    setSelectedMember(member);
    setShowMemberModal(true);
  };

  const handleViewFullProfile = () => {
    if (selectedMember?.user_id) {
      setShowMemberModal(false);
      router.push(`/userProfile/${selectedMember.user_id}`);
    }
  };

  const handleMemberAction = async (action: 'promote' | 'demote' | 'remove') => {
    if (!selectedMember) return;

    try {
      switch (action) {
        case 'promote':
          await communitiesAPI.promoteMember(id as string, selectedMember.user_id, selectedMember.role as 'member' | 'moderator');
          break;
        case 'demote':
          await communitiesAPI.demoteMember(id as string, selectedMember.user_id, selectedMember.role as 'admin' | 'moderator');
          break;
        case 'remove':
          await communitiesAPI.removeMember(id as string, selectedMember.user_id);
          break;
      }

      Alert.alert('Success', `Member ${action}d successfully!`);
      setShowMemberModal(false);
      await loadCommunityData(); // Refresh data
    } catch (error: any) {
      console.error(`Error ${action}ing member:`, error);
      Alert.alert('Error', error.message || `Failed to ${action} member`);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Loading members...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!community) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.text }]}>
            Community not found
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, {
          borderBottomColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
          backgroundColor: colors.background,
        }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              Members
            </Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              {community.name}
            </Text>
          </View>

          {/* Invite Button - Only show for admins and moderators */}
          {(userMembership?.role === 'admin' || userMembership?.role === 'moderator') && (
            <TouchableOpacity
              onPress={() => setShowInviteModal(true)}
              style={[styles.inviteButton, {
                backgroundColor: isDarkMode ? 'rgba(128, 128, 128, 0.2)' : 'rgba(128, 128, 128, 0.1)',
                borderColor: isDarkMode ? 'rgba(128, 128, 128, 0.3)' : 'rgba(128, 128, 128, 0.2)',
              }]}
            >
              <Feather name="user-plus" size={20} color={colors.text} />
            </TouchableOpacity>
          )}
        </View>

        {/* Members List */}
        <CommunityMembersList
          communityId={id as string}
          currentUserRole={userMembership?.role}
          currentUserId={currentUserId}
          onMemberPress={handleMemberPress}
        />


        {/* Invite Members Modal */}
        {community && userMembership && (
          <InviteMembersModal
            visible={showInviteModal}
            onClose={() => setShowInviteModal(false)}
            communityId={id as string}
            communityName={community.name}
            currentUserId={userMembership.user_id}
            onInviteSuccess={() => {
              // Optionally refresh the members list
              loadCommunityData();
            }}
          />
        )}

        {/* Member Profile Modal */}
        <MemberProfileModal
          visible={showMemberModal}
          onClose={() => setShowMemberModal(false)}
          member={selectedMember}
          onViewFullProfile={handleViewFullProfile}
          canManage={userMembership?.role === 'admin' || userMembership?.role === 'moderator'}
          onPromote={() => handleMemberAction('promote')}
          onDemote={() => handleMemberAction('demote')}
          onRemove={() => handleMemberAction('remove')}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  headerContent: {
    marginLeft: 16,
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Rubik-Bold',
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: 'Rubik-Medium',
    marginTop: 2,
  },
  inviteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Rubik-Medium',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'Rubik-Medium',
  },
});