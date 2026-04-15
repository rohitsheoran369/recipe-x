import fetch from "node-fetch";

export async function generateOpenRouterRecipe(query: string, language: string = "English"): Promise<any> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set");
  }

  const prompt = `Generate a detailed recipe for: ${query}. 
  The entire response (title, description, instructions, ingredients, etc.) MUST be in ${language}. 
  Respond ONLY with a valid JSON object. Do not include any markdown formatting outside the JSON.
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

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.APP_URL || "http://localhost:3000",
        "X-Title": "Recipe X",
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-001",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.json();
      console.error("OpenRouter API Error:", error);
      throw new Error("Failed to generate recipe via OpenRouter");
    }

    const data = await response.json() as any;
    let content = data.choices[0].message.content;
    
    // Clean markdown code blocks if present
    content = content.replace(/```json\n?|```/g, '').trim();
    
    return JSON.parse(content);
  } catch (error) {
    console.error("OpenRouter Request Error:", error);
    throw error;
  }
}

export async function enhanceRecipeWithOpenRouter(baseRecipe: any, language: string = "English"): Promise<any> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set");
  }

  const prompt = `I have a base recipe from a database. Please enhance it and translate it entirely to ${language}.
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

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.APP_URL || "http://localhost:3000",
        "X-Title": "Recipe X",
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-001",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to enhance recipe via OpenRouter");
    }

    const data = await response.json() as any;
    let content = data.choices[0].message.content;
    content = content.replace(/```json\n?|```/g, '').trim();
    return JSON.parse(content);
  } catch (error) {
    console.error("OpenRouter Enhancement Error:", error);
    throw error;
  }
}
