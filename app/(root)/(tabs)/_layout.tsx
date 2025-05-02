import { Tabs } from "expo-router";
import { View, Text, StyleSheet } from "react-native";
import React from "react";
import { Feather } from "@expo/vector-icons";

const TabIcon = ({
  iconName,
  focused,
  title,
}: {
  iconName: string;
  focused: boolean;
  title: string;
}) => (
  <View style={styles.tabIconContainer}>
    <View style={[styles.iconWrapper, focused && styles.iconWrapperActive]}>
      <Feather 
        name={iconName} 
        size={24} 
        color={focused ? "#FFD700" : "#A0A0A0"} 
      />
    </View>
    <Text
      style={[
        styles.title,
        focused ? styles.titleActive : styles.titleInactive,
      ]}
    >
      {title}
    </Text>
  </View>
);

export default function Layout() {
  return (
    <Tabs
      initialRouteName="home"
      screenOptions={{
        tabBarShowLabel: false,
        tabBarStyle: styles.tabBar,
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
            <TabIcon iconName="film" focused={focused} title="Reels" />
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
    backgroundColor: "#2A2A2A",
    borderRadius: 30,
    marginHorizontal: 12,
    marginBottom: 14,
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
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.1)",
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
  iconWrapperActive: {
    backgroundColor: "rgba(255, 215, 0, 0.2)",
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
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  titleActive: {
    color: "#FFD700",  // Already golden
  },
  titleInactive: {
    color: "#A0A0A0",
  },
});
