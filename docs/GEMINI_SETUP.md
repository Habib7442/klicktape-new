# Gemini AI Service Setup Guide

This guide will help you set up the Gemini AI service for caption generation and hashtag suggestions in your KlickTape app.

## 1. Get Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Sign in with your Google account
3. Click "Get API Key" 
4. Create a new API key or use an existing one
5. Copy the API key

## 2. Environment Setup

Add your Gemini API key to your environment variables:

### For Development (.env file)
Create or update your `.env` file in the project root:

```env
EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here
```

### For Production
Set the environment variable in your deployment platform:
- **Vercel**: Add in Project Settings > Environment Variables
- **Netlify**: Add in Site Settings > Environment Variables  
- **EAS Build**: Add to `eas.json` or use `eas secret:create`

## 3. Usage Examples

### Basic Caption Generation from Image

```typescript
import { generateCaptionFromImage } from './lib/geminiService';

const handleGenerateCaption = async (imageUri: string) => {
    try {
        // Convert image to base64 (implement based on your image handling)
        const base64Image = await convertImageToBase64(imageUri);
        
        const result = await generateCaptionFromImage(
            base64Image, 
            'image/jpeg',
            'This is a photo from my vacation' // Optional user context
        );
        
        console.log('Caption:', result.caption);
        console.log('Hashtags:', result.hashtags);
        console.log('Genre:', result.genre);
    } catch (error) {
        console.error('Error:', error);
    }
};
```

### Generate Hashtags from Text

```typescript
import { generateHashtagsFromText } from './lib/geminiService';

const handleGenerateHashtags = async () => {
    try {
        const result = await generateHashtagsFromText(
            'Beautiful sunset at the beach with friends',
            'Lifestyle', // Optional genre
            10 // Number of hashtags
        );
        
        console.log('All hashtags:', result.hashtags);
        console.log('Trending:', result.trending);
        console.log('Relevant:', result.relevant);
    } catch (error) {
        console.error('Error:', error);
    }
};
```

### Improve Existing Caption

```typescript
import { improveCaptionWithAI } from './lib/geminiService';

const handleImproveCaption = async () => {
    try {
        const improved = await improveCaptionWithAI(
            'Had a great day today',
            'trendy' // Style: casual, professional, funny, inspirational, trendy
        );
        
        console.log('Improved caption:', improved);
    } catch (error) {
        console.error('Error:', error);
    }
};
```

## 4. Integration with CreatePost Component

Here's how to integrate the Gemini service into your CreatePost component:

