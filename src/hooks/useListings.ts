
import { useState, useEffect } from 'react';
import { db } from '@/integrations/firebase/client';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { ListingItem } from '@/types/marketplace';

interface ListingsHook {
  listings: ListingItem[];
  loading: boolean;
  error: Error | null;
}

export const useListings = (filter: { category?: string, status?: string } = {}): ListingsHook => {
  const [listings, setListings] = useState<ListingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    
    let listingsQuery = collection(db, 'listings');
    
    const queryConstraints = [];
    // Default filter for active items
    queryConstraints.push(where('status', '==', filter.status || 'active'));

    if (filter.category && filter.category !== 'all') {
      queryConstraints.push(where('category', '==', filter.category));
    }
    
    // Order by creation date
    queryConstraints.push(orderBy('created_at', 'desc'));

    const q = query(listingsQuery, ...queryConstraints);

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const listingsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as ListingItem[];
        setListings(listingsData);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching listings: ", err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [filter.category, filter.status]);

  return { listings, loading, error };
};
