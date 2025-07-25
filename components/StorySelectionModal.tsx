import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  Alert,
} from 'react-native';
import Modal from 'react-native-modal';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '@/src/context/ThemeContext';
import ThemedGradient from '@/components/ThemedGradient';

interface Story {
  id: string;
  user_id: string;
  image_url: string;
  caption?: string;
  created_at: string;
  expires_at: string;
  viewed_by: string[];
  user: {
    username: string;
    avatar: string;
  };
}

interface GroupedStory {
  user_id: string;
  user: {
    username: string;
    avatar: string;
  };
  stories: Story[];
  hasUnviewed: boolean;
  latestStory: Story;
}

interface StorySelectionModalProps {
  isVisible: boolean;
  groupedStory: GroupedStory | null;
  onClose: () => void;
  onDeleteStory: (storyId: string) => void;
}

const StorySelectionModal: React.FC<StorySelectionModalProps> = ({
  isVisible,
  groupedStory,
  onClose,
  onDeleteStory,
}) => {
  const { colors, isDarkMode } = useTheme();
  const [selectedStories, setSelectedStories] = useState<Set<string>>(new Set());



  const handleStoryToggle = (storyId: string) => {
    const newSelected = new Set(selectedStories);
    if (newSelected.has(storyId)) {
      newSelected.delete(storyId);
    } else {
      newSelected.add(storyId);
    }
    setSelectedStories(newSelected);
  };

  const handleDeleteSelected = () => {
    if (selectedStories.size === 0) {
      Alert.alert('No Selection', 'Please select at least one story to delete.');
      return;
    }

    Alert.alert(
      'Delete Stories',
      `Are you sure you want to delete ${selectedStories.size} story(ies)? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            selectedStories.forEach(storyId => {
              onDeleteStory(storyId);
            });
            setSelectedStories(new Set());
            onClose();
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (!groupedStory) return null;

  return (
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
          <Text
            className="font-rubik-bold"
            style={[styles.title, { color: colors.text }]}
          >
            Select Stories to Delete
          </Text>
          <View style={{ width: 24 }} />
        </View>

        {/* User Info */}
        <View style={styles.userInfo}>
          <Image
            source={{ uri: groupedStory.user.avatar || 'https://via.placeholder.com/40' }}
            style={[styles.avatar, { borderColor: colors.primary }]}
          />
          <Text
            className="font-rubik-medium"
            style={[styles.username, { color: colors.text }]}
          >
            {groupedStory.user.username}
          </Text>
          <Text
            className="font-rubik-regular"
            style={[styles.storyCount, { color: colors.textSecondary }]}
          >
            {groupedStory.stories.length} stories
          </Text>
        </View>

        {/* Stories List */}
        <ScrollView style={styles.storiesList} showsVerticalScrollIndicator={false}>
          {groupedStory.stories.map((story) => (
            <TouchableOpacity
              key={story.id}
              style={[
                styles.storyItem,
                {
                  backgroundColor: selectedStories.has(story.id)
                    ? `${colors.primary}20`
                    : `${colors.backgroundSecondary}40`,
                  borderColor: selectedStories.has(story.id)
                    ? colors.primary
                    : 'transparent',
                },
              ]}
              onPress={() => handleStoryToggle(story.id)}
            >
              <Image source={{ uri: story.image_url }} style={styles.storyImage} />
              <View style={styles.storyInfo}>
                <Text
                  className="font-rubik-medium"
                  style={[styles.storyDate, { color: colors.text }]}
                >
                  {formatDate(story.created_at)}
                </Text>
                {story.caption && (
                  <Text
                    className="font-rubik-regular"
                    style={[styles.storyCaption, { color: colors.textSecondary }]}
                    numberOfLines={2}
                  >
                    {story.caption}
                  </Text>
                )}
              </View>
              <View style={styles.checkbox}>
                {selectedStories.has(story.id) && (
                  <AntDesign name="check" size={16} color={colors.primary} />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[
              styles.selectAllButton,
              {
                backgroundColor: `${colors.backgroundSecondary}60`,
                borderColor: `${colors.primary}30`,
              },
            ]}
            onPress={() => {
              if (selectedStories.size === groupedStory.stories.length) {
                setSelectedStories(new Set());
              } else {
                setSelectedStories(new Set(groupedStory.stories.map(s => s.id)));
              }
            }}
          >
            <Text
              className="font-rubik-medium"
              style={[styles.selectAllText, { color: colors.text }]}
            >
              {selectedStories.size === groupedStory.stories.length ? 'Deselect All' : 'Select All'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.deleteButton,
              {
                backgroundColor: selectedStories.size > 0 ? colors.error : `${colors.error}40`,
                opacity: selectedStories.size > 0 ? 1 : 0.5,
              },
            ]}
            onPress={handleDeleteSelected}
            disabled={selectedStories.size === 0}
          >
            <AntDesign name="delete" size={16} color="white" />
            <Text
              className="font-rubik-bold"
              style={styles.deleteButtonText}
            >
              Delete ({selectedStories.size})
            </Text>
          </TouchableOpacity>
        </View>
      </ThemedGradient>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: {
    margin: 0,
    justifyContent: 'flex-end',
  },
  container: {
    maxHeight: '80%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    textAlign: 'center',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    marginRight: 12,
  },
  username: {
    fontSize: 16,
    flex: 1,
  },
  storyCount: {
    fontSize: 14,
  },
  storiesList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  storyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 2,
  },
  storyImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  storyInfo: {
    flex: 1,
  },
  storyDate: {
    fontSize: 14,
    marginBottom: 4,
  },
  storyCaption: {
    fontSize: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
  },
  selectAllButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  selectAllText: {
    fontSize: 14,
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 14,
  },
});

export default StorySelectionModal;
