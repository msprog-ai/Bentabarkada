import { useState } from 'react';
import { X, Heart, Share2, MapPin, Star, MessageCircle, Shield, ShoppingCart } from 'lucide-react';
import { ListingItem } from '@/types/marketplace';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import { MessageDialog } from './MessageDialog';
import { BiddingSection } from './BiddingSection';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface ListingDetailProps {
  item: ListingItem;
  onClose: () => void;
  sellerId?: string;
}

export const ListingDetail = ({ item, onClose, sellerId }: ListingDetailProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const [isFavorite, setIsFavorite] = useState(item.isFavorite || false);
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);

  const conditionLabels = {
    new: 'Brand New',
    'like-new': 'Like New',
    good: 'Good Condition',
    fair: 'Fair Condition',
  };

  const handleMessageSeller = () => {
    if (!user) {
      toast.error('Please sign in to message the seller');
      navigate('/auth');
      return;
    }
    if (!sellerId) {
      toast.error('Cannot message this seller');
      return;
    }
    if (sellerId === user.id) {
      toast.info('This is your own listing');
      return;
    }
    setShowMessageDialog(true);
  };

  const isSoldOut = item.quantity === 0;

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
    await addToCart(item.id);
    setAddingToCart(false);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm animate-fade-in">
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-start justify-center p-4 sm:p-6 md:p-10">
            <div className="relative w-full max-w-4xl bg-card rounded-2xl card-shadow overflow-hidden animate-scale-in">
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center hover:bg-card transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="grid md:grid-cols-2">
                {/* Image */}
                <div className="relative aspect-square">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Content */}
                <div className="p-6 md:p-8 flex flex-col">
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <h1 className="text-2xl font-bold text-foreground">{item.title}</h1>
                    </div>

                    <p className="text-3xl font-bold text-gradient mb-4">
                      ₱{item.price.toLocaleString()}
                    </p>

                    <div className="flex items-center gap-4 mb-6 flex-wrap">
                      {isSoldOut ? (
                        <span className="px-3 py-1 rounded-full bg-destructive text-destructive-foreground text-sm font-bold uppercase">
                          Sold Out
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full bg-secondary text-sm font-medium capitalize">
                          {conditionLabels[item.condition]}
                        </span>
                      )}
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        <span>{item.location}</span>
                      </div>
                      {!isSoldOut && item.quantity && item.quantity > 1 && (
                        <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                          {item.quantity} available
                        </span>
                      )}
                    </div>

                    <div className="mb-6">
                      <h3 className="font-semibold mb-2">Description</h3>
                      <p className="text-muted-foreground leading-relaxed">{item.description}</p>
                    </div>

                    {/* Seller Info */}
                    <div className="p-4 bg-secondary rounded-xl mb-6">
                      <div className="flex items-center gap-3">
                        <img
                          src={item.seller.avatar}
                          alt={item.seller.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                        <div className="flex-1">
                          <p className="font-semibold">{item.seller.name}</p>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            {item.seller.rating > 0 ? (
                              <>
                                <Star className="w-4 h-4 fill-warning text-warning" />
                                <span>{item.seller.rating.toFixed(1)} rating</span>
                              </>
                            ) : (
                              <span>New seller</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-success text-sm">
                          <Shield className="w-4 h-4" />
                          <span className="hidden sm:inline">Verified</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setIsFavorite(!isFavorite)}
                      className={cn(isFavorite && "text-primary border-primary")}
                    >
                      <Heart className={cn("w-5 h-5", isFavorite && "fill-current")} />
                    </Button>
                    <Button variant="outline" size="icon" onClick={async () => {
                      const shareUrl = `${window.location.origin}/?item=${item.id}`;
                      const shareData = { title: item.title, text: `Check out ${item.title} for ₱${item.price.toLocaleString()} on BentaBarkada!`, url: shareUrl };
                      if (navigator.share) {
                        try { await navigator.share(shareData); } catch {}
                      } else {
                        await navigator.clipboard.writeText(shareUrl);
                        toast.success('Link copied to clipboard!');
                      }
                    }}>
                      <Share2 className="w-5 h-5" />
                    </Button>
                    <Button 
                      variant="outline" 
                      className="gap-2"
                      onClick={handleAddToCart}
                      disabled={addingToCart || isSoldOut}
                    >
                      <ShoppingCart className="w-5 h-5" />
                      {isSoldOut ? 'Sold Out' : addingToCart ? 'Adding...' : 'Add to Cart'}
                    </Button>
                    <Button 
                      className="flex-1 hero-gradient border-0 gap-2"
                      onClick={handleMessageSeller}
                    >
                      <MessageCircle className="w-5 h-5" />
                      Message Seller
                    </Button>
                  </div>
                </div>
              </div>

              {/* Bidding Section */}
              <div className="border-t border-border p-6 md:p-8">
                <BiddingSection
                  listingId={item.id}
                  currentPrice={item.price}
                  sellerId={sellerId}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {showMessageDialog && sellerId && (
        <MessageDialog
          sellerId={sellerId}
          sellerName={item.seller.name}
          sellerAvatar={item.seller.avatar}
          listingId={item.id}
          listingTitle={item.title}
          onClose={() => setShowMessageDialog(false)}
        />
      )}
    </>
  );
};
