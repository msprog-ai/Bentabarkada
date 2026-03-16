
import { ListingItem } from '@/types/marketplace';
import { Button } from '@/components/ui/button';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { toast } from 'sonner';

interface ItemCardProps {
  item: ListingItem;
}

export const ItemCard = ({ item }: ItemCardProps) => {
  const { addToCart } = useCart();

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await addToCart(item.id, 1);
      toast.success('Added to cart!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to add item to cart.');
    }
  };

  return (
    <div className="group relative border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col h-full">
      <div className="relative w-full aspect-square overflow-hidden">
        <img
          src={item.image_url}
          alt={item.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </div>
      <div className="p-4 flex flex-col flex-grow">
        <h3 className="font-semibold text-lg leading-tight truncate">{item.title}</h3>
        <p className="text-muted-foreground text-sm mt-1 flex-grow">{item.description.substring(0, 40)}...</p>
        <div className="flex items-center justify-between mt-4">
          <p className="font-bold text-xl text-primary">₱{item.price.toLocaleString()}</p>
          <Button variant="outline" size="icon" onClick={handleAddToCart}>
            <ShoppingCart className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};
