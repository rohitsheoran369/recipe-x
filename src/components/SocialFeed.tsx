import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Camera, 
  X, 
  Star, 
  Send, 
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  ChefHat,
  Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Post, Recipe } from '../types';
import { socialService } from '../lib/socialService';
import { auth } from '../lib/firebase';
import { Button } from '@/components/ui/button';
import { PostCard } from './PostCard';

interface SocialFeedProps {
  currentRecipe?: Recipe | null;
}

export function SocialFeed({ currentRecipe }: SocialFeedProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newPost, setNewPost] = useState({
    caption: '',
    rating: 5,
    imageUrl: ''
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    setIsLoading(true);
    const data = await socialService.getPosts();
    setPosts(data);
    setIsLoading(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewPost(prev => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[Post Feed] handleSubmit triggered');
    
    if (!auth.currentUser) {
      console.error('[Post Feed] No user authenticated');
      setStatusMessage('Please sign in to share!');
      return;
    }

    if (!selectedFile) {
      console.error('[Post Feed] No file selected');
      setStatusMessage('Please select a photo first');
      return;
    }

    if (isSubmitting) return;

    setIsSubmitting(true);
    setStatusMessage('Uploading your dish...');
    try {
      console.log('[Post Feed] Starting image upload to ImgBB...');
      // 1. Upload image first
      const downloadUrl = await socialService.uploadImage(selectedFile);
      console.log('[Post Feed] Image uploaded successfully:', downloadUrl);
      
      setStatusMessage('Creating your post...');
      // 2. Create post with download URL
      const postData: any = {
        userId: auth.currentUser.uid,
        userName: auth.currentUser.displayName || 'Anonymous',
        userPhoto: auth.currentUser.photoURL || null,
        caption: newPost.caption,
        rating: newPost.rating,
        imageUrl: downloadUrl
      };

      if (currentRecipe?.title) {
        postData.recipeId = currentRecipe.title;
        postData.recipeTitle = currentRecipe.title;
      }

      await socialService.createPost(postData);
      console.log('[Post Feed] Post created successfully');
      
      setIsCreating(false);
      setNewPost({ caption: '', rating: 5, imageUrl: '' });
      setSelectedFile(null);
      setStatusMessage(null);
      fetchPosts();
    } catch (error) {
      console.error('[Post Feed] Error sharing dish:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setStatusMessage(`Error: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 pb-32">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold font-display text-stone-900 leading-tight">Kitchen Feed</h2>
          <p className="text-stone-500 text-sm">See what the world is cooking</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={fetchPosts}
            className="rounded-full"
            disabled={isLoading}
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button 
            onClick={() => {
              if (!auth.currentUser) {
                alert('Please sign in first to share your dishes!');
                // We could trigger login here if we have a handleSignIn prop
                return;
              }
              setIsCreating(true);
            }}
            className="rounded-full gap-2 px-6 shadow-lg shadow-primary/20"
          >
            <Plus className="w-5 h-5" />
            Share Your Dish
          </Button>
        </div>
      </div>

      {/* Feed */}
      <AnimatePresence mode="popLayout">
        {isLoading && posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-primary/10 border-t-primary rounded-full animate-spin"></div>
              <ChefHat className="w-6 h-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <p className="text-stone-400 font-medium animate-pulse">Loading recipe stories...</p>
          </div>
        ) : (
          posts.map((post, idx) => (
            <motion.div
              key={post.id || idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <PostCard 
                post={post} 
                onLikeChange={(count, liked) => {
                  setPosts(prev => prev.map(p => p.id === post.id ? { ...p, likesCount: count } : p));
                }}
                onDelete={(postId) => {
                  setPosts(prev => prev.filter(p => p.id !== postId));
                }}
              />
            </motion.div>
          ))
        )}
      </AnimatePresence>

      {/* Create Post Dialog */}
      <AnimatePresence>
        {isCreating && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"
              onClick={() => setIsCreating(false)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl relative"
            >
              <div className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-stone-900">Share Your Result</h3>
                  <button onClick={() => setIsCreating(false)} className="p-2 hover:bg-stone-50 rounded-full">
                    <X className="w-6 h-6 text-stone-400" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Image Upload Input */}
                  <div className="space-y-4">
                    <label className="text-xs font-bold uppercase tracking-widest text-stone-400 block">Dish Photo</label>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                    />
                    <div 
                      className="relative group cursor-pointer"
                      onClick={() => !isSubmitting && fileInputRef.current?.click()}
                    >
                      {newPost.imageUrl ? (
                        <div className="aspect-video w-full rounded-3xl overflow-hidden relative group">
                          <img src={newPost.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="text-white text-sm font-bold flex items-center gap-2">
                              <RefreshCw className="w-4 h-4" /> Change Photo
                            </span>
                          </div>
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setNewPost({ ...newPost, imageUrl: '' });
                              setSelectedFile(null);
                            }}
                            className="absolute top-2 right-2 p-2 bg-stone-900/50 backdrop-blur-md text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="aspect-video w-full border-2 border-dashed border-stone-200 rounded-3xl flex flex-col items-center justify-center gap-2 hover:border-primary/30 hover:bg-stone-50 transition-all">
                          <div className="bg-primary/10 p-4 rounded-full">
                            <Camera className="w-8 h-8 text-primary" />
                          </div>
                          <p className="text-sm font-bold text-stone-600">Tap to Upload Photo</p>
                          <p className="text-xs text-stone-400">Supports JPG, PNG, WEBP</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Caption */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-stone-400 block">How was it?</label>
                    <textarea 
                      placeholder="Tell us about your cooking experience..."
                      className="w-full bg-stone-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none resize-none h-24"
                      value={newPost.caption}
                      onChange={(e) => setNewPost({ ...newPost, caption: e.target.value })}
                    />
                  </div>

                  {/* Rating */}
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-widest text-stone-400">Rating</label>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setNewPost({ ...newPost, rating: star })}
                          className={`p-1 transition-transform active:scale-95 ${star <= newPost.rating ? 'text-amber-500' : 'text-stone-200'}`}
                        >
                          <Star className={`w-6 h-6 ${star <= newPost.rating ? 'fill-current' : ''}`} />
                        </button>
                      ))}
                    </div>
                  </div>

                  <Button 
                    type="submit"
                    className="w-full h-14 rounded-2xl text-lg font-bold shadow-xl shadow-primary/20"
                    disabled={!newPost.imageUrl || isSubmitting}
                  >
                    {isSubmitting ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <span>Posting...</span>
                      </div>
                    ) : (
                      <>
                        <Send className="mr-2 w-5 h-5" />
                        Post to Feed
                      </>
                    )}
                  </Button>

                  {statusMessage && (
                    <motion.p 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={`text-center text-sm font-medium ${statusMessage.startsWith('Error') ? 'text-red-500' : 'text-primary'}`}
                    >
                      {statusMessage}
                    </motion.p>
                  )}
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
