import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { Navbar } from '@/components/Navbar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ShieldCheck, Package, ShoppingBag, Users, UserCheck, Eye, Check, X, Loader2, ArrowLeft, CreditCard, Store, ShoppingCart, Filter } from 'lucide-react';
import { toast } from 'sonner';

const AdminDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading, fetchAdminData } = useAdmin();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('orders');
  const [data, setData] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Filters
  const [userTypeFilter, setUserTypeFilter] = useState<string>('all');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all');

  // Review state
  const [reviewingVerification, setReviewingVerification] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [reviewingListing, setReviewingListing] = useState<any | null>(null);
  const [reviewingPayment, setReviewingPayment] = useState<any | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
    if (!authLoading && !adminLoading && user && !isAdmin) navigate('/');
  }, [authLoading, adminLoading, user, isAdmin, navigate]);

  useEffect(() => {
    if (isAdmin) loadData(activeTab);
  }, [isAdmin, activeTab]);

  const loadData = async (tab: string) => {
    setDataLoading(true);
    try {
      const result = await fetchAdminData(tab);
      setData(result || []);
    } catch (e) {
      console.error('Admin data error:', e);
      setData([]);
    }
    setDataLoading(false);
  };

  const callAdminAction = async (body: Record<string, any>) => {
    setActionLoading(true);
    try {
      const { data: { session } } = await (await import('@/integrations/supabase/client')).supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-data`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify(body),
        }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed');
      }
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Action failed');
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerificationAction = async (action: 'approve_verification' | 'reject_verification') => {
    if (!reviewingVerification) return;
    if (action === 'reject_verification' && !rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    const success = await callAdminAction({
      action,
      verification_id: reviewingVerification.id,
      rejection_reason: rejectionReason || undefined,
    });
    if (success) {
      toast.success(action === 'approve_verification' ? 'Seller approved!' : 'Verification rejected');
      setReviewingVerification(null);
      setRejectionReason('');
      loadData('verifications');
    }
  };

  const handleListingAction = async (action: 'approve_listing' | 'reject_listing', listingId: string) => {
    const success = await callAdminAction({ action, listing_id: listingId });
    if (success) {
      toast.success(action === 'approve_listing' ? 'Listing approved!' : 'Listing rejected');
      setReviewingListing(null);
      loadData('listings');
    }
  };

  const handleUserAction = async (action: 'approve_user' | 'reject_user', userId: string) => {
    const success = await callAdminAction({ action, user_id: userId });
    if (success) {
      toast.success(action === 'approve_user' ? 'User approved!' : 'User access revoked');
      loadData('users');
    }
  };

  const handlePaymentAction = async (action: 'confirm_payment' | 'reject_payment', orderId: string) => {
    const success = await callAdminAction({ action, order_id: orderId });
    if (success) {
      toast.success(action === 'confirm_payment' ? 'Payment confirmed!' : 'Payment rejected');
      setReviewingPayment(null);
      loadData('orders');
    }
  };

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar searchQuery="" onSearchChange={() => {}} onPostClick={() => {}} />
        <div className="container mx-auto p-6 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!isAdmin) return null;

  const statusColor = (status: string) => {
    const map: Record<string, string> = {
      pending: 'bg-yellow-500/10 text-yellow-600',
      confirmed: 'bg-blue-500/10 text-blue-600',
      shipped: 'bg-purple-500/10 text-purple-600',
      delivered: 'bg-green-500/10 text-green-600',
      cancelled: 'bg-red-500/10 text-red-600',
      approved: 'bg-green-500/10 text-green-600',
      rejected: 'bg-red-500/10 text-red-600',
      awaiting_review: 'bg-orange-500/10 text-orange-600',
    };
    return map[status] || 'bg-muted text-muted-foreground';
  };

  const ID_TYPE_LABELS: Record<string, string> = {
    philippine_id: 'Philippine National ID',
    drivers_license: "Driver's License",
    passport: 'Passport',
    sss_id: 'SSS ID',
    philhealth_id: 'PhilHealth ID',
    voters_id: "Voter's ID",
    postal_id: 'Postal ID',
  };

  // Filtered data
  const filteredUsers = data.filter((u: any) => {
    if (userTypeFilter === 'sellers') return u.user_type === 'seller';
    if (userTypeFilter === 'buyers') return u.user_type === 'buyer';
    if (userTypeFilter === 'pending') return !u.is_approved;
    return true;
  });

  const filteredOrders = data.filter((o: any) => {
    let match = true;
    if (orderStatusFilter !== 'all') match = match && o.status === orderStatusFilter;
    if (paymentStatusFilter !== 'all') match = match && o.payment_status === paymentStatusFilter;
    return match;
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar searchQuery={searchQuery} onSearchChange={setSearchQuery} onPostClick={() => {}} />

      <div className="container mx-auto px-4 py-6">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Marketplace
        </button>
        <div className="flex items-center gap-3 mb-6">
          <ShieldCheck className="w-7 h-7 text-primary" />
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 flex-wrap">
            <TabsTrigger value="orders" className="gap-2"><Package className="w-4 h-4" /> Orders</TabsTrigger>
            <TabsTrigger value="listings" className="gap-2"><ShoppingBag className="w-4 h-4" /> Listings</TabsTrigger>
            <TabsTrigger value="users" className="gap-2"><Users className="w-4 h-4" /> Users</TabsTrigger>
            <TabsTrigger value="verifications" className="gap-2"><UserCheck className="w-4 h-4" /> Seller Approvals</TabsTrigger>
          </TabsList>

          {/* Orders Tab */}
          <TabsContent value="orders">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Orders</CardTitle></CardHeader>
                <CardContent><p className="text-2xl font-bold">{data.length}</p></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Awaiting Payment</CardTitle></CardHeader>
                <CardContent><p className="text-2xl font-bold text-orange-600">{data.filter((d: any) => d.payment_status === 'awaiting_review').length}</p></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Pending</CardTitle></CardHeader>
                <CardContent><p className="text-2xl font-bold text-yellow-600">{data.filter((d: any) => d.status === 'pending').length}</p></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Delivered</CardTitle></CardHeader>
                <CardContent><p className="text-2xl font-bold text-green-600">{data.filter((d: any) => d.status === 'delivered').length}</p></CardContent>
              </Card>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select value={orderStatusFilter} onValueChange={setOrderStatusFilter}>
                <SelectTrigger className="w-[160px]"><SelectValue placeholder="Order Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Payment Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Payments</SelectItem>
                  <SelectItem value="awaiting_review">Awaiting Review</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {dataLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : filteredOrders.length === 0 ? (
              <EmptyState icon={Package} message="No orders found" />
            ) : (
              <div className="rounded-lg border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Buyer</TableHead>
                      <TableHead>Seller</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Payment Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map((order: any) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-xs">{order.id.slice(0, 8)}...</TableCell>
                        <TableCell>{order.buyer_profile?.display_name || 'Unknown'}</TableCell>
                        <TableCell>{order.seller_profile?.display_name || 'Unknown'}</TableCell>
                        <TableCell>₱{Number(order.total).toLocaleString()}</TableCell>
                        <TableCell><Badge className={statusColor(order.status)}>{order.status}</Badge></TableCell>
                        <TableCell className="uppercase text-xs">{order.payment_method?.replace('_', ' ')}</TableCell>
                        <TableCell>
                          <Badge className={statusColor(order.payment_status || 'pending')}>
                            {(order.payment_status || 'pending').replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          {order.payment_status === 'awaiting_review' && (
                            <Button size="sm" variant="outline" className="gap-1" onClick={() => setReviewingPayment(order)}>
                              <CreditCard className="w-3 h-3" /> Review
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* Listings Tab */}
          <TabsContent value="listings">
            {dataLoading ? <Skeleton className="h-64 w-full" /> : data.length === 0 ? <EmptyState icon={ShoppingBag} message="No listings yet" /> : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Pending Review</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-yellow-600">{data.filter((l: any) => l.approval_status === 'pending').length}</p></CardContent></Card>
                  <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Approved</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-green-600">{data.filter((l: any) => l.approval_status === 'approved').length}</p></CardContent></Card>
                  <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Rejected</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-red-600">{data.filter((l: any) => l.approval_status === 'rejected').length}</p></CardContent></Card>
                </div>
                <div className="rounded-lg border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Image</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Seller</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.map((listing: any) => (
                        <TableRow key={listing.id}>
                          <TableCell>{listing.image_url && <img src={listing.image_url} alt={listing.title} className="w-12 h-12 rounded-lg object-cover" />}</TableCell>
                          <TableCell className="font-medium max-w-[200px] truncate">{listing.title}</TableCell>
                          <TableCell>{listing.seller_name}</TableCell>
                          <TableCell>₱{Number(listing.price).toLocaleString()}</TableCell>
                          <TableCell>{listing.quantity || 1}</TableCell>
                          <TableCell><Badge variant="outline">{listing.category}</Badge></TableCell>
                          <TableCell><Badge className={statusColor(listing.approval_status || 'pending')}>{listing.approval_status || 'pending'}</Badge></TableCell>
                          <TableCell className="text-xs text-muted-foreground">{new Date(listing.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Button size="sm" variant="outline" className="gap-1" onClick={() => setReviewingListing(listing)}><Eye className="w-3 h-3" /> Review</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            {dataLoading ? <Skeleton className="h-64 w-full" /> : data.length === 0 ? <EmptyState icon={Users} message="No users yet" /> : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Users</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{data.length}</p></CardContent></Card>
                  <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Sellers</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-primary">{data.filter((u: any) => u.user_type === 'seller').length}</p></CardContent></Card>
                  <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Buyers</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-blue-600">{data.filter((u: any) => u.user_type === 'buyer').length}</p></CardContent></Card>
                  <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Pending Approval</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-yellow-600">{data.filter((u: any) => !u.is_approved).length}</p></CardContent></Card>
                </div>

                {/* User type filter */}
                <div className="flex items-center gap-3 mb-4">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  <Select value={userTypeFilter} onValueChange={setUserTypeFilter}>
                    <SelectTrigger className="w-[160px]"><SelectValue placeholder="Filter by type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="sellers">Sellers Only</SelectItem>
                      <SelectItem value="buyers">Buyers Only</SelectItem>
                      <SelectItem value="pending">Pending Approval</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="rounded-lg border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Roles</TableHead>
                        <TableHead>Approved</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((profile: any) => (
                        <TableRow key={profile.id}>
                          <TableCell className="font-medium">{profile.display_name || 'No name'}</TableCell>
                          <TableCell className="text-xs">{profile.email}</TableCell>
                          <TableCell>{profile.phone || '-'}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="gap-1">
                              {profile.user_type === 'seller' ? <><Store className="w-3 h-3" /> Seller</> : <><ShoppingCart className="w-3 h-3" /> Buyer</>}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {profile.roles?.length > 0
                              ? profile.roles.map((r: string) => <Badge key={r} className="mr-1" variant="outline">{r}</Badge>)
                              : <span className="text-muted-foreground text-xs">user</span>}
                          </TableCell>
                          <TableCell>
                            {profile.is_approved
                              ? <Badge className="bg-green-500/10 text-green-600">Approved</Badge>
                              : <Badge className="bg-yellow-500/10 text-yellow-600">Pending</Badge>}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{new Date(profile.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {!profile.is_approved ? (
                                <Button size="sm" className="gap-1 hero-gradient border-0" onClick={() => handleUserAction('approve_user', profile.user_id)} disabled={actionLoading}>
                                  {actionLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Approve
                                </Button>
                              ) : (
                                <Button size="sm" variant="outline" className="gap-1 text-red-600" onClick={() => handleUserAction('reject_user', profile.user_id)} disabled={actionLoading}>
                                  <X className="w-3 h-3" /> Suspend
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </TabsContent>

          {/* Verifications Tab */}
          <TabsContent value="verifications">
            {dataLoading ? <Skeleton className="h-64 w-full" /> : data.length === 0 ? <EmptyState icon={UserCheck} message="No verification requests" /> : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Pending Review</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-yellow-600">{data.filter((v: any) => v.status === 'pending').length}</p></CardContent></Card>
                  <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Approved</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-green-600">{data.filter((v: any) => v.status === 'approved').length}</p></CardContent></Card>
                  <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Rejected</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-red-600">{data.filter((v: any) => v.status === 'rejected').length}</p></CardContent></Card>
                </div>
                <div className="rounded-lg border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Shop</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>ID Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.map((v: any) => (
                        <TableRow key={v.id}>
                          <TableCell className="font-medium">{v.full_name}</TableCell>
                          <TableCell className="text-sm">{v.shop_name || '-'}</TableCell>
                          <TableCell className="text-xs">{v.email}</TableCell>
                          <TableCell className="text-xs">{v.phone}</TableCell>
                          <TableCell className="text-xs">{ID_TYPE_LABELS[v.id_type] || v.id_type}</TableCell>
                          <TableCell><Badge className={statusColor(v.status)}>{v.status}</Badge></TableCell>
                          <TableCell className="text-xs text-muted-foreground">{new Date(v.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Button size="sm" variant="outline" className="gap-1" onClick={() => setReviewingVerification(v)}>
                              <Eye className="w-3 h-3" /> Review
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Verification Review Dialog */}
      <Dialog open={!!reviewingVerification} onOpenChange={() => { setReviewingVerification(null); setRejectionReason(''); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><UserCheck className="w-5 h-5" /> Review Verification - {reviewingVerification?.full_name}</DialogTitle>
          </DialogHeader>
          {reviewingVerification && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-muted-foreground">Full Name</p><p className="font-medium">{reviewingVerification.full_name}</p></div>
                <div><p className="text-muted-foreground">Shop Name</p><p className="font-medium">{reviewingVerification.shop_name || 'N/A'}</p></div>
                <div><p className="text-muted-foreground">Email</p><p className="font-medium">{reviewingVerification.email}</p></div>
                <div><p className="text-muted-foreground">Phone</p><p className="font-medium">{reviewingVerification.phone}</p></div>
                <div className="col-span-2"><p className="text-muted-foreground">Address</p><p className="font-medium">{reviewingVerification.address}</p></div>
                <div><p className="text-muted-foreground">ID Type</p><p className="font-medium">{ID_TYPE_LABELS[reviewingVerification.id_type] || reviewingVerification.id_type}</p></div>
                <div><p className="text-muted-foreground">Status</p><Badge className={statusColor(reviewingVerification.status)}>{reviewingVerification.status}</Badge></div>
                {reviewingVerification.social_link && (
                  <div className="col-span-2"><p className="text-muted-foreground">Social / Store Link</p><a href={reviewingVerification.social_link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{reviewingVerification.social_link}</a></div>
                )}
              </div>
              <div>
                <h4 className="font-medium mb-3">Submitted Documents</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {reviewingVerification.id_front_url_signed && (
                    <div><p className="text-xs text-muted-foreground mb-1">ID Front</p><img src={reviewingVerification.id_front_url_signed} alt="ID Front" className="w-full h-48 object-cover rounded-lg border" /></div>
                  )}
                  {reviewingVerification.id_back_url_signed && (
                    <div><p className="text-xs text-muted-foreground mb-1">ID Back</p><img src={reviewingVerification.id_back_url_signed} alt="ID Back" className="w-full h-48 object-cover rounded-lg border" /></div>
                  )}
                  {reviewingVerification.selfie_url_signed && (
                    <div><p className="text-xs text-muted-foreground mb-1">Selfie with ID</p><img src={reviewingVerification.selfie_url_signed} alt="Selfie" className="w-full h-48 object-cover rounded-lg border" /></div>
                  )}
                </div>
              </div>
              {reviewingVerification.rejection_reason && (
                <div className="bg-destructive/10 p-3 rounded-lg text-sm">
                  <p className="font-medium text-destructive">Previous Rejection Reason:</p>
                  <p>{reviewingVerification.rejection_reason}</p>
                </div>
              )}
              {reviewingVerification.status === 'pending' && (
                <>
                  <div>
                    <label className="text-sm font-medium block mb-2">Rejection Reason (required if rejecting)</label>
                    <Input placeholder="e.g., ID is blurry, selfie doesn't match..." value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} />
                  </div>
                  <DialogFooter className="gap-2">
                    <Button variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10 gap-1" onClick={() => handleVerificationAction('reject_verification')} disabled={actionLoading}>
                      {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />} Reject
                    </Button>
                    <Button className="hero-gradient border-0 gap-1" onClick={() => handleVerificationAction('approve_verification')} disabled={actionLoading}>
                      {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Approve Seller
                    </Button>
                  </DialogFooter>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Listing Review Dialog */}
      <Dialog open={!!reviewingListing} onOpenChange={() => setReviewingListing(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ShoppingBag className="w-5 h-5" /> Review Listing</DialogTitle>
          </DialogHeader>
          {reviewingListing && (
            <div className="space-y-4">
              {reviewingListing.image_url && <img src={reviewingListing.image_url} alt={reviewingListing.title} className="w-full h-64 object-cover rounded-xl" />}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-muted-foreground">Title</p><p className="font-medium">{reviewingListing.title}</p></div>
                <div><p className="text-muted-foreground">Price</p><p className="font-medium">₱{Number(reviewingListing.price).toLocaleString()}</p></div>
                <div><p className="text-muted-foreground">Quantity</p><p className="font-medium">{reviewingListing.quantity || 1}</p></div>
                <div><p className="text-muted-foreground">Seller</p><p className="font-medium">{reviewingListing.seller_name}</p></div>
                <div><p className="text-muted-foreground">Category</p><Badge variant="outline">{reviewingListing.category}</Badge></div>
                <div><p className="text-muted-foreground">Condition</p><p className="font-medium capitalize">{reviewingListing.condition}</p></div>
                <div className="col-span-2"><p className="text-muted-foreground">Description</p><p className="font-medium">{reviewingListing.description}</p></div>
                <div><p className="text-muted-foreground">Current Status</p><Badge className={statusColor(reviewingListing.approval_status || 'pending')}>{reviewingListing.approval_status || 'pending'}</Badge></div>
              </div>
              {(reviewingListing.approval_status === 'pending' || !reviewingListing.approval_status) && (
                <DialogFooter className="gap-2">
                  <Button variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10 gap-1" onClick={() => handleListingAction('reject_listing', reviewingListing.id)} disabled={actionLoading}>
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />} Reject
                  </Button>
                  <Button className="hero-gradient border-0 gap-1" onClick={() => handleListingAction('approve_listing', reviewingListing.id)} disabled={actionLoading}>
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Approve
                  </Button>
                </DialogFooter>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Review Dialog */}
      <Dialog open={!!reviewingPayment} onOpenChange={() => setReviewingPayment(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><CreditCard className="w-5 h-5" /> Review Payment Proof</DialogTitle>
          </DialogHeader>
          {reviewingPayment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-muted-foreground">Order ID</p><p className="font-mono text-xs">{reviewingPayment.id.slice(0, 8)}...</p></div>
                <div><p className="text-muted-foreground">Total</p><p className="font-medium">₱{Number(reviewingPayment.total).toLocaleString()}</p></div>
                <div><p className="text-muted-foreground">Payment Method</p><p className="font-medium uppercase">{reviewingPayment.payment_method?.replace('_', ' ')}</p></div>
                <div><p className="text-muted-foreground">Reference #</p><p className="font-medium">{reviewingPayment.payment_reference || 'N/A'}</p></div>
                <div><p className="text-muted-foreground">Buyer</p><p className="font-medium">{reviewingPayment.buyer_profile?.display_name || 'Unknown'}</p></div>
                <div><p className="text-muted-foreground">Seller</p><p className="font-medium">{reviewingPayment.seller_profile?.display_name || 'Unknown'}</p></div>
              </div>

              {reviewingPayment.payment_proof_url && (
                <div>
                  <p className="text-sm font-medium mb-2">Payment Screenshot</p>
                  <img src={reviewingPayment.payment_proof_url} alt="Payment proof" className="w-full max-h-80 object-contain rounded-lg border" />
                </div>
              )}

              {!reviewingPayment.payment_proof_url && (
                <div className="p-4 bg-muted/50 rounded-lg text-center text-sm text-muted-foreground">
                  No payment proof uploaded
                </div>
              )}

              <DialogFooter className="gap-2">
                <Button variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10 gap-1" onClick={() => handlePaymentAction('reject_payment', reviewingPayment.id)} disabled={actionLoading}>
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />} Reject Payment
                </Button>
                <Button className="hero-gradient border-0 gap-1" onClick={() => handlePaymentAction('confirm_payment', reviewingPayment.id)} disabled={actionLoading}>
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Confirm Payment
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const EmptyState = ({ icon: Icon, message }: { icon: any; message: string }) => (
  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
    <Icon className="w-12 h-12 mb-3 opacity-40" />
    <p>{message}</p>
  </div>
);

export default AdminDashboard;
