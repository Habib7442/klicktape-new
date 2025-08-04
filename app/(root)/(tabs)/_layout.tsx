import { Tabs } from "expo-router";
import { View, Text, StyleSheet } from "react-native";
import React from "react";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/src/context/ThemeContext";
import { useProfileProtection } from "@/hooks/useProfileProtection";

const TabIcon = ({
  iconName,
  focused,
  title,
}: {
  iconName: any; // Using any to fix the TypeScript error
  focused: boolean;
  title: string;
}) => {
  const { colors, isDarkMode } = useTheme();

  return (
    <View style={styles.tabIconContainer}>
      <View style={[
        styles.iconWrapper,
        focused && { backgroundColor: 'rgba(255, 255, 255, 0.1)' } // White highlight for focused state on black background
      ]}>
        <Feather
          name={iconName}
          size={24}
          color="#FFFFFF" // Always white icons for black background
        />
      </View>
      <Text
        style={[
          styles.title,
          { color: "#FFFFFF" }, // Always white text for black background
        ]}
      >
        {title}
      </Text>
    </View>
  );
};

export default function Layout() {
  // Protect all tab routes - redirect to create-profile if profile incomplete
  useProfileProtection();

  const { colors, isDarkMode } = useTheme();

  return (
    <Tabs
      initialRouteName="home"
      screenOptions={{
        tabBarShowLabel: false,
        tabBarStyle: [
          styles.tabBar,
          {
            backgroundColor: '#000000', // Solid black background as per reference design
            borderColor: 'rgba(128, 128, 128, 0.2)'
          }
        ],
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabIcon iconName="home" focused={focused} title="Home" />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Search",
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabIcon
              iconName="search"
              focused={focused}
              title="Search"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: "Create",
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabIcon
              iconName="plus-square"
              focused={focused}
              title="Create"
            />
          ),
          tabBarStyle: { display: "none" },
        }}
      />
      <Tabs.Screen
        name="reels"
        options={{
          title: "Reels",
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabIcon iconName="film" focused={focused} title="Tapes" />
          ),
          tabBarStyle: { display: "none" },
        }}
      />
      <Tabs.Screen
        name="rooms"
        options={{
          title: "Rooms",
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabIcon iconName="users" focused={focused} title="Rooms" />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabIcon
              iconName="user"
              focused={focused}
              title="Profile"
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    borderRadius: 0, // Remove rounded corners for solid design
    marginHorizontal: 0, // Remove horizontal margin for full width
    marginBottom: 0, // Remove bottom margin for proper positioning
    height: 90,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    position: "absolute",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 0, // Remove border for clean solid look
    zIndex: 0,
  },
  tabIconContainer: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    height: "100%",
    paddingHorizontal: 10,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
    marginBottom: 4,
  },
  icon: {
    width: 30,
    height: 30,
  },
  title: {
    fontSize: 10,
    fontFamily: "Rubik-Medium",
    textAlign: "center",
    marginTop: 2,
    includeFontPadding: false,
    textTransform: "uppercase",
    letterSpacing: 0.2,
    width: "100%",
    overflow: "hidden",
  },
});
