import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ChefHat, Globe, Utensils, Zap, ChevronRight, Check, UtensilsCrossed, LogIn, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { UserPreferences } from '@/src/types';
import { auth, googleProvider } from '@/src/lib/firebase';
import { signInWithPopup } from 'firebase/auth';

interface LandingPageProps {
  onStart: (prefs: UserPreferences) => void;
}

export function LandingPage({ onStart }: LandingPageProps) {
  const [prefs, setPrefs] = useState<UserPreferences>({
    language: 'English',
    dietary: [],
    skillLevel: 'Beginner',
    interests: []
  });

  const languages = [
    { name: 'English', code: 'English' },
    { name: 'Hindi', code: 'Hindi' },
    { name: 'Bengali', code: 'Bengali' },
    { name: 'Tamil', code: 'Tamil' },
    { name: 'Telugu', code: 'Telugu' }
  ];

  const dietaryOptions = ['Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Keto'];
  const interestOptions = ['Italian', 'Indian', 'Chinese', 'Mexican', 'Thai', 'Baking', 'Spicy', 'Quick', 'Healthy'];
  const skillLevels: ('Beginner' | 'Intermediate' | 'Pro')[] = ['Beginner', 'Intermediate', 'Pro'];

  const toggleDietary = (option: string) => {
    setPrefs(prev => ({
      ...prev,
      dietary: prev.dietary.includes(option)
        ? prev.dietary.filter(o => o !== option)
        : [...prev.dietary, option]
    }));
  };

  const toggleInterest = (option: string) => {
    setPrefs(prev => ({
      ...prev,
      interests: prev.interests.includes(option)
        ? prev.interests.filter(o => o !== option)
        : [...prev.interests, option]
    }));
  };

  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Sign in failed:", error);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-4 md:p-8">
      <div className="max-w-5xl w-full grid md:grid-cols-2 gap-12 items-center">
        
        {/* Left Side: Hero Content */}
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-8"
        >
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-stone-900 p-3 rounded-2xl shadow-xl shadow-stone-200">
                <UtensilsCrossed className="w-10 h-10 text-white" />
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest w-fit">
                <Zap className="w-3 h-3" />
                Next Gen Cooking Assistant
              </div>
            </div>
            <div className="text-xs font-bold text-stone-400 tracking-[0.3em] uppercase">
              By Rohit Sheoran • SHEORAN X
            </div>
          </div>
          
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold font-display leading-[1.1] md:leading-[0.9] tracking-tight text-stone-900">
            COOK WITH <br className="hidden sm:block" />
            <span className="text-primary italic">INTELLIGENCE.</span>
          </h1>
          
          <p className="text-lg md:text-xl text-stone-600 max-w-md leading-relaxed">
            Recipe X transforms your kitchen into a smart studio. Personalized recipes, real-time guidance, and a seamless experience tailored to you.
          </p>

          <div className="flex flex-wrap gap-4 pt-4">
            <div className="flex items-center gap-2 text-sm text-stone-500">
              <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center">
                <Globe className="w-4 h-4" />
              </div>
              Multi-lingual
            </div>
            <div className="flex items-center gap-2 text-sm text-stone-500">
              <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center">
                <Utensils className="w-4 h-4" />
              </div>
              Smart Pantry
            </div>
          </div>
        </motion.div>

        {/* Right Side: Preference Selector */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-none shadow-2xl shadow-stone-200 rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden">
            <CardContent className="p-6 md:p-10 space-y-6 md:space-y-8">
              <div className="space-y-2">
                <h3 className="text-xl md:text-2xl font-bold text-stone-900">Set Your Preferences</h3>
                <p className="text-stone-500 text-sm">Customize Recipe X to match your style.</p>
              </div>

              {/* Language Selection */}
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-widest text-stone-400">Preferred Language</label>
                <div className="grid grid-cols-3 gap-2">
                  {languages.map(lang => (
                    <button
                      key={lang.code}
                      onClick={() => setPrefs({ ...prefs, language: lang.code })}
                      className={`px-3 py-2 rounded-xl text-sm font-medium transition-all border ${
                        prefs.language === lang.code 
                          ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' 
                          : 'bg-stone-50 text-stone-600 border-stone-100 hover:border-stone-300'
                      }`}
                    >
                      {lang.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Skill Level */}
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-widest text-stone-400">Cooking Skill Level</label>
                <div className="flex gap-2">
                  {skillLevels.map(level => (
                    <button
                      key={level}
                      onClick={() => setPrefs({ ...prefs, skillLevel: level })}
                      className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium transition-all border ${
                        prefs.skillLevel === level 
                          ? 'bg-stone-900 text-white border-stone-900 shadow-lg shadow-stone-900/20' 
                          : 'bg-stone-50 text-stone-600 border-stone-100 hover:border-stone-300'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dietary Preferences */}
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-widest text-stone-400">Dietary Preferences</label>
                <div className="flex flex-wrap gap-2">
                  {dietaryOptions.map(option => (
                    <button
                      key={option}
                      onClick={() => toggleDietary(option)}
                      className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all border flex items-center gap-1.5 ${
                        prefs.dietary.includes(option)
                          ? 'bg-green-500/10 text-green-700 border-green-500/20'
                          : 'bg-stone-50 text-stone-500 border-stone-100 hover:border-stone-300'
                      }`}
                    >
                      {prefs.dietary.includes(option) && <Check className="w-3 h-3" />}
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              {/* Interests */}
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-widest text-stone-400">Cuisine Interests</label>
                <div className="flex flex-wrap gap-2">
                  {interestOptions.map(option => (
                    <button
                      key={option}
                      onClick={() => toggleInterest(option)}
                      className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all border flex items-center gap-1.5 ${
                        prefs.interests.includes(option)
                          ? 'bg-primary/10 text-primary border-primary/20'
                          : 'bg-stone-50 text-stone-500 border-stone-100 hover:border-stone-300'
                      }`}
                    >
                      {prefs.interests.includes(option) && <Check className="w-3 h-3" />}
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                {!auth.currentUser && (
                  <Button 
                    variant="outline"
                    className="w-full h-12 rounded-xl border-stone-200 gap-2"
                    onClick={handleSignIn}
                  >
                    <LogIn className="w-4 h-4" />
                    Sign in with Google to save progress
                  </Button>
                )}
                <Button 
                  size="lg" 
                  className="w-full h-14 rounded-2xl text-lg font-bold group"
                  onClick={() => onStart(prefs)}
                >
                  Start Cooking
                  <ChevronRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

      </div>

      {/* Footer Branding */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-16 flex flex-col items-center gap-2 text-stone-400"
      >
        <div className="flex items-center gap-2">
          <UtensilsCrossed className="w-5 h-5 opacity-50" />
          <span className="font-bold font-display tracking-tight">Recipe X</span>
        </div>
        <div className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-60">
          Created by Rohit Sheoran • SHEORAN X
        </div>
      </motion.div>
    </div>
  );
}
