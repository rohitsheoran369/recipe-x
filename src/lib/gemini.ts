import { UserPreferences } from "@/src/types";
import { searchMealDB, formatMealDBToRecipe } from "./mealdb";

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
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

export async function generateRecipe(query: string, prefs?: UserPreferences | null): Promise<Recipe> {
  const language = prefs?.language || "English";
  console.log(`Generating ${language} recipe for: ${query} using TheMealDB + OpenRouter...`);

  // 1. Try TheMealDB first
  const meal = await searchMealDB(query);
  let baseRecipe = null;
  if (meal) {
    console.log("Found recipe in TheMealDB, preparing for enhancement...");
    baseRecipe = formatMealDBToRecipe(meal);
  }

  // 2. Use OpenRouter for enhancement or generation
  return withRetry(async () => {
    const response = await fetch('/api/recipe/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        query, 
        language, 
        baseRecipe,
        personalization: prefs ? JSON.stringify(prefs) : "" 
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to generate recipe via server");
    }

    const recipe = await response.json();
    if (!recipe.title || !recipe.instructions || recipe.instructions.length === 0) {
      throw new Error("AI returned an incomplete recipe.");
    }
    
    return recipe;
  });
}

export async function generateRecommendation(history: string[], prefs?: UserPreferences | null): Promise<Recipe> {
  const language = prefs?.language || "English";
  console.log("Generating personalized recommendation via OpenRouter...");

  return withRetry(async () => {
    const response = await fetch('/api/recipe/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        query: `Recommend a unique recipe based on history: ${history.join(', ')}`, 
        language,
        personalization: prefs ? JSON.stringify(prefs) : "" 
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to generate recommendation");
    }

    return await response.json();
  });
}

export async function getCookingTip(currentStep: string, ingredient: string, language: string = "English"): Promise<string> {
  const defaultTips: Record<string, string> = {
    "English": "Watch the heat and keep stirring!",
    "Hindi": "आंच का ध्यान रखें और चलाते रहें!",
    "Bengali": "আঁচের দিকে খেয়াল রাখুন এবং নাড়তে থাকুন!",
    "Tamil": "தீயைக் கவனித்து கிளறிக்கொண்டே இருங்கள்!",
    "Telugu": "మంటను గమనిస్తూ కలుపుతూ ఉండండి!"
  };
  return defaultTips[language] || "Keep cooking!";
}

const audioCache = new Map<string, string>();

export async function generateSpeech(text: string): Promise<string | null> {
  if (!text.trim()) return null;
  
  const cached = audioCache.get(text);
  if (cached) return cached;

  try {
    const response = await fetch('/api/tts/coqui', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });

    if (response.ok) {
      const { audio } = await response.json();
      if (audio) {
        audioCache.set(text, audio);
        return audio;
      }
    }
    return null;
  } catch (error) {
    console.warn("TTS failed:", error);
    return null;
  }
}
