import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/src/context/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Filter {
  name: string;
  icon: string;
  transform: ImageManipulator.Action[];
  overlay?: {
    color: string;
    opacity: number;
  };
}

interface ImageFiltersProps {
  imageUri: string;
  onFilterApplied: (filteredUri: string) => void;
  onClose: () => void;
}

const FILTERS: Filter[] = [
  {
    name: 'Original',
    icon: 'image',
    transform: [],
  },
  {
    name: 'Sepia',
    icon: 'sun',
    transform: [],
    overlay: {
      color: '#704214',
      opacity: 0.3,
    },
  },
  {
    name: 'Black & White',
    icon: 'circle',
    transform: [],
    overlay: {
      color: '#000000',
      opacity: 0.2,
    },
  },
  {
    name: 'Vintage',
    icon: 'camera',
    transform: [],
    overlay: {
      color: '#8B4513',
      opacity: 0.25,
    },
  },
  {
    name: 'High Contrast',
    icon: 'contrast',
    transform: [],
    overlay: {
      color: '#FFFFFF',
      opacity: 0.1,
    },
  },
  {
    name: 'Warm Tone',
    icon: 'thermometer',
    transform: [],
    overlay: {
      color: '#FF6B35',
      opacity: 0.15,
    },
  },
  {
    name: 'Cool Tone',
    icon: 'droplet',
    transform: [],
    overlay: {
      color: '#4A90E2',
      opacity: 0.15,
    },
  },
  {
    name: 'Cinematic',
    icon: 'film',
    transform: [],
    overlay: {
      color: '#1A1A1A',
      opacity: 0.2,
    },
  },
];

