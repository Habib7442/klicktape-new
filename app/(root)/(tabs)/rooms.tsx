import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { roomsAPI } from "@/lib/roomsApi";

export default function RoomsScreen() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [topic, setTopic] = useState("");
  const [userId, setUserId] = useState(null);

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
    }
  }, [userId]);

  const loadRooms = async () => {
    try {
      const roomsData = await roomsAPI.getRooms();
      setRooms(roomsData || []);
    } catch (error) {
      console.error("Error loading rooms:", error);
      setRooms([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoom = async () => {
    const trimmedName = roomName.trim();
    const trimmedDescription = topic.trim();

    if (!trimmedName || !trimmedDescription) return;
    if (trimmedName.length > 500 || trimmedDescription.length > 500) {
      alert("Room name and description must be less than 500 characters");
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

  const RoomItem = ({ item, userId, onRoomUpdate }) => {
    const [isJoined, setIsJoined] = useState(false);
    const [joining, setJoining] = useState(false);

    useEffect(() => {
      checkJoinStatus();
    }, []);

    const checkJoinStatus = async () => {
      try {
        const isJoined = await roomsAPI.checkJoinStatus(item.id, userId);
        setIsJoined(isJoined);
      } catch (error) {
        console.error("Error checking join status:", error);
      }
    };

    const handleJoinRoom = async () => {
      if (joining) return;
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

    return (
      <View>
        <TouchableOpacity
          onPress={() => router.push(`/rooms/${item.id}`)}
          activeOpacity={0.9}
        >
          <View style={styles.roomItem}>
            <Text style={styles.roomName}>{item.name}</Text>
            <Text style={styles.roomDescription}>{item.description}</Text>
            <View style={styles.participantsContainer}>
              <Feather name="users" size={16} color="#FFE55C" />
              <Text style={styles.participantsCount}>
                {item.participants_count || 0} participants
              </Text>
            </View>
            {!isJoined && (
              <TouchableOpacity
                onPress={handleJoinRoom}
                style={styles.joinButton}
                disabled={joining}
              >
                <Text style={styles.joinButtonText}>
                  {joining ? "Joining..." : "Join to Chat"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const renderRoom = ({ item }) => (
    <RoomItem item={item} userId={userId} onRoomUpdate={loadRooms} />
  );

  return (
    <LinearGradient
    colors={["#000000", "#1a1a1a", "#2a2a2a"]}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Anonymous Rooms</Text>
          <TouchableOpacity
            onPress={() => setShowCreateRoom(true)}
            style={styles.createButton}
          >
            <Feather name="plus" size={22} color="#FFE55C" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#FFE55C" style={styles.loader} />
        ) : (
          <FlatList
            data={rooms}
            renderItem={renderRoom}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
          />
        )}
      </View>

      {showCreateRoom && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create New Room</Text>
            <TextInput
              style={styles.input}
              placeholder="Room Name"
              placeholderTextColor="rgba(255, 229, 92, 0.7)"
              value={roomName}
              onChangeText={setRoomName}
            />
            <TextInput
              style={styles.input}
              placeholder="Topic"
              placeholderTextColor="rgba(255, 229, 92, 0.7)"
              value={topic}
              onChangeText={setTopic}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => setShowCreateRoom(false)}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCreateRoom}
                style={styles.createModalButton}
              >
                <Text style={styles.createModalButtonText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 25,
    borderBottomWidth: 2,
    borderBottomColor: "rgba(255, 229, 92, 0.5)",
    paddingBottom: 15,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: "Rubik-Bold",
    color: "#FFE55C",
  },
  createButton: {
    backgroundColor: "rgba(255, 229, 92, 0.3)",
    padding: 12,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: "rgba(255, 229, 92, 0.7)",
  },
  listContainer: {
    paddingBottom: 25,
  },
  roomItem: {
    borderRadius: 20,
    marginBottom: 20,
    padding: 25,
    backgroundColor: "rgba(60, 75, 75, 0.8)",
    borderWidth: 1,
    borderColor: "rgba(255, 229, 92, 0.2)",
  },
  roomName: {
    fontSize: 22,
    fontFamily: "Rubik-Bold",
    color: "#FFE55C",
    marginBottom: 10,
  },
  roomDescription: {
    fontSize: 16,
    fontFamily: "Rubik-Regular",
    color: "#E0E0E0",
    marginBottom: 15,
    lineHeight: 22,
  },
  participantsContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  participantsCount: {
    fontSize: 16,
    fontFamily: "Rubik-Medium",
    color: "#FFE55C",
    marginLeft: 10,
  },
  joinButton: {
    backgroundColor: "rgba(255, 229, 92, 0.9)",
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 30,
    alignSelf: "flex-start",
    borderWidth: 2,
    borderColor: "rgba(255, 229, 92, 0.7)",
  },
  joinButtonText: {
    fontSize: 16,
    fontFamily: "Rubik-Medium",
    color: "#2d2d2d",
    textAlign: "center",
  },
  loader: {
    marginTop: 30,
  },
  modalOverlay: {
    position: "absolute",
    inset: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "rgba(70, 85, 85, 0.95)",
    padding: 25,
    borderRadius: 25,
    width: "85%",
    borderWidth: 2,
    borderColor: "rgba(255, 229, 92, 0.5)",
  },
  modalTitle: {
    fontSize: 24,
    fontFamily: "Rubik-Bold",
    color: "#FFE55C",
    marginBottom: 25,
    textAlign: "center",
  },
  input: {
    backgroundColor: "rgba(255, 229, 92, 0.15)",
    borderRadius: 15,
    padding: 15,
    fontSize: 16,
    fontFamily: "Rubik-Medium",
    color: "#FFE55C",
    marginBottom: 20,
    borderWidth: 2,
    borderColor: "rgba(255, 229, 92, 0.3)",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 20,
    marginTop: 15,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: "rgba(255, 229, 92, 0.5)",
    backgroundColor: "rgba(255, 229, 92, 0.15)",
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: "Rubik-Medium",
    color: "#FFE55C",
  },
  createModalButton: {
    backgroundColor: "#FFE55C",
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: "rgba(255, 229, 92, 0.7)",
  },
  createModalButtonText: {
    fontSize: 16,
    fontFamily: "Rubik-Medium",
    color: "#2d2d2d",
  },
});