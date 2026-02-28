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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ShieldCheck, Package, ShoppingBag, Users, AlertTriangle, UserCheck, Eye, Check, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const AdminDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading, fetchAdminData } = useAdmin();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('orders');
  const [data, setData] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Verification review state
  const [reviewingVerification, setReviewingVerification] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

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

  const handleVerificationAction = async (action: 'approve_verification' | 'reject_verification') => {
    if (!reviewingVerification) return;
    if (action === 'reject_verification' && !rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }
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
          body: JSON.stringify({
            action,
            verification_id: reviewingVerification.id,
            rejection_reason: rejectionReason || undefined,
          }),
        }
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed');
      }

      toast.success(action === 'approve_verification' ? 'Seller approved!' : 'Verification rejected');
      setReviewingVerification(null);
      setRejectionReason('');
      loadData('verifications');
    } catch (err: any) {
      toast.error(err.message || 'Action failed');
    } finally {
      setActionLoading(false);
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
    };
    return map[status] || 'bg-muted text-muted-foreground';
  };

  const stats = {
    orders: data.length,
    pending: data.filter((d: any) => d.status === 'pending').length,
    delivered: data.filter((d: any) => d.status === 'delivered').length,
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar searchQuery={searchQuery} onSearchChange={setSearchQuery} onPostClick={() => {}} />

      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <ShieldCheck className="w-7 h-7 text-primary" />
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="orders" className="gap-2">
              <Package className="w-4 h-4" /> Orders
            </TabsTrigger>
            <TabsTrigger value="listings" className="gap-2">
              <ShoppingBag className="w-4 h-4" /> Listings
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="w-4 h-4" /> Users
            </TabsTrigger>
            <TabsTrigger value="verifications" className="gap-2">
              <UserCheck className="w-4 h-4" /> Verifications
            </TabsTrigger>
          </TabsList>

          {/* Orders Tab */}
          <TabsContent value="orders">
            {activeTab === 'orders' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Orders</CardTitle></CardHeader>
                    <CardContent><p className="text-2xl font-bold">{stats.orders}</p></CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Pending</CardTitle></CardHeader>
                    <CardContent><p className="text-2xl font-bold text-yellow-600">{stats.pending}</p></CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Delivered</CardTitle></CardHeader>
                    <CardContent><p className="text-2xl font-bold text-green-600">{stats.delivered}</p></CardContent>
                  </Card>
                </div>

                {dataLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : data.length === 0 ? (
                  <EmptyState icon={Package} message="No orders yet" />
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
                          <TableHead>Delivery</TableHead>
                          <TableHead>Payment</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.map((order: any) => (
                          <TableRow key={order.id}>
                            <TableCell className="font-mono text-xs">{order.id.slice(0, 8)}...</TableCell>
                            <TableCell>{order.buyer_profile?.display_name || 'Unknown'}</TableCell>
                            <TableCell>{order.seller_profile?.display_name || 'Unknown'}</TableCell>
                            <TableCell>₱{Number(order.total).toLocaleString()}</TableCell>
                            <TableCell><Badge className={statusColor(order.status)}>{order.status}</Badge></TableCell>
                            <TableCell>
                              <Badge variant="outline">{order.delivery_method || 'N/A'}</Badge>
                              {order.delivery_status && (
                                <Badge variant="outline" className="ml-1 text-xs">{order.delivery_status}</Badge>
                              )}
                            </TableCell>
                            <TableCell>{order.payment_method}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {new Date(order.created_at).toLocaleDateString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* Listings Tab */}
          <TabsContent value="listings">
            {dataLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : data.length === 0 ? (
              <EmptyState icon={ShoppingBag} message="No listings yet" />
            ) : (
              <div className="rounded-lg border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Seller</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Condition</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map((listing: any) => (
                      <TableRow key={listing.id}>
                        <TableCell className="font-medium max-w-[200px] truncate">{listing.title}</TableCell>
                        <TableCell>{listing.seller_name}</TableCell>
                        <TableCell>₱{Number(listing.price).toLocaleString()}</TableCell>
                        <TableCell><Badge variant="outline">{listing.category}</Badge></TableCell>
                        <TableCell>{listing.condition}</TableCell>
                        <TableCell className="text-xs">{listing.location}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(listing.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            {dataLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : data.length === 0 ? (
              <EmptyState icon={Users} message="No users yet" />
            ) : (
              <div className="rounded-lg border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Roles</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map((profile: any) => (
                      <TableRow key={profile.id}>
                        <TableCell className="font-medium">{profile.display_name || 'No name'}</TableCell>
                        <TableCell className="text-xs">{profile.email}</TableCell>
                        <TableCell>{profile.phone || '-'}</TableCell>
                        <TableCell>{profile.rating ? `⭐ ${profile.rating}` : '-'}</TableCell>
                        <TableCell>
                          {profile.roles?.length > 0
                            ? profile.roles.map((r: string) => (
                                <Badge key={r} className="mr-1" variant="outline">{r}</Badge>
                              ))
                            : <span className="text-muted-foreground text-xs">user</span>
                          }
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(profile.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* Verifications Tab */}
          <TabsContent value="verifications">
            {dataLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : data.length === 0 ? (
              <EmptyState icon={UserCheck} message="No verification requests" />
            ) : (
              <div className="space-y-4">
                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Pending Review</CardTitle></CardHeader>
                    <CardContent><p className="text-2xl font-bold text-yellow-600">{data.filter((v: any) => v.status === 'pending').length}</p></CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Approved</CardTitle></CardHeader>
                    <CardContent><p className="text-2xl font-bold text-green-600">{data.filter((v: any) => v.status === 'approved').length}</p></CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Rejected</CardTitle></CardHeader>
                    <CardContent><p className="text-2xl font-bold text-red-600">{data.filter((v: any) => v.status === 'rejected').length}</p></CardContent>
                  </Card>
                </div>

                <div className="rounded-lg border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>ID Type</TableHead>
                        <TableHead>Phone Verified</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.map((v: any) => (
                        <TableRow key={v.id}>
                          <TableCell className="font-medium">{v.full_name}</TableCell>
                          <TableCell className="text-xs">{v.email}</TableCell>
                          <TableCell className="text-xs">{v.phone}</TableCell>
                          <TableCell className="text-xs">{ID_TYPE_LABELS[v.id_type] || v.id_type}</TableCell>
                          <TableCell>
                            {v.phone_verified
                              ? <Badge className="bg-green-500/10 text-green-600">Yes</Badge>
                              : <Badge variant="outline">No</Badge>
                            }
                          </TableCell>
                          <TableCell><Badge className={statusColor(v.status)}>{v.status}</Badge></TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(v.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1"
                              onClick={() => setReviewingVerification(v)}
                            >
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
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="w-5 h-5" />
              Review Verification - {reviewingVerification?.full_name}
            </DialogTitle>
          </DialogHeader>

          {reviewingVerification && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Full Name</p>
                  <p className="font-medium">{reviewingVerification.full_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p className="font-medium">{reviewingVerification.email}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Phone</p>
                  <p className="font-medium">{reviewingVerification.phone}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Phone Verified</p>
                  <p className="font-medium">{reviewingVerification.phone_verified ? '✅ Yes' : '❌ No'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground">Address</p>
                  <p className="font-medium">{reviewingVerification.address}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">ID Type</p>
                  <p className="font-medium">{ID_TYPE_LABELS[reviewingVerification.id_type] || reviewingVerification.id_type}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge className={statusColor(reviewingVerification.status)}>{reviewingVerification.status}</Badge>
                </div>
              </div>

              {/* Documents */}
              <div>
                <h4 className="font-medium mb-3">Submitted Documents</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {reviewingVerification.id_front_url_signed && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">ID Front</p>
                      <img
                        src={reviewingVerification.id_front_url_signed}
                        alt="ID Front"
                        className="w-full h-48 object-cover rounded-lg border"
                      />
                    </div>
                  )}
                  {reviewingVerification.id_back_url_signed && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">ID Back</p>
                      <img
                        src={reviewingVerification.id_back_url_signed}
                        alt="ID Back"
                        className="w-full h-48 object-cover rounded-lg border"
                      />
                    </div>
                  )}
                  {reviewingVerification.selfie_url_signed && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Selfie with ID</p>
                      <img
                        src={reviewingVerification.selfie_url_signed}
                        alt="Selfie"
                        className="w-full h-48 object-cover rounded-lg border"
                      />
                    </div>
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
                    <Input
                      placeholder="e.g., ID is blurry, selfie doesn't match..."
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                    />
                  </div>

                  <DialogFooter className="gap-2">
                    <Button
                      variant="outline"
                      className="text-destructive border-destructive/30 hover:bg-destructive/10 gap-1"
                      onClick={() => handleVerificationAction('reject_verification')}
                      disabled={actionLoading}
                    >
                      {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                      Reject
                    </Button>
                    <Button
                      className="hero-gradient border-0 gap-1"
                      onClick={() => handleVerificationAction('approve_verification')}
                      disabled={actionLoading}
                    >
                      {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      Approve Seller
                    </Button>
                  </DialogFooter>
                </>
              )}
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
