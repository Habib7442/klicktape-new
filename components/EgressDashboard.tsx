/**
 * Egress Monitoring Dashboard Component
 * Shows real-time bandwidth usage and optimization suggestions
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/context/ThemeContext';
import { egressMonitor } from '@/lib/utils/egressMonitor';

const EgressDashboard: React.FC = () => {
  const { colors, isDarkMode } = useTheme();
  const [summary, setSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState(24);

  useEffect(() => {
    loadEgressData();
  }, [selectedPeriod]);

  const loadEgressData = async () => {
    setIsLoading(true);
    try {
      await egressMonitor.loadMetrics();
      const egressSummary = egressMonitor.getEgressSummary(selectedPeriod);
      setSummary(egressSummary);
    } catch (error) {
      console.error('Error loading egress data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const showDetailedReport = () => {
    const report = egressMonitor.getFormattedReport(selectedPeriod);
    Alert.alert('Detailed Egress Report', report);
  };

  const clearMetrics = async () => {
    Alert.alert(
      'Clear Metrics',
      'Are you sure you want to clear all egress metrics?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await egressMonitor.clearMetrics();
            loadEgressData();
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.loadingText, { color: colors.text }]}>Loading egress data...</Text>
      </View>
    );
  }

  if (!summary) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>No egress data available</Text>
      </View>
    );
  }

  const cacheHitRate = summary.totalEgress > 0 ? (summary.cachedEgress / summary.totalEgress) * 100 : 0;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]} className="font-rubik-bold">
          Egress Monitor
        </Text>
        <TouchableOpacity onPress={showDetailedReport} style={styles.reportButton}>
          <Ionicons name="document-text-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Period Selector */}
      <View style={styles.periodSelector}>
        {[1, 6, 24, 168].map((hours) => (
          <TouchableOpacity
            key={hours}
            style={[
              styles.periodButton,
              { backgroundColor: selectedPeriod === hours ? colors.primary : colors.backgroundSecondary },
            ]}
            onPress={() => setSelectedPeriod(hours)}
          >
            <Text
              style={[
                styles.periodText,
                { color: selectedPeriod === hours ? colors.background : colors.text },
              ]}
              className="font-rubik-medium"
            >
              {hours === 1 ? '1h' : hours === 6 ? '6h' : hours === 24 ? '24h' : '7d'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryGrid}>
        <View style={[styles.summaryCard, { backgroundColor: colors.backgroundSecondary }]}>
          <Ionicons name="cloud-download-outline" size={24} color={colors.primary} />
          <Text style={[styles.summaryValue, { color: colors.text }]} className="font-rubik-bold">
            {formatBytes(summary.totalEgress)}
          </Text>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]} className="font-rubik-regular">
            Total Egress
          </Text>
        </View>

        <View style={[styles.summaryCard, { backgroundColor: colors.backgroundSecondary }]}>
          <Ionicons name="flash-outline" size={24} color="#10B981" />
          <Text style={[styles.summaryValue, { color: colors.text }]} className="font-rubik-bold">
            {cacheHitRate.toFixed(1)}%
          </Text>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]} className="font-rubik-regular">
            Cache Hit Rate
          </Text>
        </View>

        <View style={[styles.summaryCard, { backgroundColor: colors.backgroundSecondary }]}>
          <Ionicons name="save-outline" size={24} color="#F59E0B" />
          <Text style={[styles.summaryValue, { color: colors.text }]} className="font-rubik-bold">
            {formatBytes(summary.cachedEgress)}
          </Text>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]} className="font-rubik-regular">
            Cached Data
          </Text>
        </View>

        <View style={[styles.summaryCard, { backgroundColor: colors.backgroundSecondary }]}>
          <Ionicons name="warning-outline" size={24} color="#EF4444" />
          <Text style={[styles.summaryValue, { color: colors.text }]} className="font-rubik-bold">
            {formatBytes(summary.uncachedEgress)}
          </Text>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]} className="font-rubik-regular">
            Uncached Data
          </Text>
        </View>
      </View>

      {/* Top Endpoints */}
      <View style={[styles.section, { backgroundColor: colors.backgroundSecondary }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]} className="font-rubik-semibold">
          Top Endpoints
        </Text>
        {summary.topEndpoints.slice(0, 5).map((endpoint: any, index: number) => (
          <View key={endpoint.endpoint} style={styles.endpointRow}>
            <View style={styles.endpointInfo}>
              <Text style={[styles.endpointName, { color: colors.text }]} className="font-rubik-medium">
                {endpoint.endpoint}
              </Text>
              <Text style={[styles.endpointSize, { color: colors.textSecondary }]} className="font-rubik-regular">
                {formatBytes(endpoint.egress)} ({endpoint.percentage.toFixed(1)}%)
              </Text>
            </View>
            <View style={[styles.endpointBar, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.endpointBarFill,
                  { 
                    backgroundColor: colors.primary,
                    width: `${Math.min(endpoint.percentage, 100)}%`
                  }
                ]}
              />
            </View>
          </View>
        ))}
      </View>

      {/* Recommendations */}
      {summary.recommendations.length > 0 && (
        <View style={[styles.section, { backgroundColor: colors.backgroundSecondary }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]} className="font-rubik-semibold">
            💡 Optimization Recommendations
          </Text>
          {summary.recommendations.map((recommendation: string, index: number) => (
            <View key={index} style={styles.recommendationRow}>
              <Ionicons name="bulb-outline" size={16} color={colors.primary} />
              <Text style={[styles.recommendationText, { color: colors.text }]} className="font-rubik-regular">
                {recommendation}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.primary }]}
          onPress={loadEgressData}
        >
          <Ionicons name="refresh-outline" size={20} color={colors.background} />
          <Text style={[styles.actionText, { color: colors.background }]} className="font-rubik-medium">
            Refresh
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.border }]}
          onPress={clearMetrics}
        >
          <Ionicons name="trash-outline" size={20} color={colors.text} />
          <Text style={[styles.actionText, { color: colors.text }]} className="font-rubik-medium">
            Clear Data
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
  },
  errorText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
  },
  reportButton: {
    padding: 8,
  },
  periodSelector: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 8,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  periodText: {
    fontSize: 14,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  summaryValue: {
    fontSize: 18,
  },
  summaryLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  section: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    marginBottom: 12,
  },
  endpointRow: {
    marginBottom: 12,
  },
  endpointInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  endpointName: {
    fontSize: 14,
    flex: 1,
  },
  endpointSize: {
    fontSize: 12,
  },
  endpointBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  endpointBarFill: {
    height: '100%',
  },
  recommendationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 8,
  },
  recommendationText: {
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  actionText: {
    fontSize: 14,
  },
});

export default EgressDashboard;
