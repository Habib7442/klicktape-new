import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import React from "react";
import Modal from "react-native-modal";

interface DeleteModalProps {
  isVisible: boolean;
  title: string;
  desc: string;
  cancel: () => void;
  confirm: () => void;
}

const DeleteModal: React.FC<DeleteModalProps> = ({
  isVisible,
  title,
  desc,
  cancel,
  confirm,
}) => {
  return (
    <View>
      <Modal
        isVisible={isVisible}
        style={styles.warningModal}
        backdropOpacity={0.5}
        animationIn="zoomIn"
        animationOut="zoomOut"
      >
        <View style={styles.warningModalContent}>
          <Text className="font-rubik-bold" style={styles.warningTitle}>
            {title}
          </Text>
          <Text className="font-rubik-medium" style={styles.warningText}>
            {`Are you sure you want to delete this ${desc}? This action cannot be undone.`}
          </Text>
          <View style={styles.warningButtonContainer}>
            <TouchableOpacity
              style={[styles.warningButton, styles.cancelButton]}
              onPress={cancel}
            >
              <Text
                className="font-rubik-medium"
                style={styles.warningButtonText}
              >
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.warningButton, styles.deleteButtonModal]}
              onPress={confirm}
            >
              <Text
                className="font-rubik-medium"
                style={styles.warningButtonText}
              >
                Delete
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default DeleteModal;

const styles = StyleSheet.create({
  warningModal: {
    margin: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  warningModalContent: {
    backgroundColor: "#1a1a1a",
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
    minWidth: 300,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.3)",
  },
  warningTitle: {
    fontSize: 20,
    color: "#FFD700",
    marginBottom: 10,
  },
  warningText: {
    fontSize: 16,
    color: "#ffffff",
    textAlign: "center",
    marginBottom: 20,
  },
  warningButtonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  warningButton: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  deleteButtonModal: {
    backgroundColor: "#ff6b6b",
    borderWidth: 1,
    borderColor: "rgba(255, 0, 0, 0.5)",
  },
  warningButtonText: {
    fontSize: 16,
    color: "#ffffff",
  },
});
