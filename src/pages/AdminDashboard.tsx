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
import { ShieldCheck, Package, ShoppingBag, Users, AlertTriangle } from 'lucide-react';

const AdminDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading, fetchAdminData } = useAdmin();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('orders');
  const [data, setData] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
    };
    return map[status] || 'bg-muted text-muted-foreground';
  };

  const stats = {
    orders: data.length,
    pending: data.filter((d: any) => d.status === 'pending').length,
    delivered: data.filter((d: any) => d.status === 'delivered').length,
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
        </Tabs>
      </div>
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
