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
  Loader2,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Post, Comment } from '../types';
import { socialService } from '../lib/socialService';
import { auth } from '../lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import { RecipeShareCard } from './RecipeShareCard';

interface PostCardProps {
  post: Post;
  onLikeChange?: (likesCount: number, isLiked: boolean) => void;
  onDelete?: (postId: string) => void;
}

export function PostCard({ post, onLikeChange, onDelete }: PostCardProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [showShareCard, setShowShareCard] = useState(false);

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

  const handleDelete = async () => {
    if (!auth.currentUser || auth.currentUser.uid !== post.userId) return;
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      await socialService.deletePost(post.id!);
      onDelete?.(post.id!);
    } catch (e) {
      alert('Failed to delete post');
    }
  };

  const isOwner = auth.currentUser?.uid === post.userId;

  return (
    <Card className="border-stone-100 shadow-sm transition-shadow hover:shadow-md mb-6 relative z-0">
      <CardContent className="p-0 overflow-visible">
        {/* Header */}
        <div className="flex items-center justify-between p-4 relative z-20">
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
          <div className="relative z-[50]">
            <button 
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('[PostCard] Menu toggled');
                setShowMenu(!showMenu);
              }}
              className="text-stone-400 hover:text-stone-900 transition-colors p-2 -mr-2 rounded-full hover:bg-stone-100/50 active:bg-stone-200/50 flex items-center justify-center min-w-[40px] min-h-[40px]"
              aria-label="More options"
            >
              <MoreHorizontal className="w-6 h-6" />
            </button>
            <AnimatePresence>
              {showMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-[100] cursor-default" 
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowMenu(false);
                    }}
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-stone-100 z-[101] overflow-hidden"
                  >
                    {isOwner ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowMenu(false);
                          handleDelete();
                        }}
                        className="w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 transition-colors font-semibold border-b border-stone-50"
                      >
                        Delete Post
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowMenu(false);
                          alert('Reported. Thank you for keeping our community safe!');
                        }}
                        className="w-full px-4 py-3 text-left text-sm text-stone-600 hover:bg-stone-50 transition-colors font-medium border-b border-stone-50"
                      >
                        Report Post
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-3 text-left text-sm text-stone-500 hover:bg-stone-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
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
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('[PostCard] Share button clicked!');
                setShowShareCard(true);
              }}
              className="text-[#FF4D00] hover:text-[#FF6B00] transition-colors ml-auto flex items-center gap-1 bg-orange-50 px-3 py-1.5 rounded-full hover:bg-orange-100 border border-orange-100 group"
              title="Share Recipe Card"
            >
              <Share2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold uppercase tracking-wider">Share</span>
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

      <RecipeShareCard 
        data={{
          id: post.id!,
          imageUrl: post.imageUrl,
          recipeTitle: post.recipeTitle,
          recipeId: post.recipeId,
          userName: post.userName,
          caption: post.caption,
          rating: post.rating,
          userId: post.userId
        }}
        isOpen={showShareCard}
        onClose={() => setShowShareCard(false)}
      />
    </Card>
  );
}
