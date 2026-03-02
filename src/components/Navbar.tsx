import { Search, Plus, User, LogOut, Store, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { useNavigate } from 'react-router-dom';
import { CartSheet } from '@/components/CartSheet';
import bentabarkadaLogo from '@/assets/bentabarkada-logo.png';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger } from
'@/components/ui/dropdown-menu';

interface NavbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onPostClick: () => void;
}

export const Navbar = ({ searchQuery, onSearchChange, onPostClick }: NavbarProps) => {
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();

  return (
    <nav className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo */}
          <div
            className="flex items-center gap-2 flex-shrink-0 cursor-pointer"
            onClick={() => navigate('/')}>

            <img

              alt="BentaBarkada"
              className="h-14 w-auto object-cover" src="/lovable-uploads/1889f6cb-6489-4f6c-a3d6-892f55365ff0.png" />

          </div>

          {/* Search */}
          <div className="flex-1 max-w-xl hidden sm:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10 bg-secondary border-0" />

            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Button onClick={onPostClick} className="hero-gradient border-0 gap-2">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Sell</span>
            </Button>

            <CartSheet />

            {user ?
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <User className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem className="text-muted-foreground text-sm">
                    {user.email}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <User className="w-4 h-4 mr-2" />
                    My Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/seller')}>
                    <Store className="w-4 h-4 mr-2" />
                    Seller Dashboard
                  </DropdownMenuItem>
                  {isAdmin &&
                <DropdownMenuItem onClick={() => navigate('/admin')}>
                      <ShieldCheck className="w-4 h-4 mr-2" />
                      Admin Dashboard
                    </DropdownMenuItem>
                }
                  <DropdownMenuItem onClick={signOut}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu> :

            <Button variant="outline" onClick={() => navigate('/auth')}>
                Sign In
              </Button>
            }
          </div>
        </div>

        {/* Mobile Search */}
        <div className="pb-4 sm:hidden">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 bg-secondary border-0" />

          </div>
        </div>
      </div>
    </nav>);

};