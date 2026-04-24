import React, { useState, useEffect } from 'react';
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  MoreHorizontal, 
  Star, 
  Send,
  User as UserIcon,
  ChefHat,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Post, Comment } from '../types';
import { socialService } from '../lib/socialService';
import { auth } from '../lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';

interface PostCardProps {
  post: Post;
  onLikeChange?: (likesCount: number, isLiked: boolean) => void;
}

export function PostCard({ post, onLikeChange }: PostCardProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingComments, setIsLoadingComments] = useState(false);

  useEffect(() => {
    socialService.checkIfLiked(post.id!).then(setIsLiked);
  }, [post.id]);

  const handleLike = async () => {
    if (!auth.currentUser) return;
    const newLikedStatus = !isLiked;
    setIsLiked(newLikedStatus);
    
    try {
      await socialService.toggleLike(post.id!, isLiked);
      onLikeChange?.(post.likesCount + (newLikedStatus ? 1 : -1), newLikedStatus);
    } catch (e) {
      setIsLiked(!newLikedStatus); // Revert on error
    }
  };

  const loadComments = async () => {
    if (showComments) {
      setShowComments(false);
      return;
    }
    
    setIsLoadingComments(true);
    setShowComments(true);
    const data = await socialService.getComments(post.id!);
    setComments(data);
    setIsLoadingComments(false);
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await socialService.addComment(post.id!, newComment);
      const updatedComments = await socialService.getComments(post.id!);
      setComments(updatedComments);
      setNewComment('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="overflow-hidden border-stone-100 shadow-sm transition-shadow hover:shadow-md mb-6">
      <CardContent className="p-0">
        {/* Header */}
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center overflow-hidden">
              {post.userPhoto ? (
                <img src={post.userPhoto} alt={post.userName} className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="w-5 h-5 text-stone-400" />
              )}
            </div>
            <div>
              <p className="font-bold text-sm text-stone-900">{post.userName}</p>
              <p className="text-[10px] text-stone-400 uppercase tracking-widest">
                {post.createdAt?.seconds ? formatDistanceToNow(post.createdAt.toDate()) + ' ago' : 'Just now'}
              </p>
            </div>
          </div>
          <button className="text-stone-400 hover:text-stone-900 transition-colors">
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>

        {/* Image */}
        <div className="aspect-square w-full bg-stone-50 relative overflow-hidden group">
          <img 
            src={post.imageUrl} 
            alt="Dish cooked" 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          {post.rating && (
            <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-2 py-1 rounded-full flex items-center gap-1 shadow-sm">
              <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
              <span className="text-xs font-bold text-stone-900">{post.rating}</span>
            </div>
          )}
          {post.recipeTitle && (
            <div className="absolute bottom-4 left-4 right-4 bg-stone-900/40 backdrop-blur-md px-3 py-2 rounded-xl text-white flex items-center gap-2">
              <ChefHat className="w-4 h-4" />
              <span className="text-xs font-medium truncate">{post.recipeTitle}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-4">
            <button 
              onClick={handleLike}
              className={`transition-colors flex items-center gap-1.5 ${isLiked ? 'text-red-500' : 'text-stone-600 hover:text-stone-900'}`}
            >
              <Heart className={`w-6 h-6 ${isLiked ? 'fill-current' : ''}`} />
              <span className="text-sm font-bold">{post.likesCount}</span>
            </button>
            <button 
              onClick={loadComments}
              className="text-stone-600 hover:text-stone-900 transition-colors flex items-center gap-1.5"
            >
              <MessageCircle className="w-6 h-6" />
              <span className="text-sm font-bold">{post.commentsCount}</span>
            </button>
            <button 
              onClick={async () => {
                const shareData = {
                  title: `Check out this dish by ${post.userName} on Recipe X`,
                  text: post.caption,
                  url: window.location.href
                };
                try {
                  if (navigator.share) {
                    await navigator.share(shareData);
                  } else {
                    await navigator.clipboard.writeText(`${shareData.title}\n${shareData.url}`);
                    alert('Link copied to clipboard!');
                  }
                } catch (err) {
                  console.error('Error sharing:', err);
                }
              }}
              className="text-stone-600 hover:text-stone-900 transition-colors ml-auto p-1 rounded-full hover:bg-stone-100"
            >
              <Share2 className="w-6 h-6" />
            </button>
          </div>

          <p className="text-sm text-stone-800 leading-relaxed">
            <span className="font-bold mr-2">{post.userName}</span>
            {post.caption}
          </p>

          {/* Comments Section */}
          <AnimatePresence>
            {showComments && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden pt-4 border-t border-stone-100"
              >
                <div className="max-h-60 overflow-y-auto space-y-4 mb-4 scrollbar-hide">
                  {isLoadingComments ? (
                    <div className="flex justify-center p-4">
                      <Loader2 className="w-6 h-6 animate-spin text-stone-300" />
                    </div>
                  ) : comments.length === 0 ? (
                    <p className="text-xs text-center text-stone-400 py-4 italic">No comments yet. Be the first!</p>
                  ) : (
                    comments.map(comment => (
                      <div key={comment.id} className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-stone-100 flex-shrink-0 flex items-center justify-center overflow-hidden">
                          {comment.userPhoto ? (
                            <img src={comment.userPhoto} alt={comment.userName} className="w-full h-full object-cover" />
                          ) : (
                            <UserIcon className="w-4 h-4 text-stone-400" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-bold text-stone-900">{comment.userName}</p>
                          <p className="text-xs text-stone-600">{comment.text}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={handleAddComment} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="flex-1 bg-stone-50 border-none rounded-xl px-4 py-2 text-xs focus:ring-2 focus:ring-primary/20 outline-none"
                    disabled={isSubmitting}
                  />
                  <button 
                    type="submit"
                    disabled={isSubmitting || !newComment.trim()}
                    className="p-2 text-primary hover:bg-primary/5 rounded-full disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
}
