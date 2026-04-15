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

export interface CookingState {
  recipe: Recipe | null;
  currentStepIndex: number;
  isCooking: boolean;
}

export interface UserPreferences {
  language: string;
  dietary: string[];
  skillLevel: 'Beginner' | 'Intermediate' | 'Pro';
  interests: string[];
}
