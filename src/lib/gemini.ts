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

async function callOpenRouter(prompt: string): Promise<any> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set. Please add it to your environment variables.");
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": window.location.origin,
      "X-Title": "Recipe X",
    },
    body: JSON.stringify({
      model: "google/gemini-2.0-flash-001",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error("OpenRouter Error Details:", errorData);
    throw new Error(`OpenRouter API failed: ${response.status}`);
  }

  const data = await response.json();
  let content = data.choices[0].message.content;
  
  // Remove markdown code blocks if present
  content = content.replace(/```json\n?|```/g, '').trim();
  
  try {
    let parsed = JSON.parse(content);
    
    // Handle cases where the model returns an array instead of a single object
    if (Array.isArray(parsed) && parsed.length > 0) {
      parsed = parsed[0];
    }
    
    // Handle cases where the model wraps the response in a "recipe" or "data" key
    if (parsed.recipe && typeof parsed.recipe === 'object') {
      parsed = parsed.recipe;
    } else if (parsed.data && typeof parsed.data === 'object') {
      parsed = parsed.data;
    }
    
    return parsed;
  } catch (e) {
    console.error("Failed to parse OpenRouter response:", content);
    throw new Error("Failed to parse AI response.");
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
    let prompt;
    if (baseRecipe) {
      prompt = `I have a base recipe from a database. Please enhance it and translate it entirely to ${language}.
      Base Recipe: ${JSON.stringify(baseRecipe)}
      
      Tasks:
      1. Translate everything (title, description, ingredients, instructions, tips) to ${language}.
      2. Improve the instructions to be clearer and more professional.
      3. Estimate realistic prepTime and cookTime if they seem like placeholders.
      4. Add 3 helpful cooking tips specific to this dish.
      
      Respond ONLY with a valid JSON object.
      JSON structure:
      {
        "title": "string",
        "description": "string",
        "prepTime": "string",
        "cookTime": "string",
        "servings": number,
        "ingredients": ["string"],
        "instructions": ["string"],
        "tips": ["string"]
      }
      IMPORTANT: Do NOT include step numbers in the instructions array.`;
    } else {
      prompt = `Generate a detailed recipe for: ${query}. 
      The entire response (title, description, instructions, ingredients, etc.) MUST be in ${language}. 
      Respond ONLY with a valid JSON object.
      JSON structure:
      {
        "title": "string",
        "description": "string",
        "prepTime": "string",
        "cookTime": "string",
        "servings": number,
        "ingredients": ["string"],
        "instructions": ["string"],
        "tips": ["string"]
      }
      IMPORTANT: Translate all content to ${language}. Do NOT include step numbers in the instructions array.`;
    }

    const recipe = await callOpenRouter(prompt);
    
    if (!recipe || !recipe.title || !recipe.instructions || recipe.instructions.length === 0) {
      console.error("Incomplete recipe received:", recipe);
      throw new Error("AI returned an incomplete recipe.");
    }
    
    return recipe;
  });
}

export async function generateRecommendation(history: string[], prefs?: UserPreferences | null): Promise<Recipe> {
  const language = prefs?.language || "English";
  console.log("Generating personalized recommendation via OpenRouter...");

  return withRetry(async () => {
    const prompt = `Recommend a unique recipe based on history: ${history.join(', ')}. 
    User Preferences: ${prefs ? JSON.stringify(prefs) : "None"}.
    The entire response MUST be in ${language}.
    Respond ONLY with a valid JSON object matching the recipe structure.`;
    
    const recipe = await callOpenRouter(prompt);

    if (!recipe || !recipe.title || !recipe.instructions || recipe.instructions.length === 0) {
      console.error("Incomplete recommendation received:", recipe);
      throw new Error("AI returned an incomplete recommendation.");
    }

    return recipe;
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
