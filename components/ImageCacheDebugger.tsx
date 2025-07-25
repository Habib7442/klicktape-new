import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import Modal from 'react-native-modal';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '@/src/context/ThemeContext';
import { ImageCacheManager } from '@/lib/utils/imageCaching';

interface ImageCacheDebuggerProps {
  isVisible: boolean;
  onClose: () => void;
}

const ImageCacheDebugger: React.FC<ImageCacheDebuggerProps> = ({ isVisible, onClose }) => {
  const { colors, isDarkMode } = useTheme();
  const [cacheStats, setCacheStats] = useState({
    totalSize: 0,
    totalImages: 0,
    oldestEntry: 0,
    newestEntry: 0,
  });
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (isVisible) {
      loadCacheStats();
    }
  }, [isVisible, refreshKey]);

  const loadCacheStats = async () => {
    try {
      const stats = await ImageCacheManager.getCacheStats();
      setCacheStats(stats);
    } catch (error) {
      console.error('Error loading cache stats:', error);
    }
  };

  const refresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const clearCache = () => {
    Alert.alert(
      'Clear Image Cache',
      'Are you sure you want to clear all cached images? This will free up storage space but images will need to be downloaded again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await ImageCacheManager.clearCache();
              refresh();
              Alert.alert('Success', 'Image cache cleared successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear image cache');
            }
          },
        },
      ]
    );
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (timestamp: number) => {
    if (timestamp === 0) return 'N/A';
    return new Date(timestamp).toLocaleString();
  };

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
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: `${colors.primary}20` }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <AntDesign name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text
            className="font-rubik-bold"
            style={[styles.title, { color: colors.text }]}
          >
            Image Cache Debugger
          </Text>
          <TouchableOpacity onPress={refresh} style={styles.refreshButton}>
            <AntDesign name="reload1" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Cache Statistics */}
          <View style={[styles.section, { backgroundColor: `${colors.backgroundSecondary}40` }]}>
            <Text
              className="font-rubik-bold"
              style={[styles.sectionTitle, { color: colors.text }]}
            >
              Cache Statistics
            </Text>
            
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text className="font-rubik-medium" style={[styles.statValue, { color: colors.primary }]}>
                  {cacheStats.totalImages}
                </Text>
                <Text className="font-rubik-regular" style={[styles.statLabel, { color: colors.textSecondary }]}>
                  Cached Images
                </Text>
              </View>
              
              <View style={styles.statItem}>
                <Text className="font-rubik-medium" style={[styles.statValue, { color: colors.success || '#4CAF50' }]}>
                  {formatBytes(cacheStats.totalSize)}
                </Text>
                <Text className="font-rubik-regular" style={[styles.statLabel, { color: colors.textSecondary }]}>
                  Total Size
                </Text>
              </View>
            </View>

            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text className="font-rubik-medium" style={[styles.statValue, { color: colors.textSecondary }]}>
                  {formatDate(cacheStats.oldestEntry)}
                </Text>
                <Text className="font-rubik-regular" style={[styles.statLabel, { color: colors.textSecondary }]}>
                  Oldest Entry
                </Text>
              </View>
              
              <View style={styles.statItem}>
                <Text className="font-rubik-medium" style={[styles.statValue, { color: colors.textSecondary }]}>
                  {formatDate(cacheStats.newestEntry)}
                </Text>
                <Text className="font-rubik-regular" style={[styles.statLabel, { color: colors.textSecondary }]}>
                  Newest Entry
                </Text>
              </View>
            </View>
          </View>

          {/* Actions */}
          <View style={[styles.section, { backgroundColor: `${colors.backgroundSecondary}40` }]}>
            <Text
              className="font-rubik-bold"
              style={[styles.sectionTitle, { color: colors.text }]}
            >
              Actions
            </Text>
            
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.error }]}
              onPress={clearCache}
            >
              <AntDesign name="delete" size={20} color="white" />
              <Text className="font-rubik-medium" style={styles.actionButtonText}>
                Clear All Cache
              </Text>
            </TouchableOpacity>
          </View>

          {/* Info */}
          <View style={[styles.section, { backgroundColor: `${colors.backgroundSecondary}40` }]}>
            <Text
              className="font-rubik-bold"
              style={[styles.sectionTitle, { color: colors.text }]}
            >
              How It Works
            </Text>
            
            <Text className="font-rubik-regular" style={[styles.infoText, { color: colors.textSecondary }]}>
              • Avatar images are automatically cached when loaded{'\n'}
              • Cached images are served instantly on subsequent loads{'\n'}
              • Cache expires after 7 days to ensure fresh content{'\n'}
              • Maximum cache size is 100MB{'\n'}
              • Reduces Supabase storage API calls and costs
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: {
    margin: 0,
    justifyContent: 'flex-end',
  },
  container: {
    flex: 1,
    maxHeight: '80%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
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
  refreshButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginVertical: 10,
    padding: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 16,
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  actionButtonText: {
    color: 'white',
    marginLeft: 8,
    fontSize: 14,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
});

export default ImageCacheDebugger;
