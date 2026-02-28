import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { User, Mail, Star, Camera, LogOut, Package, MessageSquare, ShoppingBag, Send, Bike } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useMessages } from '@/hooks/useMessages';
import { useOrders } from '@/hooks/useOrders';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ListingCard } from '@/components/ListingCard';
import { ListingItem } from '@/types/marketplace';
import { formatDistanceToNow } from 'date-fns';
import DeliveryStatusTracker from '@/components/DeliveryStatusTracker';

interface ProfileData {
  display_name: string | null;
  avatar_url: string | null;
  rating: number | null;
  phone: string | null;
}

const Profile = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading, signOut } = useAuth();
  const { conversations, messages, loading: messagesLoading, sendMessage, refetch: refetchMessages } = useMessages();
  const { orders, loading: ordersLoading, refetch: refetchOrders } = useOrders();
  
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [myListings, setMyListings] = useState<ListingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  
  // Messages state
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [conversationMessages, setConversationMessages] = useState<any[]>([]);
  
  const defaultTab = searchParams.get('tab') || 'listings';

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('display_name, avatar_url, rating, phone')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setProfile(data);
        setDisplayName(data.display_name || '');
      }
    };

    const fetchMyListings = async () => {
      const { data } = await supabase
        .from('listings')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (data) {
        setMyListings(data.map(listing => ({
          id: listing.id,
          title: listing.title,
          description: listing.description,
          price: Number(listing.price),
          category: listing.category,
          condition: listing.condition as 'new' | 'like-new' | 'good' | 'fair',
          location: listing.city || listing.location,
          image: listing.image_url || 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=400&fit=crop',
          seller: {
            name: 'You',
            avatar: '',
            rating: 5,
          },
          createdAt: new Date(listing.created_at),
        })));
      }
      setLoading(false);
    };

    fetchProfile();
    fetchMyListings();
  }, [user]);

  const fetchConversationMessages = async (partnerId: string) => {
    if (!user) return;
    
    const { data } = await supabase
      .from('messages')
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(display_name, avatar_url)
      `)
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: true });
    
    setConversationMessages(data || []);
    
    // Mark as read
    const unreadIds = (data || [])
      .filter(m => m.receiver_id === user.id && !m.is_read)
      .map(m => m.id);
    
    if (unreadIds.length > 0) {
      await supabase
        .from('messages')
        .update({ is_read: true })
        .in('id', unreadIds);
      refetchMessages();
    }
  };

  const handleSelectConversation = (partnerId: string) => {
    setSelectedConversation(partnerId);
    fetchConversationMessages(partnerId);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;
    
    await sendMessage(newMessage, selectedConversation);
    setNewMessage('');
    fetchConversationMessages(selectedConversation);
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: displayName })
      .eq('user_id', user.id);

    setSaving(false);

    if (error) {
      toast.error('Failed to update profile');
    } else {
      toast.success('Profile updated!');
      setProfile(prev => prev ? { ...prev, display_name: displayName } : null);
      setEditing(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const fileExt = file.name.split('.').pop();
    const filePath = `${user.id}/avatar.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('listing-images')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast.error('Failed to upload avatar');
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('listing-images')
      .getPublicUrl(filePath);

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('user_id', user.id);

    if (updateError) {
      toast.error('Failed to update avatar');
    } else {
      toast.success('Avatar updated!');
      setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : null);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      shipped: 'bg-purple-100 text-purple-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="hero-gradient py-12">
        <div className="container mx-auto px-4">
          <button onClick={() => navigate('/')} className="text-white/80 hover:text-white">
            ← Back to Marketplace
          </button>
        </div>
      </div>

      <div className="container mx-auto px-4 -mt-16 pb-16">
        {/* Profile Card */}
        <div className="bg-card rounded-2xl card-shadow p-6 mb-8">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative">
              <img
                src={profile?.avatar_url || `https://i.pravatar.cc/150?u=${user.id}`}
                alt="Profile"
                className="w-24 h-24 rounded-full object-cover border-4 border-background"
              />
              <label className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center cursor-pointer hover:bg-primary/90">
                <Camera className="w-4 h-4 text-primary-foreground" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </label>
            </div>

            <div className="flex-1 text-center sm:text-left">
              {editing ? (
                <div className="flex gap-2 items-center justify-center sm:justify-start">
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Display name"
                    className="max-w-xs"
                  />
                  <Button onClick={handleSaveProfile} disabled={saving} size="sm">
                    Save
                  </Button>
                  <Button variant="ghost" onClick={() => setEditing(false)} size="sm">
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  <h1 className="text-2xl font-bold">{profile?.display_name || 'User'}</h1>
                  <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
                    Edit
                  </Button>
                </div>
              )}
              <div className="flex items-center gap-4 mt-2 text-muted-foreground justify-center sm:justify-start flex-wrap">
                <div className="flex items-center gap-1">
                  <Mail className="w-4 h-4" />
                  <span className="text-sm">{user.email}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-warning text-warning" />
                  <span className="text-sm">{profile?.rating || 5.0} rating</span>
                </div>
              </div>
            </div>

            <Button variant="outline" onClick={handleSignOut} className="gap-2">
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue={defaultTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="listings" className="gap-2">
              <Package className="w-4 h-4" />
              <span className="hidden sm:inline">My Listings</span>
              <span className="sm:hidden">Listings</span>
            </TabsTrigger>
            <TabsTrigger value="orders" className="gap-2">
              <ShoppingBag className="w-4 h-4" />
              <span className="hidden sm:inline">Order History</span>
              <span className="sm:hidden">Orders</span>
            </TabsTrigger>
            <TabsTrigger value="messages" className="gap-2">
              <MessageSquare className="w-4 h-4" />
              Messages
              {conversations.filter(c => c.unreadCount > 0).length > 0 && (
                <span className="w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                  {conversations.reduce((sum, c) => sum + c.unreadCount, 0)}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Listings Tab */}
          <TabsContent value="listings">
            {myListings.length === 0 ? (
              <div className="text-center py-12 bg-card rounded-2xl">
                <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">No listings yet</h3>
                <p className="text-muted-foreground mb-4">Start selling by posting your first item!</p>
                <Button onClick={() => navigate('/')} className="hero-gradient border-0">
                  Post an Item
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {myListings.map((item) => (
                  <ListingCard key={item.id} item={item} onClick={() => {}} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders">
            {ordersLoading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading orders...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-12 bg-card rounded-2xl">
                <ShoppingBag className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">No orders yet</h3>
                <p className="text-muted-foreground mb-4">Your purchase and sales history will appear here.</p>
                <Button onClick={() => navigate('/')} className="hero-gradient border-0">
                  Start Shopping
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <div key={order.id} className="bg-card rounded-2xl p-6 card-shadow">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Order #{order.id.slice(0, 8)}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusBadge(order.status)}`}>
                          {order.status}
                        </span>
                        <span className="text-sm">
                          {order.buyer_id === user.id ? 'You bought' : 'You sold'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      {order.items?.map((item) => (
                        <div key={item.id} className="flex items-center gap-4">
                          <img
                            src={item.listing?.image_url || 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=400&fit=crop'}
                            alt={item.listing?.title}
                            className="w-16 h-16 rounded-lg object-cover"
                          />
                          <div className="flex-1">
                            <p className="font-medium">{item.listing?.title}</p>
                            <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                          </div>
                          <p className="font-semibold">₱{item.price.toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                    
                    <div className="border-t border-border mt-4 pt-4 flex justify-between items-center">
                      <div className="text-sm">
                        <span className="text-muted-foreground">Payment: </span>
                        <span className="font-medium uppercase">{order.payment_method.replace('_', ' ')}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Total</p>
                        <p className="text-xl font-bold text-gradient">₱{order.total.toLocaleString()}</p>
                      </div>
                    </div>

                    {/* Delivery Tracking for Buyers */}
                    {order.buyer_id === user.id && (order.status === 'confirmed' || order.status === 'shipped') && (
                      <div className="border-t border-border mt-4 pt-4">
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
                          isBuyer={true}
                          onUpdate={refetchOrders}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages">
            <div className="bg-card rounded-2xl card-shadow overflow-hidden">
              <div className="grid md:grid-cols-3 min-h-[500px]">
                {/* Conversations List */}
                <div className="border-r border-border">
                  <div className="p-4 border-b border-border">
                    <h3 className="font-semibold">Conversations</h3>
                  </div>
                  {messagesLoading ? (
                    <div className="p-4 text-center text-muted-foreground">Loading...</div>
                  ) : conversations.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No conversations yet</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {conversations.map((conv) => (
                        <button
                          key={conv.partnerId}
                          onClick={() => handleSelectConversation(conv.partnerId)}
                          className={`w-full p-4 text-left hover:bg-muted/50 transition-colors ${
                            selectedConversation === conv.partnerId ? 'bg-muted' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <img
                              src={conv.partnerAvatar}
                              alt={conv.partnerName}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p className="font-medium truncate">{conv.partnerName}</p>
                                {conv.unreadCount > 0 && (
                                  <span className="w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                                    {conv.unreadCount}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground truncate">{conv.lastMessage}</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Messages */}
                <div className="md:col-span-2 flex flex-col">
                  {selectedConversation ? (
                    <>
                      <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {conversationMessages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`flex ${msg.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                                msg.sender_id === user.id
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted'
                              }`}
                            >
                              <p>{msg.content}</p>
                              <p className={`text-xs mt-1 ${
                                msg.sender_id === user.id ? 'text-primary-foreground/70' : 'text-muted-foreground'
                              }`}>
                                {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="p-4 border-t border-border">
                        <div className="flex gap-2">
                          <Textarea
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Type a message..."
                            rows={1}
                            className="resize-none"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage();
                              }
                            }}
                          />
                          <Button onClick={handleSendMessage} className="hero-gradient border-0">
                            <Send className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>Select a conversation to view messages</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Profile;
