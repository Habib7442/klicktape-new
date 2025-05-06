import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Image,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/src/store/store";
import { logoutUser } from "@/src/store/actions/authActions";
import { closeSidebar } from "@/src/store/slices/sidebarSlice";
import { useSupabaseFetch } from "@/hooks/useSupabaseFetch";
import AsyncStorage from "@react-native-async-storage/async-storage";

const Sidebar = () => {
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const isVisible = useSelector((state: RootState) => state.sidebar.isVisible);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isActive, setIsActive] = useState(false);
  const { fetchUserProfile, loading } = useSupabaseFetch();
  const [userId, setUserId] = useState<string | null>(null);

  const slideAnim = useRef(new Animated.Value(-300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const getUserFromStorage = async () => {
      try {
        const userData = await AsyncStorage.getItem("user");
        if (userData) {
          const user = JSON.parse(userData);
          setUserId(user.id);
        }
      } catch (error) {
        console.error("Error getting user from storage:", error);
      }
    };

    getUserFromStorage();
  }, []);

  const loadUserProfile = async () => {
    try {
      if (userId) {
        const userProfileData = await fetchUserProfile(userId);
        console.log(userProfileData, "upd");

        setUserProfile({
          ...userProfileData,
          postsCount: 0,
        });

        setIsActive(true);
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    }
  };

  useEffect(() => {
    if (userId) {
      loadUserProfile();
    }
  }, [userId]);

  useEffect(() => {
    if (isVisible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          speed: 10,
          bounciness: 8,
          useNativeDriver: true,
        }),
        Animated.spring(fadeAnim, {
          toValue: 1,
          speed: 10,
          bounciness: 0,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: -300,
          speed: 10,
          bounciness: 8,
          useNativeDriver: true,
        }),
        Animated.spring(fadeAnim, {
          toValue: 0,
          speed: 10,
          bounciness: 0,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isVisible]);

  const handleLogout = async () => {
    try {
      if (!supabase) {
        console.error("Supabase client is not initialized");
        return;
      }

      // Update user active status if possible
      if (user?.id) {
        try {
          await supabase
            .from("profiles")
            .update({ is_active: false })
            .eq("id", user.id);
        } catch (statusError) {
          console.error("Error updating active status:", statusError);
          // Continue with logout even if this fails
        }
      }

      // Sign out from Supabase
      await supabase.auth.signOut();

      // Clear all Redux state
      dispatch(logoutUser());

      // Close sidebar
      dispatch(closeSidebar());

      // Navigate to sign-up screen
      router.replace("/sign-up");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const handleClose = () => {
    dispatch(closeSidebar());
  };

  return (
    <Animated.View
      style={[
        styles.container,
        { opacity: fadeAnim },
        !isVisible && styles.hidden,
      ]}
      pointerEvents={isVisible ? "auto" : "none"}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={handleClose}
      >
        <Animated.View
          style={[styles.overlayBackground, { opacity: fadeAnim }]}
        />
      </TouchableOpacity>

      <Animated.View
        style={[
          styles.sidebarContainer,
          { transform: [{ translateX: slideAnim }] },
        ]}
      >
        <LinearGradient
          colors={["#000000", "#1a1a1a", "#2a2a2a"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.sidebar}
        >
          <View style={styles.header}>
            <Text style={styles.headerText}>Klicktape</Text>
          </View>

          {userProfile && (
            <TouchableOpacity
              style={styles.userInfo}
              onPress={() => {
                router.push("/profile");
                handleClose();
              }}
            >
              <Image
                source={{
                  uri:
                    userProfile.avatar_url || "https://via.placeholder.com/150",
                }}
                style={styles.avatar}
              />
              <Text style={styles.username}>{userProfile.username}</Text>
              <View style={styles.userStatus}>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: isActive ? "#4CAF50" : "#9E9E9E" },
                  ]}
                />
                <Text style={styles.statusText}>
                  {isActive ? "Online" : "Offline"}
                </Text>
              </View>

              <View style={styles.statsContainer}>
                <View style={styles.stat}>
                  <Text style={styles.statNumber}>
                    {userProfile.postsCount || 0}
                  </Text>
                  <Text style={styles.statLabel}>Posts</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statNumber}>
                    {userProfile.followersCount || 0}
                  </Text>
                  <Text style={styles.statLabel}>Followers</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statNumber}>
                    {userProfile.followingCount || 0}
                  </Text>
                  <Text style={styles.statLabel}>Following</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              router.push("/profile");
              handleClose();
            }}
          >
            <Feather name="user" size={24} color="#FFD700" />
            <Text style={styles.menuText}>Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              router.push("/settings");
              handleClose();
            }}
          >
            <Feather name="settings" size={24} color="#FFD700" />
            <Text style={styles.menuText}>Settings</Text>
          </TouchableOpacity>

          {/* <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              router.push("/nearby");
              handleClose();
            }}
          >
            <Feather name="map-pin" size={24} color="#FFD700" />
            <Text style={styles.menuText}>People Nearby</Text>
          </TouchableOpacity> */}

          <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
            <Feather name="log-out" size={24} color="#FF6B6B" />
            <Text style={[styles.menuText, styles.logoutText]}>Logout</Text>
          </TouchableOpacity>
        </LinearGradient>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  hidden: {
    display: "none",
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  overlayBackground: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 1)",
  },
  sidebarContainer: {
    width: "80%",
    height: "100%",
    backgroundColor: "#000000",
  },
  sidebar: {
    flex: 1,
    padding: 20,
    backgroundColor: "#000000",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 215, 0, 0.3)",
    paddingBottom: 16,
  },
  headerText: {
    fontSize: 24,
    fontFamily: "Rubik-Bold",
    color: "#FFD700",
    marginLeft: 8,
  },
  userInfo: {
    padding: 20,
    marginBottom: 20,
    borderRadius: 12,
    backgroundColor: "rgba(255, 215, 0, 0.05)",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.1)",
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: "rgba(255, 215, 0, 0.3)",
  },
  username: {
    color: "#ffffff",
    fontSize: 18,
    fontFamily: "Rubik-Bold",
    marginBottom: 8,
  },
  userStatus: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  statusText: {
    color: "#FFD700",
    fontSize: 14,
    fontFamily: "Rubik-Medium",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 10,
  },
  stat: {
    alignItems: "center",
    flex: 1,
  },
  statNumber: {
    color: "#ffffff",
    fontSize: 16,
    fontFamily: "Rubik-Bold",
  },
  statLabel: {
    color: "rgba(255, 215, 0, 0.7)",
    fontSize: 12,
    fontFamily: "Rubik-Regular",
    marginTop: 4,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderRadius: 8,
    backgroundColor: "rgba(255, 215, 0, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.1)",
  },
  menuText: {
    marginLeft: 16,
    fontFamily: "Rubik-Medium",
    fontSize: 16,
    color: "#ffffff",
  },
  logoutText: {
    color: "#FF6B6B",
  },
});

export default Sidebar;
