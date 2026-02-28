import { useState, useMemo } from 'react';
import { Navbar } from '@/components/Navbar';
import { HeroSection } from '@/components/HeroSection';
import { CategoryFilter } from '@/components/CategoryFilter';
import { ListingCard } from '@/components/ListingCard';
import { ListingDetail } from '@/components/ListingDetail';
import { PostItemForm } from '@/components/PostItemForm';
import { SellerVerificationForm } from '@/components/SellerVerificationForm';
import { ChatBot } from '@/components/ChatBot';
import { useListings } from '@/hooks/useListings';
import { useAuth } from '@/hooks/useAuth';
import { useSellerVerification } from '@/hooks/useSellerVerification';
import { ListingItem } from '@/types/marketplace';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { listings, loading, refetch } = useListings();
  const { isVerified, isPending, isRejected, refetch: refetchVerification } = useSellerVerification();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedItem, setSelectedItem] = useState<ListingItem | null>(null);
  const [showPostForm, setShowPostForm] = useState(false);
  const [showVerification, setShowVerification] = useState(false);

  const filteredListings = useMemo(() => {
    return listings.filter((item) => {
      const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory, listings]);

  const handlePostClick = () => {
    if (!user) {
      toast.error('Please sign in to post an item');
      navigate('/auth');
      return;
    }
    if (!isVerified) {
      if (isPending) {
        toast.info('Your seller verification is still being reviewed.');
      } else {
        setShowVerification(true);
      }
      return;
    }
    setShowPostForm(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onPostClick={handlePostClick} />


      <HeroSection />

      <main className="container mx-auto px-4 pb-16 border-2">
        {/* Categories */}
        <div className="mb-8">
          <CategoryFilter
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory} />

        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">
            {selectedCategory === 'all' ? 'All Items' : `${selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)}`}
          </h2>
          <p className="text-muted-foreground">
            {filteredListings.length} {filteredListings.length === 1 ? 'item' : 'items'}
          </p>
        </div>

        {/* Listings Grid */}
        {loading ?
        <div className="text-center py-16">
            <p className="text-muted-foreground">Loading listings...</p>
          </div> :
        filteredListings.length > 0 ?
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredListings.map((item, index) =>
          <div key={item.id} style={{ animationDelay: `${index * 0.05}s` }}>
                <ListingCard item={item} onClick={setSelectedItem} />
              </div>
          )}
          </div> :

        <div className="text-center py-20">
            <div className="text-7xl mb-6 animate-bounce">🛍️</div>
            <h3 className="text-2xl font-bold mb-3">No items yet — be the first!</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              The marketplace is waiting for its first listing. Got something to sell? Post it now and let others discover it!
            </p>
            <button
            onClick={handlePostClick}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-primary-foreground font-semibold shadow-lg hover:opacity-90 transition-opacity">

              Post Your First Item
            </button>
          </div>
        }
      </main>

      {/* Item Detail Modal */}
      {selectedItem &&
      <ListingDetail
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        sellerId={selectedItem.seller.id} />

      }

      {/* Post Item Form */}
      {showPostForm &&
      <PostItemForm
        onClose={() => setShowPostForm(false)}
        onSuccess={refetch} />

      }

      {/* Seller Verification Form */}
      {showVerification &&
      <SellerVerificationForm
        onClose={() => {
          setShowVerification(false);
          refetchVerification();
        }} />

      }

      {/* AI Chatbot */}
      <ChatBot />
    </div>);

};

export default Index;