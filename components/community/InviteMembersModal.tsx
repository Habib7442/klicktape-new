import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/src/context/ThemeContext';
import { communitiesAPI } from '@/lib/communitiesApi';

interface InviteMembersModalProps {
  visible: boolean;
  onClose: () => void;
  communityId: string;
  communityName: string;
  currentUserId: string;
  onInviteSuccess?: () => void;
}

export default function InviteMembersModal({
  visible,
  onClose,
  communityId,
  communityName,
  currentUserId,
  onInviteSuccess,
}: InviteMembersModalProps) {
  const { colors, isDarkMode } = useTheme();
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  const handleInvite = async () => {
    if (!username.trim()) {
      Alert.alert('Error', 'Please enter a username');
      return;
    }

    try {
      setLoading(true);
      await communitiesAPI.inviteUser(communityId, username.trim(), currentUserId);

      Alert.alert(
        'Success',
        `Invitation sent to @${username.trim()}!`,
        [
          {
            text: 'OK',
            onPress: () => {
              setUsername('');
              onInviteSuccess?.();
              onClose();
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Error inviting user:', error);
      Alert.alert('Error', error.message || 'Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setUsername('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        {/* Header */}
        <View style={[styles.header, {
          borderBottomColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        }]}>
          <TouchableOpacity onPress={handleClose}>
            <Feather name="x" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Invite Members
          </Text>
          <TouchableOpacity
            onPress={handleInvite}
            disabled={loading || !username.trim()}
            style={[styles.inviteButton, {
              backgroundColor: (!username.trim() || loading)
                ? (isDarkMode ? 'rgba(128, 128, 128, 0.2)' : 'rgba(128, 128, 128, 0.1)')
                : (isDarkMode ? 'rgba(128, 128, 128, 0.3)' : 'rgba(128, 128, 128, 0.2)'),
              borderColor: isDarkMode ? 'rgba(128, 128, 128, 0.3)' : 'rgba(128, 128, 128, 0.2)',
            }]}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.text} />
            ) : (
              <Text style={[styles.inviteButtonText, {
                color: (!username.trim() || loading) ? colors.textTertiary : colors.text
              }]}>
                Send
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.communityInfo}>
            <Feather name="users" size={24} color={colors.primary} />
            <Text style={[styles.communityName, { color: colors.text }]}>
              {communityName}
            </Text>
          </View>

          <Text style={[styles.description, { color: colors.textSecondary }]}>
            Invite someone to join this community by entering their username below.
          </Text>

          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>
              Username
            </Text>
            <View style={[styles.inputWrapper, {
              backgroundColor: colors.input,
              borderColor: colors.inputBorder,
            }]}>
              <Text style={[styles.atSymbol, { color: colors.textSecondary }]}>@</Text>
              <TextInput
                style={[styles.textInput, { color: colors.text }]}
                placeholder="Enter username"
                placeholderTextColor={colors.textTertiary}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="send"
                onSubmitEditing={handleInvite}
                editable={!loading}
              />
            </View>
          </View>

          <View style={[styles.infoBox, {
            backgroundColor: isDarkMode ? 'rgba(128, 128, 128, 0.1)' : 'rgba(128, 128, 128, 0.05)',
            borderColor: isDarkMode ? 'rgba(128, 128, 128, 0.2)' : 'rgba(128, 128, 128, 0.1)',
          }]}>
            <Feather name="info" size={16} color={colors.textSecondary} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              The user will receive a notification and can choose to join the community.
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
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
    marginHorizontal: 16,
  },
  inviteButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    minWidth: 60,
    alignItems: 'center',
  },
  inviteButtonText: {
    fontSize: 14,
    fontFamily: 'Rubik-Bold',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  communityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  communityName: {
    fontSize: 20,
    fontFamily: 'Rubik-Bold',
  },
  description: {
    fontSize: 16,
    fontFamily: 'Rubik-Regular',
    lineHeight: 24,
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontFamily: 'Rubik-Bold',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  atSymbol: {
    fontSize: 16,
    fontFamily: 'Rubik-Medium',
    marginRight: 4,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Rubik-Medium',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  infoText: {
    fontSize: 14,
    fontFamily: 'Rubik-Regular',
    lineHeight: 20,
    flex: 1,
  },
});