import React, { useState } from 'react';
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
import { cacheManager } from '@/lib/utils/cacheManager';
import ThemedGradient from '@/components/ThemedGradient';

interface CacheDebuggerProps {
  isVisible: boolean;
  onClose: () => void;
}

const CacheDebugger: React.FC<CacheDebuggerProps> = ({ isVisible, onClose }) => {
  const { colors, isDarkMode } = useTheme();
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const clearCache = () => {
    Alert.alert(
      'Clear Cache',
      'Are you sure you want to clear all cached data?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            cacheManager.clear();
            refresh();
            Alert.alert('Success', 'Cache cleared successfully');
          },
        },
      ]
    );
  };

  const removeSpecificCache = (key: string) => {
    Alert.alert(
      'Remove Cache Entry',
      `Remove cache entry for "${key}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            cacheManager.remove(key);
            refresh();
          },
        },
      ]
    );
  };

  const cacheStats = cacheManager.getCacheStats();
  const allStatus = cacheManager.getAllStatus();

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
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
            Cache Debugger
          </Text>
          <TouchableOpacity onPress={refresh} style={styles.refreshButton}>
            <AntDesign name="reload1" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Cache Statistics */}
        <View style={[styles.statsContainer, { backgroundColor: `${colors.backgroundSecondary}40` }]}>
          <Text
            className="font-rubik-bold"
            style={[styles.sectionTitle, { color: colors.text }]}
          >
            Cache Statistics
          </Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text className="font-rubik-medium" style={[styles.statValue, { color: colors.primary }]}>
                {cacheStats.totalKeys}
              </Text>
              <Text className="font-rubik-regular" style={[styles.statLabel, { color: colors.textSecondary }]}>
                Total Keys
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text className="font-rubik-medium" style={[styles.statValue, { color: colors.success || '#4CAF50' }]}>
                {cacheStats.validItems}
              </Text>
              <Text className="font-rubik-regular" style={[styles.statLabel, { color: colors.textSecondary }]}>
                Valid Items
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text className="font-rubik-medium" style={[styles.statValue, { color: colors.error }]}>
                {cacheStats.expiredItems}
              </Text>
              <Text className="font-rubik-regular" style={[styles.statLabel, { color: colors.textSecondary }]}>
                Expired Items
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text className="font-rubik-medium" style={[styles.statValue, { color: colors.text }]}>
                {formatBytes(cacheStats.totalSizeBytes)}
              </Text>
              <Text className="font-rubik-regular" style={[styles.statLabel, { color: colors.textSecondary }]}>
                Total Size
              </Text>
            </View>
          </View>
        </View>

        {/* Cache Entries */}
        <ScrollView style={styles.entriesList} showsVerticalScrollIndicator={false}>
          <Text
            className="font-rubik-bold"
            style={[styles.sectionTitle, { color: colors.text, marginBottom: 12 }]}
          >
            Cache Entries
          </Text>
          
          {Object.keys(allStatus).length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: `${colors.backgroundSecondary}20` }]}>
              <AntDesign name="inbox" size={48} color={colors.textSecondary} />
              <Text
                className="font-rubik-medium"
                style={[styles.emptyText, { color: colors.textSecondary }]}
              >
                No cache entries found
              </Text>
            </View>
          ) : (
            Object.entries(allStatus).map(([key, status]) => (
              <View
                key={key}
                style={[
                  styles.cacheEntry,
                  {
                    backgroundColor: status.expired
                      ? `${colors.error}10`
                      : `${colors.backgroundSecondary}40`,
                    borderColor: status.expired ? colors.error : `${colors.primary}20`,
                  },
                ]}
              >
                <View style={styles.entryHeader}>
                  <Text
                    className="font-rubik-bold"
                    style={[styles.entryKey, { color: colors.text }]}
                  >
                    {key}
                  </Text>
                  <TouchableOpacity
                    onPress={() => removeSpecificCache(key)}
                    style={styles.removeButton}
                  >
                    <AntDesign name="delete" size={16} color={colors.error} />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.entryDetails}>
                  <Text
                    className="font-rubik-regular"
                    style={[styles.entryDetail, { color: colors.textSecondary }]}
                  >
                    Status: {status.expired ? '❌ Expired' : '✅ Valid'}
                  </Text>
                  <Text
                    className="font-rubik-regular"
                    style={[styles.entryDetail, { color: colors.textSecondary }]}
                  >
                    Age: {formatTime(status.age)}
                  </Text>
                  {!status.expired && (
                    <Text
                      className="font-rubik-regular"
                      style={[styles.entryDetail, { color: colors.textSecondary }]}
                    >
                      Expires in: {formatTime(status.expiresIn)}
                    </Text>
                  )}
                  <Text
                    className="font-rubik-regular"
                    style={[styles.entryDetail, { color: colors.textSecondary }]}
                  >
                    Size: {formatBytes(status.dataSize)}
                  </Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.clearButton, { backgroundColor: colors.error }]}
            onPress={clearCache}
          >
            <AntDesign name="delete" size={16} color="white" />
            <Text className="font-rubik-bold" style={styles.clearButtonText}>
              Clear All Cache
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
    maxHeight: '90%',
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
  refreshButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    textAlign: 'center',
  },
  statsContainer: {
    margin: 20,
    padding: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 16,
    marginBottom: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    width: '48%',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  entriesList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
  },
  cacheEntry: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  entryKey: {
    fontSize: 14,
    flex: 1,
  },
  removeButton: {
    padding: 4,
  },
  entryDetails: {
    gap: 2,
  },
  entryDetail: {
    fontSize: 12,
  },
  actionButtons: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  clearButtonText: {
    color: 'white',
    fontSize: 14,
  },
});

export default CacheDebugger;
