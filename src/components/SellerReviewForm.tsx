import { useState } from 'react';
import { Star, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface SellerReviewFormProps {
  orderId: string;
  sellerId: string;
  sellerName?: string;
  onReviewSubmitted: () => void;
}

export const SellerReviewForm = ({ orderId, sellerId, sellerName, onReviewSubmitted }: SellerReviewFormProps) => {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!user) return;
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }

    setSubmitting(true);
    const { error } = await supabase
      .from('seller_reviews')
      .insert({
        order_id: orderId,
        seller_id: sellerId,
        reviewer_id: user.id,
        rating,
        comment: comment.trim() || null,
      });

    setSubmitting(false);

    if (error) {
      if (error.code === '23505') {
        toast.info('You already reviewed this order');
      } else {
        toast.error('Failed to submit review');
        console.error('Review error:', error);
      }
      return;
    }

    toast.success('Review submitted! Thank you.');
    setSubmitted(true);
    onReviewSubmitted();
  };

  if (submitted) {
    return (
      <div className="flex items-center gap-2 text-sm text-success">
        <Star className="w-4 h-4 fill-current" />
        <span>Review submitted — thanks!</span>
      </div>
    );
  }

  return (
    <div className="border-t border-border mt-4 pt-4 space-y-3">
      <p className="text-sm font-medium">
        Rate {sellerName ? sellerName : 'the seller'}
      </p>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onMouseEnter={() => setHoveredRating(star)}
            onMouseLeave={() => setHoveredRating(0)}
            onClick={() => setRating(star)}
            className="p-0.5 transition-transform hover:scale-110"
          >
            <Star
              className={cn(
                "w-6 h-6 transition-colors",
                (hoveredRating || rating) >= star
                  ? "fill-warning text-warning"
                  : "text-muted-foreground/30"
              )}
            />
          </button>
        ))}
        {rating > 0 && (
          <span className="text-sm text-muted-foreground ml-2">
            {rating === 1 && 'Poor'}
            {rating === 2 && 'Fair'}
            {rating === 3 && 'Good'}
            {rating === 4 && 'Very Good'}
            {rating === 5 && 'Excellent'}
          </span>
        )}
      </div>
      <Textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Leave a comment (optional)..."
        rows={2}
        maxLength={500}
        className="resize-none"
      />
      <Button
        onClick={handleSubmit}
        disabled={submitting || rating === 0}
        size="sm"
        className="gap-2 hero-gradient border-0"
      >
        <Send className="w-3.5 h-3.5" />
        {submitting ? 'Submitting...' : 'Submit Review'}
      </Button>
    </div>
  );
};
