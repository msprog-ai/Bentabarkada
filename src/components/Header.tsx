import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSellerVerification } from '@/hooks/useSellerVerification';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { LogIn, User, LogOut, ShieldCheck, ShoppingCart, PlusCircle, Search } from 'lucide-react';
import { Cart } from '@/components/Cart';
import { PostItemForm } from '@/components/PostItemForm';
import { SellerVerificationForm } from '@/components/SellerVerificationForm';
import { toast } from 'sonner';
import bentabarkadaLogo from '@/assets/bentabarkada-logo.png';

export const Header = () => {
  const { user, signIn, signOut } = useAuth();
  const { isVerified, isPending, isRejected } = useSellerVerification();
  const [isPostItemOpen, setPostItemOpen] = useState(false);
  const [isVerificationOpen, setVerificationOpen] = useState(false);

  const handlePostItemClick = () => {
    if (isVerified) {
      setPostItemOpen(true);
    } else if (isPending) {
        toast.info('Your verification is pending. You will be able to post items once approved.');
    } else if (isRejected) {
        toast.error('Your previous verification was rejected. Please resubmit.');
        setVerificationOpen(true);
    } else {
        toast.info('You need to be a verified seller to post items.');
        setVerificationOpen(true);
    }
  };
  
  const handleVerificationSuccess = () => {
    setVerificationOpen(false);
    toast.success('Verification submitted! We will review your application.');
  };

  const UserMenu = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user?.photoURL || ''} alt={user?.displayName || 'User'} />
            <AvatarFallback>{user?.displayName?.charAt(0) || 'U'}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user?.displayName}</p>
            <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <User className="mr-2 h-4 w-4" />
          <span>Profile</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={signOut}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b bg-background">
        <div className="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0">
          <div className="flex gap-6 md:gap-10">
            <a href="/" className="flex items-center space-x-2">
              <img src={bentabarkadaLogo} alt="BentaBarkada" className="h-10" />
            </a>
          </div>
          
          <div className="flex flex-1 items-center justify-end space-x-2">
            {user ? (
              <>
                <Button onClick={handlePostItemClick} className='hero-gradient border-0'>
                    <PlusCircle className="mr-2 h-4 w-4" /> Post Item
                </Button>
                <Cart />
                <UserMenu />
              </>
            ) : (
              <Button onClick={signIn}>
                <LogIn className="mr-2 h-4 w-4" /> Sign In
              </Button>
            )}
          </div>
        </div>
      </header>
      {isPostItemOpen && <PostItemForm onClose={() => setPostItemOpen(false)} onSuccess={() => setPostItemOpen(false)} />}
      {isVerificationOpen && <SellerVerificationForm onClose={() => setVerificationOpen(false)} onSuccess={handleVerificationSuccess} />}
    </>
  );
};