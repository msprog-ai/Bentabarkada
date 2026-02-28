import { useState, useEffect } from 'react';
import { Truck, Clock, Package } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/integrations/supabase/client';

export interface Courier {
  id: string;
  name: string;
  logo_url: string | null;
  estimated_days: string;
  base_fee: number;
  is_active: boolean;
}

interface CourierSelectorProps {
  listingIds: string[];
  value: string | null;
  onChange: (courierId: string, courier: Courier) => void;
}

const CourierSelector = ({ listingIds, value, onChange }: CourierSelectorProps) => {
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [loading, setLoading] = useState(true);
  const [noCommonCourier, setNoCommonCourier] = useState(false);

  useEffect(() => {
    const fetchAvailableCouriers = async () => {
      setLoading(true);

      if (listingIds.length === 0) {
        setCouriers([]);
        setLoading(false);
        return;
      }

      // Get listing_couriers for all cart items
      const { data: listingCouriers, error } = await supabase
        .from('listing_couriers')
        .select('listing_id, courier_id, shipping_fee, shipping_couriers(*)')
        .in('listing_id', listingIds);

      if (error) {
        console.error('Error fetching listing couriers:', error);
        // Fallback: show all active couriers
        const { data: allCouriers } = await supabase
          .from('shipping_couriers')
          .select('*')
          .eq('is_active', true);
        setCouriers((allCouriers || []).map(c => ({ ...c, base_fee: Number(c.base_fee) })));
        setLoading(false);
        return;
      }

      if (!listingCouriers || listingCouriers.length === 0) {
        // No listing_couriers found - show all active couriers as fallback
        const { data: allCouriers } = await supabase
          .from('shipping_couriers')
          .select('*')
          .eq('is_active', true);
        setCouriers((allCouriers || []).map(c => ({ ...c, base_fee: Number(c.base_fee) })));
        setLoading(false);
        return;
      }

      // Find intersection of couriers across all listings
      const couriersByListing = new Map<string, Set<string>>();
      const courierDataMap = new Map<string, Courier>();

      listingCouriers.forEach((lc: any) => {
        if (!couriersByListing.has(lc.listing_id)) {
          couriersByListing.set(lc.listing_id, new Set());
        }
        couriersByListing.get(lc.listing_id)!.add(lc.courier_id);

        if (lc.shipping_couriers) {
          courierDataMap.set(lc.courier_id, {
            id: lc.shipping_couriers.id,
            name: lc.shipping_couriers.name,
            logo_url: lc.shipping_couriers.logo_url,
            estimated_days: lc.shipping_couriers.estimated_days,
            base_fee: lc.shipping_fee ? Number(lc.shipping_fee) : Number(lc.shipping_couriers.base_fee),
            is_active: lc.shipping_couriers.is_active,
          });
        }
      });

      // Intersection: courier must be available for ALL listings
      let commonCourierIds: Set<string> | null = null;
      couriersByListing.forEach((courierIds) => {
        if (commonCourierIds === null) {
          commonCourierIds = new Set(courierIds);
        } else {
          commonCourierIds = new Set([...commonCourierIds].filter(id => courierIds.has(id)));
        }
      });

      const result = [...(commonCourierIds || [])].map(id => courierDataMap.get(id)!).filter(Boolean);

      if (result.length === 0 && listingIds.length > 1) {
        setNoCommonCourier(true);
      }

      setCouriers(result);
      setLoading(false);
    };

    fetchAvailableCouriers();
  }, [listingIds.join(',')]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Package className="w-5 h-5 animate-pulse mr-2" />
        Loading shipping options...
      </div>
    );
  }

  if (noCommonCourier) {
    return (
      <div className="p-4 rounded-xl border-2 border-destructive/30 bg-destructive/5 text-sm text-center">
        <p className="font-medium text-destructive mb-1">No common shipping option</p>
        <p className="text-muted-foreground">
          The items in your cart support different couriers. Please check out items from each seller separately.
        </p>
      </div>
    );
  }

  if (couriers.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        No shipping options available.
      </p>
    );
  }

  return (
    <RadioGroup value={value || ''} onValueChange={(v) => {
      const courier = couriers.find(c => c.id === v);
      if (courier) onChange(v, courier);
    }}>
      <div className="grid gap-3">
        {couriers.map((courier) => (
          <div
            key={courier.id}
            onClick={() => onChange(courier.id, courier)}
            className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer ${
              value === courier.id
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            }`}
          >
            <RadioGroupItem value={courier.id} id={courier.id} />
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
              <Truck className={`w-5 h-5 ${value === courier.id ? 'text-primary' : 'text-muted-foreground'}`} />
            </div>
            <div className="flex-1">
              <label htmlFor={courier.id} className="font-semibold cursor-pointer block">
                {courier.name}
              </label>
              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {courier.estimated_days}
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="font-bold text-primary">₱{courier.base_fee.toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>
    </RadioGroup>
  );
};

export default CourierSelector;
