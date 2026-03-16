
import { useState, useEffect, useCallback } from 'react';
import { db } from '@/integrations/firebase/client';
import {
  collection, doc, onSnapshot, addDoc, deleteDoc, updateDoc, getDoc, serverTimestamp
} from 'firebase/firestore';
import { useAuth } from './useAuth';
import { CartItem, ListingItem } from '@/types/marketplace';
import { toast } from 'sonner';

interface CartHook {
  cart: CartItem[];
  loading: boolean;
  addToCart: (listingId: string) => Promise<void>;
  removeFromCart: (cartItemId: string) => Promise<void>;
  updateItemQuantity: (cartItemId: string, quantity: number) => Promise<void>;
  cartTotal: number;
  itemCount: number;
}

export const useCart = (): CartHook => {
  const { user, loading: authLoading } = useAuth();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCart = useCallback(() => {
    if (!user) {
      setLoading(false);
      setCart([]);
      return () => {};
    }

    setLoading(true);
    const cartRef = collection(db, 'users', user.uid, 'cart');
    
    const unsubscribe = onSnapshot(cartRef, async (snapshot) => {
      if (snapshot.empty) {
        setCart([]);
        setLoading(false);
        return;
      }

      const cartItemsPromises = snapshot.docs.map(async (cartDoc) => {
        const cartData = cartDoc.data();
        const listingRef = doc(db, 'listings', cartData.listingId);
        const listingSnap = await getDoc(listingRef);

        if (listingSnap.exists()) {
          const listingData = listingSnap.data() as Omit<ListingItem, 'id'>;
          return {
            ...cartData,
            id: cartDoc.id,
            listing: {
              id: listingSnap.id,
              ...listingData,
            },
          } as CartItem;
        } else {
          // Handle case where listing might have been deleted
          // You might want to auto-remove these from the cart
          return null;
        }
      });

      const resolvedCartItems = (await Promise.all(cartItemsPromises)).filter(Boolean) as CartItem[];
      setCart(resolvedCartItems);
      setLoading(false);
    }, (error) => {
        console.error("Error fetching cart:", error);
        toast.error("Could not fetch cart details.");
        setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    const unsubscribe = fetchCart();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user, authLoading, fetchCart]);

  const addToCart = async (listingId: string) => {
    if (!user) throw new Error('You must be logged in to add items to the cart');

    const cartRef = collection(db, 'users', user.uid, 'cart');
    
    // Simple add - does not check for existing items. 
    // Firestore security rules should prevent adding more than available quantity if needed.
    await addDoc(cartRef, {
      listingId,
      quantity: 1,
      added_at: serverTimestamp(),
    });
  };

  const removeFromCart = async (cartItemId: string) => {
    if (!user) throw new Error('Authentication error');
    const itemRef = doc(db, 'users', user.uid, 'cart', cartItemId);
    await deleteDoc(itemRef);
  };

  const updateItemQuantity = async (cartItemId: string, quantity: number) => {
    if (!user) throw new Error('Authentication error');
    if (quantity <= 0) {
      await removeFromCart(cartItemId);
      return;
    }
    const itemRef = doc(db, 'users', user.uid, 'cart', cartItemId);
    await updateDoc(itemRef, { quantity });
  };

  const cartTotal = cart.reduce((total, item) => total + (item.listing?.price || 0) * item.quantity, 0);
  const itemCount = cart.reduce((count, item) => count + item.quantity, 0);

  return { cart, loading, addToCart, removeFromCart, updateItemQuantity, cartTotal, itemCount };
};
