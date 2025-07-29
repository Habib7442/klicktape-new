import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/src/context/ThemeContext';

interface Reaction {
  id: string;
  emoji: string;
  user_id: string;
  created_at: string;
}

interface ReactionBadgeProps {
  reactions: Reaction[];
  currentUserId: string;
  onReactionPress: (emoji: string) => void;
}

const ReactionBadge: React.FC<ReactionBadgeProps> = ({
  reactions,
  currentUserId,
  onReactionPress,
}) => {
  const { colors, isDarkMode } = useTheme();

  if (!reactions || reactions.length === 0) return null;

  // Group reactions by emoji
  const groupedReactions = reactions.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = [];
    }
    acc[reaction.emoji].push(reaction);
    return acc;
  }, {} as Record<string, Reaction[]>);

  return (
    <View style={styles.container}>
      {Object.entries(groupedReactions).map(([emoji, emojiReactions]) => {
        const count = emojiReactions.length;
        const hasUserReacted = emojiReactions.some(r => r.user_id === currentUserId);
        
        return (
          <TouchableOpacity
            key={emoji}
            style={[
              styles.badge,
              {
                backgroundColor: hasUserReacted 
                  ? colors.primary + '20'
                  : isDarkMode 
                    ? 'rgba(255, 255, 255, 0.1)' 
                    : 'rgba(0, 0, 0, 0.05)',
                borderColor: hasUserReacted 
                  ? colors.primary 
                  : isDarkMode 
                    ? 'rgba(255, 255, 255, 0.2)' 
                    : 'rgba(0, 0, 0, 0.1)',
              },
            ]}
            onPress={() => onReactionPress(emoji)}
            activeOpacity={0.7}
          >
            <Text style={styles.emoji}>{emoji}</Text>
            {count > 1 && (
              <Text 
                style={[
                  styles.count, 
                  { 
                    color: hasUserReacted 
                      ? colors.primary 
                      : colors.textSecondary 
                  }
                ]}
              >
                {count}
              </Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
    marginBottom: 2,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 4,
    marginBottom: 2,
    minWidth: 32,
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 14,
  },
  count: {
    fontSize: 12,
    fontFamily: 'Rubik-Medium',
    marginLeft: 2,
  },
});

export default ReactionBadge;
