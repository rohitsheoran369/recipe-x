import React, { useState, useEffect } from 'react';
import { Share, PlusSquare, X, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';

export function PWAInstallPrompt() {
  const [show, setShow] = useState(false);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'other'>('other');

  useEffect(() => {
    // Detect if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    if (isStandalone) return;

    // Detect platform
    const ua = window.navigator.userAgent;
    const isIos = /iphone|ipad|ipod/.test(ua.toLowerCase());
    const isAndroid = /android/.test(ua.toLowerCase());

    if (isIos) setPlatform('ios');
    else if (isAndroid) setPlatform('android');

    // Show after 5 seconds if on mobile
    if (isIos || isAndroid) {
      const timer = setTimeout(() => setShow(true), 5000);
      return () => clearTimeout(timer);
    }
  }, []);

  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="fixed bottom-6 left-4 right-4 z-[100] md:hidden"
      >
        <div className="bg-stone-900 border border-stone-800 text-white rounded-2xl p-4 shadow-2xl flex flex-col gap-3">
          <div className="flex items-start justify-between">
            <div className="flex gap-3">
              <div className="bg-white/10 p-2 rounded-xl">
                <Smartphone className="w-6 h-6 text-white" />
              </div>
              <div>
                <h4 className="font-bold text-sm">Install Recipe X</h4>
                <p className="text-white/60 text-xs">Add to home screen for a better experience</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-white/40 hover:text-white"
              onClick={() => setShow(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="bg-white/5 rounded-xl p-3 text-xs flex items-center gap-3">
            {platform === 'ios' ? (
              <>
                <Share className="w-4 h-4 text-blue-400" />
                <span>Tap <strong>Share</strong> then <strong>Add to Home Screen</strong></span>
              </>
            ) : (
              <>
                <PlusSquare className="w-4 h-4 text-green-400" />
                <span>Tap <strong>Menu</strong> then <strong>Install App</strong></span>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
