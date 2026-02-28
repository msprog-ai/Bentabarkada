import { useState } from 'react';
import { Package, Truck, MapPin, CheckCircle, Camera, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type DeliveryStatus = 'pending' | 'pickup_scheduled' | 'picked_up' | 'in_transit' | 'delivered';

interface DeliveryStatusTrackerProps {
  orderId: string;
  deliveryStatus: DeliveryStatus;
  deliveryMethod: 'buyer_book' | 'seller_book' | null;
  riderName?: string;
  riderPhone?: string;
  trackingNumber?: string;
  deliveryProvider?: string;
  proofOfDeliveryUrl?: string;
  isSeller?: boolean;
  isBuyer?: boolean;
  onUpdate?: () => void;
}

const statusSteps = [
  { id: 'pending', label: 'Preparing', icon: Package },
  { id: 'pickup_scheduled', label: 'Pickup Scheduled', icon: MapPin },
  { id: 'picked_up', label: 'Picked Up', icon: Truck },
  { id: 'in_transit', label: 'In Transit', icon: Truck },
  { id: 'delivered', label: 'Delivered', icon: CheckCircle },
] as const;

const DeliveryStatusTracker = ({
  orderId,
  deliveryStatus,
  deliveryMethod,
  riderName,
  riderPhone,
  trackingNumber,
  deliveryProvider,
  proofOfDeliveryUrl,
  isSeller = false,
  isBuyer = false,
  onUpdate,
}: DeliveryStatusTrackerProps) => {
  const [uploading, setUploading] = useState(false);
  const [showRiderForm, setShowRiderForm] = useState(false);
  const [riderInfo, setRiderInfo] = useState({
    rider_name: riderName || '',
    rider_phone: riderPhone || '',
    tracking_number: trackingNumber || '',
    delivery_provider: deliveryProvider || '',
  });

  const currentStepIndex = statusSteps.findIndex((s) => s.id === deliveryStatus);

  const updateDeliveryStatus = async (newStatus: DeliveryStatus, additionalData?: Record<string, any>) => {
    const { error } = await supabase
      .from('orders')
      .update({ 
        delivery_status: newStatus,
        ...additionalData
      })
      .eq('id', orderId);

    if (error) {
      toast.error('Failed to update delivery status');
      console.error(error);
    } else {
      toast.success(`Delivery status updated to ${newStatus.replace('_', ' ')}`);
      onUpdate?.();
    }
  };

  const handleRiderInfoSubmit = async () => {
    await updateDeliveryStatus('pickup_scheduled', riderInfo);
    setShowRiderForm(false);
  };

  const handleProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    const fileExt = file.name.split('.').pop();
    const fileName = `${orderId}-${Date.now()}.${fileExt}`;

    const { error: uploadError, data } = await supabase.storage
      .from('delivery-proofs')
      .upload(fileName, file);

    if (uploadError) {
      toast.error('Failed to upload proof of delivery');
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('delivery-proofs')
      .getPublicUrl(fileName);

    await updateDeliveryStatus('delivered', { proof_of_delivery_url: publicUrl });
    setUploading(false);
  };

  const getNextAction = () => {
    if (deliveryStatus === 'delivered') return null;

    if (deliveryStatus === 'pending' && isSeller) {
      return (
        <Button
          onClick={() => setShowRiderForm(true)}
          className="hero-gradient border-0 gap-2"
        >
          <Truck className="w-4 h-4" />
          Add Rider Details
        </Button>
      );
    }

    if (deliveryStatus === 'pickup_scheduled' && isSeller) {
      return (
        <Button
          onClick={() => updateDeliveryStatus('picked_up')}
          className="hero-gradient border-0 gap-2"
        >
          <Package className="w-4 h-4" />
          Mark as Picked Up
        </Button>
      );
    }

    if (deliveryStatus === 'picked_up' && (isSeller || isBuyer)) {
      return (
        <Button
          onClick={() => updateDeliveryStatus('in_transit')}
          className="hero-gradient border-0 gap-2"
        >
          <Truck className="w-4 h-4" />
          Mark as In Transit
        </Button>
      );
    }

    if (deliveryStatus === 'in_transit') {
      return (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Upload proof of delivery to complete
          </p>
          <Label htmlFor="proof-upload" className="cursor-pointer">
            <div className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
              {uploading ? (
                <span>Uploading...</span>
              ) : (
                <>
                  <Camera className="w-4 h-4" />
                  <span>Upload Proof Photo</span>
                </>
              )}
            </div>
          </Label>
          <input
            id="proof-upload"
            type="file"
            accept="image/*"
            onChange={handleProofUpload}
            disabled={uploading}
            className="hidden"
          />
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-6">
      {/* Courier Badge */}
      {deliveryProvider && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Shipping via:</span>
          <span className="font-medium px-3 py-1 rounded-full bg-primary/10 text-primary">
            {deliveryProvider}
          </span>
        </div>
      )}

      {/* Progress Steps */}
      <div className="relative">
        <div className="flex justify-between">
          {statusSteps.map((step, index) => {
            const Icon = step.icon;
            const isCompleted = index <= currentStepIndex;
            const isCurrent = index === currentStepIndex;

            return (
              <div key={step.id} className="flex flex-col items-center flex-1">
                <div
                  className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    isCompleted
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  } ${isCurrent ? 'ring-4 ring-primary/30' : ''}`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span
                  className={`text-xs mt-2 text-center ${
                    isCompleted ? 'text-foreground font-medium' : 'text-muted-foreground'
                  }`}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Progress Line */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-muted -z-0">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${(currentStepIndex / (statusSteps.length - 1)) * 100}%` }}
          />
        </div>
      </div>

      {/* Rider Info */}
      {(riderName || deliveryProvider) && (
        <div className="bg-muted/50 rounded-xl p-4 space-y-2">
          <h4 className="font-medium text-sm">Rider Details</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {deliveryProvider && (
              <div>
                <span className="text-muted-foreground">Provider: </span>
                <span className="font-medium">{deliveryProvider}</span>
              </div>
            )}
            {riderName && (
              <div>
                <span className="text-muted-foreground">Rider: </span>
                <span className="font-medium">{riderName}</span>
              </div>
            )}
            {riderPhone && (
              <div>
                <span className="text-muted-foreground">Phone: </span>
                <a href={`tel:${riderPhone}`} className="font-medium text-primary">
                  {riderPhone}
                </a>
              </div>
            )}
            {trackingNumber && (
              <div>
                <span className="text-muted-foreground">Tracking: </span>
                <span className="font-medium">{trackingNumber}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Proof of Delivery */}
      {proofOfDeliveryUrl && (
        <div className="space-y-2">
          <h4 className="font-medium text-sm flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            Proof of Delivery
          </h4>
          <img
            src={proofOfDeliveryUrl}
            alt="Proof of delivery"
            className="w-full max-w-xs rounded-xl border border-border"
          />
        </div>
      )}

      {/* Rider Info Form */}
      {showRiderForm && (
        <div className="bg-muted/50 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Add Rider Details</h4>
            <Button variant="ghost" size="icon" onClick={() => setShowRiderForm(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Delivery Provider</Label>
              <Input
                value={riderInfo.delivery_provider}
                onChange={(e) => setRiderInfo({ ...riderInfo, delivery_provider: e.target.value })}
                placeholder="e.g., Lalamove, Grab"
              />
            </div>
            <div>
              <Label>Tracking Number</Label>
              <Input
                value={riderInfo.tracking_number}
                onChange={(e) => setRiderInfo({ ...riderInfo, tracking_number: e.target.value })}
                placeholder="Optional"
              />
            </div>
            <div>
              <Label>Rider Name</Label>
              <Input
                value={riderInfo.rider_name}
                onChange={(e) => setRiderInfo({ ...riderInfo, rider_name: e.target.value })}
                placeholder="Rider's name"
              />
            </div>
            <div>
              <Label>Rider Phone</Label>
              <Input
                value={riderInfo.rider_phone}
                onChange={(e) => setRiderInfo({ ...riderInfo, rider_phone: e.target.value })}
                placeholder="09XX XXX XXXX"
              />
            </div>
          </div>
          <Button onClick={handleRiderInfoSubmit} className="w-full hero-gradient border-0">
            Save & Schedule Pickup
          </Button>
        </div>
      )}

      {/* Actions */}
      {!showRiderForm && (isSeller || isBuyer) && (
        <div className="pt-2">{getNextAction()}</div>
      )}
    </div>
  );
};

export default DeliveryStatusTracker;
