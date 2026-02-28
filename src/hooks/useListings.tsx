import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ListingItem } from '@/types/marketplace';
import { mockListings } from '@/data/mockData';

export interface Profile {
  display_name: string | null;
  avatar_url: string | null;
  rating: number | null;
}

export const useListings = () => {
  const [listings, setListings] = useState<ListingItem[]>(mockListings);
  const [loading, setLoading] = useState(true);

  const fetchListings = async () => {
    try {
      const { data: dbListings, error } = await supabase
        .from('listings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching listings:', error);
        return;
      }

      if (dbListings && dbListings.length > 0) {
        // Fetch profiles for all listing users
        const userIds = [...new Set(dbListings.map(l => l.user_id))];
        const { data: profiles } = await supabase
          .from('profiles_public' as any)
          .select('user_id, display_name, avatar_url, rating')
          .in('user_id', userIds) as { data: { user_id: string; display_name: string; avatar_url: string; rating: number }[] | null };

        const profileMap = new Map(profiles?.map((p: any) => [p.user_id, p]) || []);

        const transformedListings: ListingItem[] = dbListings.map((listing) => {
          const profile = profileMap.get(listing.user_id) as Profile | undefined;
          return {
            id: listing.id,
            title: listing.title,
            description: listing.description,
            price: Number(listing.price),
            category: listing.category,
            condition: listing.condition as 'new' | 'like-new' | 'good' | 'fair',
            location: listing.location,
            image: listing.image_url || 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=400&fit=crop',
            seller: {
              id: listing.user_id,
              name: profile?.display_name || 'Anonymous',
              avatar: profile?.avatar_url || `https://i.pravatar.cc/100?u=${listing.user_id}`,
              rating: Number(profile?.rating) || 5.0,
            },
            createdAt: new Date(listing.created_at),
          };
        });

        // Combine database listings with mock data
        setListings([...transformedListings, ...mockListings]);
      }
    } catch (error) {
      console.error('Error in fetchListings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, []);

  return { listings, loading, refetch: fetchListings };
};