```typescript
// Add to your CreatePost component imports
import { 
    generateCaptionFromImage, 
    generateHashtagsFromText, 
    improveCaptionWithAI 
} from '@/lib/geminiService';

// Add state for AI features
const [isGeneratingAI, setIsGeneratingAI] = useState(false);

// AI Caption Generation Button Handler
const handleAIGeneration = async () => {
    if (!media.length) {
        Alert.alert('No Image', 'Please select an image first');
        return;
    }

    try {
        setIsGeneratingAI(true);
        
        // Convert your image to base64 (implement based on your image handling)
        const base64Image = await convertImageToBase64(media[0].uri);
        
        const result = await generateCaptionFromImage(
            base64Image,
            'image/jpeg',
            caption // Use existing caption as context if available
        );
        
        // Update your state
        setCaption(result.caption);
        setHashtags([...hashtags, ...result.hashtags]);
        
        // Set genre if not already selected
        if (result.genre && !selectedGenre) {
            const genreMatch = GENRES.find(g => 
                g.name.toLowerCase() === result.genre?.toLowerCase()
            );
            if (genreMatch) setSelectedGenre(genreMatch);
        }
        
        Alert.alert('Success', 'AI suggestions generated!');
    } catch (error) {
        Alert.alert('AI Generation Failed', error.message);
    } finally {
        setIsGeneratingAI(false);
    }
};

// AI Hashtag Generation Button Handler
const handleHashtagGeneration = async () => {
    if (!caption.trim()) {
        Alert.alert('No Caption', 'Please write a caption first');
        return;
    }

    try {
        setIsGeneratingAI(true);
        
        const result = await generateHashtagsFromText(
            caption,
            selectedGenre?.name,
            15
        );
        
        // Merge with existing hashtags, avoiding duplicates
        const newHashtags = [...new Set([...hashtags, ...result.hashtags])];
        setHashtags(newHashtags.slice(0, 30)); // Limit to 30 total
        
        Alert.alert('Success', `Generated ${result.hashtags.length} new hashtags!`);
    } catch (error) {
        Alert.alert('Hashtag Generation Failed', error.message);
    } finally {
        setIsGeneratingAI(false);
    }
};

// Add AI buttons to your UI
<View style={styles.aiSection}>
    <TouchableOpacity
        style={[styles.aiButton, { backgroundColor: isDarkMode ? '#808080' : '#606060' }]}
        onPress={handleAIGeneration}
        disabled={isGeneratingAI || !media.length}
    >
        <Feather name="zap" size={20} color="#FFFFFF" />
        <Text style={[styles.aiButtonText, { color: '#FFFFFF' }]}>
            {isGeneratingAI ? 'Generating...' : 'AI Caption'}
        </Text>
    </TouchableOpacity>
    
    <TouchableOpacity
        style={[styles.aiButton, { backgroundColor: isDarkMode ? '#808080' : '#606060' }]}
        onPress={handleHashtagGeneration}
        disabled={isGeneratingAI || !caption.trim()}
    >
        <Feather name="hash" size={20} color="#FFFFFF" />
        <Text style={[styles.aiButtonText, { color: '#FFFFFF' }]}>
            {isGeneratingAI ? 'Generating...' : 'AI Hashtags'}
        </Text>
    </TouchableOpacity>
</View>
```

## 5. Required Dependencies

Make sure you have installed the required package:

```bash
npm install @google/genai
```

## 6. Image to Base64 Conversion

You'll need to implement image to base64 conversion. Here are examples for different scenarios:

### With Expo FileSystem

```typescript
import * as FileSystem from 'expo-file-system';

async function convertImageToBase64(imageUri: string): Promise<string> {
    try {
        const base64 = await FileSystem.readAsStringAsync(imageUri, { 
            encoding: 'base64' 
        });
        return base64;
    } catch (error) {
        throw new Error('Failed to convert image to base64');
    }
}
```

### With React Native FS

```typescript
import RNFS from 'react-native-fs';

async function convertImageToBase64(imageUri: string): Promise<string> {
    try {
        const base64 = await RNFS.readFile(imageUri, 'base64');
        return base64;
    } catch (error) {
        throw new Error('Failed to convert image to base64');
    }
}
```

## 7. Error Handling

The service includes comprehensive error handling. Common issues:

- **API Key Missing**: Ensure `EXPO_PUBLIC_GEMINI_API_KEY` is set
- **Invalid Image Format**: Ensure image is in supported format (JPEG, PNG, WebP)
- **Rate Limiting**: Implement retry logic for production use
- **Network Issues**: Handle offline scenarios gracefully

## 8. Best Practices

1. **Cache Results**: Cache AI-generated content to avoid repeated API calls
2. **User Feedback**: Allow users to edit AI-generated content
3. **Fallback Options**: Provide manual input options if AI fails
4. **Rate Limiting**: Implement client-side rate limiting for API calls
5. **Loading States**: Show clear loading indicators during AI generation
6. **Error Recovery**: Provide clear error messages and retry options

## 9. Styling for AI Buttons

Add these styles to your CreatePost component:

```typescript
const styles = StyleSheet.create({
    // ... existing styles
    aiSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
        gap: 10,
    },
    aiButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        gap: 8,
    },
    aiButtonText: {
        fontSize: 14,
        fontWeight: '500',
        fontFamily: 'Rubik-Medium',
    },
});
```

This setup will give you a powerful AI-driven caption and hashtag generation system that integrates seamlessly with your existing CreatePost workflow!
