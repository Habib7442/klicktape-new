/**
 * Example usage of the Gemini Service for AI-powered caption and hashtag generation
 * This file demonstrates how to integrate the Gemini service into your React Native app
 */

import { 
    generateCaptionFromImage, 
    generateHashtagsFromText, 
    improveCaptionWithAI, 
    generateCaptionFromText,
    type CaptionGenerationResult,
    type HashtagGenerationResult
} from './geminiService';

// Example 1: Generate caption and hashtags from an image
export async function handleImageCaptionGeneration(imageUri: string, userPrompt?: string) {
    try {
        // Convert image to base64 (you'll need to implement this based on your image handling)
        const base64Image = await convertImageToBase64(imageUri);
        const mimeType = 'image/jpeg'; // or determine from image
        
        const result: CaptionGenerationResult = await generateCaptionFromImage(
            base64Image, 
            mimeType, 
            userPrompt
        );
        
        console.log('Generated Caption:', result.caption);
        console.log('Generated Hashtags:', result.hashtags);
        console.log('Suggested Genre:', result.genre);
        
        return result;
    } catch (error) {
        console.error('Error generating caption from image:', error);
        throw error;
    }
}

// Example 2: Generate hashtags from existing text content
export async function handleHashtagGeneration(content: string, genre?: string) {
    try {
        const result: HashtagGenerationResult = await generateHashtagsFromText(
            content, 
            genre, 
            15 // Generate 15 hashtags
        );
        
        console.log('All Hashtags:', result.hashtags);
        console.log('Trending Hashtags:', result.trending);
        console.log('Relevant Hashtags:', result.relevant);
        
        return result;
    } catch (error) {
        console.error('Error generating hashtags:', error);
        throw error;
    }
}

// Example 3: Improve an existing caption
export async function handleCaptionImprovement(originalCaption: string, style: 'casual' | 'professional' | 'funny' | 'inspirational' | 'trendy' = 'casual') {
    try {
        const improvedCaption = await improveCaptionWithAI(originalCaption, style);
        
        console.log('Original Caption:', originalCaption);
        console.log('Improved Caption:', improvedCaption);
        
        return improvedCaption;
    } catch (error) {
        console.error('Error improving caption:', error);
        throw error;
    }
}

// Example 4: Generate caption from text description
export async function handleTextToCaptionGeneration(description: string, style: 'casual' | 'professional' | 'funny' | 'inspirational' | 'trendy' = 'casual') {
    try {
        const result: CaptionGenerationResult = await generateCaptionFromText(
            description, 
            style, 
            true // Include hashtags
        );
        
        console.log('Generated Caption:', result.caption);
        console.log('Generated Hashtags:', result.hashtags);
        console.log('Suggested Genre:', result.genre);
        
        return result;
    } catch (error) {
        console.error('Error generating caption from text:', error);
        throw error;
    }
}

// Helper function to convert image URI to base64 (implement based on your needs)
async function convertImageToBase64(imageUri: string): Promise<string> {
    // This is a placeholder - implement based on your image handling library
    // For React Native, you might use react-native-fs or expo-file-system
    
    // Example with expo-file-system:
    // import * as FileSystem from 'expo-file-system';
    // const base64 = await FileSystem.readAsStringAsync(imageUri, { encoding: 'base64' });
    // return base64;
    
    throw new Error('convertImageToBase64 not implemented - please implement based on your image handling needs');
}

// Integration example for CreatePost component
export class GeminiIntegration {
    
    /**
     * Generate AI suggestions for a post
     */
    static async generatePostSuggestions(imageUri?: string, userInput?: string, genre?: string) {
        try {
            let result: CaptionGenerationResult;
            
            if (imageUri) {
                // Generate from image
                const base64Image = await convertImageToBase64(imageUri);
                result = await generateCaptionFromImage(base64Image, 'image/jpeg', userInput);
            } else if (userInput) {
                // Generate from text description
                result = await generateCaptionFromText(userInput, 'casual', true);
            } else {
                throw new Error('Either image or text input is required');
            }
            
            // Generate additional hashtags if genre is specified
            if (genre && result.caption) {
                const hashtagResult = await generateHashtagsFromText(result.caption, genre, 10);
                // Merge hashtags, avoiding duplicates
                const allHashtags = [...new Set([...result.hashtags, ...hashtagResult.hashtags])];
                result.hashtags = allHashtags.slice(0, 15); // Limit to 15 hashtags
            }
            
            return result;
        } catch (error) {
            console.error('Error generating post suggestions:', error);
            throw error;
        }
    }
    
    /**
     * Enhance existing post content
     */
    static async enhancePostContent(caption: string, hashtags: string[], genre?: string) {
        try {
            // Improve the caption
            const improvedCaption = await improveCaptionWithAI(caption, 'trendy');
            
            // Generate additional relevant hashtags
            const hashtagResult = await generateHashtagsFromText(improvedCaption, genre, 10);
            
            // Merge and deduplicate hashtags
            const enhancedHashtags = [...new Set([...hashtags, ...hashtagResult.hashtags])];
            
            return {
                caption: improvedCaption,
                hashtags: enhancedHashtags.slice(0, 20), // Limit to 20 hashtags
                suggestions: {
                    trending: hashtagResult.trending,
                    relevant: hashtagResult.relevant
                }
            };
        } catch (error) {
            console.error('Error enhancing post content:', error);
            throw error;
        }
    }
}

// Usage in React Native component:
/*
import { GeminiIntegration } from './lib/geminiServiceExample';

// In your CreatePost component:
const handleAIGeneration = async () => {
    try {
        setLoading(true);
        
        const suggestions = await GeminiIntegration.generatePostSuggestions(
            selectedImage?.uri, 
            userInput, 
            selectedGenre?.name
        );
        
        // Update your state with AI suggestions
        setCaption(suggestions.caption);
        setHashtags(suggestions.hashtags);
        if (suggestions.genre) {
            // Set genre if not already selected
            const genreMatch = GENRES.find(g => g.name.toLowerCase() === suggestions.genre?.toLowerCase());
            if (genreMatch) setSelectedGenre(genreMatch);
        }
        
    } catch (error) {
        Alert.alert('AI Generation Failed', error.message);
    } finally {
        setLoading(false);
    }
};

const handleCaptionImprovement = async () => {
    try {
        setLoading(true);
        
        const enhanced = await GeminiIntegration.enhancePostContent(
            caption, 
            hashtags, 
            selectedGenre?.name
        );
        
        setCaption(enhanced.caption);
        setHashtags(enhanced.hashtags);
        
    } catch (error) {
        Alert.alert('Enhancement Failed', error.message);
    } finally {
        setLoading(false);
    }
};
*/
