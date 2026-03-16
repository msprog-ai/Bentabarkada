// src/hooks/useNotifications.ts
import { useState, useEffect, useCallback } from 'react';
import { db } from '@/integrations/firebase/client';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { useAuth } from './useAuth';

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  read: boolean;
  created_at: Date;
}

export const useNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  // Listen for real-time notifications for the current user
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(
      collection(db, 'notifications'),
      where('user_id', '==', user.uid),
      orderBy('created_at', 'desc')
    );
    const unsub = onSnapshot(q, (snapshot) => {
      setNotifications(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          created_at: doc.data().created_at?.toDate?.() || new Date(),
        }) as Notification)
      );
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  // Mark a notification as read
  const markAsRead = useCallback(async (id: string) => {
    await updateDoc(doc(db, 'notifications', id), { read: true });
  }, []);

  // Send a notification to a user
  const sendNotification = useCallback(async (userId: string, type: string, title: string, message: string, data?: any) => {
    await addDoc(collection(db, 'notifications'), {
      user_id: userId,
      type,
      title,
      message,
      data: data || null,
      read: false,
      created_at: serverTimestamp(),
    });
  }, []);

  return { notifications, loading, markAsRead, sendNotification };
};
