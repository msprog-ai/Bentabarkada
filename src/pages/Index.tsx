import { useState, useMemo } from 'react';
import { Navbar } from '@/components/Navbar';
import { HeroSection } from '@/components/HeroSection';
import { CategoryFilter } from '@/components/CategoryFilter';
import { ListingCard } from '@/components/ListingCard';
import { ListingDetail } from '@/components/ListingDetail';
import { PostItemForm } from '@/components/PostItemForm';
import { ChatBot } from '@/components/ChatBot';
import { useListings } from '@/hooks/useListings';
import { useAuth } from '@/hooks/useAuth';
import { ListingItem } from '@/types/marketplace';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { listings, loading, refetch } = useListings();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedItem, setSelectedItem] = useState<ListingItem | null>(null);
  const [showPostForm, setShowPostForm] = useState(false);

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
    setShowPostForm(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onPostClick={handlePostClick}
      />

      <HeroSection />

      <main className="container mx-auto px-4 pb-16">
        {/* Categories */}
        <div className="mb-8">
          <CategoryFilter
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
          />
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
        {loading ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground">Loading listings...</p>
          </div>
        ) : filteredListings.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredListings.map((item, index) => (
              <div key={item.id} style={{ animationDelay: `${index * 0.05}s` }}>
                <ListingCard item={item} onClick={setSelectedItem} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-4xl mb-4">🔍</p>
            <h3 className="text-xl font-semibold mb-2">No items found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search or browse different categories
            </p>
          </div>
        )}
      </main>

      {/* Item Detail Modal */}
      {selectedItem && (
        <ListingDetail 
          item={selectedItem} 
          onClose={() => setSelectedItem(null)} 
          sellerId={selectedItem.seller.id}
        />
      )}

      {/* Post Item Form */}
      {showPostForm && (
        <PostItemForm 
          onClose={() => setShowPostForm(false)} 
          onSuccess={refetch}
        />
      )}

      {/* AI Chatbot */}
      <ChatBot />
    </div>
  );
};

export default Index;
