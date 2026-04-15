import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle2, Lightbulb, Camera, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { VoiceAssistant } from './VoiceAssistant';
import { Recipe } from '@/src/types';
import { getCookingTip } from '@/src/lib/gemini';
import { motion, AnimatePresence } from 'motion/react';

interface CookingModeProps {
  recipe: Recipe;
  onExit: () => void;
  language?: string;
}

export function CookingMode({ recipe, onExit, language = "English" }: CookingModeProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [tip, setTip] = useState<string | null>(null);
  const [loadingTip, setLoadingTip] = useState(false);
  const [isPrefetching, setIsPrefetching] = useState(false);

  const instructions = recipe?.instructions || [];
  const progress = instructions.length > 0 ? ((currentStep + 1) / instructions.length) * 100 : 0;

  useEffect(() => {
    const fetchTip = async () => {
      if (instructions.length === 0) return;
      setLoadingTip(true);
      try {
        const newTip = await getCookingTip(instructions[currentStep], "", language);
        setTip(newTip);
      } catch (error) {
        console.error("Failed to fetch tip:", error);
        setTip(null); // Clear tip if API fails
      } finally {
        setLoadingTip(false);
      }
    };
    fetchTip();
  }, [currentStep, instructions, language]);

  if (!recipe || instructions.length === 0) {
    return (
      <div className="fixed inset-0 bg-background z-50 flex flex-col items-center justify-center p-8 text-center space-y-4">
        <h2 className="text-2xl font-bold">Invalid Recipe Data</h2>
        <p className="text-muted-foreground">We couldn't find any instructions for this recipe.</p>
        <Button onClick={onExit}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Header */}
      <header className="border-bottom p-3 md:p-4 flex items-center justify-between bg-card">
        <div className="flex items-center gap-2 md:gap-4">
          <Button variant="ghost" size="icon" onClick={onExit}>
            <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
          </Button>
          <div className="min-w-0">
            <h3 className="font-bold truncate text-sm md:text-base max-w-[150px] sm:max-w-[300px] md:max-w-md">{recipe.title}</h3>
            <div className="flex items-center gap-2">
              <p className="text-[10px] md:text-xs text-muted-foreground whitespace-nowrap">Step {currentStep + 1} of {instructions.length}</p>
              {isPrefetching && (
                <span className="text-[9px] md:text-[10px] text-primary animate-pulse flex items-center gap-1">
                  <div className="w-1 h-1 bg-primary rounded-full" />
                  <span className="hidden sm:inline">Preparing next step...</span>
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* AI features integrated into steps */}
        </div>
      </header>

      {/* Progress Bar */}
      <div className="h-1.5 w-full bg-secondary">
        <motion.div 
          className="h-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
        />
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6 flex items-center justify-center">
        <div className="max-w-3xl w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-primary uppercase tracking-wider">Current Instruction</span>
                    <span className="text-[10px] text-orange-500 font-medium">Voice System Paused</span>
                  </div>
                  <VoiceAssistant text={instructions[currentStep]} autoSpeak language={language} />
                </div>
                <h2 className="text-3xl md:text-5xl font-bold leading-tight">
                  {instructions[currentStep]}
                </h2>
              </div>

              {tip && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-primary/5 border border-primary/10 rounded-2xl p-6 flex gap-4"
                >
                  <div className="p-2 bg-primary/10 rounded-full h-fit">
                    <Lightbulb className="w-5 h-5 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-primary uppercase tracking-widest">AI Tip</p>
                    <p className="text-lg text-muted-foreground italic">"{tip}"</p>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Footer Controls */}
      <footer className="p-4 md:p-6 border-t bg-card flex items-center justify-between gap-2 md:gap-4">
        <Button
          variant="outline"
          size="lg"
          onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
          disabled={currentStep === 0}
          className="flex-1 max-w-[200px] h-10 md:h-12 text-sm md:text-base"
        >
          <ChevronLeft className="mr-1 md:mr-2 w-4 h-4 md:w-5 md:h-5" /> Previous
        </Button>

        {currentStep === instructions.length - 1 ? (
          <Button
            size="lg"
            onClick={onExit}
            className="flex-1 max-w-[200px] h-10 md:h-12 text-sm md:text-base bg-green-600 hover:bg-green-700"
          >
            <CheckCircle2 className="mr-1 md:mr-2 w-4 h-4 md:w-5 md:h-5" /> Finish
          </Button>
        ) : (
          <Button
            size="lg"
            onClick={() => setCurrentStep(Math.min(instructions.length - 1, currentStep + 1))}
            className="flex-1 max-w-[200px] h-10 md:h-12 text-sm md:text-base"
          >
            Next <span className="hidden sm:inline">Step</span> <ChevronRight className="ml-1 md:ml-2 w-4 h-4 md:w-5 md:h-5" />
          </Button>
        )}
      </footer>
    </div>
  );
}
