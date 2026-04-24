import { 
  collection, 
  doc, 
  addDoc, 
  setDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  serverTimestamp, 
  increment, 
  runTransaction,
  Timestamp,
  type DocumentData
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { Post, Comment, UserProfile } from '../types';

export const socialService = {
  // Storage Operations (Using ImgBB API)
  async uploadImage(file: File): Promise<string> {
    if (!auth.currentUser) throw new Error('Authentication required');
    
    const apiKey = import.meta.env.VITE_IMGBB_API_KEY;
    if (!apiKey) {
      throw new Error('ImgBB API key is missing. Please add VITE_IMGBB_API_KEY to your environment.');
    }

    const formData = new FormData();
    formData.append('image', file);

    try {
      console.log('Sending request to ImgBB...');
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
        method: 'POST',
        body: formData,
      });

      console.log('ImgBB response status:', response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('ImgBB error details:', errorText);
        throw new Error(`Failed to upload image to ImgBB: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('ImgBB upload result:', result);
      
      if (result.success) {
        return result.data.url;
      } else {
        throw new Error(result.error?.message || 'Unknown ImgBB upload error');
      }
    } catch (error) {
      console.error('ImgBB Upload Error:', error);
      throw error;
    }
  },

  // Post Operations
  async createPost(post: Omit<Post, 'id' | 'likesCount' | 'commentsCount' | 'createdAt'>) {
    if (!auth.currentUser) throw new Error('Authentication required');
    
    // Clean null/undefined values for specific fields if necessary, 
    // but Firestore definitely hates 'undefined'.
    const cleanData: any = {};
    Object.keys(post).forEach(key => {
      const val = (post as any)[key];
      if (val !== undefined && val !== null) {
        cleanData[key] = val;
      } else if (val === null && (key === 'userPhoto')) {
        // Keep null for these specific fields if they are explicitly null
        cleanData[key] = null;
      }
    });

    console.log('[socialService] Creating post with cleaned data:', cleanData);

    try {
      const postRef = await addDoc(collection(db, 'posts'), {
        ...cleanData,
        likesCount: 0,
        commentsCount: 0,
        createdAt: serverTimestamp()
      });
      console.log('[socialService] Post created, ID:', postRef.id);
      return postRef.id;
    } catch (error) {
      console.error('[socialService] createPost error:', error);
      handleFirestoreError(error, OperationType.CREATE, 'posts');
      throw error;
    }
  },

  async getPosts(sortBy: 'latest' | 'popular' = 'latest', lastDoc?: any) {
    try {
      let q = query(
        collection(db, 'posts'),
        orderBy(sortBy === 'latest' ? 'createdAt' : 'likesCount', 'desc'),
        limit(20)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Post[];
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'posts');
      return [];
    }
  },

  // Like Operations
  async toggleLike(postId: string, isLiked: boolean) {
    if (!auth.currentUser) throw new Error('Authentication required');
    const userId = auth.currentUser.uid;
    const likeRef = doc(db, 'posts', postId, 'likes', userId);
    const postRef = doc(db, 'posts', postId);

    try {
      await runTransaction(db, async (transaction) => {
        if (!isLiked) {
          transaction.set(likeRef, { userId, createdAt: serverTimestamp() });
          transaction.update(postRef, { likesCount: increment(1) });
        } else {
          transaction.delete(likeRef);
          transaction.update(postRef, { likesCount: increment(-1) });
        }
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `posts/${postId}/likes`);
      throw error;
    }
  },

  async checkIfLiked(postId: string) {
    if (!auth.currentUser) return false;
    const likeRef = doc(db, 'posts', postId, 'likes', auth.currentUser.uid);
    const docSnap = await getDoc(likeRef);
    return docSnap.exists();
  },

  // Comment Operations
  async addComment(postId: string, text: string) {
    if (!auth.currentUser) throw new Error('Authentication required');
    
    const commentData: any = {
      userId: auth.currentUser.uid,
      userName: auth.currentUser.displayName || 'Anonymous',
      userPhoto: auth.currentUser.photoURL || null,
      text,
      createdAt: serverTimestamp()
    };

    try {
      await runTransaction(db, async (transaction) => {
        const postRef = doc(db, 'posts', postId);
        const commentRef = doc(collection(db, 'posts', postId, 'comments'));
        transaction.set(commentRef, commentData);
        transaction.update(postRef, { commentsCount: increment(1) });
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `posts/${postId}/comments`);
      throw error;
    }
  },

  async getComments(postId: string) {
    try {
      const q = query(
        collection(db, 'posts', postId, 'comments'),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Comment[];
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, `posts/${postId}/comments`);
      return [];
    }
  },

  // Profile Operations
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) return null;
      
      // Also get followers/following counts
      // For simplicity in this demo, we'll store them on the user doc or count them
      return {
        uid: userId,
        ...userDoc.data()
      } as UserProfile;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `users/${userId}`);
      return null;
    }
  }
};
