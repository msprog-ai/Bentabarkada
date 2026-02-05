export interface ListingItem {
  id: string;
  title: string;
  price: number;
  description: string;
  image: string;
  category: string;
  location: string;
  seller: {
    name: string;
    avatar: string;
    rating: number;
  };
  condition: 'new' | 'like-new' | 'good' | 'fair';
  createdAt: Date;
  isFavorite?: boolean;
}

export type Category = {
  id: string;
  name: string;
  icon: string;
};
