import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { ListingItem } from '@/types/marketplace';
import { toast } from 'sonner';

export interface CartItem {
  id: string;
  listing_id: string;
  quantity: number;
  listing?: ListingItem;
}

export const useCart = () => {
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCart = useCallback(async () => {
    if (!user) {
      setCartItems([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('cart_items')
        .select(`
          id,
          listing_id,
          quantity,
          listings (
            id,
            title,
            price,
            description,
            image_url,
            category,
            condition,
            location,
            user_id,
            created_at
          )
        `)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching cart:', error);
        return;
      }

      const items: CartItem[] = (data || []).map((item: any) => ({
        id: item.id,
        listing_id: item.listing_id,
        quantity: item.quantity,
        listing: item.listings ? {
          id: item.listings.id,
          title: item.listings.title,
          price: Number(item.listings.price),
          description: item.listings.description,
          image: item.listings.image_url || 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=400&fit=crop',
          category: item.listings.category,
          condition: item.listings.condition as 'new' | 'like-new' | 'good' | 'fair',
          location: item.listings.location,
          seller: { name: 'Seller', avatar: '', rating: 5 },
          createdAt: new Date(item.listings.created_at),
        } : undefined,
      }));

      setCartItems(items);
    } catch (error) {
      console.error('Error in fetchCart:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const addToCart = async (listingId: string) => {
    if (!user) {
      toast.error('Please sign in to add items to cart');
      return { error: new Error('Not authenticated') };
    }

    // Check if already in cart
    const existing = cartItems.find(item => item.listing_id === listingId);
    if (existing) {
      toast.info('Item already in cart');
      return { error: null };
    }

    const { error } = await supabase.from('cart_items').insert({
      user_id: user.id,
      listing_id: listingId,
      quantity: 1,
    });

    if (error) {
      console.error('Error adding to cart:', error);
      toast.error('Failed to add to cart');
      return { error };
    }

    await fetchCart();
    return { error: null, success: true };
  };

  const removeFromCart = async (cartItemId: string) => {
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('id', cartItemId);

    if (error) {
      console.error('Error removing from cart:', error);
      toast.error('Failed to remove from cart');
      return { error };
    }

    toast.success('Removed from cart');
    fetchCart();
    return { error: null };
  };

  const updateQuantity = async (cartItemId: string, quantity: number) => {
    if (quantity < 1) {
      return removeFromCart(cartItemId);
    }

    const { error } = await supabase
      .from('cart_items')
      .update({ quantity })
      .eq('id', cartItemId);

    if (error) {
      console.error('Error updating quantity:', error);
      return { error };
    }

    fetchCart();
    return { error: null };
  };

  const clearCart = async () => {
    if (!user) return;

    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('user_id', user.id);

    if (!error) {
      setCartItems([]);
      toast.success('Cart cleared');
    }
  };

  const cartTotal = cartItems.reduce((total, item) => {
    return total + (item.listing?.price || 0) * item.quantity;
  }, 0);

  const cartCount = cartItems.reduce((count, item) => count + item.quantity, 0);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  return {
    cartItems,
    loading,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    cartTotal,
    cartCount,
    refetch: fetchCart,
  };
};
