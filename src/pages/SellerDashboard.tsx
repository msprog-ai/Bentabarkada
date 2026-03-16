import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, ArrowLeft, Clock, CheckCircle, Truck, PackageCheck, XCircle, User, MapPin, Phone, CreditCard, Bike, Gavel, AlertCircle, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useOrders, Order } from '@/hooks/useOrders';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import DeliveryStatusTracker from '@/components/DeliveryStatusTracker';
import SellerBidsTab from '@/components/SellerBidsTab';

const statusConfig = {
  pending: { icon: Clock, color: 'text-yellow-600 bg-yellow-100', label: 'Pending' },
  confirmed: { icon: CheckCircle, color: 'text-blue-600 bg-blue-100', label: 'Confirmed' },
  shipped: { icon: Truck, color: 'text-purple-600 bg-purple-100', label: 'Shipped' },
  delivered: { icon: PackageCheck, color: 'text-green-600 bg-green-100', label: 'Delivered' },
  cancelled: { icon: XCircle, color: 'text-red-600 bg-red-100', label: 'Cancelled' },
};

const statusFlow = ['pending', 'confirmed', 'shipped', 'delivered'] as const;

const SellerDashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { orders, loading: ordersLoading, refetch } = useOrders();
  const [updatingOrder, setUpdatingOrder] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Filter orders where user is the seller
  const sellerOrders = orders.filter(order => order.seller_id === user?.id);
  
  const filteredOrders = statusFilter === 'all' 
    ? sellerOrders 
    : sellerOrders.filter(order => order.status === statusFilter);

  const orderStats = {
    pending: sellerOrders.filter(o => o.status === 'pending').length,
    confirmed: sellerOrders.filter(o => o.status === 'confirmed').length,
    shipped: sellerOrders.filter(o => o.status === 'shipped').length,
    delivered: sellerOrders.filter(o => o.status === 'delivered').length,
    cancelled: sellerOrders.filter(o => o.status === 'cancelled').length,
  };

  const updateOrderStatus = async (orderId: string, newStatus: Order['status']) => {
    setUpdatingOrder(orderId);
    
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);

    setUpdatingOrder(null);

    if (error) {
      toast.error('Failed to update order status');
      console.error('Update error:', error);
    } else {
      toast.success(`Order status updated to ${newStatus}`);
      refetch();
    }
  };

  const getNextStatus = (currentStatus: Order['status']): Order['status'] | null => {
    const currentIndex = statusFlow.indexOf(currentStatus as any);
    if (currentIndex === -1 || currentIndex >= statusFlow.length - 1) return null;
    return statusFlow[currentIndex + 1];
  };

  if (authLoading || ordersLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!user) {
    navigate('/auth');
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="hero-gradient py-8">
        <div className="container mx-auto px-4">
          <button 
            onClick={() => navigate('/')} 
            className="flex items-center gap-2 text-white/80 hover:text-white mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Marketplace
          </button>
          <h1 className="text-3xl font-bold text-white">Seller Dashboard</h1>
          <p className="text-white/80 mt-1">Manage your incoming orders</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="orders" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="orders" className="gap-2">
              <Package className="w-4 h-4" />
              Orders
            </TabsTrigger>
            <TabsTrigger value="bids" className="gap-2">
              <Gavel className="w-4 h-4" />
              Bids Received
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              {Object.entries(orderStats).map(([status, count]) => {
                const config = statusConfig[status as keyof typeof statusConfig];
                const Icon = config.icon;
                return (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status === statusFilter ? 'all' : status)}
                    className={`p-4 rounded-xl bg-card card-shadow transition-all ${
                      statusFilter === status ? 'ring-2 ring-primary' : ''
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg ${config.color} flex items-center justify-center mb-2`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <p className="text-2xl font-bold">{count}</p>
                    <p className="text-sm text-muted-foreground capitalize">{status}</p>
                  </button>
                );
              })}
            </div>

            {/* Filter */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">
                {statusFilter === 'all' ? 'All Orders' : `${statusConfig[statusFilter as keyof typeof statusConfig]?.label} Orders`}
                <span className="text-muted-foreground ml-2">({filteredOrders.length})</span>
              </h2>
              {statusFilter !== 'all' && (
                <Button variant="ghost" onClick={() => setStatusFilter('all')}>
                  Clear Filter
                </Button>
              )}
            </div>

            {/* Orders List */}
            {filteredOrders.length === 0 ? (
              <div className="text-center py-16 bg-card rounded-2xl card-shadow">
                <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No orders yet</h3>
                <p className="text-muted-foreground mb-4">
                  {statusFilter === 'all' 
                    ? 'When buyers purchase your items, orders will appear here.'
                    : `No ${statusFilter} orders at the moment.`}
                </p>
                <Button onClick={() => navigate('/')} className="hero-gradient border-0">
                  View Marketplace
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map((order) => {
                  const config = statusConfig[order.status];
                  const Icon = config.icon;
                  const nextStatus = getNextStatus(order.status);
                  
                  return (
                    <div key={order.id} className="bg-card rounded-2xl card-shadow overflow-hidden">
                      {/* Order Header */}
                      <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-3">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${config.color}`}>
                              <Icon className="w-3 h-3" />
                              {config.label}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              Order #{order.id.slice(0, 8)}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {order.status !== 'delivered' && order.status !== 'cancelled' && (
                            <>
                              {nextStatus && (
                                <Button
                                  onClick={() => updateOrderStatus(order.id, nextStatus)}
                                  disabled={updatingOrder === order.id}
                                  className="hero-gradient border-0"
                                >
                                  {updatingOrder === order.id ? 'Updating...' : `Mark as ${statusConfig[nextStatus].label}`}
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                onClick={() => updateOrderStatus(order.id, 'cancelled')}
                                disabled={updatingOrder === order.id}
                                className="text-destructive border-destructive/20 hover:bg-destructive/10"
                              >
                                Cancel
                              </Button>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="p-4 grid md:grid-cols-2 gap-6">
                        {/* Order Items */}
                        <div>
                          <h4 className="font-medium mb-3 text-sm text-muted-foreground uppercase tracking-wide">Items</h4>
                          <div className="space-y-3">
                            {order.items?.map((item) => (
                              <div key={item.id} className="flex items-center gap-3">
                                <img
                                  src={item.listing?.image_url || 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=400&fit=crop'}
                                  alt={item.listing?.title}
                                  className="w-14 h-14 rounded-lg object-cover"
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium truncate">{item.listing?.title}</p>
                                  <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                                </div>
                                <p className="font-semibold">₱{item.price.toLocaleString()}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Buyer & Delivery Info */}
                        <div className="space-y-4">
                          {order.address && (
                            <div>
                              <h4 className="font-medium mb-2 text-sm text-muted-foreground uppercase tracking-wide">Delivery Address</h4>
                              <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
                                <div className="flex items-center gap-2">
                                  <User className="w-4 h-4 text-muted-foreground" />
                                  <span className="font-medium">{order.address.recipient_name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Phone className="w-4 h-4 text-muted-foreground" />
                                  <span>{order.address.phone}</span>
                                </div>
                                <div className="flex items-start gap-2">
                                  <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                                  <span>
                                    {order.address.complete_address}, {order.address.barangay && `${order.address.barangay}, `}
                                    {order.address.city}, {order.address.province}
                                    {order.address.postal_code && ` ${order.address.postal_code}`}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}

                          <div>
                            <h4 className="font-medium mb-2 text-sm text-muted-foreground uppercase tracking-wide">Payment</h4>
                            <div className="flex items-center gap-2 text-sm">
                              <CreditCard className="w-4 h-4 text-muted-foreground" />
                              <span className="font-medium uppercase">{order.payment_method.replace('_', ' ')}</span>
                            </div>
                            {order.payment_status && (
                              <div className="mt-2">
                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                  order.payment_status === 'confirmed' ? 'bg-green-100 text-green-700' :
                                  order.payment_status === 'awaiting_review' ? 'bg-orange-100 text-orange-700' :
                                  order.payment_status === 'rejected' ? 'bg-red-100 text-red-700' :
                                  'bg-yellow-100 text-yellow-700'
                                }`}>
                                  {order.payment_status === 'awaiting_review' && <AlertCircle className="w-3 h-3" />}
                                  {order.payment_status === 'confirmed' && <CheckCircle className="w-3 h-3" />}
                                  Payment: {order.payment_status?.replace('_', ' ')}
                                </span>
                              </div>
                            )}
                            {order.payment_proof_url && (
                              <div className="mt-2">
                                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Image className="w-3 h-3" /> Payment Proof</p>
                                <img src={order.payment_proof_url} alt="Payment proof" className="w-full max-h-32 object-contain rounded border" />
                              </div>
                            )}
                            {order.payment_reference && (
                              <p className="text-xs text-muted-foreground mt-1">Ref: {order.payment_reference}</p>
                            )}
                          </div>

                          {order.notes && (
                            <div>
                              <h4 className="font-medium mb-2 text-sm text-muted-foreground uppercase tracking-wide">Notes</h4>
                              <p className="text-sm bg-muted/50 rounded-lg p-3">{order.notes}</p>
                            </div>
                          )}

                          {/* Delivery Tracking */}
                          {order.status === 'confirmed' || order.status === 'shipped' ? (
                            <div className="md:col-span-2 pt-4 border-t border-border">
                              <h4 className="font-medium mb-4 text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                                <Bike className="w-4 h-4" />
                                Delivery Tracking
                              </h4>
                              <DeliveryStatusTracker
                                orderId={order.id}
                                deliveryStatus={order.delivery_status || 'pending'}
                                deliveryMethod={order.delivery_method || null}
                                riderName={order.rider_name}
                                riderPhone={order.rider_phone}
                                trackingNumber={order.tracking_number}
                                deliveryProvider={order.delivery_provider}
                                proofOfDeliveryUrl={order.proof_of_delivery_url}
                                pickupPhotoUrl={order.pickup_photo_url}
                                riderTrackingLink={order.rider_tracking_link}
                                deliveryCheckpoint={order.delivery_checkpoint}
                                isSeller={true}
                                onUpdate={refetch}
                              />
                            </div>
                          ) : null}
                        </div>
                      </div>

                      {/* Order Footer */}
                      <div className="px-4 py-3 bg-muted/30 border-t border-border flex justify-between items-center">
                        <div className="text-sm">
                          <span className="text-muted-foreground">Subtotal: </span>
                          <span>₱{order.subtotal.toLocaleString()}</span>
                          <span className="mx-2 text-muted-foreground">|</span>
                          <span className="text-muted-foreground">Delivery: </span>
                          <span>₱{order.delivery_fee.toLocaleString()}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-muted-foreground text-sm">Total: </span>
                          <span className="text-xl font-bold text-gradient">₱{order.total.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="bids">
            <SellerBidsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SellerDashboard;
