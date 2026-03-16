
import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/integrations/firebase/client';
import { useAuth } from '@/hooks/useAuth';

// The SellerVerification interface remains mostly the same,
// but we need to handle potential Firestore Timestamps for date fields.
export interface SellerVerification {
  id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected';
  full_name: string;
  phone: string;
  phone_verified: boolean;
  address: string;
  id_type: string;
  id_front_url: string | null;
  id_back_url: string | null; // This field was in the interface, keep it for consistency
  selfie_url: string | null;  // This field was in the interface, keep it for consistency
  rejection_reason: string | null;
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
}

// Type guard to check if a value is a Firestore Timestamp
function isTimestamp(value: any): value is Timestamp {
  return value && typeof value.toDate === 'function';
}

export const useSellerVerification = () => {
  const { user } = useAuth();
  const [verification, setVerification] = useState<SellerVerification | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchVerification = useCallback(async () => {
    if (!user) {
      setVerification(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Assumes the document ID in 'seller_verifications' collection is the user's UID.
      const verificationDocRef = doc(db, 'seller_verifications', user.uid);
      const docSnap = await getDoc(verificationDocRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        // Convert Firestore Timestamps to ISO strings for consistency
        const createdAt = data.created_at;
        const updatedAt = data.updated_at;

        setVerification({
          id: docSnap.id,
          user_id: data.user_id, // or user.uid
          status: data.status,
          full_name: data.full_name,
          phone: data.phone,
          phone_verified: data.phone_verified || false,
          address: data.address,
          id_type: data.id_type,
          id_front_url: data.id_front_url || null,
          id_back_url: data.id_back_url || null,
          selfie_url: data.selfie_url || null,
          rejection_reason: data.rejection_reason || null,
          created_at: isTimestamp(createdAt) ? createdAt.toDate().toISOString() : createdAt,
          updated_at: isTimestamp(updatedAt) ? updatedAt.toDate().toISOString() : updatedAt,
        });
      } else {
        setVerification(null);
      }
    } catch (error) {
      console.error("Error fetching seller verification status:", error);
      setVerification(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchVerification();
  }, [fetchVerification]);

  const isVerified = verification?.status === 'approved';
  const isPending = verification?.status === 'pending';
  const isRejected = verification?.status === 'rejected';

  return { verification, loading, isVerified, isPending, isRejected, refetch: fetchVerification };
};
