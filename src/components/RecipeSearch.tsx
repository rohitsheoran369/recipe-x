import React, { useState } from 'react';
import { Search, Loader2, ChefHat, UtensilsCrossed } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { generateRecipe } from '@/src/lib/gemini';
import { Recipe, UserPreferences } from '@/src/types';

interface RecipeSearchProps {
  onRecipeFound: (recipe: Recipe) => void;
  userPrefs?: UserPreferences | null;
}

export function RecipeSearch({ onRecipeFound, userPrefs }: RecipeSearchProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const recipe = await generateRecipe(query, userPrefs);
      onRecipeFound(recipe);
    } catch (err: any) {
      console.error("Failed to generate recipe:", err);
      const errorText = err.message || String(err);
      
      if (errorText === "QUOTA_EXCEEDED") {
        setError("API quota exceeded. Please wait a minute and try again.");
      } else if (errorText.includes("API key not valid") || errorText.includes("401")) {
        setError("Invalid API key. Please check your environment variables.");
      } else {
        setError(`Failed to generate ${userPrefs?.language || 'English'} recipe. Please try again.`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <div className="flex justify-center">
          <div className="p-3 bg-stone-900 rounded-2xl shadow-lg">
            <UtensilsCrossed className="w-8 h-8 text-white" />
          </div>
        </div>
        <h1 className="text-4xl font-bold tracking-tight">What's on the menu?</h1>
        <p className="text-muted-foreground">Search for a dish or tell me what ingredients you have.</p>
        <div className="pt-2">
          <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-stone-400">By SHEORAN X</span>
        </div>
      </div>

      <form onSubmit={handleSearch} className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="e.g., Spicy Thai Basil Chicken or 'I have eggs, flour, and milk'"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 h-12 text-base md:text-lg"
            />
          </div>
          <Button type="submit" size="lg" disabled={loading} className="h-12 px-8 w-full sm:w-auto">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Generate"}
          </Button>
        </div>
        {error && (
          <p className="text-sm text-red-500 text-center font-medium animate-pulse">{error}</p>
        )}
      </form>
    </div>
  );
}
