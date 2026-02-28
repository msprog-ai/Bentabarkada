import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

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
  id_back_url: string | null;
  selfie_url: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export const useSellerVerification = () => {
  const { user } = useAuth();
  const [verification, setVerification] = useState<SellerVerification | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchVerification = async () => {
    if (!user) {
      setVerification(null);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from('seller_verifications')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    setVerification(data as SellerVerification | null);
    setLoading(false);
  };

  useEffect(() => {
    fetchVerification();
  }, [user]);

  const isVerified = verification?.status === 'approved';
  const isPending = verification?.status === 'pending';
  const isRejected = verification?.status === 'rejected';

  return { verification, loading, isVerified, isPending, isRejected, refetch: fetchVerification };
};
