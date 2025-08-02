import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/src/context/ThemeContext';
import { supabase } from '@/lib/supabase';

export interface TaggedUser {
  id: string;
  username: string;
  avatar_url?: string;
  name?: string;
}

interface UserTaggingProps {
  taggedUsers: TaggedUser[];
  collaborators: TaggedUser[];
  onTaggedUsersChange: (users: TaggedUser[]) => void;
  onCollaboratorsChange: (users: TaggedUser[]) => void;
  maxTags?: number;
  maxCollaborators?: number;
}

const UserTagging: React.FC<UserTaggingProps> = ({
  taggedUsers,
  collaborators,
  onTaggedUsersChange,
  onCollaboratorsChange,
  maxTags = 20,
  maxCollaborators = 5,
}) => {
  const { colors, isDarkMode } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TaggedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'tag' | 'collaborate'>('tag');
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (searchQuery.length >= 2) {
      // Debounce search
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      
      searchTimeoutRef.current = setTimeout(() => {
        searchUsers(searchQuery);
      }, 300);
    } else {
      setSearchResults([]);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  const searchUsers = async (query: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, name')
        .ilike('username', `%${query}%`)
        .limit(20);

      if (error) throw error;

      // Filter out already tagged users and collaborators
      const allTaggedIds = [...taggedUsers, ...collaborators].map(u => u.id);
      const filteredResults = (data || []).filter(user => !allTaggedIds.includes(user.id));
      
      setSearchResults(filteredResults);
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const addUser = (user: TaggedUser, type: 'tag' | 'collaborate') => {
    if (type === 'tag' && taggedUsers.length < maxTags) {
      onTaggedUsersChange([...taggedUsers, user]);
    } else if (type === 'collaborate' && collaborators.length < maxCollaborators) {
      onCollaboratorsChange([...collaborators, user]);
    }
    setSearchQuery('');
    setSearchResults([]);
  };

  const removeUser = (userId: string, type: 'tag' | 'collaborate') => {
    if (type === 'tag') {
      onTaggedUsersChange(taggedUsers.filter(u => u.id !== userId));
    } else {
      onCollaboratorsChange(collaborators.filter(u => u.id !== userId));
    }
  };

  const renderUserItem = ({ item }: { item: TaggedUser }) => (
    <TouchableOpacity
      style={[styles.userItem, { backgroundColor: colors.backgroundSecondary }]}
      onPress={() => addUser(item, activeTab)}
    >
      <Image
        source={{ 
          uri: item.avatar_url || 'https://via.placeholder.com/40x40.png?text=U' 
        }}
        style={styles.userAvatar}
      />
      <View style={styles.userInfo}>
        <Text style={[styles.username, { color: colors.text, fontFamily: 'Rubik-Regular' }]}>@{item.username}</Text>
        {item.name && (
          <Text style={[styles.fullName, { color: colors.textSecondary, fontFamily: 'Rubik-Regular' }]}>
            {item.name}
          </Text>
        )}
      </View>
      <Feather name="plus" size={20} color={isDarkMode ? '#808080' : '#606060'} />
    </TouchableOpacity>
  );

  const renderTaggedUser = ({ item, type }: { item: TaggedUser; type: 'tag' | 'collaborate' }) => (
    <View style={[styles.taggedUserChip, { 
      backgroundColor: type === 'collaborate' ? `${colors.success}20` : isDarkMode ? 'rgba(128, 128, 128, 0.2)' : 'rgba(128, 128, 128, 0.2)'
    }]}>
      <Image
        source={{ 
          uri: item.avatar_url || 'https://via.placeholder.com/24x24.png?text=U' 
        }}
        style={styles.chipAvatar}
      />
      <Text style={[styles.chipUsername, { color: colors.text, fontFamily: 'Rubik-Regular' }]}>@{item.username}</Text>
      <TouchableOpacity
        onPress={() => removeUser(item.id, type)}
        style={styles.removeChipButton}
        hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
      >
        <Feather name="x" size={12} color={colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Tagged Users Display */}
      {taggedUsers.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Tagged Users</Text>
          <FlatList
            data={taggedUsers}
            renderItem={({ item }) => renderTaggedUser({ item, type: 'tag' })}
            keyExtractor={(item) => `tag-${item.id}`}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsList}
          />
        </View>
      )}

      {/* Collaborators Display */}
      {collaborators.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Collaborators</Text>
          <FlatList
            data={collaborators}
            renderItem={({ item }) => renderTaggedUser({ item, type: 'collaborate' })}
            keyExtractor={(item) => `collab-${item.id}`}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsList}
          />
        </View>
      )}

      {/* Add Users Button */}
      <TouchableOpacity
        style={[styles.addButton, { 
          backgroundColor: isDarkMode ? 'rgba(128, 128, 128, 0.1)' : 'rgba(128, 128, 128, 0.1)',
          borderColor: isDarkMode ? 'rgba(128, 128, 128, 0.3)' : 'rgba(128, 128, 128, 0.3)'
        }]}
        onPress={() => setShowModal(true)}
      >
        <Feather name="user-plus" size={20} color={isDarkMode ? '#808080' : '#606060'} />
        <Text style={[styles.addButtonText, { color: colors.text, fontFamily: 'Rubik-Regular' }]}>
          Tag People & Add Collaborators
        </Text>
      </TouchableOpacity>

      {/* User Search Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          {/* Modal Header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.divider }]}>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Feather name="x" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text, fontFamily: 'Rubik-Medium' }]}>Tag People</Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Tab Selector */}
          <View style={[styles.tabContainer, { backgroundColor: colors.backgroundSecondary }]}>
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === 'tag' && [styles.activeTab, { backgroundColor: isDarkMode ? '#808080' : '#606060' }]
              ]}
              onPress={() => setActiveTab('tag')}
            >
              <Text style={[
                styles.tabText,
                {
                  color: activeTab === 'tag' ? 'white' : colors.textSecondary,
                  fontFamily: 'Rubik-Regular'
                }
              ]}>
                Tag ({taggedUsers.length}/{maxTags})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === 'collaborate' && [styles.activeTab, { backgroundColor: isDarkMode ? '#808080' : '#606060' }]
              ]}
              onPress={() => setActiveTab('collaborate')}
            >
              <Text style={[
                styles.tabText,
                {
                  color: activeTab === 'collaborate' ? 'white' : colors.textSecondary,
                  fontFamily: 'Rubik-Regular'
                }
              ]}>
                Collaborate ({collaborators.length}/{maxCollaborators})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Search Input */}
          <View style={[styles.searchContainer, {
            backgroundColor: isDarkMode ? 'rgba(128, 128, 128, 0.1)' : 'rgba(128, 128, 128, 0.1)',
            borderColor: isDarkMode ? 'rgba(128, 128, 128, 0.3)' : 'rgba(128, 128, 128, 0.3)'
          }]}>
            <Feather name="search" size={20} color={isDarkMode ? '#808080' : '#606060'} />
            <TextInput
              style={[styles.searchInput, { color: colors.text, fontFamily: 'Rubik-Regular' }]}
              placeholder="Search users by username..."
              placeholderTextColor={colors.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
            />
            {loading && <ActivityIndicator size="small" color={isDarkMode ? '#808080' : '#606060'} />}
          </View>

          {/* Search Results */}
          <FlatList
            data={searchResults}
            renderItem={renderUserItem}
            keyExtractor={(item) => item.id}
            style={styles.resultsList}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              searchQuery.length >= 2 && !loading ? (
                <View style={styles.emptyContainer}>
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    No users found
                  </Text>
                </View>
              ) : searchQuery.length < 2 ? (
                <View style={styles.emptyContainer}>
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    Type at least 2 characters to search
                  </Text>
                </View>
              ) : null
            }
          />
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    fontFamily: 'Rubik-Medium',
  },
  chipsList: {
    paddingHorizontal: 4,
  },
  taggedUserChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  chipAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 6,
  },
  chipUsername: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Rubik-Medium',
  },
  removeChipButton: {
    marginLeft: 6,
    padding: 2,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  addButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Rubik-Medium',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Rubik-Medium',
  },
  tabContainer: {
    flexDirection: 'row',
    margin: 16,
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeTab: {
    // Background color set inline
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Rubik-Medium',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    fontFamily: 'Rubik-Regular',
  },
  resultsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'Rubik-Medium',
  },
  fullName: {
    fontSize: 14,
    marginTop: 2,
    fontFamily: 'Rubik-Regular',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Rubik-Regular',
  },
});

export default UserTagging;
