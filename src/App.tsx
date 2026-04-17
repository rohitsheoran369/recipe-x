import React, { useState, useEffect } from 'react';
import { RecipeSearch } from './components/RecipeSearch';
import { RecipeDisplay } from './components/RecipeDisplay';
import { CookingMode } from './components/CookingMode';
import { LandingPage } from './components/LandingPage';
import { NotificationSystem } from './components/NotificationSystem';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { Recipe, UserPreferences } from './types';
import { ChefHat, Utensils, History, Heart, Loader2, Camera, UtensilsCrossed, LogOut, User as UserIcon, Sparkles, Menu, X as CloseIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { motion, AnimatePresence } from 'motion/react';
import { generateRecipe, generateRecommendation } from './lib/gemini';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from './lib/firebase';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, collection, onSnapshot, query, where, orderBy, serverTimestamp, addDoc, limit } from 'firebase/firestore';

export default function App() {
  const [hasStarted, setHasStarted] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [userPrefs, setUserPrefs] = useState<UserPreferences | null>(null);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [recommendation, setRecommendation] = useState<Recipe | null>(null);
  const [isCooking, setIsCooking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecommending, setIsRecommending] = useState(false);
  const [view, setView] = useState<'home' | 'my-recipes' | 'pantry' | 'system'>('home');
  const [savedRecipes, setSavedRecipes] = useState<Recipe[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [language, setLanguage] = useState<string>("English");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Sync language state with user preferences
  useEffect(() => {
    if (userPrefs && userPrefs.language !== language) {
      setUserPrefs(prev => prev ? { ...prev, language } : null);
    }
  }, [language, userPrefs]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Fetch user preferences from Firestore
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data() as UserPreferences;
          setUserPrefs(data);
          setLanguage(data.language);
          setHasStarted(true);
        }

        // Listen for saved recipes
        const q = query(
          collection(db, 'users', currentUser.uid, 'savedRecipes'),
          orderBy('savedAt', 'desc')
        );
        const unsubRecipes = onSnapshot(q, (snapshot) => {
          const recipes = snapshot.docs.map(doc => doc.data() as Recipe);
          setSavedRecipes(recipes);
        }, (error) => {
          handleFirestoreError(error, OperationType.LIST, `users/${currentUser.uid}/savedRecipes`);
        });

        // Listen for search history
        const sq = query(
          collection(db, 'users', currentUser.uid, 'searchHistory'),
          orderBy('timestamp', 'desc'),
          limit(5)
        );
        const unsubSearch = onSnapshot(sq, (snapshot) => {
          const history = snapshot.docs.map(doc => doc.data().query as string);
          setSearchHistory(history);
        });

        return () => {
          unsubRecipes();
          unsubSearch();
        };
      } else {
        setSavedRecipes([]);
        setSearchHistory([]);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user && searchHistory.length > 0 && !recommendation) {
      fetchRecommendation();
    }
  }, [user, searchHistory]);

  const fetchRecommendation = async () => {
    if (!user || searchHistory.length === 0) return;
    setIsRecommending(true);
    try {
      const rec = await generateRecommendation(searchHistory, userPrefs);
      setRecommendation(rec);
      
      // Create a notification for the recommendation
      await addDoc(collection(db, 'users', user.uid, 'notifications'), {
        uid: user.uid,
        title: "New Recommendation!",
        message: `Based on your interest in ${searchHistory[0]}, we found a great ${rec.title} recipe for you.`,
        type: 'recommendation',
        read: false,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Failed to fetch recommendation:", error);
    } finally {
      setIsRecommending(false);
    }
  };

  const trackSearch = async (query: string) => {
    if (!user || !query) return;
    try {
      await addDoc(collection(db, 'users', user.uid, 'searchHistory'), {
        uid: user.uid,
        query,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/searchHistory`);
    }
  };

  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Sign in failed:", error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setHasStarted(false);
      setUserPrefs(null);
      setRecipe(null);
      setView('home');
    } catch (error) {
      console.error("Sign out failed:", error);
    }
  };

  const handleStart = async (prefs: UserPreferences) => {
    setUserPrefs(prefs);
    setLanguage(prefs.language);
    setHasStarted(true);

    if (user) {
      // Save preferences to Firestore
      try {
        await setDoc(doc(db, 'users', user.uid), {
          ...prefs,
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }, { merge: true });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
      }
    }
  };

  const handleQuickSearch = async (category: string) => {
    setView('home');
    setIsLoading(true);
    try {
      const newRecipe = await generateRecipe(category, userPrefs);
      setRecipe(newRecipe);
      trackSearch(category);
    } catch (error) {
      console.error("Failed to generate category recipe:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveRecipe = async (r: Recipe) => {
    if (!savedRecipes.find(sr => sr.title === r.title)) {
      if (user) {
        try {
          const recipeId = r.title.replace(/\s+/g, '-').toLowerCase();
          await setDoc(doc(db, 'users', user.uid, 'savedRecipes', recipeId), {
            ...r,
            uid: user.uid,
            savedAt: serverTimestamp()
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/savedRecipes`);
        }
      } else {
        setSavedRecipes([...savedRecipes, r]);
      }
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-stone-50">
        <PWAInstallPrompt />
        <AnimatePresence mode="wait">
        {!hasStarted ? (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <LandingPage onStart={handleStart} />
          </motion.div>
        ) : (
          <motion.div
            key="app"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col min-h-screen"
          >
            {/* Navigation */}
            <nav className="sticky top-0 z-40 w-full border-b bg-white/80 backdrop-blur-md">
              <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                <div 
                  className="flex items-center gap-2 cursor-pointer" 
                  onClick={() => { setRecipe(null); setIsCooking(false); setView('home'); setIsMobileMenuOpen(false); }}
                >
                  <div className="bg-stone-900 p-1.5 rounded-lg">
                    <UtensilsCrossed className="w-5 h-5 md:w-6 md:h-6 text-white" />
                  </div>
                  <span className="text-lg md:text-xl font-bold tracking-tight font-display">Recipe X</span>
                </div>
                
                <div className="hidden lg:flex items-center gap-6">
                  <Button 
                    variant="ghost" 
                    className={`text-sm font-medium ${view === 'home' ? 'text-primary' : ''}`}
                    onClick={() => { setView('home'); setRecipe(null); }}
                  >
                    Discover
                  </Button>
                  <Button 
                    variant="ghost" 
                    className={`text-sm font-medium ${view === 'my-recipes' ? 'text-primary' : ''}`}
                    onClick={() => setView('my-recipes')}
                  >
                    My Recipes
                  </Button>
                  <Button 
                    variant="ghost" 
                    className={`text-sm font-medium ${view === 'pantry' ? 'text-primary' : ''}`}
                    onClick={() => setView('pantry')}
                  >
                    Pantry
                  </Button>
                  <Button 
                    variant="ghost" 
                    className={`text-sm font-medium ${view === 'system' ? 'text-primary' : ''}`}
                    onClick={() => setView('system')}
                  >
                    System Info
                  </Button>
                </div>

                <div className="flex items-center gap-2 md:gap-4">
                  <select 
                    value={language} 
                    onChange={(e) => {
                      const newLang = e.target.value;
                      setLanguage(newLang);
                    }}
                    className="hidden sm:block bg-transparent text-sm font-medium border-none focus:ring-0 cursor-pointer"
                  >
                    <option value="English">English</option>
                    <option value="Hindi">Hindi</option>
                    <option value="Bengali">Bengali</option>
                    <option value="Tamil">Tamil</option>
                    <option value="Telugu">Telugu</option>
                  </select>
                  
                  <div className="flex items-center gap-1 md:gap-2">
                    {user && <NotificationSystem />}
                    <Button variant="ghost" size="icon" className="hidden sm:flex" onClick={() => setView('my-recipes')}>
                      <History className="w-5 h-5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="hidden sm:flex" onClick={() => setView('my-recipes')}>
                      <Heart className="w-5 h-5" />
                    </Button>
                    
                    {user ? (
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full overflow-hidden border border-stone-200">
                          <img src={user.photoURL || ''} alt={user.displayName || ''} referrerPolicy="no-referrer" />
                        </div>
                        <Button variant="ghost" size="icon" className="hidden sm:flex" onClick={handleSignOut}>
                          <LogOut className="w-5 h-5" />
                        </Button>
                      </div>
                    ) : (
                      <Button className="rounded-full px-4 md:px-6 h-9 md:h-10 text-xs md:text-sm" onClick={handleSignIn}>Sign In</Button>
                    )}

                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="lg:hidden"
                      onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    >
                      {isMobileMenuOpen ? <CloseIcon className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Mobile Menu */}
              <AnimatePresence>
                {isMobileMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="lg:hidden border-t bg-white overflow-hidden"
                  >
                    <div className="container mx-auto px-4 py-4 flex flex-col gap-2">
                      <Button 
                        variant="ghost" 
                        className={`justify-start text-sm font-medium ${view === 'home' ? 'text-primary bg-primary/5' : ''}`}
                        onClick={() => { setView('home'); setRecipe(null); setIsMobileMenuOpen(false); }}
                      >
                        Discover
                      </Button>
                      <Button 
                        variant="ghost" 
                        className={`justify-start text-sm font-medium ${view === 'my-recipes' ? 'text-primary bg-primary/5' : ''}`}
                        onClick={() => { setView('my-recipes'); setIsMobileMenuOpen(false); }}
                      >
                        My Recipes
                      </Button>
                      <Button 
                        variant="ghost" 
                        className={`justify-start text-sm font-medium ${view === 'pantry' ? 'text-primary bg-primary/5' : ''}`}
                        onClick={() => { setView('pantry'); setIsMobileMenuOpen(false); }}
                      >
                        Pantry
                      </Button>
                      <Button 
                        variant="ghost" 
                        className={`justify-start text-sm font-medium ${view === 'system' ? 'text-primary bg-primary/5' : ''}`}
                        onClick={() => { setView('system'); setIsMobileMenuOpen(false); }}
                      >
                        System Info
                      </Button>
                      
                      <div className="border-t my-2 pt-2">
                        <p className="px-4 py-2 text-xs font-bold text-stone-400 uppercase tracking-widest">Language</p>
                        <div className="grid grid-cols-2 gap-2 px-2">
                          {['English', 'Hindi', 'Bengali', 'Tamil', 'Telugu'].map(lang => (
                            <Button
                              key={lang}
                              variant="ghost"
                              size="sm"
                              className={`justify-start ${language === lang ? 'text-primary bg-primary/5' : ''}`}
                              onClick={() => { setLanguage(lang); setIsMobileMenuOpen(false); }}
                            >
                              {lang}
                            </Button>
                          ))}
                        </div>
                      </div>

                      {user && (
                        <Button 
                          variant="ghost" 
                          className="justify-start text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => { handleSignOut(); setIsMobileMenuOpen(false); }}
                        >
                          <LogOut className="w-4 h-4 mr-2" />
                          Sign Out
                        </Button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <AnimatePresence mode="wait">
          {view === 'home' && !recipe && (
            <motion.div
              key="search"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="py-12"
            >
              <RecipeSearch 
                onRecipeFound={(r, q) => { setRecipe(r); trackSearch(q); }} 
                userPrefs={userPrefs} 
              />
              
              {/* Recommendations */}
              {user && recommendation && (
                <div className="mt-16 space-y-6 max-w-4xl mx-auto">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <Sparkles className="w-5 h-5 text-orange-600" />
                      </div>
                      <h3 className="text-xl font-bold">Recommended for You</h3>
                    </div>
                    <Button variant="ghost" size="sm" onClick={fetchRecommendation} disabled={isRecommending}>
                      {isRecommending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Refresh"}
                    </Button>
                  </div>
                  
                  <Card 
                    className="cursor-pointer hover:border-primary transition-all group overflow-hidden border-stone-200"
                    onClick={() => setRecipe(recommendation)}
                  >
                    <CardContent className="p-0">
                      <div className="flex flex-col md:flex-row">
                        <div className="md:w-1/3 bg-stone-100 p-8 flex items-center justify-center">
                          <UtensilsCrossed className="w-12 h-12 text-stone-300 group-hover:scale-110 transition-transform" />
                        </div>
                        <div className="p-6 flex-1 space-y-2">
                          <h4 className="text-2xl font-bold group-hover:text-primary transition-colors">{recommendation.title}</h4>
                          <p className="text-stone-500 line-clamp-2">{recommendation.description}</p>
                          <div className="flex gap-4 pt-2">
                            <span className="text-xs font-bold uppercase tracking-widest text-stone-400">{recommendation.prepTime} Prep</span>
                            <span className="text-xs font-bold uppercase tracking-widest text-stone-400">{recommendation.cookTime} Cook</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Featured Categories */}
              <div className="mt-24 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
                {['Quick Meals', 'Healthy', 'Vegetarian', 'Desserts'].map((cat) => (
                  <Button 
                    key={cat} 
                    variant="outline" 
                    disabled={isLoading}
                    onClick={() => handleQuickSearch(cat)}
                    className="h-24 flex flex-col gap-2 rounded-2xl border-stone-200 hover:border-primary hover:bg-primary/5 transition-all"
                  >
                    {isLoading ? (
                      <Loader2 className="w-6 h-6 text-primary animate-spin" />
                    ) : (
                      <Utensils className="w-6 h-6 text-primary" />
                    )}
                    <span>{cat}</span>
                  </Button>
                ))}
              </div>
            </motion.div>
          )}

          {view === 'home' && recipe && (
            <motion.div
              key="display"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <RecipeDisplay 
                recipe={recipe} 
                onStartCooking={() => setIsCooking(true)}
                onSave={() => saveRecipe(recipe)}
                isSaved={!!savedRecipes.find(sr => sr.title === recipe.title)}
              />
            </motion.div>
          )}

          {view === 'my-recipes' && (
            <motion.div
              key="my-recipes"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-4xl mx-auto space-y-8"
            >
              <div className="space-y-2">
                <h2 className="text-3xl font-bold">My Recipes</h2>
                <p className="text-muted-foreground">Your collection of saved culinary inspirations.</p>
              </div>
              
              {savedRecipes.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-stone-200">
                  <Heart className="w-12 h-12 text-stone-300 mx-auto mb-4" />
                  <p className="text-stone-500">You haven't saved any recipes yet.</p>
                  <Button variant="link" onClick={() => setView('home')}>Go discover some!</Button>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                  {savedRecipes.map((r, i) => (
                    <Card key={i} className="cursor-pointer hover:border-primary transition-colors" onClick={() => { setRecipe(r); setView('home'); }}>
                      <CardHeader>
                        <CardTitle className="text-lg">{r.title}</CardTitle>
                        <CardDescription className="line-clamp-2">{r.description}</CardDescription>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {view === 'pantry' && (
            <motion.div
              key="pantry"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-4xl mx-auto space-y-8"
            >
              <div className="space-y-2">
                <h2 className="text-3xl font-bold">Pantry</h2>
                <p className="text-muted-foreground">Manage your ingredients and get matching recipes.</p>
              </div>
              
              <div className="bg-white p-8 rounded-3xl border border-stone-200 text-center space-y-4">
                <Utensils className="w-12 h-12 text-primary mx-auto" />
                <h3 className="text-xl font-bold">Coming Soon</h3>
                <p className="text-stone-500 max-w-md mx-auto">
                  We're building a smart pantry manager that tracks your ingredients and suggests recipes based on what's expiring soon.
                </p>
                <Button onClick={() => setView('home')}>Back to Search</Button>
              </div>
            </motion.div>
          )}

          {view === 'system' && (
            <motion.div
              key="system"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-4xl mx-auto space-y-8"
            >
              <div className="space-y-2">
                <h2 className="text-3xl font-bold">System Information</h2>
                <p className="text-muted-foreground">Status and future feature implementation guide.</p>
              </div>
              
              <div className="grid gap-6">
                <Card className="border-orange-200 bg-orange-50/30">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-orange-700">
                      <Utensils className="w-5 h-5" />
                      Voice System: Paused
                    </CardTitle>
                    <CardDescription>
                      The AI Voice Assistant is currently disabled to optimize operational costs.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm space-y-4">
                    <div className="space-y-2">
                      <p className="font-bold">How to re-enable in the future:</p>
                      <ol className="list-decimal list-inside space-y-1 text-stone-600">
                        <li>Open <code className="bg-stone-100 px-1 rounded">src/components/VoiceAssistant.tsx</code></li>
                        <li>Find the variable <code className="bg-stone-100 px-1 rounded">isPaused</code></li>
                        <li>Change its value from <code className="bg-stone-100 px-1 rounded">true</code> to <code className="bg-stone-100 px-1 rounded">false</code></li>
                        <li>The system will automatically resume using the Coqui VITS engine.</li>
                      </ol>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-blue-200 bg-blue-50/30">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-blue-700">
                      <Camera className="w-5 h-5" />
                      Vision System: Paused
                    </CardTitle>
                    <CardDescription>
                      The Real-time Camera Analysis is currently disabled.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm space-y-4">
                    <div className="space-y-2">
                      <p className="font-bold">How to re-enable in the future:</p>
                      <ol className="list-decimal list-inside space-y-1 text-stone-600">
                        <li>Open <code className="bg-stone-100 px-1 rounded">metadata.json</code></li>
                        <li>Add <code className="bg-stone-100 px-1 rounded">"camera"</code> to the <code className="bg-stone-100 px-1 rounded">requestFramePermissions</code> array.</li>
                        <li>Implement the <code className="bg-stone-100 px-1 rounded">VisionAssistant</code> component in <code className="bg-stone-100 px-1 rounded">CookingMode.tsx</code>.</li>
                      </ol>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Cooking Mode Overlay */}
      <AnimatePresence>
        {isCooking && recipe && (
          <CookingMode 
            recipe={recipe} 
            onExit={() => setIsCooking(false)} 
            language={language}
          />
        )}
      </AnimatePresence>

      {/* Footer */}
      {!isCooking && hasStarted && (
        <footer className="border-t bg-white py-12">
          <div className="container mx-auto px-4 text-center space-y-4">
            <div className="flex justify-center items-center gap-2">
              <UtensilsCrossed className="w-6 h-6 text-stone-900" />
              <span className="font-bold font-display">Recipe X</span>
            </div>
            <p className="text-sm text-muted-foreground">© 2026 Recipe X. Created by Rohit Sheoran.</p>
            <p className="text-xs font-bold text-stone-400 tracking-widest uppercase">SHEORAN X</p>
          </div>
        </footer>
      )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </ErrorBoundary>
  );
}