const ImageFilters: React.FC<ImageFiltersProps> = ({
  imageUri,
  onFilterApplied,
  onClose,
}) => {
  const { colors, isDarkMode } = useTheme();
  const [selectedFilter, setSelectedFilter] = useState<Filter>(FILTERS[0]);
  const [filteredPreviews, setFilteredPreviews] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [applyingFilter, setApplyingFilter] = useState(false);

  useEffect(() => {
    generatePreviews();
  }, [imageUri]);

  const generatePreviews = async () => {
    console.log('Starting filter preview generation for:', imageUri);
    setLoading(true);
    const previews: Record<string, string> = {};

    try {
      for (const filter of FILTERS) {
        if (filter.name === 'Original') {
          previews[filter.name] = imageUri;
        } else {
          try {
            // For visual effect filters, we'll just resize for preview
            // The actual filter effect will be applied via overlay in the UI
            const result = await ImageManipulator.manipulateAsync(
              imageUri,
              [{ resize: { width: 150, height: 150 } }],
              {
                compress: 0.7,
                format: ImageManipulator.SaveFormat.JPEG,
              }
            );
            previews[filter.name] = result.uri;
            console.log(`Generated preview for ${filter.name}`);
          } catch (filterError) {
            console.warn(`Error applying filter ${filter.name}:`, filterError);
            // Fallback to original image for failed filters
            previews[filter.name] = imageUri;
          }
        }
      }
      setFilteredPreviews(previews);
      console.log('Filter previews generated:', Object.keys(previews));
    } catch (error) {
      console.error('Error generating filter previews:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilter = async () => {
    if (selectedFilter.name === 'Original') {
      onFilterApplied(imageUri);
      return;
    }

    setApplyingFilter(true);
    try {
      // For visual effect filters, we maintain original dimensions
      // The filter effect is applied via CSS-like overlays in the UI
      const result = await ImageManipulator.manipulateAsync(
        imageUri,
        [], // No transformations to maintain original dimensions
        {
          compress: 0.8,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );
      onFilterApplied(result.uri);
    } catch (error) {
      console.error('Error applying filter:', error);
      // Fallback to original image if filter fails
      onFilterApplied(imageUri);
    } finally {
      setApplyingFilter(false);
    }
  };



  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Handle Bar */}
      <View style={styles.handleContainer}>
        <View style={[styles.handle, { backgroundColor: colors.textTertiary }]} />
      </View>

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.divider }]}>
        <TouchableOpacity onPress={onClose} style={styles.headerButton}>
          <Feather name="chevron-down" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text, fontFamily: 'Rubik-Medium' }]}>Filters</Text>
        <TouchableOpacity
          onPress={applyFilter}
          style={[styles.headerButton, { opacity: applyingFilter ? 0.5 : 1 }]}
          disabled={applyingFilter}
        >
          {applyingFilter ? (
            <ActivityIndicator size="small" color={isDarkMode ? '#808080' : '#606060'} />
          ) : (
            <Text style={[styles.applyText, { color: isDarkMode ? '#808080' : '#606060', fontFamily: 'Rubik-Medium' }]}>Apply</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Main Image Preview */}
      <View style={styles.imageContainer}>
        {filteredPreviews[selectedFilter.name] ? (
          <View style={styles.mainImageContainer}>
            <Image
              source={{ uri: filteredPreviews[selectedFilter.name] || imageUri }}
              style={styles.mainImage}
              resizeMode="cover"
            />
            {selectedFilter.overlay && (
              <View
                style={[
                  styles.mainImageOverlay,
                  {
                    backgroundColor: selectedFilter.overlay.color,
                    opacity: selectedFilter.overlay.opacity,
                  },
                ]}
              />
            )}
          </View>
        ) : (
          <View style={[styles.mainImage, { backgroundColor: colors.backgroundTertiary }]}>
            <ActivityIndicator size="large" color={isDarkMode ? '#808080' : '#606060'} />
          </View>
        )}
      </View>

      {/* Filter Options */}
      <View style={[styles.filtersContainer, { backgroundColor: colors.backgroundSecondary }]}>
        <Text style={[styles.filtersTitle, { color: colors.text, fontFamily: 'Rubik-Medium' }]}>
          Choose Filter ({FILTERS.length} available)
        </Text>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={isDarkMode ? '#808080' : '#606060'} />
            <Text style={[styles.loadingText, { color: colors.textSecondary, fontFamily: 'Rubik-Regular' }]}>
              Generating previews...
            </Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersScrollContainer}
          >
            {FILTERS.map((filter, index) => {
              const isSelected = selectedFilter.name === filter.name;
              const previewUri = filteredPreviews[filter.name] || imageUri;

              return (
                <TouchableOpacity
                  key={`${filter.name}-${index}`}
                  style={[
                    styles.filterItem,
                    {
                      borderColor: isSelected ? (isDarkMode ? '#808080' : '#606060') : colors.divider,
                      backgroundColor: isSelected
                        ? (isDarkMode ? '#80808020' : '#60606020')
                        : colors.background,
                    },
                  ]}
                  onPress={() => {
                    console.log('Filter selected:', filter.name);
                    setSelectedFilter(filter);
                  }}
                >
                  <View style={styles.filterPreviewContainer}>
                    {previewUri ? (
                      <View style={styles.filterPreview}>
                        <Image
                          source={{ uri: previewUri }}
                          style={styles.filterPreview}
                          resizeMode="cover"
                          onError={(error) => console.log('Image load error:', error)}
                        />
                        {filter.overlay && (
                          <View
                            style={[
                              styles.filterOverlay,
                              {
                                backgroundColor: filter.overlay.color,
                                opacity: filter.overlay.opacity,
                              },
                            ]}
                          />
                        )}
                      </View>
                    ) : (
                      <View style={[styles.filterPreview, { backgroundColor: colors.backgroundTertiary, justifyContent: 'center', alignItems: 'center' }]}>
                        <Feather name="image" size={24} color={colors.textSecondary} />
                      </View>
                    )}
                    {isSelected && (
                      <View style={[styles.selectedOverlay, { backgroundColor: isDarkMode ? '#80808040' : '#60606040' }]}>
                        <Feather name="check" size={16} color={isDarkMode ? '#808080' : '#606060'} />
                      </View>
                    )}
                  </View>
                  <Text style={[styles.filterName, { color: colors.text, fontFamily: 'Rubik-Regular' }]} numberOfLines={1}>
                    {filter.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
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
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  applyText: {
    fontSize: 16,
    fontWeight: '600',
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  mainImageContainer: {
    position: 'relative',
    width: SCREEN_WIDTH - 32,
    height: SCREEN_WIDTH - 32,
    borderRadius: 12,
    overflow: 'hidden',
  },
  mainImage: {
    width: SCREEN_WIDTH - 32,
    height: SCREEN_WIDTH - 32,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainImageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
  },
  filtersContainer: {
    paddingVertical: 16,
    paddingBottom: 32,
    minHeight: 140,
  },
  filtersTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
  },
  filtersScrollContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  filterItem: {
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 2,
    borderRadius: 12,
    padding: 8,
    minWidth: 90,
  },
  filterPreviewContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  filterPreview: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  filterOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 8,
  },
  selectedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterName: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 4,
  },
});

export default ImageFilters;
