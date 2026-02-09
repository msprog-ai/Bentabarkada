import { Bike, Truck } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface DeliveryMethodSelectorProps {
  value: 'buyer_book' | 'seller_book' | null;
  onChange: (value: 'buyer_book' | 'seller_book') => void;
}

const DeliveryMethodSelector = ({ value, onChange }: DeliveryMethodSelectorProps) => {
  const methods = [
    {
      id: 'buyer_book',
      icon: Bike,
      title: 'I will book my own rider',
      description: 'Book via Lalamove, Grab, or your preferred delivery app',
      note: 'You arrange pickup with the seller',
    },
    {
      id: 'seller_book',
      icon: Truck,
      title: 'Seller will book delivery',
      description: 'Seller arranges Lalamove/Grab delivery for you',
      note: 'Delivery fee may be updated by seller',
    },
  ] as const;

  return (
    <RadioGroup value={value || ''} onValueChange={(v) => onChange(v as 'buyer_book' | 'seller_book')}>
      <div className="grid gap-4">
        {methods.map((method) => {
          const Icon = method.icon;
          return (
            <div
              key={method.id}
              onClick={() => onChange(method.id)}
              className={`flex items-start gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                value === method.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <RadioGroupItem value={method.id} id={method.id} className="mt-1" />
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                value === method.id ? 'bg-primary text-primary-foreground' : 'bg-muted'
              }`}>
                <Icon className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <label htmlFor={method.id} className="font-semibold cursor-pointer block">
                  {method.title}
                </label>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {method.description}
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1 italic">
                  {method.note}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </RadioGroup>
  );
};

export default DeliveryMethodSelector;
