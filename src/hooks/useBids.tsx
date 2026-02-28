import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface Bid {
  id: string;
  listing_id: string;
  user_id: string;
  amount: number;
  comment: string | null;
  created_at: string;
  profile?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

export const useBids = (listingId: string) => {
  const { user } = useAuth();
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBids = async () => {
    const { data, error } = await supabase
      .from('bids')
      .select('*')
      .eq('listing_id', listingId)
      .order('amount', { ascending: false });

    if (!error && data) {
      // Fetch profiles for all bidders
      const userIds = [...new Set(data.map(b => b.user_id))];
      const { data: profiles } = await supabase
        .from('profiles_public')
        .select('user_id, display_name, avatar_url')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      const bidsWithProfiles: Bid[] = data.map(b => ({
        ...b,
        profile: profileMap.get(b.user_id) as Bid['profile'] || undefined,
      }));

      setBids(bidsWithProfiles);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBids();

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`bids-${listingId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bids',
          filter: `listing_id=eq.${listingId}`,
        },
        () => {
          fetchBids();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [listingId]);

  const placeBid = async (amount: number, comment?: string) => {
    if (!user) return { error: 'Not authenticated' };

    const { error } = await supabase
      .from('bids')
      .insert({
        listing_id: listingId,
        user_id: user.id,
        amount,
        comment: comment || null,
      });

    if (error) return { error: error.message };
    return { error: null };
  };

  const deleteBid = async (bidId: string) => {
    const { error } = await supabase
      .from('bids')
      .delete()
      .eq('id', bidId);
    return { error: error?.message || null };
  };

  const highestBid = bids.length > 0 ? bids[0] : null;

  return { bids, loading, placeBid, deleteBid, highestBid, refetch: fetchBids };
};
