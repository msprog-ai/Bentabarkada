import { Heart, MapPin, Star, MessageSquare, Gavel, Tag, Eye } from 'lucide-react';
import { ListingItem } from '@/types/marketplace';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ListingCardProps {
  item: ListingItem;
  onClick: (item: ListingItem) => void;
}

export const ListingCard = ({ item, onClick }: ListingCardProps) => {
  const [isFavorite, setIsFavorite] = useState(item.isFavorite || false);
  const [bidCount, setBidCount] = useState(0);
  const [highestBid, setHighestBid] = useState<number | null>(null);

  useEffect(() => {
    const fetchBidInfo = async () => {
      const { data, error } = await supabase
        .from('bids')
        .select('amount')
        .eq('listing_id', item.id)
        .order('amount', { ascending: false });

      if (!error && data) {
        setBidCount(data.length);
        if (data.length > 0) {
          setHighestBid(data[0].amount);
        }
      }
    };
    fetchBidInfo();
  }, [item.id]);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFavorite(!isFavorite);
  };

  const conditionColors = {
    new: 'bg-success text-success-foreground',
    'like-new': 'bg-primary text-primary-foreground',
    good: 'bg-warning text-warning-foreground',
    fair: 'bg-muted text-muted-foreground'
  };

  const isSoldOut = item.quantity === 0;

  return (
    <div
      onClick={() => onClick(item)}
      className={cn(
        "group bg-card rounded-xl overflow-hidden card-shadow hover:card-shadow-hover transition-all duration-300 cursor-pointer animate-fade-in flex flex-col",
        isSoldOut && "opacity-75"
      )}
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden">
        <img
          src={item.image}
          alt={item.title}
          className={cn(
            "w-full h-full group-hover:scale-105 transition-transform duration-500 border border-solid border-primary object-scale-down rounded-lg",
            isSoldOut && "grayscale"
          )}
        />
        {isSoldOut && (
          <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
            <span className="bg-destructive text-destructive-foreground px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wide">
              Sold Out
            </span>
          </div>
        )}
        <button
          onClick={handleFavoriteClick}
          className={cn(
            "absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200",
            isFavorite
              ? "bg-primary text-primary-foreground"
              : "bg-card/80 backdrop-blur-sm text-foreground hover:bg-card"
          )}
        >
          <Heart className={cn("w-4 h-4", isFavorite && "fill-current")} />
        </button>
        {!isSoldOut && (
          <span
            className={cn(
              "absolute bottom-2 left-2 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium capitalize",
              conditionColors[item.condition]
            )}
          >
            {item.condition.replace('-', ' ')}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-3 sm:p-4 flex flex-col flex-1">
        <h3 className="font-semibold text-sm sm:text-base text-foreground line-clamp-2 group-hover:text-primary transition-colors mb-1">
          {item.title}
        </h3>

        {/* Description preview */}
        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
          {item.description}
        </p>

        {/* Price */}
        <div className="flex items-center gap-1.5 mb-2">
          <Tag className="w-3.5 h-3.5 text-primary flex-shrink-0" />
          <span className="text-lg sm:text-xl font-bold text-foreground">
            ₱{item.price.toLocaleString()}
          </span>
        </div>

        {/* Bid info */}
        <div className="flex items-center gap-3 mb-2 flex-wrap">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Gavel className="w-3.5 h-3.5" />
            <span>{bidCount} {bidCount === 1 ? 'bid' : 'bids'}</span>
          </div>
          {highestBid && (
            <div className="flex items-center gap-1 text-xs font-semibold text-primary">
              <Eye className="w-3.5 h-3.5" />
              <span>Top: ₱{highestBid.toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* Location */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
          <MapPin className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">{item.location}</span>
        </div>

        {/* Seller info - pushed to bottom */}
        <div className="flex items-center gap-2 pt-2 mt-auto border-t border-border">
          <img
            src={item.seller.avatar}
            alt={item.seller.name}
            className="w-6 h-6 rounded-full object-cover flex-shrink-0"
          />
          <span className="text-xs text-muted-foreground truncate">{item.seller.name}</span>
          <div className="flex items-center gap-0.5 ml-auto flex-shrink-0">
            {item.seller.rating > 0 ? (
              <>
                <Star className="w-3 h-3 fill-warning text-warning" />
                <span className="text-xs font-medium">{item.seller.rating.toFixed(1)}</span>
              </>
            ) : (
              <span className="text-xs text-muted-foreground">New seller</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
