import React from 'react';
import { TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '@/src/context/ThemeContext';

interface ScrollToBottomButtonProps {
  visible: boolean;
  onPress: () => void;
  bottom?: number;
  right?: number;
  size?: number;
  iconSize?: number;
}

const ScrollToBottomButton: React.FC<ScrollToBottomButtonProps> = ({
  visible,
  onPress,
  bottom = 80,
  right = 20,
  size = 40,
  iconSize = 20,
}) => {
  const { colors } = useTheme();
  const [fadeAnim] = React.useState(new Animated.Value(0));

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: visible ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [visible, fadeAnim]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          bottom,
          right,
          opacity: fadeAnim,
          transform: [
            {
              scale: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.8, 1],
              }),
            },
          ],
        },
      ]}
    >
      <TouchableOpacity
        style={[
          styles.button,
          {
            backgroundColor: colors.text,
            shadowColor: colors.text,
            width: size,
            height: size,
            borderRadius: size / 2,
          },
        ]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <AntDesign name="down" size={iconSize} color={colors.background} />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 1000,
  },
  button: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});

export default ScrollToBottomButton;
