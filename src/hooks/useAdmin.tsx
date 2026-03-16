
import { useState, useEffect, useCallback } from 'react';
import { db } from '@/integrations/firebase/client';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';

export const useAdmin = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      setLoading(true);
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }
      try {
        const roleDocRef = doc(db, 'user_roles', user.uid);
        const roleDoc = await getDoc(roleDocRef);
        setIsAdmin(roleDoc.exists() && roleDoc.data().role === 'admin');
      } catch (error) {
        console.error("Error checking admin status:", error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };
    checkAdmin();
  }, [user]);

  const fetchAdminData = useCallback(async (tab: string) => {
    if (!user) throw new Error('Not authenticated');

    const token = await user.getIdToken();
    
    // TODO: Replace with your actual Firebase Cloud Function URL for fetching admin data.
    // This function should handle authentication by verifying the bearer token.
    const functionUrl = `https://your-region-your-project-id.cloudfunctions.net/adminData?tab=${tab}`;
    
    const res = await fetch(functionUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Failed to fetch admin data with no error body.' }));
      throw new Error(errorData.error || 'Failed to fetch admin data');
    }
    
    const result = await res.json();
    // Assuming the cloud function returns data in a { data: ... } object, similar to the Supabase function.
    // Adjust if your function returns the data directly.
    return result.data;
  }, [user]);

  return { isAdmin, loading, fetchAdminData };
};
