import { GoogleGenAI, Type, Modality } from "@google/genai";
import { UserPreferences } from "@/src/types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface Recipe {
  title: string;
  description: string;
  prepTime: string;
  cookTime: string;
  servings: number;
  ingredients: string[];
  instructions: string[];
  tips: string[];
}

async function withRetry<T>(fn: () => Promise<T>, retries = 2, delay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    // Don't retry if it's a quota error (429)
    const isQuotaError = error?.message?.includes('429') || error?.status === 'RESOURCE_EXHAUSTED';
    
    if (retries > 0 && !isQuotaError) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

export async function generateRecipe(query: string, prefs?: UserPreferences | null): Promise<Recipe> {
  const language = prefs?.language || "English";
  const languagePrompt = language === "English" 
    ? "The entire response (title, description, instructions, etc.) MUST be in English."
    : `The entire response (title, description, instructions, etc.) MUST be in ${language}. Translate everything including the title and instructions into ${language}.`;

  const personalizationPrompt = prefs ? `
    Personalize this recipe based on these user preferences:
    - Dietary Restrictions: ${prefs.dietary.join(', ') || 'None'}
    - Cooking Skill Level: ${prefs.skillLevel}
    - Cuisine Interests: ${prefs.interests.join(', ') || 'None'}
    Ensure the recipe respects dietary restrictions and matches the skill level.
  ` : "";

  console.log(`Generating ${language} recipe for: ${query}...`);

  // 1. Try OpenRouter first
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

    const response = await fetch('/api/recipe/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, language, personalization: personalizationPrompt }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    if (response.ok) {
      const recipe = await response.json();
      if (recipe && recipe.title && recipe.instructions && recipe.instructions.length > 0) {
        console.log("Recipe generated via OpenRouter");
        return recipe;
      }
    }
  } catch (error) {
    console.warn("OpenRouter generation failed or timed out, falling back to Gemini:", error);
  }

  console.log("Falling back to Gemini for recipe generation...");
  // 2. Fallback to Gemini
  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate a detailed recipe for: ${query}. ${languagePrompt} ${personalizationPrompt} IMPORTANT: Do NOT include step numbers (like 1., 2.) in the instructions array, just provide the text for each step.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            prepTime: { type: Type.STRING },
            cookTime: { type: Type.STRING },
            servings: { type: Type.NUMBER },
            ingredients: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            instructions: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            tips: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["title", "description", "ingredients", "instructions"]
        }
      }
    });

    const recipe = JSON.parse(response.text);
    
    if (!recipe.title || !recipe.instructions || recipe.instructions.length === 0) {
      throw new Error("AI returned an incomplete recipe.");
    }
    
    return recipe;
  });
}

export async function generateRecommendation(history: string[], prefs?: UserPreferences | null): Promise<Recipe> {
  const language = prefs?.language || "English";
  const languagePrompt = language === "English" 
    ? "The entire response MUST be in English."
    : `The entire response MUST be in ${language}.`;

  const historyContext = history.length > 0 
    ? `The user has recently searched for: ${history.join(', ')}.`
    : "";

  const preferencesContext = prefs ? `
    User Preferences:
    - Dietary: ${prefs.dietary.join(', ') || 'None'}
    - Skill: ${prefs.skillLevel}
    - Interests: ${prefs.interests.join(', ') || 'None'}
  ` : "";

  console.log("Generating personalized recommendation...");

  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `
        Based on the following context, suggest ONE highly relevant and unique recipe that the user would love.
        ${historyContext}
        ${preferencesContext}
        ${languagePrompt}
        
        IMPORTANT: Make it different from their recent searches but within the same flavor profile or interest area.
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            prepTime: { type: Type.STRING },
            cookTime: { type: Type.STRING },
            servings: { type: Type.NUMBER },
            ingredients: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            instructions: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            tips: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["title", "description", "ingredients", "instructions"]
        }
      }
    });

    return JSON.parse(response.text);
  });
}

export async function getCookingTip(currentStep: string, ingredient: string, language: string = "English"): Promise<string> {
  try {
    return await withRetry(async () => {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `I am currently at this step: "${currentStep}". I am using "${ingredient}". Give me a quick pro-tip or warning. Keep it under 20 words. Respond in ${language}.`,
      });
      return response.text || "Keep cooking!";
    });
  } catch (error: any) {
    console.warn("Gemini Tip failed (likely quota), using default:", error);
    const defaultTips: Record<string, string> = {
      "English": "Watch the heat and keep stirring!",
      "Hindi": "आंच का ध्यान रखें और चलाते रहें!",
      "Bengali": "আঁচের দিকে খেয়াল রাখুন এবং নাড়তে থাকুন!",
      "Tamil": "தீயைக் கவனித்து கிளறிக்கொண்டே இருங்கள்!",
      "Telugu": "మంటను గమనిస్తూ కలుపుతూ ఉండండి!"
    };
    return defaultTips[language] || "Keep cooking!";
  }
}

const audioCache = new Map<string, string>();

export async function generateSpeech(text: string): Promise<string | null> {
  if (!text.trim()) return null;
  
  const cached = audioCache.get(text);
  if (cached) return cached;

  try {
    return await withRetry(async () => {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });

      const data = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
      if (data) {
        audioCache.set(text, data);
      }
      return data;
    });
  } catch (error) {
    console.warn("Gemini TTS failed:", error);
    return null;
  }
}
