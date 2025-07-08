import { View, Text, Image, StyleSheet, Animated } from "react-native";
import { useEffect, useRef, useState } from "react";
import { Redirect } from "expo-router";


export default function Welcome() {
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 2,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      setShouldRedirect(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  if (shouldRedirect) {
    return <Redirect href="/home" />;
  }

  return (
    <View style={[styles.container, { backgroundColor: '#000000' }]}>
      <Animated.View
        style={[
          styles.imageContainer,
          { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
        ]}
      >
        <Image
          source={require("../../assets/images/adaptive-icon.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>

      <Animated.Text
        className="font-rubik-bold"
        style={[styles.title, { opacity: fadeAnim }]}
      >
        Welcome to Klicktape
      </Animated.Text>
      <Text className="font-rubik-medium" style={styles.subtitle}>
        The ultimate social experience
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  imageContainer: {
    marginBottom: 30,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 2,
    borderColor: "rgba(255, 215, 0, 0.3)",
    borderRadius: 125,
  },
  logo: {
    width: 250,
    height: 250,
  },
  title: {
    fontSize: 28,
    color: "#ffffff",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.7)",
  },
});
