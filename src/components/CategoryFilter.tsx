import { categories } from '@/data/mockData';
import { cn } from '@/lib/utils';

interface CategoryFilterProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

export const CategoryFilter = ({ selectedCategory, onCategoryChange }: CategoryFilterProps) => {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => onCategoryChange(category.id)}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all duration-200",
            selectedCategory === category.id
              ? "hero-gradient text-primary-foreground shadow-lg"
              : "bg-secondary hover:bg-secondary/80 text-foreground"
          )}
        >
          <span>{category.icon}</span>
          <span className="font-medium text-sm">{category.name}</span>
        </button>
      ))}
    </div>
  );
};
