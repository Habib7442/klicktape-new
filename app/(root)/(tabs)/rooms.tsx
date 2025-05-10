import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Animated,
  RefreshControl,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Feather, MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { roomsAPI } from "@/lib/roomsApi";
import DeleteModal from "@/components/DeleteModal";
import { BlurView } from "expo-blur";
import ThemedGradient from "@/components/ThemedGradient";
import { useTheme } from "@/src/context/ThemeContext";

export default function RoomsScreen() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [topic, setTopic] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [refreshIconAnim] = useState(new Animated.Value(0));
  const { colors, isDarkMode } = useTheme();

  useEffect(() => {
    const getUserFromStorage = async () => {
      try {
        const userData = await AsyncStorage.getItem("user");
        if (userData) {
          const user = JSON.parse(userData);
          setUserId(user.id);
        } else {
          router.replace("/sign-in");
        }
      } catch (error) {
        console.error("Error getting user from storage:", error);
        router.replace("/sign-in");
      }
    };

    getUserFromStorage();
  }, []);

  useEffect(() => {
    if (userId) {
      loadRooms();
      // Fade in animation
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();
    }
  }, [userId, fadeAnim]);

  const loadRooms = async (isRefreshing = false) => {
    try {
      const roomsData = await roomsAPI.getRooms();
      setRooms(roomsData || []);
    } catch (error) {
      console.error("Error loading rooms:", error);
      setRooms([]);
    } finally {
      setLoading(false);
      if (isRefreshing) {
        setRefreshing(false);
      }
    }
  };

  const onRefresh = () => {
    setRefreshing(true);

    // Animate the refresh icon
    Animated.timing(refreshIconAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start(() => {
      refreshIconAnim.setValue(0);
    });

    loadRooms(true);
  };

  const handleCreateRoom = async () => {
    const trimmedName = roomName.trim();
    const trimmedDescription = topic.trim();

    if (!trimmedName || !trimmedDescription) return;
    if (trimmedName.length > 500 || trimmedDescription.length > 500) {
      alert("Room name and description must be less than 500 characters");
      return;
    }

    if (!userId) {
      alert("You must be logged in to create a room");
      return;
    }

    try {
      await roomsAPI.createRoom(userId, trimmedName, trimmedDescription);
      setShowCreateRoom(false);
      setRoomName("");
      setTopic("");
      loadRooms();
    } catch (error) {
      console.error("Error creating room:", error);
      alert("Failed to create room. Please try again.");
    }
  };

  interface RoomItemProps {
    item: {
      id: string;
      name: string;
      description: string;
      creator_id: string;
      participants_count: number;
    };
    userId: string | null;
    onRoomUpdate: () => void;
  }

  const RoomItem = ({ item, userId, onRoomUpdate }: RoomItemProps) => {
    const [isJoined, setIsJoined] = useState(false);
    const [joining, setJoining] = useState(false);
    const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
    const [scaleAnim] = useState(new Animated.Value(1));
    const { colors, isDarkMode } = useTheme();

    useEffect(() => {
      checkJoinStatus();
    }, []);

    const checkJoinStatus = async () => {
      if (!userId) return;
      try {
        const isJoined = await roomsAPI.checkJoinStatus(item.id, userId);
        setIsJoined(isJoined);
      } catch (error) {
        console.error("Error checking join status:", error);
      }
    };

    const handleJoinRoom = async () => {
      if (joining || !userId) return;

      // Button press animation
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();

      setJoining(true);
      try {
        await roomsAPI.joinRoom(item.id, userId);
        setIsJoined(true);
        onRoomUpdate();
      } catch (error) {
        console.error("Error joining room:", error);
        alert("Failed to join room. Please try again.");
      } finally {
        setJoining(false);
      }
    };

    const handleDeletePress = () => {
      setIsDeleteModalVisible(true);
    };

    const handleConfirmDelete = async () => {
      try {
        await roomsAPI.deleteRoom(item.id);
        onRoomUpdate(); // Refresh the rooms list
        setIsDeleteModalVisible(false);
      } catch (error) {
        console.error("Error deleting room:", error);
        alert("Failed to delete room. Please try again.");
      }
    };

    return (
      <View>
        <TouchableOpacity
          onPress={() => router.push(`/rooms/${item.id}`)}
          activeOpacity={0.8}
          onPressIn={() => {
            Animated.timing(scaleAnim, {
              toValue: 0.98,
              duration: 100,
              useNativeDriver: true,
            }).start();
          }}
          onPressOut={() => {
            Animated.timing(scaleAnim, {
              toValue: 1,
              duration: 150,
              useNativeDriver: true,
            }).start();
          }}
        >
          <Animated.View
            style={[
              styles.roomItem,
              {
                transform: [{ scale: scaleAnim }],
                backgroundColor: `${colors.primary}10`,
                borderColor: `${colors.primary}20`
              }
            ]}
          >
            <LinearGradient
              colors={[
                `${colors.primary}20`,
                `${colors.primary}15`
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ borderRadius: 16, flex: 1, padding: 16 }}
            >
              <View style={styles.roomHeader}>
                <Text
                  style={[styles.roomName, { color: colors.primary }]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {item.name}
                </Text>
                {item.creator_id === userId && (
                  <TouchableOpacity
                    onPress={handleDeletePress}
                    style={[styles.deleteButton, {
                      backgroundColor: "rgba(255, 68, 68, 0.1)",
                      borderColor: "rgba(255, 68, 68, 0.3)"
                    }]}
                    activeOpacity={0.7}
                  >
                    <Feather name="trash-2" size={18} color="#FF4444" />
                  </TouchableOpacity>
                )}
              </View>
              <Text
                style={[styles.roomDescription, { color: colors.text }]}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {item.description}
              </Text>
              <View style={[styles.participantsContainer, { backgroundColor: `${colors.primary}10` }]}>
                <Feather name="users" size={14} color={colors.primary} />
                <Text style={[styles.participantsCount, { color: colors.primary }]}>
                  {item.participants_count || 0} participants
                </Text>
              </View>
              {!isJoined && (
                <Animated.View>
                  <TouchableOpacity
                    onPress={handleJoinRoom}
                    style={[styles.joinButton, {
                      backgroundColor: colors.primary,
                      borderColor: `${colors.primary}70`,
                      shadowOpacity: 0
                    }]}
                    disabled={joining}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.joinButtonText, { color: isDarkMode ? "#2d2d2d" : "#2d2d2d" }]}>
                      {joining ? "Joining..." : "Join to Chat"}
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
              )}
            </LinearGradient>
          </Animated.View>
        </TouchableOpacity>

        <DeleteModal
          isVisible={isDeleteModalVisible}
          title="Delete Room"
          desc="room"
          cancel={() => setIsDeleteModalVisible(false)}
          confirm={handleConfirmDelete}
        />
      </View>
    );
  };

  const renderRoom = ({ item }: { item: any }) => (
    <RoomItem item={item} userId={userId} onRoomUpdate={loadRooms} />
  );

  return (
    <ThemedGradient style={styles.container}>
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <View style={[styles.headerContainer, { shadowOpacity: 0 }]}>
          <LinearGradient
            colors={[
              isDarkMode
                ? `${colors.backgroundSecondary}E6`
                : `${colors.backgroundSecondary}E6`,
              isDarkMode
                ? `${colors.backgroundTertiary}E6`
                : `${colors.backgroundTertiary}E6`
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          >
            <View style={[styles.header, { borderBottomColor: `${colors.primary}30` }]}>
              <Text style={[styles.headerTitle, { color: colors.primary }]}>
                <MaterialIcons name="forum" size={24} color={colors.primary} style={styles.headerIcon} />
                Anonymous Rooms
              </Text>
              <View style={styles.headerButtons}>

                <TouchableOpacity
                  onPress={() => setShowCreateRoom(true)}
                  style={[styles.createButton, {
                    backgroundColor: `${colors.primary}20`,
                    borderColor: `${colors.primary}50`,
                    shadowOpacity: 0
                  }]}
                  activeOpacity={0.7}
                >
                  <Feather name="plus" size={22} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>
        </View>

        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator
              size="large"
              color={colors.primary}
              style={styles.loader}
            />
            <Text style={[styles.loaderText, { color: colors.primary }]}>Loading rooms...</Text>
          </View>
        ) : (
          <FlatList
            data={rooms}
            renderItem={renderRoom}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
                colors={[colors.primary]}
                progressBackgroundColor={colors.backgroundSecondary}
                title="Pull to refresh"
                titleColor={colors.primary}
              />
            }
          />
        )}
      </Animated.View>

      {showCreateRoom && (
        <BlurView intensity={15} style={styles.modalOverlay}>
          <Animated.View
            style={[styles.modalContent, {
              transform: [{ scale: new Animated.Value(0.95) }],
              opacity: new Animated.Value(1),
              backgroundColor: colors.modalBackground,
              borderColor: `${colors.primary}50`
            }]}
          >
            <Text style={[styles.modalTitle, { color: colors.primary }]}>Create New Room</Text>
            <View style={[styles.inputContainer, {
              backgroundColor: `${colors.primary}10`,
              borderColor: `${colors.primary}30`
            }]}>
              <Feather name="edit-3" size={20} color={colors.primary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.primary }]}
                placeholder="Room Name"
                placeholderTextColor={`${colors.primary}70`}
                value={roomName}
                onChangeText={setRoomName}
                maxLength={500}
              />
            </View>
            <View style={[styles.inputContainer, {
              backgroundColor: `${colors.primary}10`,
              borderColor: `${colors.primary}30`
            }]}>
              <Feather name="message-circle" size={20} color={colors.primary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.primary }]}
                placeholder="Topic"
                placeholderTextColor={`${colors.primary}70`}
                value={topic}
                onChangeText={setTopic}
                maxLength={500}
                multiline
              />
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => setShowCreateRoom(false)}
                style={[styles.cancelButton, {
                  backgroundColor: `${colors.primary}10`,
                  borderColor: `${colors.primary}50`
                }]}
                activeOpacity={0.7}
              >
                <Text style={[styles.cancelButtonText, { color: colors.primary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCreateRoom}
                style={[styles.createModalButton, {
                  backgroundColor: colors.primary,
                  borderColor: `${colors.primary}70`,
                  shadowOpacity: 0
                }]}
                activeOpacity={0.7}
              >
                <Text style={[styles.createModalButtonText, { color: isDarkMode ? "#2d2d2d" : "#2d2d2d" }]}>Create</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </BlurView>
      )}
    </ThemedGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    marginBottom: 15,
  },
  headerGradient: {
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
    overflow: 'hidden',
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: "Rubik-Bold",
  },
  headerIcon: {
    marginRight: 8,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  refreshButton: {
    padding: 10,
    borderRadius: 50,
    borderWidth: 1.5,
    marginRight: 10,
  },
  createButton: {
    padding: 10,
    borderRadius: 50,
    borderWidth: 1.5,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  roomItem: {
    borderRadius: 16,
    marginBottom: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  roomHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  roomName: {
    fontSize: 18,
    fontFamily: "Rubik-Bold",
    flex: 1,
  },
  deleteButton: {
    padding: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  roomDescription: {
    fontSize: 14,
    fontFamily: "Rubik-Regular",
    marginBottom: 12,
    lineHeight: 20,
  },
  participantsContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  participantsCount: {
    fontSize: 14,
    fontFamily: "Rubik-Medium",
    marginLeft: 8,
  },
  joinButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: "flex-start",
    borderWidth: 1.5,
  },
  joinButtonText: {
    fontSize: 14,
    fontFamily: "Rubik-Medium",
    textAlign: "center",
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loader: {
    marginBottom: 15,
  },
  loaderText: {
    fontSize: 16,
    fontFamily: "Rubik-Medium",
    opacity: 0.8,
  },
  modalOverlay: {
    position: "absolute",
    inset: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    padding: 20,
    borderRadius: 20,
    width: "85%",
    borderWidth: 1.5,
  },
  modalTitle: {
    fontSize: 22,
    fontFamily: "Rubik-Bold",
    marginBottom: 20,
    textAlign: "center",
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  inputIcon: {
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    paddingRight: 12,
    fontSize: 15,
    fontFamily: "Rubik-Medium",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1.5,
    flex: 1,
    marginRight: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontFamily: "Rubik-Medium",
  },
  createModalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1.5,
    flex: 1,
    marginLeft: 8,
    alignItems: 'center',
  },
  createModalButtonText: {
    fontSize: 15,
    fontFamily: "Rubik-Medium",
  },
});
