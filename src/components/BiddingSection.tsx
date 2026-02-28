import { useState } from 'react';
import { Gavel, Trophy, Trash2, Send, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { useBids, Bid } from '@/hooks/useBids';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface BiddingSectionProps {
  listingId: string;
  currentPrice: number;
  sellerId?: string;
}

export const BiddingSection = ({ listingId, currentPrice, sellerId }: BiddingSectionProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { bids, loading, placeBid, deleteBid, highestBid } = useBids(listingId);
  const [bidAmount, setBidAmount] = useState('');
  const [bidComment, setBidComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const minimumBid = highestBid ? highestBid.amount + 1 : currentPrice;

  const handlePlaceBid = async () => {
    if (!user) {
      toast.error('Please sign in to place a bid');
      navigate('/auth');
      return;
    }

    if (user.id === sellerId) {
      toast.error("You can't bid on your own listing");
      return;
    }

    const amount = parseFloat(bidAmount);
    if (isNaN(amount) || amount < minimumBid) {
      toast.error(`Minimum bid is ₱${minimumBid.toLocaleString()}`);
      return;
    }

    setSubmitting(true);
    const { error } = await placeBid(amount, bidComment);
    setSubmitting(false);

    if (error) {
      toast.error(error);
    } else {
      toast.success('Bid placed successfully!');
      setBidAmount('');
      setBidComment('');
    }
  };

  const handleDeleteBid = async (bidId: string) => {
    const { error } = await deleteBid(bidId);
    if (error) {
      toast.error('Failed to remove bid');
    } else {
      toast.success('Bid removed');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Gavel className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-lg">Bids & Offers</h3>
        <span className="text-sm text-muted-foreground">({bids.length})</span>
      </div>

      {/* Highest Bid Banner */}
      {highestBid && (
        <div className="bg-primary/10 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Highest Bid</p>
            <p className="text-xl font-bold text-primary">₱{highestBid.amount.toLocaleString()}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium">{highestBid.profile?.display_name || 'Anonymous'}</p>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(highestBid.created_at), { addSuffix: true })}
            </p>
          </div>
        </div>
      )}

      {/* Place Bid Form */}
      {user?.id !== sellerId && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Place Your Bid</span>
            <span className="text-xs text-muted-foreground ml-auto">
              Min: ₱{minimumBid.toLocaleString()}
            </span>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₱</span>
              <Input
                type="number"
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
                placeholder={minimumBid.toString()}
                className="pl-7"
                min={minimumBid}
              />
            </div>
          </div>
          <Textarea
            value={bidComment}
            onChange={(e) => setBidComment(e.target.value)}
            placeholder="Add a comment (optional)..."
            rows={2}
            className="resize-none"
          />
          <Button
            onClick={handlePlaceBid}
            disabled={submitting || !bidAmount}
            className="w-full hero-gradient border-0 gap-2"
          >
            {submitting ? 'Placing bid...' : <><Send className="w-4 h-4" /> Place Bid</>}
          </Button>
        </div>
      )}

      {/* Bids List */}
      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-4">Loading bids...</p>
      ) : bids.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground">
          <Gavel className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No bids yet. Be the first to make an offer!</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {bids.map((bid, index) => (
            <div
              key={bid.id}
              className={`flex items-start gap-3 p-3 rounded-xl transition-colors ${
                index === 0 ? 'bg-primary/5 border border-primary/20' : 'bg-muted/30'
              }`}
            >
              <img
                src={bid.profile?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${bid.profile?.display_name || 'U'}`}
                alt=""
                className="w-8 h-8 rounded-full object-cover flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">
                    {bid.profile?.display_name || 'Anonymous'}
                  </span>
                  {index === 0 && (
                    <span className="text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">
                      Highest
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground ml-auto flex-shrink-0">
                    {formatDistanceToNow(new Date(bid.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="font-bold text-primary">₱{bid.amount.toLocaleString()}</p>
                {bid.comment && (
                  <p className="text-sm text-muted-foreground mt-1">{bid.comment}</p>
                )}
              </div>
              {user?.id === bid.user_id && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDeleteBid(bid.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
