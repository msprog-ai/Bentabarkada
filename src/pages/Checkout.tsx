import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, CreditCard, Truck, Plus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCart';
import { useOrders, Address } from '@/hooks/useOrders';
import { philippineCities, getDeliveryZoneByCity } from '@/data/philippineLocations';
import { toast } from 'sonner';
import DeliveryMethodSelector from '@/components/DeliveryMethodSelector';

const Checkout = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { cartItems, cartTotal, clearCart } = useCart();
  const { addresses, deliveryZones, createAddress, createOrder } = useOrders();

  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'gcash' | 'maya' | 'qr_ph' | 'cod'>('gcash');
  const [deliveryMethod, setDeliveryMethod] = useState<'buyer_book' | 'seller_book' | null>(null);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [newAddress, setNewAddress] = useState({
    label: 'Home',
    recipient_name: '',
    phone: '',
    city: '',
    province: '',
    barangay: '',
    complete_address: '',
    postal_code: '',
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (addresses.length > 0 && !selectedAddress) {
      const defaultAddr = addresses.find(a => a.is_default) || addresses[0];
      setSelectedAddress(defaultAddr.id);
    }
  }, [addresses, selectedAddress]);

  const getSelectedAddressData = (): Address | undefined => {
    return addresses.find(a => a.id === selectedAddress);
  };

  const getDeliveryFee = (): number => {
    const addr = getSelectedAddressData();
    if (!addr) return 0;
    
    const zoneName = getDeliveryZoneByCity(addr.city);
    const zone = deliveryZones.find(z => z.name === zoneName);
    return zone?.base_fee || 150; // Default to Luzon rate
  };

  const deliveryFee = getDeliveryFee();
  const orderTotal = cartTotal + deliveryFee;

  const handleAddAddress = async () => {
    if (!newAddress.recipient_name || !newAddress.phone || !newAddress.city || !newAddress.complete_address) {
      toast.error('Please fill in all required fields');
      return;
    }

    const zoneName = getDeliveryZoneByCity(newAddress.city);
    const zone = deliveryZones.find(z => z.name === zoneName);

    const { data, error } = await createAddress({
      ...newAddress,
      delivery_zone_id: zone?.id,
      is_default: addresses.length === 0,
    });

    if (!error && data) {
      setSelectedAddress(data.id);
      setShowAddressForm(false);
      setNewAddress({
        label: 'Home',
        recipient_name: '',
        phone: '',
        city: '',
        province: '',
        barangay: '',
        complete_address: '',
        postal_code: '',
      });
    }
  };

  const handleCityChange = (city: string) => {
    const cityData = philippineCities.find(c => c.name === city);
    setNewAddress(prev => ({
      ...prev,
      city,
      province: cityData?.province || ''
    }));
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      toast.error('Please select a delivery address');
      return;
    }

    if (!deliveryMethod) {
      toast.error('Please select a delivery method');
      return;
    }

    if (cartItems.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    setIsSubmitting(true);

    const items = cartItems.map(item => ({
      listing_id: item.listing_id,
      quantity: item.quantity,
      price: item.listing?.price || 0,
      seller_id: (item as any).listing?.seller?.id || ''
    }));

    // Get seller IDs from the cart items via listings
    const itemsWithSellers = await Promise.all(
      cartItems.map(async (item) => {
        const { data } = await (await import('@/integrations/supabase/client')).supabase
          .from('listings')
          .select('user_id')
          .eq('id', item.listing_id)
          .single();
        
        return {
          listing_id: item.listing_id,
          quantity: item.quantity,
          price: item.listing?.price || 0,
          seller_id: data?.user_id || ''
        };
      })
    );

    const { error } = await createOrder(
      itemsWithSellers,
      paymentMethod,
      selectedAddress,
      deliveryFee,
      notes || undefined,
      deliveryMethod
    );

    setIsSubmitting(false);

    if (!error) {
      await clearCart();
      navigate('/profile?tab=orders');
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-16">
            <h1 className="text-2xl font-bold mb-4">Your cart is empty</h1>
            <Button onClick={() => navigate('/')} className="hero-gradient border-0">
              Continue Shopping
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="hero-gradient py-6">
        <div className="container mx-auto px-4">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-white/80 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <h1 className="text-2xl font-bold text-white mt-4">Checkout</h1>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Delivery Address */}
            <div className="bg-card rounded-2xl p-6 card-shadow">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">Delivery Address</h2>
              </div>

              {addresses.length > 0 && !showAddressForm && (
                <RadioGroup value={selectedAddress} onValueChange={setSelectedAddress}>
                  {addresses.map((addr) => (
                    <div
                      key={addr.id}
                      className={`flex items-start gap-3 p-4 rounded-xl border-2 transition-colors ${
                        selectedAddress === addr.id ? 'border-primary bg-primary/5' : 'border-border'
                      }`}
                    >
                      <RadioGroupItem value={addr.id} id={addr.id} className="mt-1" />
                      <label htmlFor={addr.id} className="flex-1 cursor-pointer">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{addr.label}</span>
                          {addr.is_default && (
                            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {addr.recipient_name} • {addr.phone}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {addr.complete_address}, {addr.barangay && `${addr.barangay}, `}
                          {addr.city}, {addr.province}
                        </p>
                      </label>
                    </div>
                  ))}
                </RadioGroup>
              )}

              {!showAddressForm && (
                <Button
                  variant="outline"
                  className="w-full mt-4 gap-2"
                  onClick={() => setShowAddressForm(true)}
                >
                  <Plus className="w-4 h-4" />
                  Add New Address
                </Button>
              )}

              {showAddressForm && (
                <div className="space-y-4 mt-4 p-4 border border-border rounded-xl">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Label</Label>
                      <Select
                        value={newAddress.label}
                        onValueChange={(v) => setNewAddress({ ...newAddress, label: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Home">Home</SelectItem>
                          <SelectItem value="Office">Office</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Recipient Name *</Label>
                      <Input
                        value={newAddress.recipient_name}
                        onChange={(e) => setNewAddress({ ...newAddress, recipient_name: e.target.value })}
                        placeholder="Full name"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Phone Number *</Label>
                    <Input
                      value={newAddress.phone}
                      onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                      placeholder="09XX XXX XXXX"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>City *</Label>
                      <Select value={newAddress.city} onValueChange={handleCityChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select city" />
                        </SelectTrigger>
                        <SelectContent>
                          {philippineCities.map((city) => (
                            <SelectItem key={`${city.name}-${city.province}`} value={city.name}>
                              {city.name}, {city.province}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Province</Label>
                      <Input value={newAddress.province} disabled />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Barangay</Label>
                      <Input
                        value={newAddress.barangay}
                        onChange={(e) => setNewAddress({ ...newAddress, barangay: e.target.value })}
                        placeholder="Barangay name"
                      />
                    </div>
                    <div>
                      <Label>Postal Code</Label>
                      <Input
                        value={newAddress.postal_code}
                        onChange={(e) => setNewAddress({ ...newAddress, postal_code: e.target.value })}
                        placeholder="e.g., 1234"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Complete Address *</Label>
                    <Textarea
                      value={newAddress.complete_address}
                      onChange={(e) => setNewAddress({ ...newAddress, complete_address: e.target.value })}
                      placeholder="House/Unit No., Street, Building, Landmark"
                      rows={2}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handleAddAddress} className="flex-1 hero-gradient border-0">
                      Save Address
                    </Button>
                    <Button variant="outline" onClick={() => setShowAddressForm(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Payment Method */}
            <div className="bg-card rounded-2xl p-6 card-shadow">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">Payment Method</h2>
              </div>

              <RadioGroup value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)}>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { id: 'gcash', name: 'GCash', desc: 'Pay via GCash' },
                    { id: 'maya', name: 'Maya', desc: 'Pay via Maya' },
                    { id: 'qr_ph', name: 'QR PH', desc: 'Scan QR code to pay' },
                    { id: 'cod', name: 'Cash on Delivery', desc: 'Pay when you receive' },
                  ].map((method) => (
                    <div
                      key={method.id}
                      className={`flex items-start gap-3 p-4 rounded-xl border-2 transition-colors cursor-pointer ${
                        paymentMethod === method.id ? 'border-primary bg-primary/5' : 'border-border'
                      }`}
                      onClick={() => setPaymentMethod(method.id as any)}
                    >
                      <RadioGroupItem value={method.id} id={method.id} className="mt-1" />
                      <label htmlFor={method.id} className="cursor-pointer">
                        <span className="font-medium">{method.name}</span>
                        <p className="text-sm text-muted-foreground">{method.desc}</p>
                      </label>
                    </div>
                  ))}
                </div>
              </RadioGroup>

              {paymentMethod !== 'cod' && (
                <div className="mt-4 p-4 bg-muted/50 rounded-xl">
                  <p className="text-sm text-muted-foreground">
                    📱 The seller will send you payment details after confirming your order.
                    Please wait for their message before sending payment.
                  </p>
                </div>
              )}
            </div>

            {/* Delivery Method */}
            <div className="bg-card rounded-2xl p-6 card-shadow">
              <div className="flex items-center gap-2 mb-4">
                <Truck className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">Delivery Method</h2>
              </div>
              <DeliveryMethodSelector
                value={deliveryMethod}
                onChange={setDeliveryMethod}
              />
            </div>

            {/* Order Notes */}
            <div className="bg-card rounded-2xl p-6 card-shadow">
              <h2 className="text-lg font-semibold mb-4">Order Notes (Optional)</h2>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special instructions for the seller..."
                rows={3}
              />
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-2xl p-6 card-shadow sticky top-4">
              <h2 className="text-lg font-semibold mb-4">Order Summary</h2>

              <div className="space-y-4 mb-6">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <img
                      src={item.listing?.image}
                      alt={item.listing?.title}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.listing?.title}</p>
                      <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                      <p className="text-sm font-semibold">₱{item.listing?.price.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-border pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>₱{cartTotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Truck className="w-4 h-4" />
                    Delivery Fee
                  </span>
                  <span>₱{deliveryFee.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-2 border-t border-border">
                  <span>Total</span>
                  <span className="text-gradient">₱{orderTotal.toLocaleString()}</span>
                </div>
              </div>

              <Button
                onClick={handlePlaceOrder}
                disabled={isSubmitting || !selectedAddress}
                className="w-full mt-6 hero-gradient border-0 gap-2"
              >
                {isSubmitting ? (
                  'Processing...'
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Place Order
                  </>
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center mt-4">
                By placing this order, you agree to our Terms of Service
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
