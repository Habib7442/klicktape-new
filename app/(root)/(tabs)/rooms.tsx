import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  Platform,
  Alert,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather, MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "@/src/context/ThemeContext";
import {
  communitiesAPI,
  Community,
  CommunityCategory,
} from "@/lib/communitiesApi";
import CommunityCard from "@/components/community/CommunityCard";
import { BlurView } from "expo-blur";

type TabType = "discover" | "my_communities" | "categories";

// Helper function to map invalid Feather icon names to valid ones
const getValidFeatherIcon = (iconName?: string): any => {
  const iconMap: { [key: string]: string } = {
    'palette': 'edit-3',        // Art & Design
    'chef-hat': 'coffee',       // Food & Cooking
    'gamepad-2': 'play',        // Gaming
    'trophy': 'award',          // Sports
  };

  return iconName ? (iconMap[iconName] || iconName) : 'hash';
};

export default function RoomsScreen() {
  const { colors, isDarkMode } = useTheme();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [categories, setCategories] = useState<CommunityCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateCommunity, setShowCreateCommunity] = useState(false);
  const [communityName, setCommunityName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [userId, setUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>("discover");
  const [sortBy, setSortBy] = useState<"members" | "activity" | "newest">(
    "activity"
  );

  // Ref for debounce timeout
  const searchTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const initializeData = async () => {
      await getUserId();
      await loadData(controller.signal);
    };

    initializeData();

    return () => {
      controller.abort();
    };
  }, []);

  // Debounce search query with 400ms delay
  useEffect(() => {
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout for debounced search
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 400);

    // Cleanup function to clear timeout on unmount
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  useEffect(() => {
    if (userId) {
      const controller = new AbortController();
      loadCommunities(controller.signal);

      // Cleanup function to abort the request if dependencies change
      return () => {
        controller.abort();
      };
    }
  }, [activeTab, sortBy, debouncedSearchQuery, userId]);

  const getUserId = async (): Promise<void> => {
    try {
      console.log("Getting user ID from storage...");
      const userData = await AsyncStorage.getItem("user");
      if (userData) {
        const user = JSON.parse(userData);
        console.log("User found:", user.id);
        setUserId(user.id);
      } else {
        console.log("No user found, redirecting to sign-in");
        router.replace("/sign-in");
      }
    } catch (error) {
      console.error("Error getting user from storage:", error);
      router.replace("/sign-in");
    }
  };

  const loadData = async (signal?: AbortSignal) => {
    try {
      console.log("Loading communities data...");

      // Set a timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Loading timeout")), 10000)
      );

      await Promise.race([
        Promise.all([loadCommunities(signal), loadCategories()]),
        timeoutPromise,
      ]);

      console.log("Communities data loaded successfully");
    } catch (error: any) {
      // Only show error if not aborted
      if (error.name !== 'AbortError' && !signal?.aborted) {
        console.error("Error loading data:", error);
        Alert.alert("Error", "Failed to load rooms. Please try again.");
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  const loadCommunities = async (signal?: AbortSignal) => {
    try {
      console.log("Loading communities for tab:", activeTab);
      let data: Community[] = [];

      if (activeTab === "my_communities") {
        console.log("Loading user communities...");
        data = await communitiesAPI.getUserCommunities();
      } else {
        console.log("Loading all communities...");
        data = await communitiesAPI.getCommunities(
          20,
          0,
          undefined,
          debouncedSearchQuery || undefined,
          undefined,
          sortBy
        );
      }

      // Check if the request was aborted before updating state
      if (!signal?.aborted) {
        console.log("Communities loaded:", data.length);
        setCommunities(data);
      }
    } catch (error: any) {
      // Only log errors if the request wasn't aborted
      if (error.name !== 'AbortError' && !signal?.aborted) {
        console.error("Error loading communities:", error);
      }
    }
  };

  const loadCategories = async () => {
    try {
      console.log("Loading categories...");
      const data = await communitiesAPI.getCategories();
      console.log("Categories loaded:", data.length);
      setCategories(data);
    } catch (error) {
      console.error("Error loading categories:", error);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    // Clear cache and reload fresh data
    setCommunities([]);
    setCategories([]);
    loadData();
  };

  const handleCreateCommunity = async () => {
    const trimmedName = communityName.trim();
    const trimmedDescription = description.trim();

    if (!trimmedName || !trimmedDescription) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    if (trimmedName.length > 100 || trimmedDescription.length > 500) {
      Alert.alert(
        "Error",
        "Community name must be less than 100 characters and description less than 500 characters"
      );
      return;
    }

    if (!userId) {
      Alert.alert("Error", "You must be logged in to create a room");
      return;
    }

    try {
      await communitiesAPI.createCommunity(
        trimmedName,
        trimmedDescription,
        selectedCategory || undefined,
        "public"
      );
      setShowCreateCommunity(false);
      setCommunityName("");
      setDescription("");
      setSelectedCategory("");
      loadData();
      Alert.alert("Success", "Room created successfully!");
    } catch (error: any) {
      console.error("Error creating room:", error);
      Alert.alert(
        "Error",
        error.message || "Failed to create room. Please try again."
      );
    }
  };

  const renderTabButton = (tab: TabType, title: string, icon: string) => (
    <TouchableOpacity
      style={[
        styles.tabButton,
        {
          backgroundColor:
            activeTab === tab
              ? isDarkMode
                ? "rgba(128, 128, 128, 0.3)"
                : "rgba(128, 128, 128, 0.2)"
              : "transparent",
          borderColor:
            activeTab === tab
              ? isDarkMode
                ? "rgba(128, 128, 128, 0.5)"
                : "rgba(128, 128, 128, 0.3)"
              : "transparent",
        },
      ]}
      onPress={() => setActiveTab(tab)}
    >
      <Feather name={icon as any} size={16} color={colors.text} />
      <Text style={[styles.tabButtonText, { color: colors.text }]}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  const renderSortButton = (sort: typeof sortBy, title: string) => (
    <TouchableOpacity
      style={[
        styles.sortButton,
        {
          backgroundColor:
            sortBy === sort
              ? isDarkMode ? 'rgba(128, 128, 128, 0.5)' : 'rgba(128, 128, 128, 0.3)'
              : isDarkMode
              ? "rgba(128, 128, 128, 0.2)"
              : "rgba(128, 128, 128, 0.1)",
        },
      ]}
      onPress={() => setSortBy(sort)}
    >
      <Text
        style={[
          styles.sortButtonText,
          {
            color: colors.text,
          },
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );

  const handleDeleteCommunity = async (communityId: string) => {
    try {
      await communitiesAPI.deleteCommunity(communityId);
      loadData();
      Alert.alert("Success", "Room deleted successfully!");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to delete room");
    }
  };

  const renderCommunityItem = ({ item }: { item: Community }) => (
    <CommunityCard
      community={item}
      onJoinStatusChange={loadCommunities}
      showJoinButton={activeTab !== "my_communities"}
      onDelete={() => handleDeleteCommunity(item.id)}
    />
  );

  const renderCategoryItem = ({ item }: { item: CommunityCategory }) => (
    <TouchableOpacity
      style={[
        styles.categoryCard,
        {
          backgroundColor: isDarkMode
            ? "rgba(40, 50, 50, 0.3)"
            : "rgba(248, 249, 250, 0.8)",
          borderColor: isDarkMode
            ? "rgba(128, 128, 128, 0.2)"
            : "rgba(128, 128, 128, 0.2)",
        },
      ]}
      onPress={() => {
        setActiveTab("discover");
        // Filter by category logic would go here
      }}
    >
      <View
        style={[
          styles.categoryIcon,
          { backgroundColor: isDarkMode ? 'rgba(128, 128, 128, 0.5)' : 'rgba(128, 128, 128, 0.3)' },
        ]}
      >
        <Feather
          name={getValidFeatherIcon(item.icon_name) || "hash"}
          size={20}
          color="#FFFFFF"
        />
      </View>
      <Text style={[styles.categoryName, { color: colors.text }]}>
        {item.name}
      </Text>
      {item.description && (
        <Text
          style={[styles.categoryDescription, { color: colors.textSecondary }]}
        >
          {item.description}
        </Text>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Loading rooms...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: `${colors.primary}20` }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Rooms</Text>
        <TouchableOpacity
          onPress={() => setShowCreateCommunity(true)}
          style={[styles.createButton, {
            backgroundColor: isDarkMode ? 'rgba(128, 128, 128, 0.2)' : 'rgba(128, 128, 128, 0.1)',
            borderColor: isDarkMode ? 'rgba(128, 128, 128, 0.5)' : 'rgba(128, 128, 128, 0.3)'
          }]}
        >
          <Feather name="plus" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, {
          backgroundColor: `${colors.backgroundSecondary}80`,
          borderColor: `${colors.primary}20`
        }]}>
          <Feather name="search" size={16} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search rooms..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {/* Show loading indicator when search is being debounced */}
          {searchQuery !== debouncedSearchQuery && searchQuery.length > 0 && (
            <ActivityIndicator size="small" color={colors.textSecondary} />
          )}
        </View>
      </View>

      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsContainer}
        contentContainerStyle={styles.tabsContent}
      >
        {renderTabButton("discover", "Discover", "compass")}
        {renderTabButton("my_communities", "My Rooms", "users")}
        {renderTabButton("categories", "Categories", "grid")}
      </ScrollView>

      {/* Sort Options (only for discover tab) */}
      {activeTab === "discover" && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.sortContainer}
          contentContainerStyle={styles.sortContent}
        >
          {renderSortButton("activity", "Most Active")}
          {renderSortButton("members", "Most Members")}
          {renderSortButton("newest", "Newest")}
        </ScrollView>
      )}

      {/* Content */}
      {activeTab === "categories" ? (
        <FlatList<CommunityCategory>
          data={categories}
          renderItem={renderCategoryItem}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.listContent, { flexGrow: 1, paddingBottom: 100 }]}
          style={{ flex: 1 }}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No categories available
              </Text>
            </View>
          )}
        />
      ) : (
        <FlatList<Community>
          data={communities}
          renderItem={renderCommunityItem}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.listContent, { paddingBottom: 100 }]}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {activeTab === "my_communities"
                  ? "You haven't joined any rooms yet"
                  : "No rooms found"}
              </Text>
              <TouchableOpacity
                onPress={() => setShowCreateCommunity(true)}
                style={[
                  styles.createEmptyButton,
                  {
                    backgroundColor: isDarkMode
                      ? "rgba(128, 128, 128, 0.2)"
                      : "rgba(128, 128, 128, 0.1)",
                    borderColor: isDarkMode
                      ? "rgba(128, 128, 128, 0.3)"
                      : "rgba(128, 128, 128, 0.3)",
                  },
                ]}
              >
                <Text
                  style={[styles.createEmptyButtonText, { color: colors.text }]}
                >
                  Create Room
                </Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      {/* Create Room Modal */}
      {showCreateCommunity && (
        <BlurView
          intensity={80}
          tint={isDarkMode ? "dark" : "light"}
          style={styles.modalOverlay}
        >
          <View
            style={[
              styles.modalContainer,
              {
                backgroundColor: isDarkMode ? "#1a1a1a" : "#ffffff",
                borderColor: isDarkMode
                  ? "rgba(128, 128, 128, 0.3)"
                  : "rgba(128, 128, 128, 0.2)",
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Create Room
              </Text>
              <TouchableOpacity
                onPress={() => setShowCreateCommunity(false)}
                style={styles.closeButton}
              >
                <Feather name="x" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>
                  Room Name *
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: `${colors.backgroundSecondary}80`,
                      borderColor: `${colors.primary}20`,
                      color: colors.text,
                    },
                  ]}
                  placeholder="Enter room name"
                  placeholderTextColor={colors.textSecondary}
                  value={communityName}
                  onChangeText={setCommunityName}
                  maxLength={100}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>
                  Description *
                </Text>
                <TextInput
                  style={[
                    styles.textArea,
                    {
                      backgroundColor: `${colors.backgroundSecondary}80`,
                      borderColor: `${colors.primary}20`,
                      color: colors.text,
                    },
                  ]}
                  placeholder="Describe your room"
                  placeholderTextColor={colors.textSecondary}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={4}
                  maxLength={500}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>
                  Category (Optional)
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.categorySelector}>
                    <TouchableOpacity
                      style={[
                        styles.categoryOption,
                        {
                          backgroundColor: !selectedCategory
                            ? isDarkMode ? 'rgba(128, 128, 128, 0.5)' : 'rgba(128, 128, 128, 0.3)'
                            : isDarkMode
                            ? "rgba(128, 128, 128, 0.2)"
                            : "rgba(128, 128, 128, 0.1)",
                          borderColor: !selectedCategory
                            ? isDarkMode ? 'rgba(128, 128, 128, 0.7)' : 'rgba(128, 128, 128, 0.5)'
                            : isDarkMode
                            ? "rgba(128, 128, 128, 0.3)"
                            : "rgba(128, 128, 128, 0.2)",
                        },
                      ]}
                      onPress={() => setSelectedCategory("")}
                    >
                      <Text
                        style={[
                          styles.categoryOptionText,
                          {
                            color: colors.text,
                          },
                        ]}
                      >
                        None
                      </Text>
                    </TouchableOpacity>
                    {categories.map((category) => (
                      <TouchableOpacity
                        key={category.id}
                        style={[
                          styles.categoryOption,
                          {
                            backgroundColor:
                              selectedCategory === category.id
                                ? isDarkMode ? 'rgba(128, 128, 128, 0.5)' : 'rgba(128, 128, 128, 0.3)'
                                : isDarkMode
                                ? "rgba(128, 128, 128, 0.2)"
                                : "rgba(128, 128, 128, 0.1)",
                            borderColor:
                              selectedCategory === category.id
                                ? isDarkMode ? 'rgba(128, 128, 128, 0.7)' : 'rgba(128, 128, 128, 0.5)'
                                : isDarkMode
                                ? "rgba(128, 128, 128, 0.3)"
                                : "rgba(128, 128, 128, 0.2)",
                          },
                        ]}
                        onPress={() => setSelectedCategory(category.id)}
                      >
                        <Text
                          style={[
                            styles.categoryOptionText,
                            {
                              color: colors.text,
                            },
                          ]}
                        >
                          {category.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[
                  styles.cancelButton,
                  {
                    backgroundColor: isDarkMode
                      ? "rgba(128, 128, 128, 0.2)"
                      : "rgba(128, 128, 128, 0.1)",
                    borderColor: isDarkMode
                      ? "rgba(128, 128, 128, 0.3)"
                      : "rgba(128, 128, 128, 0.2)",
                  },
                ]}
                onPress={() => setShowCreateCommunity(false)}
              >
                <Text style={[styles.cancelButtonText, { color: colors.text }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.createButtonModal,
                  {
                    backgroundColor: isDarkMode ? 'rgba(128, 128, 128, 0.5)' : 'rgba(128, 128, 128, 0.3)',
                    opacity: (!communityName.trim() || !description.trim()) ? 0.5 : 1
                  },
                ]}
                onPress={handleCreateCommunity}
                disabled={!communityName.trim() || !description.trim()}
              >
                <Text style={[styles.createButtonText, { color: colors.text }]}>Create Room</Text>
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: "Rubik-Medium",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    fontFamily: "Rubik-Bold",
  },
  createButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontFamily: "Rubik-Medium",
  },
  tabsContainer: {
    maxHeight: 50,
  },
  tabsContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  tabButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 1,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 6,
    fontFamily: "Rubik-Medium",
  },
  sortContainer: {
    maxHeight: 50,
  },
  sortContent: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  sortButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 12,
  },
  sortButtonText: {
    fontSize: 12,
    fontWeight: "500",
    fontFamily: "Rubik-Medium",
  },
  listContent: {
    paddingBottom: 20,
  },
  categoryCard: {
    margin: 16,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  categoryIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "Rubik-Bold",
    marginBottom: 4,
  },
  categoryDescription: {
    fontSize: 12,
    textAlign: "center",
    fontFamily: "Rubik-Medium",
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  modalContainer: {
    width: "90%",
    maxHeight: "80%",
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(128, 128, 128, 0.2)",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    fontFamily: "Rubik-Bold",
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    padding: 20,
    maxHeight: 400,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
    fontFamily: "Rubik-Medium",
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: "Rubik-Medium",
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: "Rubik-Medium",
    textAlignVertical: "top",
  },
  categorySelector: {
    flexDirection: "row",
  },
  categoryOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
  },
  categoryOptionText: {
    fontSize: 12,
    fontWeight: "500",
    fontFamily: "Rubik-Medium",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "rgba(128, 128, 128, 0.2)",
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "500",
    fontFamily: "Rubik-Medium",
  },
  createButtonModal: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "Rubik-Bold",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
    fontFamily: "Rubik-Medium",
  },
  createEmptyButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  createEmptyButtonText: {
    fontSize: 14,
    fontWeight: "500",
    fontFamily: "Rubik-Medium",
  },
});
