
import { useState, useEffect, useCallback } from 'react';
import { db } from '@/integrations/firebase/client';
import { collection, query, where, orderBy, getDocs, addDoc, doc, getDoc, writeBatch, Timestamp, documentId } from 'firebase/firestore';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

// Interfaces remain largely the same. Dates will be handled as Firestore Timestamps or ISO strings.
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
  payment_method: 'gcash' | 'maya' | 'qr_ph' | 'cod' | 'bank_transfer';
  subtotal: number;
  delivery_fee: number;
  total: number;
  notes?: string;
  created_at: string; // Storing as ISO string
  items?: OrderItem[];
  address?: Address;
  delivery_method?: 'buyer_book' | 'seller_book' | null;
  delivery_status?: 'pending' | 'pickup_scheduled' | 'picked_up' | 'in_transit' | 'delivered';
  proof_of_delivery_url?: string;
  pickup_photo_url?: string;
  rider_name?: string;
  rider_phone?: string;
  tracking_number?: string;
  delivery_provider?: string;
  rider_tracking_link?: string;
  delivery_checkpoint?: string;
  payment_proof_url?: string;
  payment_reference?: string;
  payment_status?: 'pending' | 'awaiting_review' | 'confirmed' | 'rejected';
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

// Helper to convert Firestore Timestamp to ISO string
const toISOString = (timestamp: Timestamp | string): string => {
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate().toISOString();
  }
  return timestamp;
};

