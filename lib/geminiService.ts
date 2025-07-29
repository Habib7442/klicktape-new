import { GoogleGenAI } from "@google/genai";
import { getAIConfig, warnAboutDevelopmentSecurity } from '@/lib/config/environment';

// Warn about development security issues
warnAboutDevelopmentSecurity();

// Get secure AI configuration
const { geminiApiKey } = getAIConfig();

if (!geminiApiKey) {
    console.error("Gemini API key is missing. Please set the GEMINI_API_KEY environment variable via EAS Environment Variables.");
    throw new Error("Gemini API key is required for AI features");
}

const ai = new GoogleGenAI({ apiKey: geminiApiKey });

const visionModel = "gemini-2.5-flash";
const textModel = "gemini-2.5-flash";

export interface CaptionGenerationResult {
    caption: string;
    hashtags: string[];
    genre?: string;
}

export interface HashtagGenerationResult {
    hashtags: string[];
    trending: string[];
    relevant: string[];
}

/**
 * Generates a caption and hashtags from an image using Gemini Vision
 * @param base64Image The base64 encoded image string
 * @param mimeType The MIME type of the image (e.g., 'image/jpeg', 'image/png')
 * @param userPrompt Optional user prompt to guide caption generation
 * @returns Generated caption, hashtags, and suggested genre
 */
export async function generateCaptionFromImage(
    base64Image: string, 
    mimeType: string, 
    userPrompt?: string
): Promise<CaptionGenerationResult> {
    try {
        const imagePart = {
            inlineData: {
                mimeType: mimeType,
                data: base64Image,
            },
        };

        const promptText = userPrompt 
            ? `Based on this image and the user's context: "${userPrompt}", generate an engaging social media caption and relevant hashtags.`
            : "Analyze this image and generate an engaging social media caption with relevant hashtags.";

        const systemInstruction = `You are a creative social media content creator. Analyze the image and generate engaging, authentic captions that would perform well on social media platforms like Instagram and TikTok. 

Guidelines:
- Create captions that are engaging, relatable, and authentic
- Include emojis where appropriate
- Suggest relevant hashtags (mix of popular and niche)
- Identify the most suitable content genre
- Keep captions concise but impactful
- Consider current social media trends

Provide your response in JSON format only.`;

        const textPart = {
            text: `${promptText}

Please provide the output ONLY in JSON format, following this exact structure:
{
  "caption": "An engaging social media caption with emojis",
  "hashtags": ["hashtag1", "hashtag2", "hashtag3", "hashtag4", "hashtag5"],
  "genre": "Most suitable genre (e.g., Lifestyle, Entertainment, Art, Food, Travel, Fashion, etc.)"
}`
        };

        const response = await ai.models.generateContent({
            model: visionModel,
            contents: { parts: [imagePart, textPart] },
            config: {
                systemInstruction,
                responseMimeType: "application/json",
            }
        });

        let jsonStr = response.text.trim();
        
        // Remove code fences if present
        const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
        const match = jsonStr.match(fenceRegex);
        if (match && match[2]) {
            jsonStr = match[2].trim();
        }

        try {
            const parsedData: CaptionGenerationResult = JSON.parse(jsonStr);
            return parsedData;
        } catch (e) {
            console.error("Failed to parse JSON response:", e, "Raw response:", jsonStr);
            throw new Error("The AI returned a response that was not valid JSON. Please try again.");
        }
    } catch (error) {
        console.error("Error generating caption from image:", error);
        throw new Error("Failed to generate caption with Gemini API.");
    }
}

/**
 * Generates hashtags based on text content using Gemini
 * @param content The text content to generate hashtags for
 * @param genre Optional genre to focus hashtag generation
 * @param count Number of hashtags to generate (default: 10)
 * @returns Generated hashtags categorized by type
 */
