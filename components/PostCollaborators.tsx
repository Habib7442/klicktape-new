import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/src/context/ThemeContext';
import CachedImage from './CachedImage';

interface User {
  id: string;
  username: string;
  avatar_url: string;
}

interface PostCollaboratorsProps {
  mainUser: User;
  collaborators: User[];
  style?: any;
}

const PostCollaborators: React.FC<PostCollaboratorsProps> = ({
  mainUser,
  collaborators,
  style,
}) => {
  const { colors, isDarkMode } = useTheme();
  const [showModal, setShowModal] = useState(false);

  const handleUserPress = (userId: string) => {
    setShowModal(false);
    router.push({
      pathname: "/userProfile/[id]",
      params: { id: userId },
    });
  };

  const handleMainUserPress = () => {
    router.push({
      pathname: "/userProfile/[id]",
      params: { id: mainUser.id },
    });
  };

  const renderCollaboratorItem = ({ item }: { item: User }) => (
    <TouchableOpacity
      style={[styles.collaboratorItem, { borderBottomColor: colors.border }]}
      onPress={() => handleUserPress(item.id)}
    >
      <CachedImage
        uri={item.avatar_url}
        style={styles.collaboratorAvatar}
        showLoader={true}
        fallbackUri="https://via.placeholder.com/40"
      />
      <Text style={[styles.collaboratorUsername, { color: colors.text }]}>
        {item.username}
      </Text>
    </TouchableOpacity>
  );

  if (!collaborators || collaborators.length === 0) {
    // Show only main user
    return (
      <TouchableOpacity onPress={handleMainUserPress} style={style}>
        <Text style={[styles.usernameText, { color: colors.text }]}>
          {mainUser.username}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={style}>
      <TouchableOpacity onPress={handleMainUserPress}>
        <Text style={[styles.usernameText, { color: colors.text }]}>
          {mainUser.username}
        </Text>
      </TouchableOpacity>
      
      {collaborators.length > 0 && (
        <>
          <Text style={[styles.andText, { color: colors.textSecondary }]}> and </Text>
          <TouchableOpacity onPress={() => setShowModal(true)}>
            <Text style={[styles.collaboratorsText, { color: colors.textSecondary }]}>
              {collaborators.length === 1 
                ? collaborators[0].username
                : `${collaborators.length} others`
              }
            </Text>
          </TouchableOpacity>
        </>
      )}

      {/* Collaborators Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowModal(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Collaborators
            </Text>
            <TouchableOpacity
              onPress={() => setShowModal(false)}
              style={styles.closeButton}
            >
              <Feather name="x" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={collaborators}
            renderItem={renderCollaboratorItem}
            keyExtractor={(item) => item.id}
            style={styles.collaboratorsList}
            showsVerticalScrollIndicator={false}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  usernameText: {
    fontSize: 14,
    fontFamily: 'Rubik-Medium',
  },
  andText: {
    fontSize: 14,
    fontFamily: 'Rubik-Regular',
  },
  collaboratorsText: {
    fontSize: 14,
    fontFamily: 'Rubik-Regular',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Rubik-Medium',
  },
  closeButton: {
    padding: 4,
  },
  collaboratorsList: {
    flex: 1,
  },
  collaboratorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  collaboratorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  collaboratorUsername: {
    fontSize: 16,
    fontFamily: 'Rubik-Regular',
  },
});

export default PostCollaborators;
