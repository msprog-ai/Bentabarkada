
import { useState, useRef, useEffect } from 'react';
import { X, Upload, Loader2, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { categories } from '@/data/mockData';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { db, storage } from '@/integrations/firebase/client';
import { collection, addDoc, serverTimestamp, getDocs, query, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

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
    quantity: '1',
    description: '',
    category: '',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Courier selection state
  const [couriers, setCouriers] = useState<any[]>([]);
  const [selectedCouriers, setSelectedCouriers] = useState<string[]>([]);
  const [loadingCouriers, setLoadingCouriers] = useState(true);

  // Fetch available couriers from Firestore
  useEffect(() => {
    const fetchCouriers = async () => {
      setLoadingCouriers(true);
      try {
        const couriersCollection = collection(db, 'shipping_couriers');
        const q = query(couriersCollection, where('is_active', '==', true));
        const querySnapshot = await getDocs(q);
        const couriersData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCouriers(couriersData);
      } catch (error) {
        console.error("Error fetching couriers: ", error);
        setCouriers([]);
      }
      setLoadingCouriers(false);
    };
    fetchCouriers();
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
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

  const uploadImage = async (file: File): Promise<string> => {
    if (!user) throw new Error("User not authenticated for image upload.");
    
    const fileExt = file.name.split('.').pop();
    const fileName = `listings/${user.uid}/${Date.now()}.${fileExt}`;
    const storageRef = ref(storage, fileName);

    await uploadBytes(storageRef, file);
    const downloadUrl = await getDownloadURL(storageRef);
    
    return downloadUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please sign in to post an item');
      return;
    }
    if (!formData.category || !formData.title || !formData.price || !imageFile) {
      toast.error('Please fill in all required fields and add a photo.');
      return;
    }
    if (selectedCouriers.length === 0) {
      toast.error('Please select at least one shipping courier.');
      return;
    }
    setIsSubmitting(true);
    try {
      const imageUrl = await uploadImage(imageFile);
      // Add listing to Firestore
      const listingRef = await addDoc(collection(db, 'listings'), {
        user_id: user.uid,
        title: formData.title,
        price: parseFloat(formData.price),
        quantity: parseInt(formData.quantity) || 1,
        description: formData.description,
        category: formData.category,
        image_url: imageUrl,
        approval_status: 'pending',
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
      // Insert into listing_couriers for each selected courier
      for (const courierId of selectedCouriers) {
        await addDoc(collection(db, 'listing_couriers'), {
          listing_id: listingRef.id,
          courier_id: courierId
        });
      }
      toast.success('Item submitted! It will be visible after admin review.');
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
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="fixed inset-0 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex min-h-full items-start justify-center p-4 sm:p-6 md:p-10">
          <div className="relative w-full max-w-lg bg-card rounded-2xl card-shadow overflow-hidden animate-scale-in">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-xl font-bold">Post New Item</h2>
              <button onClick={onClose} className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center hover:bg-muted transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
              <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary transition-colors cursor-pointer relative overflow-hidden">
                {imagePreview ? (
                  <div className="relative">
                    <img src={imagePreview} alt="Preview" className="w-full h-48 object-cover rounded-lg"/>
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity rounded-lg">
                      <p className="text-white font-medium">Click to change</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                    <p className="font-medium mb-1">Add Photo *</p>
                    <p className="text-sm text-muted-foreground">Click to upload (max 5MB)</p>
                  </>
                )}
              </div>

              <div>
                <Label>Title *</Label>
                <Input placeholder="What are you selling?" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Price (PHP) *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">₱</span>
                    <Input type="number" placeholder="0" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} className="pl-8" required />
                  </div>
                </div>
                <div>
                  <Label>Quantity *</Label>
                  <Input type="number" placeholder="1" min="1" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} required />
                </div>
              </div>

              <div>
                  <Label>Category *</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })} >
                    <SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger>
                    <SelectContent>
                      {categories.filter(c => c.id !== 'all').map((cat) => (
                        <SelectItem key={cat.id} value={cat.name}>{cat.icon} {cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
              </div>
        
              <div>
                <Label>Description</Label>
                <Textarea placeholder="Describe your item..." value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={4}/>
              </div>

              {/* Shipping Options - Courier selection */}
              <div>
                <Label>Shipping Options *</Label>
                {loadingCouriers ? (
                  <div className="text-muted-foreground text-sm py-2">Loading couriers...</div>
                ) : couriers.length === 0 ? (
                  <div className="text-muted-foreground text-sm py-2">No couriers available.</div>
                ) : (
                  <div className="grid grid-cols-1 gap-2 mt-2">
                    {couriers.map((courier) => (
                      <label key={courier.id} className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-colors cursor-pointer ${selectedCouriers.includes(courier.id) ? 'border-primary bg-primary/5' : 'border-border'}`}>
                        <input
                          type="checkbox"
                          checked={selectedCouriers.includes(courier.id)}
                          onChange={e => {
                            if (e.target.checked) {
                              setSelectedCouriers(prev => [...prev, courier.id]);
                            } else {
                              setSelectedCouriers(prev => prev.filter(id => id !== courier.id));
                            }
                          }}
                          className="accent-primary w-5 h-5"
                        />
                        {courier.logo_url && <img src={courier.logo_url} alt={courier.name} className="w-8 h-8 rounded bg-white border" />}
                        <span className="font-medium">{courier.name}</span>
                        <span className="text-xs text-muted-foreground">{courier.estimated_days}</span>
                        <span className="text-xs text-muted-foreground">₱{courier.base_fee}</span>
                      </label>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-1">Select at least one courier. Buyers will choose from these at checkout.</p>
              </div>

              <Button type="submit" className="w-full hero-gradient border-0" disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</> : 'Submit for Review'}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
