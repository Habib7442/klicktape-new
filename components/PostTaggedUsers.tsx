import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/src/context/ThemeContext';

interface User {
  id: string;
  username: string;
  avatar_url: string;
}

interface PostTaggedUsersProps {
  taggedUsers: User[];
  style?: any;
}

const PostTaggedUsers: React.FC<PostTaggedUsersProps> = ({
  taggedUsers,
  style,
}) => {
  const { colors } = useTheme();

  const handleUserPress = (userId: string) => {
    router.push({
      pathname: "/userProfile/[id]",
      params: { id: userId },
    });
  };

  if (!taggedUsers || taggedUsers.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.taggedText, { color: colors.textSecondary }]}>
        Tagged: {' '}
      </Text>
      {taggedUsers.map((user, index) => (
        <React.Fragment key={user.id}>
          <TouchableOpacity onPress={() => handleUserPress(user.id)}>
            <Text style={[styles.taggedUsername, { color: colors.primary }]}>
              @{user.username}
            </Text>
          </TouchableOpacity>
          {index < taggedUsers.length - 1 && (
            <Text style={[styles.separator, { color: colors.textSecondary }]}>, </Text>
          )}
        </React.Fragment>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: 4,
  },
  taggedText: {
    fontSize: 13,
    fontFamily: 'Rubik-Regular',
  },
  taggedUsername: {
    fontSize: 13,
    fontFamily: 'Rubik-Medium',
  },
  separator: {
    fontSize: 13,
    fontFamily: 'Rubik-Regular',
  },
});

export default PostTaggedUsers;
