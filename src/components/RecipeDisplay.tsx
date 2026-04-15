import React from 'react';
import { Clock, Users, ChevronRight, Play, Heart, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Recipe } from '@/src/types';
import { motion } from 'motion/react';
import { ErrorBoundary } from './ErrorBoundary';

interface RecipeDisplayProps {
  recipe: Recipe;
  onStartCooking: () => void;
  onSave?: () => void;
  isSaved?: boolean;
}

export function RecipeDisplay({ recipe, onStartCooking, onSave, isSaved }: RecipeDisplayProps) {
  if (!recipe || !recipe.title || !recipe.instructions) {
    return (
      <div className="max-w-4xl mx-auto py-20 text-center space-y-4">
        <div className="p-4 bg-orange-100 rounded-full w-fit mx-auto">
          <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
        </div>
        <h2 className="text-2xl font-bold">Preparing your recipe...</h2>
        <p className="text-muted-foreground">This is taking a bit longer than usual. Please wait a moment.</p>
      </div>
    );
  }

  const ingredients = recipe.ingredients || [];
  const instructions = recipe.instructions || [];
  const tips = recipe.tips || [];

  return (
    <ErrorBoundary>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto space-y-8 pb-20"
      >
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
            <div className="space-y-2">
              <h2 className="text-3xl md:text-4xl font-bold">{recipe.title || 'Untitled Recipe'}</h2>
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">{recipe.description || 'No description available.'}</p>
            </div>
            <Button 
              variant="outline" 
              size="icon" 
              className={`rounded-full shrink-0 self-end sm:self-start ${isSaved ? 'text-red-500 bg-red-50 border-red-200' : ''}`}
              onClick={onSave}
            >
              <Heart className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
            </Button>
          </div>
          
          <div className="flex flex-wrap gap-2 md:gap-4">
            <Badge variant="secondary" className="px-2 md:px-3 py-1 text-xs md:text-sm flex gap-2">
              <Clock className="w-3 h-3 md:w-4 md:h-4" /> Prep: {recipe.prepTime || 'N/A'}
            </Badge>
            <Badge variant="secondary" className="px-2 md:px-3 py-1 text-xs md:text-sm flex gap-2">
              <Clock className="w-3 h-3 md:w-4 md:h-4" /> Cook: {recipe.cookTime || 'N/A'}
            </Badge>
            <Badge variant="secondary" className="px-2 md:px-3 py-1 text-xs md:text-sm flex gap-2">
              <Users className="w-3 h-3 md:w-4 md:h-4" /> Serves: {recipe.servings || 'N/A'}
            </Badge>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>Ingredients</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {ingredients.length > 0 ? (
                  ingredients.map((ingredient, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                      {ingredient}
                    </li>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground italic">No ingredients listed.</p>
                )}
              </ul>
            </CardContent>
          </Card>

          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Instructions</CardTitle>
                <Button onClick={onStartCooking} className="gap-2" disabled={instructions.length === 0}>
                  <Play className="w-4 h-4 fill-current" /> Start Cooking
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {instructions.length > 0 ? (
                    instructions.map((step, i) => (
                      <div key={i} className="flex gap-4">
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold shrink-0">
                          {i + 1}
                        </span>
                        <p className="text-muted-foreground leading-relaxed">{step}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No instructions provided.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {tips.length > 0 && (
              <Card className="bg-primary/5 border-primary/20">
                <CardHeader>
                  <CardTitle className="text-lg">Pro Tips</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {tips.map((tip, i) => (
                      <li key={i} className="text-sm italic text-muted-foreground">
                        • {tip}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </motion.div>
    </ErrorBoundary>
  );
}
