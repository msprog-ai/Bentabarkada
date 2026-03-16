
import { useState, useRef } from 'react';
import { X, Upload, Camera, CreditCard, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { db, storage } from '@/integrations/firebase/client';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface SellerVerificationFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

const ID_TYPES = [
  { value: 'philippine_id', label: 'Philippine National ID' },
  { value: 'drivers_license', label: "Driver's License" },
  { value: 'passport', label: 'Passport' },
  { value: 'sss_id', label: 'SSS ID' },
  { value: 'voters_id', label: "Voter's ID" },
];

export const SellerVerificationForm = ({ onClose, onSuccess }: SellerVerificationFormProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  const [shopName, setShopName] = useState('');
  const [fullName, setFullName] = useState('');
  const [idType, setIdType] = useState('');
  
  const [idFrontFile, setIdFrontFile] = useState<File | null>(null);
  const [idFrontPreview, setIdFrontPreview] = useState<string | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  
  const idFrontRef = useRef<HTMLInputElement>(null);
  const selfieRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setFile: (f: File | null) => void,
    setPreview: (s: string | null) => void
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast.error('File must be less than 10MB');
        return;
      }
      setFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const uploadFile = async (file: File, path: string): Promise<string> => {
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!shopName || !fullName || !idType || !idFrontFile || !selfieFile) {
      toast.error('Please fill all fields and upload required images.');
      return;
    }

    setLoading(true);
    try {
        const idFrontPath = `verification_documents/${user.uid}/id_front_${Date.now()}`;
        const selfiePath = `verification_documents/${user.uid}/selfie_${Date.now()}`;

        const idFrontUrl = await uploadFile(idFrontFile, idFrontPath);
        const selfieUrl = await uploadFile(selfieFile, selfiePath);

        const verificationData = {
            user_id: user.uid,
            shop_name: shopName,
            full_name: fullName,
            id_type: idType,
            id_front_url: idFrontUrl,
            selfie_url: selfieUrl,
            status: 'pending',
            submitted_at: serverTimestamp(),
        };

        await setDoc(doc(db, 'seller_verifications', user.uid), verificationData);

        onSuccess();

    } catch (error: any) {
      console.error('Verification error:', error);
      toast.error(error.message || 'Failed to submit verification');
    } finally {
      setLoading(false);
    }
  };

  const FileUploadBox = ({
    label, preview, inputRef, onChange, icon: Icon
  }: {label: string; preview: string | null; inputRef: React.RefObject<HTMLInputElement>; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; icon: any; }) => (
    <div>
      <Label className="mb-2 block font-semibold">{label}</Label>
      <input type="file" ref={inputRef} onChange={onChange} accept="image/*" className="hidden" />
      <div
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary transition-colors cursor-pointer bg-muted/50"
      >
        {preview ? (
          <img src={preview} alt="preview" className="w-full h-40 object-cover rounded-lg" />
        ) : (
          <>
            <Icon className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Click to upload</p>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="fixed inset-0 overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex min-h-full items-start justify-center p-4 sm:p-6 md:p-10">
          <div className="relative w-full max-w-lg bg-card rounded-2xl card-shadow overflow-hidden animate-scale-in">
            <div className="flex items-center justify-between p-6 border-b border-border">
                <div className="flex items-center gap-3">
                    <ShieldCheck className="w-6 h-6 text-primary" />
                    <h2 className="text-lg font-bold">Become a Verified Seller</h2>
                </div>
                <button onClick={onClose} className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center hover:bg-muted transition-colors">
                    <X className="w-5 h-5" />
                </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                <p className='text-sm text-muted-foreground'>Please provide the following details to get verified. Your information will be reviewed by our admin team.</p>
                 <div>
                    <Label>Shop Name *</Label>
                    <Input placeholder="e.g. Juan's Sari-Sari Store" value={shopName} onChange={(e) => setShopName(e.target.value)} required />
                </div>
                <div>
                    <Label>Full Legal Name *</Label>
                    <Input placeholder="As it appears on your ID" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                </div>
                <div>
                    <Label>ID Type *</Label>
                    <Select value={idType} onValueChange={setIdType} required>
                        <SelectTrigger><SelectValue placeholder="Select ID type" /></SelectTrigger>
                        <SelectContent>
                        {ID_TYPES.map(t => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                </div>

                <FileUploadBox
                    label="Valid ID (Front) *"
                    preview={idFrontPreview}
                    inputRef={idFrontRef as React.RefObject<HTMLInputElement>}
                    onChange={(e) => handleFileChange(e, setIdFrontFile, setIdFrontPreview)}
                    icon={CreditCard}
                />
                <FileUploadBox
                    label="Selfie with ID *"
                    preview={selfiePreview}
                    inputRef={selfieRef as React.RefObject<HTMLInputElement>}
                    onChange={(e) => handleFileChange(e, setSelfieFile, setSelfiePreview)}
                    icon={Camera}
                />

                <Button className="w-full hero-gradient border-0" type="submit" disabled={loading}>
                    {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</> : 'Submit for Verification'}
                </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