export const useOrders = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDeliveryZones = useCallback(async () => {
    try {
      const zonesSnapshot = await getDocs(collection(db, 'delivery_zones'));
      const zones = zonesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DeliveryZone));
      setDeliveryZones(zones.map(zone => ({ ...zone, base_fee: Number(zone.base_fee) })));
    } catch (error) {
      console.error('Error fetching delivery zones:', error);
    }
  }, []);

  const fetchAddresses = useCallback(async () => {
    if (!user) return;
    try {
      const q = query(collection(db, 'addresses'), where('user_id', '==', user.uid), orderBy('is_default', 'desc'));
      const addressesSnapshot = await getDocs(q);
      const userAddresses = addressesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Address));
      setAddresses(userAddresses);
    } catch (error) {
      console.error('Error fetching addresses:', error);
    }
  }, [user]);

  const fetchOrders = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    try {
      const buyerQuery = query(collection(db, 'orders'), where('buyer_id', '==', user.uid));
      const sellerQuery = query(collection(db, 'orders'), where('seller_id', '==', user.uid));

      const [buyerOrdersSnapshot, sellerOrdersSnapshot] = await Promise.all([getDocs(buyerQuery), getDocs(sellerQuery)]);

      const orderDocs = new Map();
      buyerOrdersSnapshot.forEach(doc => orderDocs.set(doc.id, doc.data()));
      sellerOrdersSnapshot.forEach(doc => orderDocs.set(doc.id, doc.data()));

      if (orderDocs.size === 0) {
        setOrders([]);
        return;
      }
      
      const orderIds = Array.from(orderDocs.keys());
      const addressIds = [...new Set(Array.from(orderDocs.values()).map((o: any) => o.address_id).filter(Boolean))];

      const [itemsSnapshot, addressesSnapshot] = await Promise.all([
        getDocs(query(collection(db, 'order_items'), where('order_id', 'in', orderIds))),
        addressIds.length > 0 ? getDocs(query(collection(db, 'addresses'), where(documentId(), 'in', addressIds))) : Promise.resolve({ docs: [] })
      ]);

      const addressesMap = new Map(addressesSnapshot.docs.map(doc => [doc.id, { id: doc.id, ...doc.data() }]));
      
      const listingIds = [...new Set(itemsSnapshot.docs.map(doc => doc.data().listing_id).filter(Boolean))];
      const listingsSnapshot = listingIds.length > 0 ? await getDocs(query(collection(db, 'listings'), where(documentId(), 'in', listingIds))) : { docs: [] };
      const listingsMap = new Map(listingsSnapshot.docs.map(doc => [doc.id, doc.data()]));
      
      const itemsByOrderId = new Map<string, any[]>();
      itemsSnapshot.docs.forEach(doc => {
        const item = { id: doc.id, ...doc.data() };
        const listing = listingsMap.get(item.listing_id);
        const items = itemsByOrderId.get(item.order_id) || [];
        items.push({ ...item, price: Number(item.price), listing: listing ? { title: listing.title, image_url: listing.image_url } : undefined });
        itemsByOrderId.set(item.order_id, items);
      });

      const formattedOrders: Order[] = orderIds.map(id => {
        const order: any = { id, ...orderDocs.get(id) };
        return {
          ...order,
          created_at: toISOString(order.created_at),
          subtotal: Number(order.subtotal),
          delivery_fee: Number(order.delivery_fee),
          total: Number(order.total),
          items: itemsByOrderId.get(id) || [],
          address: addressesMap.get(order.address_id)
        };
      }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setOrders(formattedOrders);

    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const createAddress = async (address: Omit<Address, 'id' | 'user_id'>) => {
    if (!user) return { error: new Error('Not authenticated') };
    try {
      const docRef = await addDoc(collection(db, 'addresses'), { ...address, user_id: user.uid });
      fetchAddresses();
      return { data: { id: docRef.id, ...address, user_id: user.uid }, error: null };
    } catch (error) {
      toast.error('Failed to save address');
      return { error };
    }
  };

  const createOrder = async (
    items: { listing_id: string; quantity: number; price: number; seller_id: string }[],
    paymentMethod: 'gcash' | 'maya' | 'qr_ph' | 'cod' | 'bank_transfer',
    addressId: string,
    deliveryFee: number,
    notes?: string,
    deliveryMethod?: 'buyer_book' | 'seller_book',
    courierId?: string,
    courierName?: string,
    paymentReference?: string,
  ) => {
    if (!user) return { error: new Error('Not authenticated') };

    try {
      const batch = writeBatch(db);
      const sellerIds = [...new Set(items.map(i => i.seller_id))];
      const paymentStatus = paymentMethod === 'cod' ? 'pending' : 'awaiting_review';

      for (const sellerId of sellerIds) {
        const sellerItems = items.filter(i => i.seller_id === sellerId);
        const sellerSubtotal = sellerItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const sellerTotal = sellerSubtotal + (deliveryFee / sellerIds.length);
        
        const orderRef = doc(collection(db, 'orders'));
        batch.set(orderRef, {
          buyer_id: user.id,
          seller_id: sellerId,
          address_id: addressId,
          payment_method: paymentMethod,
          subtotal: sellerSubtotal,
          delivery_fee: deliveryFee / sellerIds.length, // Distribute fee
          total: sellerTotal,
          notes,
          status: 'pending',
          delivery_method: deliveryMethod,
          delivery_status: 'pending',
          payment_status: paymentStatus,
          payment_reference: paymentReference,
          created_at: Timestamp.now(),
          // Fields like courierId and delivery_provider are omitted if undefined
          ...(courierId && { courier_id: courierId }),
          ...(courierName && { delivery_provider: courierName }),
        });

        for (const item of sellerItems) {
          const itemRef = doc(collection(db, 'order_items'));
          batch.set(itemRef, {
            order_id: orderRef.id,
            listing_id: item.listing_id,
            quantity: item.quantity,
            price: item.price
          });
        }
      }

      await batch.commit();
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
    if (user) {
      fetchDeliveryZones();
      fetchAddresses();
      fetchOrders();
    }
  }, [user, fetchDeliveryZones, fetchAddresses, fetchOrders]);

  return { orders, addresses, deliveryZones, loading, createAddress, createOrder, refetch: fetchOrders, refetchAddresses: fetchAddresses };
};


