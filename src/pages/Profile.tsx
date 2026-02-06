import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Star, MapPin, Camera, LogOut, Package, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ListingCard } from '@/components/ListingCard';
import { ListingItem } from '@/types/marketplace';

interface ProfileData {
  display_name: string | null;
  avatar_url: string | null;
  rating: number | null;
}

const Profile = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [myListings, setMyListings] = useState<ListingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);

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
        .select('display_name, avatar_url, rating')
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
          location: listing.location,
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
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/')} className="text-white/80 hover:text-white">
              ← Back to Marketplace
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 -mt-16 pb-16">
        {/* Profile Card */}
        <div className="bg-card rounded-2xl card-shadow p-6 mb-8">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Avatar */}
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

            {/* Info */}
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
                  <h1 className="text-2xl font-bold">
                    {profile?.display_name || 'User'}
                  </h1>
                  <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
                    Edit
                  </Button>
                </div>
              )}
              <div className="flex items-center gap-4 mt-2 text-muted-foreground justify-center sm:justify-start">
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

            {/* Actions */}
            <Button variant="outline" onClick={handleSignOut} className="gap-2">
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="listings" className="space-y-6">
          <TabsList>
            <TabsTrigger value="listings" className="gap-2">
              <Package className="w-4 h-4" />
              My Listings ({myListings.length})
            </TabsTrigger>
            <TabsTrigger value="messages" className="gap-2">
              <MessageSquare className="w-4 h-4" />
              Messages
            </TabsTrigger>
          </TabsList>

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

          <TabsContent value="messages">
            <div className="text-center py-12 bg-card rounded-2xl">
              <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">Messages</h3>
              <p className="text-muted-foreground">
                Your conversations with buyers and sellers will appear here.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Profile;
