export interface MealDBMeal {
  idMeal: string;
  strMeal: string;
  strInstructions: string;
  strMealThumb: string;
  strCategory: string;
  strArea: string;
  [key: string]: any; // For strIngredient1, strMeasure1, etc.
}

export async function searchMealDB(query: string): Promise<MealDBMeal | null> {
  try {
    const response = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(query)}`);
    const data = await response.json();
    if (data.meals && data.meals.length > 0) {
      return data.meals[0];
    }
    return null;
  } catch (error) {
    console.error("TheMealDB Search Error:", error);
    return null;
  }
}

export function formatMealDBToRecipe(meal: MealDBMeal) {
  const ingredients: string[] = [];
  for (let i = 1; i <= 20; i++) {
    const ingredient = meal[`strIngredient${i}`];
    const measure = meal[`strMeasure${i}`];
    if (ingredient && ingredient.trim()) {
      ingredients.push(`${measure ? measure.trim() + ' ' : ''}${ingredient.trim()}`);
    }
  }

  return {
    title: meal.strMeal,
    description: `A delicious ${meal.strArea} ${meal.strCategory} dish.`,
    prepTime: "15 mins", // MealDB doesn't provide these, we'll let AI enhance
    cookTime: "30 mins",
    servings: 4,
    ingredients,
    instructions: meal.strInstructions.split('\r\n').filter(s => s.trim().length > 5),
    tips: ["Serve hot and enjoy!"]
  };
}
