import { useState, useRef } from 'react';
import { X, Upload, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { categories } from '@/data/mockData';
import { philippineCities, getDeliveryZoneByCity } from '@/data/philippineLocations';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface PostItemFormProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export const PostItemForm = ({ onClose, onSuccess }: PostItemFormProps) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    title: '',
    price: '',
    description: '',
    category: '',
    condition: '',
    city: '',
    province: '',
    barangay: '',
    complete_address: '',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be less than 5MB');
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    if (!user) return null;
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('listing-images')
      .upload(fileName, file);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('listing-images')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleCityChange = (city: string) => {
    const cityData = philippineCities.find(c => c.name === city);
    setFormData(prev => ({
      ...prev,
      city,
      province: cityData?.province || ''
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Please sign in to post an item');
      return;
    }

    if (!formData.category || !formData.condition || !formData.city) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      let imageUrl: string | null = null;
      
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }

      // Get delivery zone
      const zoneName = getDeliveryZoneByCity(formData.city);
      let deliveryZoneId: string | null = null;
      
      if (zoneName) {
        const { data: zone } = await supabase
          .from('delivery_zones')
          .select('id')
          .eq('name', zoneName)
          .single();
        deliveryZoneId = zone?.id || null;
      }

      const location = formData.barangay 
        ? `${formData.barangay}, ${formData.city}, ${formData.province}`
        : `${formData.city}, ${formData.province}`;

      const { error } = await supabase.from('listings').insert({
        user_id: user.id,
        title: formData.title,
        price: parseFloat(formData.price),
        description: formData.description,
        category: formData.category,
        condition: formData.condition,
        location: location,
        city: formData.city,
        complete_address: formData.complete_address || null,
        delivery_zone_id: deliveryZoneId,
        image_url: imageUrl,
      });

      if (error) throw error;

      toast.success('Your item has been posted successfully!');
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error posting item:', error);
      toast.error('Failed to post item. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-start justify-center p-4 sm:p-6 md:p-10">
          <div className="relative w-full max-w-lg bg-card rounded-2xl card-shadow overflow-hidden animate-scale-in">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-xl font-bold">Post New Item</h2>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              {/* Image Upload */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageChange}
                accept="image/*"
                className="hidden"
              />
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary transition-colors cursor-pointer relative overflow-hidden"
              >
                {imagePreview ? (
                  <div className="relative">
                    <img 
                      src={imagePreview} 
                      alt="Preview" 
                      className="w-full h-48 object-cover rounded-lg"
                    />
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity rounded-lg">
                      <p className="text-white font-medium">Click to change</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                    <p className="font-medium mb-1">Add Photo</p>
                    <p className="text-sm text-muted-foreground">Click to upload (max 5MB)</p>
                  </>
                )}
              </div>

              {/* Title */}
              <div>
                <Label>Title *</Label>
                <Input
                  placeholder="What are you selling?"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              {/* Price in PHP */}
              <div>
                <Label>Price (PHP) *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">₱</span>
                  <Input
                    type="number"
                    placeholder="0"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="pl-8"
                    required
                  />
                </div>
              </div>

              {/* Category & Condition */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.filter(c => c.id !== 'all').map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.icon} {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Condition *</Label>
                  <Select
                    value={formData.condition}
                    onValueChange={(value) => setFormData({ ...formData, condition: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">Brand New</SelectItem>
                      <SelectItem value="like-new">Like New</SelectItem>
                      <SelectItem value="good">Good</SelectItem>
                      <SelectItem value="fair">Fair</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Location - City */}
              <div>
                <Label>City *</Label>
                <Select value={formData.city} onValueChange={handleCityChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your city" />
                  </SelectTrigger>
                  <SelectContent>
                    {philippineCities.map((city) => (
                      <SelectItem key={`${city.name}-${city.province}`} value={city.name}>
                        {city.name}, {city.province}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Barangay */}
              <div>
                <Label>Barangay (Optional)</Label>
                <Input
                  placeholder="Enter barangay"
                  value={formData.barangay}
                  onChange={(e) => setFormData({ ...formData, barangay: e.target.value })}
                />
              </div>

              {/* Complete Address */}
              <div>
                <Label>Complete Address (Optional)</Label>
                <Textarea
                  placeholder="House/Unit No., Street, Building, Landmark"
                  value={formData.complete_address}
                  onChange={(e) => setFormData({ ...formData, complete_address: e.target.value })}
                  rows={2}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  This will only be shared with buyers after purchase
                </p>
              </div>

              {/* Description */}
              <div>
                <Label>Description *</Label>
                <Textarea
                  placeholder="Describe your item in detail..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  required
                />
              </div>

              {/* Submit */}
              <Button type="submit" className="w-full hero-gradient border-0" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Posting...
                  </>
                ) : (
                  'Post Item'
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
