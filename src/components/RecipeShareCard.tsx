import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, Share2, Download, Star, Instagram, Send, Link as LinkIcon, Loader2, Sparkles } from 'lucide-react';
import { toPng } from 'html-to-image';
import { Post } from '../types';
import { socialService } from '../lib/socialService';

interface RecipeShareCardProps {
  data: {
    id: string;
    imageUrl: string;
    recipeTitle?: string;
    recipeId?: string;
    userName: string;
    caption?: string;
    rating?: number;
    userId: string;
  };
  isOpen: boolean;
  onClose: () => void;
}

export function RecipeShareCard({ data, isOpen, onClose }: RecipeShareCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const mountTimeRef = useRef<number>(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [canInteract, setCanInteract] = useState(false);

  useEffect(() => {
    if (isOpen) {
      console.log('!!! RECIPE SHARE CARD IS NOW OPEN !!!', data.id);
      mountTimeRef.current = Date.now();
      const timer = setTimeout(() => setCanInteract(true), 800);
      return () => {
        clearTimeout(timer);
        setCanInteract(false);
        mountTimeRef.current = 0;
      };
    }
  }, [isOpen, data.id]);

  const handleShare = async (platform: string) => {
    const timeSinceMount = Date.now() - mountTimeRef.current;
    if (!isOpen || timeSinceMount < 600 || isGenerating || !cardRef.current) {
      console.log('[RecipeShareCard] handleShare blocked - too soon or invalid state');
      return;
    }
    
    console.log('[RecipeShareCard] handleShare triggered for:', platform);
    setIsGenerating(true);
    try {
      // Small delay for layout
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#ffffff'
      });

      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `recipe-${data.id}.png`, { type: 'image/png' });

      // Log Analytics
      await socialService.logShare({
        shareId: Math.random().toString(36).substring(7),
        userId: data.userId,
        recipeId: data.recipeId || 'unknown',
        postId: data.id,
        platform
      });

      if (platform === 'download') {
        const link = document.createElement('a');
        link.download = `recipe-${data.id}.png`;
        link.href = dataUrl;
        link.click();
      } else if (navigator.share) {
        try {
          await navigator.share({
            files: [file],
            title: `Check out this dish by ${data.userName} on Recipe X`,
            text: `I just made ${data.recipeTitle || 'this incredible dish'}! Check it out on Recipe X.`,
            url: window.location.origin // Include URL as well
          });
        } catch (shareErr) {
          if (shareErr instanceof Error && shareErr.name !== 'AbortError') {
            throw shareErr;
          }
        }
      } else {
        // Fallback: copy link and download
        const link = document.createElement('a');
        link.download = `recipe-${data.id}.png`;
        link.href = dataUrl;
        link.click();
        alert('Image saved! You can now share it manually.');
      }
      
      // Removed auto-onClose() to allow user to see the card again after sharing
    } catch (err) {
      console.error('Error generating share card:', err);
      alert('Failed to generate share card. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[2147483647] flex items-center justify-center p-4 overflow-hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-stone-900/95 backdrop-blur-xl"
            onClick={onClose}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative bg-white rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-2xl flex flex-col max-h-[95vh] z-[10001]"
          >
            <div className="p-6 border-b border-stone-100 flex items-center justify-between bg-white shrink-0">
              <div>
                <h3 className="font-bold text-stone-900 leading-tight">Share Recipe Card</h3>
                <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mt-0.5">Optimized for Instagram Stories</p>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-stone-100 rounded-full transition-colors"
                disabled={isGenerating}
              >
                <X className="w-5 h-5 text-stone-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-stone-100/50 flex justify-center scrollbar-hide">
              <div 
                ref={cardRef}
                className="w-[360px] h-[640px] bg-white relative overflow-hidden flex flex-col font-sans shadow-xl rounded-[2rem]"
                style={{ minWidth: '360px', minHeight: '640px' }}
              >
                <div 
                  className="absolute inset-0 z-0 bg-cover bg-center brightness-[0.7]"
                  style={{ backgroundImage: `url(${data.imageUrl})`, filter: 'blur(40px) scale(1.1)' }}
                />

                <div className="relative z-10 flex-1 flex flex-col p-8 text-white space-y-6">
                  <div className="flex items-center gap-3 text-white">
                    <div className="w-10 h-10 bg-[#FF4D00] rounded-xl flex items-center justify-center shadow-lg border-2 border-white/20">
                      <Sparkles className="w-6 h-6 text-white fill-white" />
                    </div>
                    <div>
                      <h4 className="font-black text-lg leading-tight tracking-tight uppercase">Recipe X</h4>
                      <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest">Digital Cookbook</p>
                    </div>
                  </div>

                  <div className="flex-1 flex items-center justify-center">
                    <div className="w-[280px] h-[280px] rounded-[40px] overflow-hidden border-[8px] border-white/20 shadow-2xl rotate-3 transform transition-transform">
                      <img 
                        src={data.imageUrl} 
                        alt={data.recipeTitle} 
                        className="w-full h-full object-cover -rotate-3 scale-110"
                        crossOrigin="anonymous"
                      />
                    </div>
                  </div>

                  <div className="space-y-4 text-center">
                    <h2 className="text-4xl font-black leading-none tracking-tighter uppercase line-clamp-2">
                      {data.recipeTitle || "Chef's Special"}
                    </h2>
                    
                    <div className="flex items-center justify-center gap-2">
                       {Array.from({ length: 5 }).map((_, i) => (
                         <Star 
                           key={i} 
                           className={`w-5 h-5 ${i < (data.rating || 5) ? 'fill-orange-400 text-orange-400' : 'text-white/20'}`} 
                         />
                       ))}
                    </div>

                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/10">
                      <p className="text-white font-medium leading-relaxed italic text-base">
                        "{data.caption || 'Just cooked this incredible dish!'}"
                      </p>
                      <p className="mt-3 text-white/50 text-[10px] font-bold uppercase tracking-widest border-t border-white/5 pt-2">
                        — Made by {data.userName}
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/10 flex items-center justify-between opacity-80 mt-auto text-white">
                    <div className="flex flex-col">
                       <span className="text-[10px] font-bold text-white/60 uppercase">Get the Recipe</span>
                       <span className="text-sm font-black">recipe-x.app/r/{data.recipeId?.toLowerCase().replace(/\s+/g, '-') || 'chef'}</span>
                    </div>
                    <div className="text-right">
                       <span className="text-[10px] font-bold text-white/60 uppercase">Inspired by</span>
                       <div className="font-black text-orange-400">RECIPE X</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 bg-white border-t border-stone-100 shrink-0">
              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] text-center mb-6">Select Sharing Platform</p>
              
              <div className="grid grid-cols-4 gap-4">
                <ShareButton 
                  icon={<Instagram className="w-6 h-6" />} 
                  label="Stories" 
                  onClick={() => handleShare('instagram')}
                  disabled={isGenerating || !canInteract}
                />
                <ShareButton 
                  icon={<Send className="w-6 h-6" />} 
                  label="WhatsApp" 
                  onClick={() => handleShare('whatsapp')}
                  disabled={isGenerating || !canInteract}
                />
                <ShareButton 
                  icon={<Share2 className="w-6 h-6" />} 
                  label="Others" 
                  onClick={() => handleShare('native')}
                  disabled={isGenerating || !canInteract}
                />
                <ShareButton 
                  icon={isGenerating ? <Loader2 className="animate-spin w-6 h-6" /> : <Download className="w-6 h-6" />} 
                  label="Save" 
                  onClick={() => handleShare('download')}
                  disabled={isGenerating || !canInteract}
                />
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}

function ShareButton({ icon, label, onClick, disabled }: { icon: React.ReactNode, label: string, onClick: () => void, disabled?: boolean }) {
  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-center gap-3 group disabled:opacity-50"
    >
      <div className="w-14 h-14 rounded-2xl bg-stone-50 flex items-center justify-center text-stone-600 group-hover:bg-orange-500 group-hover:text-white transition-all transform group-active:scale-95 shadow-sm group-hover:shadow-lg group-hover:-translate-y-1">
        {icon}
      </div>
      <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">{label}</span>
    </button>
  );
}

