export interface ListingItem {
  id: string;
  title: string;
  price: number;
  quantity?: number;
  description: string;
  image: string;
  category: string;
  location: string;
  seller: {
    id?: string;
    name: string;
    avatar: string;
    rating: number;
  };
  condition: 'new' | 'like-new' | 'good' | 'fair';
  createdAt: Date;
  isFavorite?: boolean;
  approval_status?: string;
}

export type Category = {
  id: string;
  name: string;
  icon: string;
};
