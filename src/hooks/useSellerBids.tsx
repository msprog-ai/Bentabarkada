import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface SellerBid {
  id: string;
  listing_id: string;
  user_id: string;
  amount: number;
  comment: string | null;
  created_at: string;
  bidder_name: string | null;
  bidder_avatar: string | null;
  listing_title: string | null;
  listing_image: string | null;
  listing_price: number;
  is_highest: boolean;
}

export const useSellerBids = () => {
  const { user } = useAuth();
  const [bids, setBids] = useState<SellerBid[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSellerBids = async () => {
    if (!user) { setLoading(false); return; }

    // Get seller's listings
    const { data: listings } = await supabase
      .from('listings')
      .select('id, title, image_url, price')
      .eq('user_id', user.id);

    if (!listings || listings.length === 0) {
      setBids([]);
      setLoading(false);
      return;
    }

    const listingIds = listings.map(l => l.id);
    const listingMap = new Map(listings.map(l => [l.id, l]));

    // Get all bids for those listings
    const { data: allBids } = await supabase
      .from('bids')
      .select('*')
      .in('listing_id', listingIds)
      .order('amount', { ascending: false });

    if (!allBids || allBids.length === 0) {
      setBids([]);
      setLoading(false);
      return;
    }

    // Get bidder profiles
    const userIds = [...new Set(allBids.map(b => b.user_id))];
    const { data: profiles } = await supabase
      .from('profiles_public')
      .select('user_id, display_name, avatar_url')
      .in('user_id', userIds);

    const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

    // Find highest bid per listing
    const highestPerListing = new Map<string, number>();
    for (const bid of allBids) {
      if (!highestPerListing.has(bid.listing_id) || bid.amount > highestPerListing.get(bid.listing_id)!) {
        highestPerListing.set(bid.listing_id, bid.amount);
      }
    }

    const sellerBids: SellerBid[] = allBids.map(b => {
      const listing = listingMap.get(b.listing_id);
      const profile = profileMap.get(b.user_id);
      return {
        ...b,
        bidder_name: profile?.display_name || null,
        bidder_avatar: profile?.avatar_url || null,
        listing_title: listing?.title || null,
        listing_image: listing?.image_url || null,
        listing_price: Number(listing?.price) || 0,
        is_highest: b.amount === highestPerListing.get(b.listing_id),
      };
    });

    setBids(sellerBids);
    setLoading(false);
  };

  useEffect(() => {
    fetchSellerBids();
  }, [user]);

  // Group bids by listing
  const bidsByListing = bids.reduce((acc, bid) => {
    if (!acc[bid.listing_id]) acc[bid.listing_id] = [];
    acc[bid.listing_id].push(bid);
    return acc;
  }, {} as Record<string, SellerBid[]>);

  return { bids, bidsByListing, loading, refetch: fetchSellerBids };
};
