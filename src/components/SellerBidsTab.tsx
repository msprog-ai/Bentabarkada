import { useState } from 'react';
import { Trophy, Gavel, MessageCircle, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSellerBids, SellerBid } from '@/hooks/useSellerBids';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

const SellerBidsTab = () => {
  const { bidsByListing, loading, refetch } = useSellerBids();
  const [expandedListings, setExpandedListings] = useState<Set<string>>(new Set());

  const toggleListing = (listingId: string) => {
    setExpandedListings(prev => {
      const next = new Set(prev);
      if (next.has(listingId)) next.delete(listingId);
      else next.add(listingId);
      return next;
    });
  };

  if (loading) {
    return <p className="text-center py-8 text-muted-foreground">Loading bids...</p>;
  }

  const listingIds = Object.keys(bidsByListing);

  if (listingIds.length === 0) {
    return (
      <div className="text-center py-16 bg-card rounded-2xl card-shadow">
        <Gavel className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold mb-2">No bids received yet</h3>
        <p className="text-muted-foreground">When buyers bid on your items, they'll appear here.</p>
      </div>
    );
  }

  const totalBids = Object.values(bidsByListing).reduce((sum, b) => sum + b.length, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          Bids Received
          <span className="text-muted-foreground ml-2">({totalBids} bids on {listingIds.length} items)</span>
        </h2>
      </div>

      {listingIds.map(listingId => {
        const bids = bidsByListing[listingId];
        const highestBid = bids[0];
        const isExpanded = expandedListings.has(listingId);

        return (
          <div key={listingId} className="bg-card rounded-2xl card-shadow overflow-hidden">
            {/* Listing Header */}
            <button
              onClick={() => toggleListing(listingId)}
              className="w-full p-4 flex items-center gap-4 hover:bg-muted/30 transition-colors"
            >
              <img
                src={highestBid.listing_image || 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=400&fit=crop'}
                alt={highestBid.listing_title || ''}
                className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
              />
              <div className="flex-1 text-left min-w-0">
                <p className="font-semibold truncate">{highestBid.listing_title}</p>
                <p className="text-sm text-muted-foreground">
                  Listed at ₱{highestBid.listing_price.toLocaleString()} · {bids.length} bid{bids.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs text-muted-foreground">Highest Bid</p>
                <p className="text-lg font-bold text-primary">₱{highestBid.amount.toLocaleString()}</p>
              </div>
              {isExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
            </button>

            {/* Expanded Bids List */}
            {isExpanded && (
              <div className="border-t border-border">
                {bids.map((bid, index) => (
                  <BidRow key={bid.id} bid={bid} rank={index + 1} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

const BidRow = ({ bid, rank }: { bid: SellerBid; rank: number }) => {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 border-b border-border last:border-b-0 ${
      bid.is_highest ? 'bg-primary/5' : ''
    }`}>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
        rank === 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
      }`}>
        {rank === 1 ? <Trophy className="w-3.5 h-3.5" /> : rank}
      </div>
      <img
        src={bid.bidder_avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${bid.bidder_name || 'U'}`}
        alt=""
        className="w-8 h-8 rounded-full object-cover flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{bid.bidder_name || 'Anonymous'}</span>
          {bid.is_highest && (
            <span className="text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">Highest</span>
          )}
        </div>
        {bid.comment && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <MessageCircle className="w-3 h-3" />
            {bid.comment}
          </p>
        )}
      </div>
      <div className="text-right flex-shrink-0">
        <p className="font-bold text-primary">₱{bid.amount.toLocaleString()}</p>
        <p className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(bid.created_at), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
};

export default SellerBidsTab;
