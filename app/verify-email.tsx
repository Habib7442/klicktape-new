import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { router } from "expo-router";

const VerifyEmail = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Please check your email for verification.</Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => router.replace("/sign-in")}
      >
        <Text style={styles.buttonText}>I've verified my email</Text>
      </TouchableOpacity>
    </View>
  );
};

export default VerifyEmail;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
    padding: 20,
  },
  text: {
    color: "#ffffff",
    fontSize: 16,
    marginBottom: 20,
    textAlign: "center",
  },
  button: {
    backgroundColor: "rgba(255, 215, 0, 0.2)",
    padding: 15,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
  },
});
