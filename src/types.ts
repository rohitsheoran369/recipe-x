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

export interface Post {
  id?: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  recipeId?: string;
  recipeTitle?: string;
  imageUrl: string;
  caption: string;
  rating: number;
  likesCount: number;
  commentsCount: number;
  createdAt: any; // Firestore Timestamp
}

export interface Comment {
  id?: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  text: string;
  createdAt: any;
}

export interface UserProfile extends UserPreferences {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  followersCount: number;
  followingCount: number;
  bio?: string;
}
