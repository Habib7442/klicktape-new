import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
} from 'react-native';
import { Feather, MaterialIcons, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/context/ThemeContext';

export interface Genre {
  id: string;
  name: string;
  icon: string;
  iconFamily: 'Feather' | 'MaterialIcons' | 'FontAwesome5' | 'Ionicons';
  color: string;
}

export const GENRES: Genre[] = [
  {
    id: 'entertainment',
    name: 'Entertainment',
    icon: 'play-circle',
    iconFamily: 'Feather',
    color: '#FF6B6B',
  },
  {
    id: 'education',
    name: 'Education',
    icon: 'book',
    iconFamily: 'Feather',
    color: '#4ECDC4',
  },
  {
    id: 'motivation',
    name: 'Motivation',
    icon: 'trending-up',
    iconFamily: 'Feather',
    color: '#45B7D1',
  },
  {
    id: 'lifestyle',
    name: 'Lifestyle',
    icon: 'heart',
    iconFamily: 'Feather',
    color: '#F7DC6F',
  },
  {
    id: 'technology',
    name: 'Technology',
    icon: 'smartphone',
    iconFamily: 'Feather',
    color: '#BB8FCE',
  },
  {
    id: 'sports',
    name: 'Sports',
    icon: 'activity',
    iconFamily: 'Feather',
    color: '#58D68D',
  },
  {
    id: 'art',
    name: 'Art',
    icon: 'palette',
    iconFamily: 'Ionicons',
    color: '#F1948A',
  },
  {
    id: 'food',
    name: 'Food',
    icon: 'restaurant',
    iconFamily: 'Ionicons',
    color: '#F39C12',
  },
  {
    id: 'travel',
    name: 'Travel',
    icon: 'airplane',
    iconFamily: 'Ionicons',
    color: '#3498DB',
  },
  {
    id: 'business',
    name: 'Business',
    icon: 'briefcase',
    iconFamily: 'Feather',
    color: '#85929E',
  },
];

interface GenreSelectorProps {
  selectedGenre: Genre | null;
  onGenreSelect: (genre: Genre) => void;
  visible: boolean;
  onClose: () => void;
}

const GenreSelector: React.FC<GenreSelectorProps> = ({
  selectedGenre,
  onGenreSelect,
  visible,
  onClose,
}) => {
  const { colors, isDarkMode } = useTheme();

  const renderIcon = (genre: Genre, size: number = 24) => {
    const iconProps = {
      name: genre.icon,
      size,
      color: genre.color,
    };

    switch (genre.iconFamily) {
      case 'Feather':
        return <Feather {...iconProps} />;
      case 'MaterialIcons':
        return <MaterialIcons {...iconProps} />;
      case 'FontAwesome5':
        return <FontAwesome5 {...iconProps} />;
      case 'Ionicons':
        return <Ionicons {...iconProps} />;
      default:
        return <Feather {...iconProps} />;
    }
  };

  const handleGenreSelect = (genre: Genre) => {
    onGenreSelect(genre);
    onClose();
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
        <View style={[styles.header, { borderBottomColor: colors.divider }]}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Feather name="x" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Select Genre</Text>
          <View style={styles.headerButton} />
        </View>

        {/* Selected Genre Display */}
        {selectedGenre && (
          <View style={[styles.selectedGenreContainer, { backgroundColor: colors.backgroundSecondary }]}>
            <Text style={[styles.selectedGenreLabel, { color: colors.textSecondary }]}>
              Selected Genre:
            </Text>
            <View style={[styles.selectedGenreItem, { backgroundColor: `${selectedGenre.color}20` }]}>
              {renderIcon(selectedGenre, 20)}
              <Text style={[styles.selectedGenreName, { color: colors.text }]}>
                {selectedGenre.name}
              </Text>
            </View>
          </View>
        )}

        {/* Genre Grid */}
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.genreGrid}
          showsVerticalScrollIndicator={false}
        >
          {GENRES.map((genre) => {
            const isSelected = selectedGenre?.id === genre.id;
            
            return (
              <TouchableOpacity
                key={genre.id}
                style={[
                  styles.genreItem,
                  {
                    backgroundColor: isSelected 
                      ? `${genre.color}20` 
                      : isDarkMode 
                        ? 'rgba(128, 128, 128, 0.1)' 
                        : 'rgba(128, 128, 128, 0.1)',
                    borderColor: isSelected 
                      ? genre.color 
                      : isDarkMode 
                        ? 'rgba(128, 128, 128, 0.3)' 
                        : 'rgba(128, 128, 128, 0.3)',
                    borderWidth: isSelected ? 2 : 1,
                  },
                ]}
                onPress={() => handleGenreSelect(genre)}
                activeOpacity={0.7}
              >
                <View style={[styles.genreIconContainer, { backgroundColor: `${genre.color}15` }]}>
                  {renderIcon(genre, 28)}
                </View>
                <Text style={[styles.genreName, { color: colors.text }]}>
                  {genre.name}
                </Text>
                {isSelected && (
                  <View style={[styles.selectedIndicator, { backgroundColor: genre.color }]}>
                    <Feather name="check" size={12} color="white" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Clear Selection Button */}
        {selectedGenre && (
          <View style={[styles.footer, { borderTopColor: colors.divider }]}>
            <TouchableOpacity
              style={[styles.clearButton, { backgroundColor: colors.backgroundSecondary }]}
              onPress={() => {
                onGenreSelect(null as any);
                onClose();
              }}
            >
              <Feather name="x-circle" size={16} color={colors.textSecondary} />
              <Text style={[styles.clearButtonText, { color: colors.textSecondary }]}>
                Clear Selection
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerButton: {
    padding: 8,
    width: 40,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  selectedGenreContainer: {
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
  },
  selectedGenreLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  selectedGenreItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  selectedGenreName: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
  },
  scrollContainer: {
    flex: 1,
  },
  genreGrid: {
    padding: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  genreItem: {
    width: '48%',
    aspectRatio: 1,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  genreIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  genreName: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  clearButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
});

export default GenreSelector;
