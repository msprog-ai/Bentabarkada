import { Heart, MapPin, Star } from 'lucide-react';
import { ListingItem } from '@/types/marketplace';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface ListingCardProps {
  item: ListingItem;
  onClick: (item: ListingItem) => void;
}

export const ListingCard = ({ item, onClick }: ListingCardProps) => {
  const [isFavorite, setIsFavorite] = useState(item.isFavorite || false);

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

  return (
    <div
      onClick={() => onClick(item)}
      className="group bg-card rounded-xl overflow-hidden card-shadow hover:card-shadow-hover transition-all duration-300 cursor-pointer animate-fade-in">

      {/* Image */}
      <div className="relative aspect-square overflow-hidden">
        <img
          src={item.image}
          alt={item.title}
          className="w-full h-full group-hover:scale-105 transition-transform duration-500 border border-solid border-primary object-scale-down rounded-lg" />

        <button
          onClick={handleFavoriteClick}
          className={cn(
            "absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200",
            isFavorite ?
            "bg-primary text-primary-foreground" :
            "bg-card/80 backdrop-blur-sm text-foreground hover:bg-card"
          )}>

          <Heart className={cn("w-4 h-4", isFavorite && "fill-current")} />
        </button>
        <span
          className={cn(
            "absolute bottom-3 left-3 px-2 py-1 rounded-full text-xs font-medium capitalize",
            conditionColors[item.condition]
          )}>

          {item.condition.replace('-', ' ')}
        </span>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
            {item.title}
          </h3>
        </div>
        <p className="text-2xl font-bold text-foreground mb-3">
          ₱{item.price.toLocaleString()}
        </p>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
          <MapPin className="w-3.5 h-3.5" />
          <span>{item.location}</span>
        </div>
        <div className="flex items-center gap-2 pt-3 border-t border-border">
          <img
            src={item.seller.avatar}
            alt={item.seller.name}
            className="w-7 h-7 rounded-full object-cover" />

          <span className="text-sm text-muted-foreground">{item.seller.name}</span>
          <div className="flex items-center gap-1 ml-auto">
            <Star className="w-3.5 h-3.5 fill-warning text-warning" />
            <span className="text-sm font-medium">{item.seller.rating}</span>
          </div>
        </div>
      </div>
    </div>);

};