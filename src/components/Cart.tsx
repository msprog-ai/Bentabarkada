
import { useCart } from '@/hooks/useCart';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { ShoppingCart, X, Plus, Minus, Loader2, Frown } from 'lucide-react';

export const Cart = () => {
  const { cart, loading, removeFromCart, updateItemQuantity, cartTotal, itemCount } = useCart();

  const handleQuantityChange = async (itemId: string, currentQuantity: number, change: number) => {
    const newQuantity = currentQuantity + change;
    if (newQuantity < 1) {
      // Optional: ask for confirmation before removing
      await handleRemoveItem(itemId);
    } else {
      try {
        await updateItemQuantity(itemId, newQuantity);
      } catch (error) {
        toast.error('Failed to update quantity.');
      }
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    try {
      await removeFromCart(itemId);
      toast.success('Item removed from cart.');
    } catch (error) {
      toast.error('Failed to remove item.');
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <ShoppingCart className="h-5 w-5" />
          {itemCount > 0 && (
            <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
              {itemCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle>Your Cart</SheetTitle>
        </SheetHeader>
        
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : itemCount === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <Frown className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg">Your cart is empty</h3>
            <p className="text-muted-foreground text-sm">Add items to see them here.</p>
          </div>
        ) : (
          <ScrollArea className="flex-1 -mx-6">
            <div className="px-6 space-y-4">
            {cart.map((item) => (
              item.listing ? (
              <div key={item.id} className="flex items-start gap-4">
                <img 
                  src={item.listing.image_url}
                  alt={item.listing.title}
                  className="w-20 h-20 rounded-lg object-cover bg-muted"
                />
                <div className="flex-1">
                  <p className="font-semibold text-sm leading-tight mb-1">{item.listing.title}</p>
                  <p className="text-primary font-bold text-md mb-2">₱{item.listing.price.toLocaleString()}</p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => handleQuantityChange(item.id, item.quantity, -1)}><Minus className="w-4 h-4"/></Button>
                    <span className="font-bold w-5 text-center">{item.quantity}</span>
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => handleQuantityChange(item.id, item.quantity, 1)}><Plus className="w-4 h-4"/></Button>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => handleRemoveItem(item.id)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              ) : null
            ))}
            </div>
          </ScrollArea>
        )}

        {itemCount > 0 && (
            <SheetFooter className="border-t border-border pt-6 mt-auto -mb-6 -mx-6 px-6 pb-6 bg-card">
              <div className="w-full space-y-4">
                  <div className="flex justify-between font-bold text-lg">
                      <span>Total</span>
                      <span>₱{cartTotal.toLocaleString()}</span>
                  </div>
                  <Button className="w-full hero-gradient border-0" size="lg" disabled={loading}>
                      Proceed to Checkout
                  </Button>
              </div>
            </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
};
