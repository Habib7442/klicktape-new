import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native";
import { router } from "expo-router";
import { useTheme, ThemeType } from "@/src/context/ThemeContext";
import * as Haptics from 'expo-haptics';

export default function AppearanceScreen() {
  const { theme, setTheme, colors, isDarkMode } = useTheme();

  // Handle theme selection
  const handleThemeSelect = (newTheme: ThemeType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTheme(newTheme);
  };

  // Define gradient colors based on theme
  const gradientColors = isDarkMode
    ? ["#000000", "#1a1a1a", "#2a2a2a"] as const
    : ["#F8F9FA", "#F0F2F5", "#E9ECEF"] as const;

  return (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <View style={[styles.header, { backgroundColor: colors.backgroundSecondary }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.backButton, { backgroundColor: colors.backgroundTertiary, borderColor: colors.cardBorder }]}
          >
            <Feather name="arrow-left" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>
            Appearance
          </Text>
        </View>

        <ScrollView
          style={styles.container}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>
              Theme
            </Text>
            <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
              Choose how Klicktape looks to you. Select a light or dark theme, or use your system settings.
            </Text>

            <TouchableOpacity
              style={[
                styles.themeOption,
                {
                  backgroundColor: colors.backgroundSecondary,
                  borderColor: theme === 'dark' ? colors.primary : colors.cardBorder
                }
              ]}
              onPress={() => handleThemeSelect('dark')}
            >
              <View style={styles.themeOptionContent}>
                <View style={[styles.themePreview, { backgroundColor: '#000000' }]}>
                  <View style={styles.themePreviewHeader}>
                    <View style={[styles.themePreviewCircle, { backgroundColor: '#FFD700' }]} />
                  </View>
                  <View style={styles.themePreviewBody}>
                    <View style={[styles.themePreviewLine, { backgroundColor: '#2A2A2A' }]} />
                    <View style={[styles.themePreviewLine, { backgroundColor: '#2A2A2A', width: '70%' }]} />
                  </View>
                </View>
                <View style={styles.themeOptionTextContainer}>
                  <Text style={[styles.themeOptionTitle, { color: colors.text }]}>Dark</Text>
                  <Text style={[styles.themeOptionDescription, { color: colors.textSecondary }]}>
                    Dark background with light text
                  </Text>
                </View>
              </View>
              {theme === 'dark' && (
                <View
                  style={[
                    styles.themeCheckmark,
                    { backgroundColor: colors.primary }
                  ]}
                >
                  <Feather name="check" size={16} color="#000000" />
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.themeOption,
                {
                  backgroundColor: colors.backgroundSecondary,
                  borderColor: theme === 'light' ? colors.primary : colors.cardBorder
                }
              ]}
              onPress={() => handleThemeSelect('light')}
            >
              <View style={styles.themeOptionContent}>
                <View style={[styles.themePreview, { backgroundColor: '#F8F9FA' }]}>
                  <View style={styles.themePreviewHeader}>
                    <View style={[styles.themePreviewCircle, { backgroundColor: '#B8860B' }]} />
                  </View>
                  <View style={styles.themePreviewBody}>
                    <View style={[styles.themePreviewLine, { backgroundColor: '#E9ECEF' }]} />
                    <View style={[styles.themePreviewLine, { backgroundColor: '#E9ECEF', width: '70%' }]} />
                  </View>
                </View>
                <View style={styles.themeOptionTextContainer}>
                  <Text style={[styles.themeOptionTitle, { color: colors.text }]}>Light</Text>
                  <Text style={[styles.themeOptionDescription, { color: colors.textSecondary }]}>
                    Light background with dark text
                  </Text>
                </View>
              </View>
              {theme === 'light' && (
                <View
                  style={[
                    styles.themeCheckmark,
                    { backgroundColor: colors.primary }
                  ]}
                >
                  <Feather name="check" size={16} color="#000000" />
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.themeOption,
                {
                  backgroundColor: colors.backgroundSecondary,
                  borderColor: theme === 'system' ? colors.primary : colors.cardBorder
                }
              ]}
              onPress={() => handleThemeSelect('system')}
            >
              <View style={styles.themeOptionContent}>
                <View style={[styles.themePreview, { backgroundColor: '#F8F9FA' }]}>
                  <View style={styles.themePreviewSplit}>
                    <View style={[styles.themePreviewHalf, { backgroundColor: '#000000' }]} />
                    <View style={[styles.themePreviewHalf, { backgroundColor: '#F8F9FA' }]} />
                  </View>
                </View>
                <View style={styles.themeOptionTextContainer}>
                  <Text style={[styles.themeOptionTitle, { color: colors.text }]}>System</Text>
                  <Text style={[styles.themeOptionDescription, { color: colors.textSecondary }]}>
                    Follows your device settings
                  </Text>
                </View>
              </View>
              {theme === 'system' && (
                <View
                  style={[
                    styles.themeCheckmark,
                    { backgroundColor: colors.primary }
                  ]}
                >
                  <Feather name="check" size={16} color="#000000" />
                </View>
              )}
            </TouchableOpacity>
          </View>

          <Text style={[styles.footerText, { color: colors.textTertiary }]}>
            Changes to appearance settings are applied immediately and saved automatically.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
    marginRight: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  title: {
    fontSize: 24,
    fontFamily: "Rubik-Bold",
  },
  container: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Rubik-Bold",
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    fontFamily: "Rubik-Regular",
    marginBottom: 20,
  },
  themeOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
  },
  themeOptionContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  themePreview: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: "hidden",
    marginRight: 16,
  },
  themePreviewHeader: {
    height: 20,
    padding: 6,
  },
  themePreviewCircle: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  themePreviewBody: {
    flex: 1,
    padding: 6,
    justifyContent: "center",
  },
  themePreviewLine: {
    height: 4,
    borderRadius: 2,
    marginBottom: 4,
  },
  themePreviewSplit: {
    flex: 1,
    flexDirection: "row",
  },
  themePreviewHalf: {
    flex: 1,
  },
  themeOptionTextContainer: {
    flex: 1,
  },
  themeOptionTitle: {
    fontSize: 16,
    fontFamily: "Rubik-Medium",
    marginBottom: 4,
  },
  themeOptionDescription: {
    fontSize: 14,
    fontFamily: "Rubik-Regular",
  },
  themeCheckmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  footerText: {
    textAlign: "center",
    fontSize: 14,
    fontFamily: "Rubik-Regular",
    marginTop: 20,
  },
});
