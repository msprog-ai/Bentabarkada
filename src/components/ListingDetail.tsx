
import { useState, useMemo } from 'react';
import { X, Heart, Share2, MapPin, Star, MessageCircle, Shield, ShoppingCart } from 'lucide-react';
import { ListingItem } from '@/types/marketplace';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import { MessageDialog } from './MessageDialog';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface ListingDetailProps {
  item: ListingItem;
  onClose: () => void;
}

export const ListingDetail = ({ item, onClose }: ListingDetailProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const [isFavorite, setIsFavorite] = useState(false); // Note: Favorite logic not yet implemented
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);

  const isSoldOut = useMemo(() => item.quantity <= 0, [item.quantity]);

  const handleMessageSeller = () => {
    if (!user) {
      toast.error('Please sign in to message the seller');
      navigate('/auth');
      return;
    }
    if (item.seller.id === user.uid) {
      toast.info('This is your own listing');
      return;
    }
    setShowMessageDialog(true);
  };

  const handleAddToCart = async () => {
    if (!user) {
      toast.error('Please sign in to add items to cart');
      navigate('/auth');
      return;
    }
    if (isSoldOut) {
      toast.error('This item is sold out');
      return;
    }
    setAddingToCart(true);
    try {
        await addToCart(item.id);
        toast.success(`${item.title} added to cart!`);
    } catch (error: any) {
        console.error("Error adding to cart:", error)
        toast.error(error.message || "Failed to add item to cart.");
    } finally {
        setAddingToCart(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm animate-fade-in" onClick={onClose}>
        <div className="fixed inset-0 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="flex min-h-full items-start justify-center p-4 sm:p-6 md:p-10">
            <div className="relative w-full max-w-4xl bg-card rounded-2xl card-shadow overflow-hidden animate-scale-in">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center hover:bg-card transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="grid md:grid-cols-2">
                <div className="relative aspect-square bg-muted">
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="p-6 md:p-8 flex flex-col">
                  <div className="flex-1">
                    <h1 className="text-2xl font-bold text-foreground mb-2">{item.title}</h1>
                    <p className="text-3xl font-bold text-gradient mb-4">
                      ₱{item.price.toLocaleString()}
                    </p>

                    <div className="flex items-center gap-4 mb-6 flex-wrap">
                      {isSoldOut ? (
                        <span className="px-3 py-1 rounded-full bg-destructive text-destructive-foreground text-sm font-bold">
                          Sold Out
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full bg-secondary text-sm font-medium">
                          {item.quantity} available
                        </span>
                      )}
                       <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        {/* Location data not yet in this structure, to be added */}
                        <span>{item.seller.shop_name || 'Unknown Location'}</span>
                      </div>
                    </div>

                    <div className="mb-6">
                      <h3 className="font-semibold mb-2">Description</h3>
                      <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{item.description}</p>
                    </div>

                    <div className="p-4 bg-secondary rounded-xl mb-6">
                      <div className="flex items-center gap-3">
                        <img
                          src={item.seller.profile_picture || '/placeholder-avatar.png'}
                          alt={item.seller.display_name}
                          className="w-12 h-12 rounded-full object-cover bg-muted"
                        />
                        <div className="flex-1">
                          <p className="font-semibold">{item.seller.display_name}</p>
                          <div className="text-sm text-muted-foreground">
                             {/* Rating logic to be added */}
                             New Seller
                          </div>
                        </div>
                         <div className="flex items-center gap-1 text-success text-sm">
                          <Shield className="w-4 h-4" />
                          <span>Verified</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button variant="outline" size="icon" onClick={() => setIsFavorite(!isFavorite)} className={cn(isFavorite && 'text-primary')}>
                        <Heart className={cn("w-5 h-5", isFavorite && "fill-current")} />
                    </Button>
                    <Button variant="outline" size="icon" onClick={async () => {
                       const shareUrl = `${window.location.origin}/?item=${item.id}`;
                       try { 
                        await navigator.clipboard.writeText(shareUrl);
                        toast.success('Link copied to clipboard!');
                       } catch {}
                    }}>
                      <Share2 className="w-5 h-5" />
                    </Button>
                    <Button 
                      className="flex-1 min-w-[120px] hero-gradient border-0 gap-2"
                      onClick={handleAddToCart}
                      disabled={addingToCart || isSoldOut}
                    >
                      <ShoppingCart className="w-5 h-5" />
                      {isSoldOut ? 'Sold Out' : addingToCart ? 'Adding...' : 'Add to Cart'}
                    </Button>
                    <Button 
                      variant='outline'
                      className="flex-1 min-w-[120px] gap-2"
                      onClick={handleMessageSeller}
                    >
                      <MessageCircle className="w-5 h-5" />
                      Message
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showMessageDialog && (
        <MessageDialog
          sellerId={item.seller.id}
          sellerName={item.seller.display_name}
          listingId={item.id}
          listingTitle={item.title}
          onClose={() => setShowMessageDialog(false)}
        />
      )}
    </>
  );
};
