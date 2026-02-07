import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface DeliveryZone {
  id: string;
  name: string;
  description: string;
  base_fee: number;
}

export interface Address {
  id: string;
  user_id: string;
  label: string;
  recipient_name: string;
  phone: string;
  city: string;
  province: string;
  barangay?: string;
  complete_address: string;
  postal_code?: string;
  delivery_zone_id?: string;
  is_default: boolean;
}

export interface Order {
  id: string;
  buyer_id: string;
  seller_id: string;
  address_id?: string;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  payment_method: 'gcash' | 'maya' | 'qr_ph' | 'cod';
  subtotal: number;
  delivery_fee: number;
  total: number;
  notes?: string;
  created_at: string;
  items?: OrderItem[];
  address?: Address;
}

export interface OrderItem {
  id: string;
  order_id: string;
  listing_id: string;
  quantity: number;
  price: number;
  listing?: {
    title: string;
    image_url: string;
  };
}

export const useOrders = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDeliveryZones = useCallback(async () => {
    const { data, error } = await supabase
      .from('delivery_zones')
      .select('*');
    
    if (error) {
      console.error('Error fetching delivery zones:', error);
      return;
    }
    
    setDeliveryZones((data || []).map(zone => ({
      ...zone,
      base_fee: Number(zone.base_fee)
    })));
  }, []);

  const fetchAddresses = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('addresses')
      .select('*')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false });

    if (error) {
      console.error('Error fetching addresses:', error);
      return;
    }

    setAddresses(data || []);
  }, [user]);

  const fetchOrders = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          listings (title, image_url)
        ),
        addresses (*)
      `)
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching orders:', error);
      setLoading(false);
      return;
    }

    const formattedOrders: Order[] = (data || []).map((order: any) => ({
      id: order.id,
      buyer_id: order.buyer_id,
      seller_id: order.seller_id,
      address_id: order.address_id,
      status: order.status,
      payment_method: order.payment_method,
      subtotal: Number(order.subtotal),
      delivery_fee: Number(order.delivery_fee),
      total: Number(order.total),
      notes: order.notes,
      created_at: order.created_at,
      items: order.order_items?.map((item: any) => ({
        id: item.id,
        order_id: item.order_id,
        listing_id: item.listing_id,
        quantity: item.quantity,
        price: Number(item.price),
        listing: item.listings ? {
          title: item.listings.title,
          image_url: item.listings.image_url
        } : undefined
      })),
      address: order.addresses
    }));

    setOrders(formattedOrders);
    setLoading(false);
  }, [user]);

  const createAddress = async (address: Omit<Address, 'id' | 'user_id'>) => {
    if (!user) return { error: new Error('Not authenticated') };

    const { data, error } = await supabase
      .from('addresses')
      .insert({ ...address, user_id: user.id })
      .select()
      .single();

    if (error) {
      toast.error('Failed to save address');
      return { error };
    }

    fetchAddresses();
    return { data, error: null };
  };

  const createOrder = async (
    items: { listing_id: string; quantity: number; price: number; seller_id: string }[],
    paymentMethod: 'gcash' | 'maya' | 'qr_ph' | 'cod',
    addressId: string,
    deliveryFee: number,
    notes?: string
  ) => {
    if (!user) return { error: new Error('Not authenticated') };

    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const total = subtotal + deliveryFee;

    // Group items by seller
    const sellerIds = [...new Set(items.map(i => i.seller_id))];
    
    // For simplicity, create one order per seller
    const orderPromises = sellerIds.map(async (sellerId) => {
      const sellerItems = items.filter(i => i.seller_id === sellerId);
      const sellerSubtotal = sellerItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const sellerTotal = sellerSubtotal + (deliveryFee / sellerIds.length);

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          buyer_id: user.id,
          seller_id: sellerId,
          address_id: addressId,
          payment_method: paymentMethod,
          subtotal: sellerSubtotal,
          delivery_fee: deliveryFee / sellerIds.length,
          total: sellerTotal,
          notes
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItems = sellerItems.map(item => ({
        order_id: order.id,
        listing_id: item.listing_id,
        quantity: item.quantity,
        price: item.price
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      return order;
    });

    try {
      await Promise.all(orderPromises);
      toast.success('Order placed successfully!');
      fetchOrders();
      return { error: null };
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error('Failed to place order');
      return { error };
    }
  };

  useEffect(() => {
    fetchDeliveryZones();
    fetchAddresses();
    fetchOrders();
  }, [fetchDeliveryZones, fetchAddresses, fetchOrders]);

  return {
    orders,
    addresses,
    deliveryZones,
    loading,
    createAddress,
    createOrder,
    refetch: fetchOrders,
    refetchAddresses: fetchAddresses
  };
};
