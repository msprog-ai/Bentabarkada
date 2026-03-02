import { TrendingUp, Users, Shield } from 'lucide-react';

export const HeroSection = () => {
  return (
    <section className="relative py-16 md:py-24 overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute inset-0 hero-gradient opacity-5" />
      
      <div className="container mx-auto px-4 relative">
        <div className="text-center max-w-3xl mx-auto mb-12 animate-slide-up">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 leading-tight">
            Sell It to Your{' '}
            <span className="text-gradient">Barkada</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            The Philippines' community marketplace.
            Buy and sell items with your community — fast, safe, and free!
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 md:gap-8 max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="text-center p-4 rounded-xl bg-card card-shadow">
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl hero-gradient flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-primary-foreground" />
            </div>
            <p className="text-2xl md:text-3xl font-bold mb-1">50K+</p>
            <p className="text-sm text-muted-foreground">Listings</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-card card-shadow">
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl hero-gradient flex items-center justify-center">
              <Users className="w-6 h-6 text-primary-foreground" />
            </div>
            <p className="text-2xl md:text-3xl font-bold mb-1">25K+</p>
            <p className="text-sm text-muted-foreground">Users</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-card card-shadow">
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl hero-gradient flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary-foreground" />
            </div>
            <p className="text-2xl md:text-3xl font-bold mb-1">100%</p>
            <p className="text-sm text-muted-foreground">Secure</p>
          </div>
        </div>
      </div>
    </section>
  );
};
