import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface MessageStatusProps {
  status: 'sent' | 'delivered' | 'read';
  color?: string;
}

const MessageStatus: React.FC<MessageStatusProps> = ({
  status,
  color = "rgba(255, 255, 255, 0.7)",
}) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'sent':
        return (
          <Ionicons 
            name="checkmark" 
            size={14} 
            color={color} 
          />
        );
      case 'delivered':
        return (
          <View style={styles.doubleCheck}>
            <Ionicons 
              name="checkmark" 
              size={14} 
              color={color} 
              style={styles.firstCheck}
            />
            <Ionicons 
              name="checkmark" 
              size={14} 
              color={color} 
              style={styles.secondCheck}
            />
          </View>
        );
      case 'read':
        return (
          <View style={styles.doubleCheck}>
            <Ionicons 
              name="checkmark" 
              size={14} 
              color="#4FC3F7" // Blue color for read status
              style={styles.firstCheck}
            />
            <Ionicons 
              name="checkmark" 
              size={14} 
              color="#4FC3F7" // Blue color for read status
              style={styles.secondCheck}
            />
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {getStatusIcon()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginLeft: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doubleCheck: {
    flexDirection: 'row',
    position: 'relative',
    width: 18,
    height: 14,
  },
  firstCheck: {
    position: 'absolute',
    left: 0,
  },
  secondCheck: {
    position: 'absolute',
    left: 6,
  },
});

export default MessageStatus;
