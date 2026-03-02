import { useState } from 'react';
import { Package, Truck, MapPin, CheckCircle, Camera, X, Link as LinkIcon, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

type DeliveryStatus = 'pending' | 'pickup_scheduled' | 'picked_up' | 'in_transit' | 'delivered';

const DELIVERY_CHECKPOINTS = [
  { value: 'preparing', label: 'Preparing Shipment' },
  { value: 'at_warehouse', label: 'At Warehouse' },
  { value: 'at_sorting_hub', label: 'At Sorting Hub' },
  { value: 'out_for_delivery', label: 'Out for Delivery' },
  { value: 'arrived_at_city', label: 'Arrived at Destination City' },
  { value: 'at_local_hub', label: 'At Local Hub' },
  { value: 'with_rider', label: 'With Delivery Rider' },
  { value: 'near_destination', label: 'Near Destination' },
];

interface DeliveryStatusTrackerProps {
  orderId: string;
  deliveryStatus: DeliveryStatus;
  deliveryMethod: 'buyer_book' | 'seller_book' | null;
  riderName?: string;
  riderPhone?: string;
  trackingNumber?: string;
  deliveryProvider?: string;
  proofOfDeliveryUrl?: string;
  pickupPhotoUrl?: string;
  riderTrackingLink?: string;
  deliveryCheckpoint?: string;
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
  pickupPhotoUrl,
  riderTrackingLink,
  deliveryCheckpoint,
  isSeller = false,
  isBuyer = false,
  onUpdate,
}: DeliveryStatusTrackerProps) => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [showRiderForm, setShowRiderForm] = useState(false);
  const [riderInfo, setRiderInfo] = useState({
    rider_name: riderName || '',
    rider_phone: riderPhone || '',
    tracking_number: trackingNumber || '',
    delivery_provider: deliveryProvider || '',
    rider_tracking_link: riderTrackingLink || '',
  });

  const currentStepIndex = statusSteps.findIndex((s) => s.id === deliveryStatus);

  // Valid status transitions
  const validTransitions: Record<DeliveryStatus, DeliveryStatus[]> = {
    pending: ['pickup_scheduled'],
    pickup_scheduled: ['picked_up'],
    picked_up: ['in_transit'],
    in_transit: ['delivered'],
    delivered: [],
  };

  const validCheckpoints = DELIVERY_CHECKPOINTS.map(cp => cp.value);

  const updateDeliveryStatus = async (newStatus: DeliveryStatus, additionalData?: Record<string, any>) => {
    if (!isSeller || !user) {
      toast.error('Only sellers can update delivery status');
      return;
    }

    // Validate status transition
    if (!validTransitions[deliveryStatus]?.includes(newStatus)) {
      toast.error(`Invalid status transition from ${deliveryStatus} to ${newStatus}`);
      return;
    }

    const { error } = await supabase
      .from('orders')
      .update({ 
        delivery_status: newStatus,
        ...additionalData
      })
      .eq('id', orderId)
      .eq('seller_id', user.id);

    if (error) {
      toast.error('Failed to update delivery status');
      console.error(error);
    } else {
      toast.success(`Delivery status updated to ${newStatus.replace('_', ' ')}`);
      onUpdate?.();
    }
  };

  const handleRiderInfoSubmit = async () => {
    if (!riderInfo.rider_tracking_link && !riderInfo.delivery_provider) {
      toast.error('Please add a rider tracking link or select a courier');
      return;
    }
    await updateDeliveryStatus('pickup_scheduled', riderInfo);
    setShowRiderForm(false);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'pickup' | 'delivery') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    const fileExt = file.name.split('.').pop();
    const fileName = `${orderId}-${type}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('delivery-proofs')
      .upload(fileName, file);

    if (uploadError) {
      toast.error(`Failed to upload ${type} photo`);
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('delivery-proofs')
      .getPublicUrl(fileName);

    if (type === 'pickup') {
      await updateDeliveryStatus('picked_up', { pickup_photo_url: publicUrl });
    } else {
      await updateDeliveryStatus('delivered', { proof_of_delivery_url: publicUrl });
    }
    setUploading(false);
  };

  const handleCheckpointUpdate = async (checkpoint: string) => {
    if (!isSeller || !user) {
      toast.error('Only sellers can update checkpoints');
      return;
    }

    if (!validCheckpoints.includes(checkpoint)) {
      toast.error('Invalid checkpoint value');
      return;
    }

    const { error } = await supabase
      .from('orders')
      .update({ delivery_checkpoint: checkpoint })
      .eq('id', orderId)
      .eq('seller_id', user.id);

    if (error) {
      toast.error('Failed to update checkpoint');
    } else {
      toast.success('Shipment location updated');
      onUpdate?.();
    }
  };

  const getNextAction = () => {
    if (deliveryStatus === 'delivered') return null;

    if (deliveryStatus === 'pending' && isSeller) {
      return (
        <Button
          onClick={() => setShowRiderForm(true)}
          className="hero-gradient border-0 gap-2"
        >
          <LinkIcon className="w-4 h-4" />
          Add Rider / Courier Details
        </Button>
      );
    }

    if (deliveryStatus === 'pickup_scheduled' && isSeller) {
      return (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Upload photo evidence that rider has picked up the item
          </p>
          <Label htmlFor="pickup-upload" className="cursor-pointer">
            <div className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
              {uploading ? (
                <span>Uploading...</span>
              ) : (
                <>
                  <Camera className="w-4 h-4" />
                  <span>Upload Pickup Photo</span>
                </>
              )}
            </div>
          </Label>
          <input
            id="pickup-upload"
            type="file"
            accept="image/*"
            onChange={(e) => handlePhotoUpload(e, 'pickup')}
            disabled={uploading}
            className="hidden"
          />
        </div>
      );
    }

    if (deliveryStatus === 'picked_up' && isSeller) {
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
        <div className="space-y-4">
          {/* Checkpoint selector for seller */}
          {isSeller && (
            <div>
              <Label className="mb-2 block">Update Shipment Location</Label>
              <Select value={deliveryCheckpoint || 'preparing'} onValueChange={handleCheckpointUpdate}>
                <SelectTrigger>
                  <SelectValue placeholder="Select current location" />
                </SelectTrigger>
                <SelectContent>
                  {DELIVERY_CHECKPOINTS.map((cp) => (
                    <SelectItem key={cp.value} value={cp.value}>{cp.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Proof of delivery upload */}
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
              onChange={(e) => handlePhotoUpload(e, 'delivery')}
              disabled={uploading}
              className="hidden"
            />
          </div>
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

      {/* Current Checkpoint (in transit) */}
      {deliveryStatus === 'in_transit' && deliveryCheckpoint && (
        <div className="bg-primary/5 rounded-xl p-4 flex items-center gap-3">
          <MapPin className="w-5 h-5 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Current Location</p>
            <p className="font-medium">{DELIVERY_CHECKPOINTS.find(cp => cp.value === deliveryCheckpoint)?.label || deliveryCheckpoint}</p>
          </div>
        </div>
      )}

      {/* Rider Info */}
      {(riderName || deliveryProvider || riderTrackingLink) && (
        <div className="bg-muted/50 rounded-xl p-4 space-y-2">
          <h4 className="font-medium text-sm">Rider / Courier Details</h4>
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
          {riderTrackingLink && (
            <a
              href={riderTrackingLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors text-sm font-medium mt-2"
            >
              <ExternalLink className="w-4 h-4" />
              Open Rider Tracking
            </a>
          )}
        </div>
      )}

      {/* Pickup Photo Evidence */}
      {pickupPhotoUrl && (
        <div className="space-y-2">
          <h4 className="font-medium text-sm flex items-center gap-2">
            <Package className="w-4 h-4 text-blue-600" />
            Pickup Evidence
          </h4>
          <img
            src={pickupPhotoUrl}
            alt="Pickup evidence"
            className="w-full max-w-xs rounded-xl border border-border"
          />
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
            <h4 className="font-medium">Add Rider / Courier Details</h4>
            <Button variant="ghost" size="icon" onClick={() => setShowRiderForm(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="space-y-4">
            <div>
              <Label>Rider Tracking Link *</Label>
              <Input
                value={riderInfo.rider_tracking_link}
                onChange={(e) => setRiderInfo({ ...riderInfo, rider_tracking_link: e.target.value })}
                placeholder="e.g., https://lalamove.com/track/..."
              />
              <p className="text-xs text-muted-foreground mt-1">
                Paste the tracking link from your rider app (Lalamove, Grab, etc.)
              </p>
            </div>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-muted px-2 text-muted-foreground">Or use a courier</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Courier / Provider</Label>
                <Input
                  value={riderInfo.delivery_provider}
                  onChange={(e) => setRiderInfo({ ...riderInfo, delivery_provider: e.target.value })}
                  placeholder="e.g., J&T, Flash Express"
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
                  placeholder="Optional"
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
