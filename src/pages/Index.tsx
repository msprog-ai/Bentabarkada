
import { useState } from 'react';
import { useListings } from '@/hooks/useListings';
import { ItemCard } from '@/components/ItemCard';
import { Button } from '@/components/ui/button';
import { Loader2, Store, Tags } from 'lucide-react';

const categories = [
  { id: 'all', name: 'All' },
  { id: 'electronics', name: 'Electronics' },
  { id: 'fashion', name: 'Fashion' },
  { id: 'home-goods', name: 'Home Goods' },
  { id: 'sports', name: 'Sports' },
  { id: 'books', name: 'Books' },
];

const Index = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const { listings, loading, error } = useListings({ category: selectedCategory });

  const CategoryPills = () => (
    <div className="flex items-center gap-2 mb-8 pb-2 overflow-x-auto">
        <Tags className="w-5 h-5 mr-2 text-muted-foreground flex-shrink-0"/>
      {categories.map(category => (
        <Button 
          key={category.id} 
          variant={selectedCategory === category.id ? 'default' : 'outline'}
          onClick={() => setSelectedCategory(category.id)}
          className="rounded-full whitespace-nowrap hero-gradient border-0"
        >
          {category.name}
        </Button>
      ))}
    </div>
  );

  return (
    <div className="space-y-8">
        <div className="text-center py-12 bg-card border rounded-xl shadow-sm">
            <h1 className="text-4xl font-bold tracking-tight">Welcome to BentaBarkada</h1>
            <p className="text-muted-foreground mt-2">Your friendly neighborhood marketplace.</p>
        </div>

      <CategoryPills />

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="text-center py-20 text-red-500">
          <p>Error loading items. Please try again later.</p>
        </div>
      ) : listings.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {listings.map(item => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
            <Store className="w-16 h-16 mx-auto text-muted-foreground mb-4"/>
          <h3 className="text-2xl font-semibold">No items found</h3>
          <p className="text-muted-foreground mt-2">Try a different category or check back later!</p>
        </div>
      )}
    </div>
  );
};

export default Index;
