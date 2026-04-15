import React, { useState, useEffect } from 'react';
import { Bell, X, Check, Info, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, limit } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'recommendation' | 'system' | 'tip';
  read: boolean;
  createdAt: any;
}

export function NotificationSystem() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'users', auth.currentUser.uid, 'notifications'),
      orderBy('createdAt', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Notification[];
      setNotifications(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${auth.currentUser?.uid}/notifications`);
    });

    return () => unsubscribe();
  }, []);

  const markAsRead = async (id: string) => {
    if (!auth.currentUser) return;
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid, 'notifications', id), {
        read: true
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${auth.currentUser.uid}/notifications/${id}`);
    }
  };

  const deleteNotification = async (id: string) => {
    if (!auth.currentUser) return;
    try {
      await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'notifications', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${auth.currentUser.uid}/notifications/${id}`);
    }
  };

  return (
    <div className="relative">
      <Button 
        variant="ghost" 
        size="icon" 
        className="relative"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
            {unreadCount}
          </span>
        )}
      </Button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)} 
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-stone-100 z-50 overflow-hidden"
            >
              <div className="p-4 border-b bg-stone-50/50 flex items-center justify-between">
                <h4 className="font-bold text-sm">Notifications</h4>
                <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
                  {unreadCount} Unread
                </span>
              </div>

              <div className="max-h-[400px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center space-y-2">
                    <Bell className="w-8 h-8 text-stone-200 mx-auto" />
                    <p className="text-xs text-stone-400">No notifications yet</p>
                  </div>
                ) : (
                  <div className="divide-y divide-stone-50">
                    {notifications.map((n) => (
                      <div 
                        key={n.id} 
                        className={`p-4 transition-colors hover:bg-stone-50 relative group ${!n.read ? 'bg-primary/5' : ''}`}
                      >
                        <div className="flex gap-3">
                          <div className={`p-2 rounded-full h-fit ${
                            n.type === 'recommendation' ? 'bg-orange-100 text-orange-600' :
                            n.type === 'tip' ? 'bg-blue-100 text-blue-600' :
                            'bg-stone-100 text-stone-600'
                          }`}>
                            {n.type === 'recommendation' ? <Sparkles className="w-3 h-3" /> :
                             n.type === 'tip' ? <Info className="w-3 h-3" /> :
                             <Bell className="w-3 h-3" />}
                          </div>
                          <div className="space-y-1 flex-1">
                            <p className={`text-sm leading-tight ${!n.read ? 'font-bold text-stone-900' : 'text-stone-600'}`}>
                              {n.title}
                            </p>
                            <p className="text-xs text-stone-500 line-clamp-2">
                              {n.message}
                            </p>
                          </div>
                        </div>
                        
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!n.read && (
                            <button 
                              onClick={() => markAsRead(n.id)}
                              className="p-1 hover:bg-white rounded-md text-green-600 shadow-sm"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                          )}
                          <button 
                            onClick={() => deleteNotification(n.id)}
                            className="p-1 hover:bg-white rounded-md text-red-600 shadow-sm"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
