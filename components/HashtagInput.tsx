import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/src/context/ThemeContext';

interface HashtagInputProps {
  hashtags: string[];
  onHashtagsChange: (hashtags: string[]) => void;
  placeholder?: string;
  maxHashtags?: number;
}

// Popular hashtags for suggestions
const POPULAR_HASHTAGS = [
  'klicktape', 'viral', 'trending', 'fyp', 'explore', 'love', 'instagood', 
  'photooftheday', 'beautiful', 'happy', 'cute', 'picoftheday', 'follow',
  'me', 'selfie', 'summer', 'art', 'instadaily', 'friends', 'nature',
  'fun', 'style', 'smile', 'food', 'instalike', 'family', 'travel',
  'fitness', 'music', 'photography', 'motivation', 'lifestyle', 'fashion',
  'sunset', 'beach', 'weekend', 'goodvibes', 'blessed', 'grateful'
];

const HashtagInput: React.FC<HashtagInputProps> = ({
  hashtags,
  onHashtagsChange,
  placeholder = "Add hashtags...",
  maxHashtags = 30,
}) => {
  const { colors, isDarkMode } = useTheme();
  const [inputText, setInputText] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (inputText.startsWith('#') && inputText.length > 1) {
      const searchTerm = inputText.slice(1).toLowerCase();
      const filteredSuggestions = POPULAR_HASHTAGS
        .filter(tag => 
          tag.toLowerCase().includes(searchTerm) && 
          !hashtags.includes(tag)
        )
        .slice(0, 10);
      setSuggestions(filteredSuggestions);
      setShowSuggestions(filteredSuggestions.length > 0);
    } else {
      setShowSuggestions(false);
      setSuggestions([]);
    }
  }, [inputText, hashtags]);

  const addHashtag = (tag: string) => {
    const cleanTag = tag.replace('#', '').trim().toLowerCase();
    if (cleanTag && !hashtags.includes(cleanTag) && hashtags.length < maxHashtags) {
      onHashtagsChange([...hashtags, cleanTag]);
    }
    setInputText('');
    setShowSuggestions(false);
  };

  const removeHashtag = (index: number) => {
    const newHashtags = hashtags.filter((_, i) => i !== index);
    onHashtagsChange(newHashtags);
  };

  const handleInputChange = (text: string) => {
    setInputText(text);
    
    // Auto-add hashtag when space or comma is pressed
    if (text.endsWith(' ') || text.endsWith(',')) {
      const tag = text.slice(0, -1).trim();
      if (tag) {
        addHashtag(tag);
      }
    }
  };

  const handleSuggestionPress = (suggestion: string) => {
    addHashtag(suggestion);
    inputRef.current?.focus();
  };

  const renderHashtag = ({ item, index }: { item: string; index: number }) => (
    <View style={[styles.hashtagChip, { backgroundColor: isDarkMode ? 'rgba(128, 128, 128, 0.2)' : 'rgba(128, 128, 128, 0.2)' }]}>
      <Text style={[styles.hashtagText, { color: colors.text, fontFamily: 'Rubik-Medium' }]}>#{item}</Text>
      <TouchableOpacity
        onPress={() => removeHashtag(index)}
        style={styles.removeButton}
        hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
      >
        <Feather name="x" size={14} color={colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );

  const renderSuggestion = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={[styles.suggestionItem, { backgroundColor: colors.backgroundSecondary }]}
      onPress={() => handleSuggestionPress(item)}
    >
      <Feather name="hash" size={16} color={isDarkMode ? '#808080' : '#606060'} />
      <Text style={[styles.suggestionText, { color: colors.text, fontFamily: 'Rubik-Regular' }]}>{item}</Text>
      <Feather name="plus" size={16} color={colors.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Hashtags Display */}
      {hashtags.length > 0 && (
        <View style={styles.hashtagsContainer}>
          <FlatList
            data={hashtags}
            renderItem={renderHashtag}
            keyExtractor={(item, index) => `${item}-${index}`}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.hashtagsList}
          />
        </View>
      )}

      {/* Input Container */}
      <View style={[styles.inputContainer, { 
        backgroundColor: isDarkMode ? 'rgba(128, 128, 128, 0.1)' : 'rgba(128, 128, 128, 0.1)',
        borderColor: isDarkMode ? 'rgba(128, 128, 128, 0.3)' : 'rgba(128, 128, 128, 0.3)'
      }]}>
        <Feather name="hash" size={20} color={isDarkMode ? '#808080' : '#606060'} />
        <TextInput
          ref={inputRef}
          style={[styles.textInput, { color: colors.text, fontFamily: 'Rubik-Regular' }]}
          placeholder={hashtags.length >= maxHashtags ? `Max ${maxHashtags} hashtags` : placeholder}
          placeholderTextColor={colors.textTertiary}
          value={inputText}
          onChangeText={handleInputChange}
          onSubmitEditing={() => {
            if (inputText.trim()) {
              addHashtag(inputText);
            }
          }}
          editable={hashtags.length < maxHashtags}
          multiline={false}
          returnKeyType="done"
        />
        {inputText.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              if (inputText.trim()) {
                addHashtag(inputText);
              }
            }}
            style={styles.addButton}
          >
            <Feather name="plus" size={20} color={isDarkMode ? '#808080' : '#606060'} />
          </TouchableOpacity>
        )}
      </View>

      {/* Hashtag Counter */}
      <View style={styles.counterContainer}>
        <Text style={[styles.counterText, { color: colors.textSecondary, fontFamily: 'Rubik-Regular' }]}>
          {hashtags.length}/{maxHashtags} hashtags
        </Text>
        {hashtags.length > 0 && (
          <TouchableOpacity
            onPress={() => onHashtagsChange([])}
            style={styles.clearAllButton}
          >
            <Text style={[styles.clearAllText, { color: colors.error, fontFamily: 'Rubik-Medium' }]}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Suggestions */}
      {showSuggestions && (
        <View style={[styles.suggestionsContainer, { 
          backgroundColor: colors.backgroundSecondary,
          borderColor: colors.divider 
        }]}>
          <Text style={[styles.suggestionsTitle, { color: colors.textSecondary, fontFamily: 'Rubik-Medium' }]}>
            Suggested hashtags:
          </Text>
          <FlatList
            data={suggestions}
            renderItem={renderSuggestion}
            keyExtractor={(item) => item}
            style={styles.suggestionsList}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}

      {/* Popular Hashtags */}
      {!showSuggestions && hashtags.length < maxHashtags && (
        <View style={styles.popularContainer}>
          <Text style={[styles.popularTitle, { color: colors.textSecondary, fontFamily: 'Rubik-Medium' }]}>
            Popular hashtags:
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.popularList}
          >
            {POPULAR_HASHTAGS.slice(0, 10).filter(tag => !hashtags.includes(tag)).map((tag) => (
              <TouchableOpacity
                key={tag}
                style={[styles.popularChip, { 
                  backgroundColor: isDarkMode ? 'rgba(128, 128, 128, 0.1)' : 'rgba(128, 128, 128, 0.1)',
                  borderColor: isDarkMode ? 'rgba(128, 128, 128, 0.3)' : 'rgba(128, 128, 128, 0.3)'
                }]}
                onPress={() => handleSuggestionPress(tag)}
              >
                <Text style={[styles.popularChipText, { color: colors.textSecondary, fontFamily: 'Rubik-Regular' }]}>
                  #{tag}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  hashtagsContainer: {
    marginBottom: 12,
  },
  hashtagsList: {
    paddingHorizontal: 4,
  },
  hashtagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  hashtagText: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Rubik-Medium',
  },
  removeButton: {
    marginLeft: 6,
    padding: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  textInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    minHeight: 20,
    fontFamily: 'Rubik-Regular',
  },
  addButton: {
    padding: 4,
  },
  counterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  counterText: {
    fontSize: 12,
    fontFamily: 'Rubik-Regular',
  },
  clearAllButton: {
    padding: 4,
  },
  clearAllText: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Rubik-Medium',
  },
  suggestionsContainer: {
    marginTop: 12,
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    maxHeight: 200,
  },
  suggestionsTitle: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
    fontFamily: 'Rubik-Medium',
  },
  suggestionsList: {
    maxHeight: 150,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  suggestionText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    fontFamily: 'Rubik-Regular',
  },
  popularContainer: {
    marginTop: 12,
  },
  popularTitle: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
    fontFamily: 'Rubik-Medium',
  },
  popularList: {
    paddingHorizontal: 4,
  },
  popularChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 8,
    borderWidth: 1,
  },
  popularChipText: {
    fontSize: 12,
    fontFamily: 'Rubik-Regular',
  },
});

export default HashtagInput;
