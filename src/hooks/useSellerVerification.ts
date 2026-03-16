
import { useState, useEffect } from 'react';
import { db } from '@/integrations/firebase/client';
import { doc, onSnapshot } from 'firebase/firestore';
import { useAuth } from './useAuth';
import type { SellerVerification } from '@/types/marketplace';

interface SellerVerificationHook {
  verification: SellerVerification | null;
  isVerified: boolean;
  isPending: boolean;
  isRejected: boolean;
  loading: boolean;
}

export const useSellerVerification = (): SellerVerificationHook => {
  const { user, loading: authLoading } = useAuth();
  const [verification, setVerification] = useState<SellerVerification | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      setVerification(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const verificationRef = doc(db, 'seller_verifications', user.uid);
    
    const unsubscribe = onSnapshot(verificationRef, (docSnap) => {
      if (docSnap.exists()) {
        setVerification({ id: docSnap.id, ...docSnap.data() } as SellerVerification);
      } else {
        setVerification(null);
      }
      setLoading(false);
    }, (error) => {
      console.error("Failed to fetch seller verification:", error);
      setVerification(null);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, authLoading]);
  
  const status = verification?.status;

  return {
    verification,
    isVerified: status === 'approved',
    isPending: status === 'pending',
    isRejected: status === 'rejected',
    loading,
  };
};