export async function generateHashtagsFromText(
    content: string, 
    genre?: string, 
    count: number = 10
): Promise<HashtagGenerationResult> {
    try {
        const systemInstruction = `You are a social media hashtag expert. Generate relevant, trending, and effective hashtags based on the provided content. Mix popular hashtags with niche ones for better reach and engagement.

Guidelines:
- Include trending hashtags that are currently popular
- Add relevant niche hashtags for targeted reach
- Consider the genre if provided
- Avoid banned or problematic hashtags
- Focus on hashtags that drive engagement
- Include a mix of broad and specific hashtags`;

        const prompt = `Generate hashtags for the following content${genre ? ` in the ${genre} genre` : ''}:

Content: "${content}"

Please provide exactly ${count} hashtags in JSON format, categorized as follows:
{
  "hashtags": ["all generated hashtags combined"],
  "trending": ["currently popular/trending hashtags"],
  "relevant": ["content-specific and niche hashtags"]
}

Make sure the total number of hashtags across all categories equals ${count}.`;

        const response = await ai.models.generateContent({
            model: textModel,
            contents: prompt,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
            }
        });

        let jsonStr = response.text.trim();
        
        // Remove code fences if present
        const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
        const match = jsonStr.match(fenceRegex);
        if (match && match[2]) {
            jsonStr = match[2].trim();
        }

        try {
            const parsedData: HashtagGenerationResult = JSON.parse(jsonStr);
            return parsedData;
        } catch (e) {
            console.error("Failed to parse JSON response:", e, "Raw response:", jsonStr);
            throw new Error("The AI returned a response that was not valid JSON. Please try again.");
        }
    } catch (error) {
        console.error("Error generating hashtags from text:", error);
        throw new Error("Failed to generate hashtags with Gemini API.");
    }
}

/**
 * Improves an existing caption using Gemini
 * @param originalCaption The original caption to improve
 * @param style Style preference (e.g., 'casual', 'professional', 'funny', 'inspirational')
 * @returns Improved caption
 */
export async function improveCaptionWithAI(
    originalCaption: string, 
    style: 'casual' | 'professional' | 'funny' | 'inspirational' | 'trendy' = 'casual'
): Promise<string> {
    try {
        const systemInstruction = `You are a social media content expert. Improve the given caption while maintaining its core message but making it more engaging, ${style}, and suitable for social media platforms.

Guidelines:
- Keep the original meaning and intent
- Make it more ${style} in tone
- Add appropriate emojis
- Improve readability and flow
- Make it more engaging for social media
- Keep it concise but impactful`;

        const prompt = `Improve this caption in a ${style} style:

Original caption: "${originalCaption}"

Return only the improved caption text, no additional formatting or explanations.`;

        const response = await ai.models.generateContent({
            model: textModel,
            contents: prompt,
            config: {
                systemInstruction,
            }
        });

        return response.text.trim();
    } catch (error) {
        console.error("Error improving caption with AI:", error);
        throw new Error("Failed to improve caption with Gemini API.");
    }
}

/**
 * Generates a caption based on text description using Gemini
 * @param description Text description of the content
 * @param style Style preference for the caption
 * @param includeHashtags Whether to include hashtags in the response
 * @returns Generated caption and optionally hashtags
 */
export async function generateCaptionFromText(
    description: string, 
    style: 'casual' | 'professional' | 'funny' | 'inspirational' | 'trendy' = 'casual',
    includeHashtags: boolean = false
): Promise<CaptionGenerationResult> {
    try {
        const systemInstruction = `You are a creative social media content creator. Generate engaging captions based on text descriptions in the specified style.

Guidelines:
- Create ${style} and engaging captions
- Include appropriate emojis
- Make it suitable for social media platforms
- Keep it authentic and relatable
- Consider current trends if style is 'trendy'`;

        const prompt = `Generate a ${style} social media caption based on this description: "${description}"

${includeHashtags ? `Also generate 5-8 relevant hashtags.

Provide the output in JSON format:
{
  "caption": "Generated caption with emojis",
  "hashtags": ["hashtag1", "hashtag2", "hashtag3", "hashtag4", "hashtag5"],
  "genre": "Most suitable content genre"
}` : 'Return only the caption text, no additional formatting.'}`;

        const response = await ai.models.generateContent({
            model: textModel,
            contents: prompt,
            config: {
                systemInstruction,
                responseMimeType: includeHashtags ? "application/json" : undefined,
            }
        });

        if (!includeHashtags) {
            return {
                caption: response.text.trim(),
                hashtags: []
            };
        }

        let jsonStr = response.text.trim();
        
        // Remove code fences if present
        const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
        const match = jsonStr.match(fenceRegex);
        if (match && match[2]) {
            jsonStr = match[2].trim();
        }

        try {
            const parsedData: CaptionGenerationResult = JSON.parse(jsonStr);
            return parsedData;
        } catch (e) {
            console.error("Failed to parse JSON response:", e, "Raw response:", jsonStr);
            return {
                caption: response.text.trim(),
                hashtags: []
            };
        }
    } catch (error) {
        console.error("Error generating caption from text:", error);
        throw new Error("Failed to generate caption with Gemini API.");
    }
}
