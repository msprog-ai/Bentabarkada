
import { useState, useEffect } from 'react';
import { db } from '@/integrations/firebase/client';
import { collection, query, where, orderBy, getDocs, documentId } from 'firebase/firestore';
import { ListingItem } from '@/types/marketplace';

export interface Profile {
  display_name: string | null;
  avatar_url: string | null;
  rating: number | null;
}

export const useListings = () => {
  const [listings, setListings] = useState<ListingItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchListings = async () => {
    try {
      setLoading(true);
      const listingsRef = collection(db, 'listings');
      const q = query(listingsRef, where('approval_status', '==', 'approved'), orderBy('created_at', 'desc'));
      const querySnapshot = await getDocs(q);

      const dbListings = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      if (dbListings.length > 0) {
        const userIds = [...new Set(dbListings.map(l => l.user_id))].filter(id => id);

        if (userIds.length > 0) {
            const profilesRef = collection(db, 'profiles');
            const profilesQuery = query(profilesRef, where(documentId(), 'in', userIds));
            const profilesSnapshot = await getDocs(profilesQuery);

            const profileMap = new Map<string, Profile>();
            profilesSnapshot.forEach(doc => {
                const data = doc.data();
                profileMap.set(doc.id, {
                    display_name: data.display_name || 'Anonymous',
                    avatar_url: data.avatar_url || null,
                    rating: data.rating != null ? Number(data.rating) : 0,
                });
            });

            const transformedListings: ListingItem[] = dbListings.map((listing: any) => {
              const profile = profileMap.get(listing.user_id);
              return {
                id: listing.id,
                title: listing.title,
                description: listing.description,
                price: Number(listing.price),
                quantity: listing.quantity || 1,
                category: listing.category,
                condition: listing.condition as 'new' | 'like-new' | 'good' | 'fair',
                location: listing.location,
                image: listing.image_url || 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=400&fit=crop',
                seller: {
                  id: listing.user_id,
                  name: profile?.display_name || 'Anonymous',
                  avatar: profile?.avatar_url || `https://i.pravatar.cc/100?u=${listing.user_id}`,
                  rating: profile?.rating || 0,
                },
                createdAt: listing.created_at.toDate(), // Convert Firestore Timestamp to Date
              };
            });
            setListings(transformedListings);
        } else {
             setListings([]);
        }

      } else {
        setListings([]);
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
