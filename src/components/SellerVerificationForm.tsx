import { useState, useRef } from 'react';
import { X, Upload, Camera, Phone, User, MapPin, CreditCard, Loader2, CheckCircle, Clock, XCircle, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSellerVerification } from '@/hooks/useSellerVerification';
import { toast } from 'sonner';
import { z } from 'zod';

const phoneSchema = z.string().regex(/^(\+63|0)?9\d{9}$/, 'Please enter a valid Philippine phone number');

interface SellerVerificationFormProps {
  onClose: () => void;
}

const ID_TYPES = [
  { value: 'philippine_id', label: 'Philippine National ID' },
  { value: 'drivers_license', label: "Driver's License" },
  { value: 'passport', label: 'Passport' },
  { value: 'sss_id', label: 'SSS ID' },
  { value: 'philhealth_id', label: 'PhilHealth ID' },
  { value: 'voters_id', label: "Voter's ID" },
  { value: 'postal_id', label: 'Postal ID' },
];

export const SellerVerificationForm = ({ onClose }: SellerVerificationFormProps) => {
  const { user } = useAuth();
  const { verification, isPending, isRejected, refetch } = useSellerVerification();
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Step 1: Basic info
  const [fullName, setFullName] = useState(verification?.full_name || '');
  const [phone, setPhone] = useState(verification?.phone || '');
  const [address, setAddress] = useState(verification?.address || '');
  
  // Step 2: Phone OTP
  const [otpSent, setOtpSent] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const [phoneVerified, setPhoneVerified] = useState(verification?.phone_verified || false);
  
  // Step 3: ID upload
  const [idType, setIdType] = useState(verification?.id_type || '');
  const [idFrontFile, setIdFrontFile] = useState<File | null>(null);
  const [idFrontPreview, setIdFrontPreview] = useState<string | null>(null);
  const [idBackFile, setIdBackFile] = useState<File | null>(null);
  const [idBackPreview, setIdBackPreview] = useState<string | null>(null);
  
  // Step 4: Selfie
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  
  const idFrontRef = useRef<HTMLInputElement>(null);
  const idBackRef = useRef<HTMLInputElement>(null);
  const selfieRef = useRef<HTMLInputElement>(null);

  const formatPhoneNumber = (phone: string): string => {
    if (phone.startsWith('0')) return '+63' + phone.substring(1);
    if (!phone.startsWith('+')) return '+63' + phone;
    return phone;
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setFile: (f: File | null) => void,
    setPreview: (s: string | null) => void
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File must be less than 10MB');
        return;
      }
      setFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const uploadFile = async (file: File, folder: string): Promise<string> => {
    if (!user) throw new Error('Not authenticated');
    const ext = file.name.split('.').pop();
    const path = `${user.id}/${folder}_${Date.now()}.${ext}`;
    
    const { error } = await supabase.storage
      .from('verification-documents')
      .upload(path, file);
    if (error) throw error;
    
    // Return the path (not public URL since bucket is private)
    return path;
  };

  const handleSendOtp = async () => {
    try {
      phoneSchema.parse(phone);
      setLoading(true);
      const formatted = formatPhoneNumber(phone);
      const { error } = await supabase.auth.signInWithOtp({ phone: formatted });
      if (error) {
        toast.error(error.message);
      } else {
        setOtpSent(true);
        toast.success('OTP sent to your phone!');
      }
    } catch (err) {
      if (err instanceof z.ZodError) toast.error(err.errors[0].message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpValue.length !== 6) {
      toast.error('Please enter the 6-digit code');
      return;
    }
    setLoading(true);
    try {
      const formatted = formatPhoneNumber(phone);
      const { error } = await supabase.auth.verifyOtp({
        phone: formatted,
        token: otpValue,
        type: 'sms',
      });
      if (error) {
        toast.error(error.message);
      } else {
        setPhoneVerified(true);
        toast.success('Phone verified!');
      }
    } catch {
      toast.error('Failed to verify OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!fullName || !phone || !address) {
      toast.error('Please fill in all basic information');
      return;
    }
    if (!idType) {
      toast.error('Please select an ID type');
      return;
    }
    if (!idFrontFile) {
      toast.error('Please upload the front of your ID');
      return;
    }
    if (!selfieFile) {
      toast.error('Please upload a selfie');
      return;
    }

    setLoading(true);
    try {
      const idFrontUrl = await uploadFile(idFrontFile, 'id_front');
      const idBackUrl = idBackFile ? await uploadFile(idBackFile, 'id_back') : null;
      const selfieUrl = await uploadFile(selfieFile, 'selfie');

      const payload = {
        user_id: user.id,
        full_name: fullName,
        phone: formatPhoneNumber(phone),
        phone_verified: phoneVerified,
        address,
        id_type: idType,
        id_front_url: idFrontUrl,
        id_back_url: idBackUrl,
        selfie_url: selfieUrl,
        status: 'pending' as const,
      };

      if (verification && isRejected) {
        // Re-submit after rejection
        const { error } = await supabase
          .from('seller_verifications')
          .update({ ...payload, rejection_reason: null })
          .eq('id', verification.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('seller_verifications')
          .insert(payload);
        if (error) throw error;
      }

      toast.success('Verification submitted! An admin will review your application.');
      refetch();
      onClose();
    } catch (error: any) {
      console.error('Verification error:', error);
      toast.error(error.message || 'Failed to submit verification');
    } finally {
      setLoading(false);
    }
  };

  // Show status if already submitted
  if (isPending) {
    return (
      <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm animate-fade-in">
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="w-full max-w-md bg-card rounded-2xl card-shadow p-8 text-center space-y-6 animate-scale-in">
              <Clock className="w-16 h-16 mx-auto text-warning" />
              <h2 className="text-xl font-bold">Verification Pending</h2>
              <p className="text-muted-foreground">
                Your seller verification is being reviewed by our team. We'll notify you once it's approved.
              </p>
              <Button onClick={onClose} variant="outline" className="w-full">Close</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const FileUploadBox = ({
    label, preview, inputRef, onChange, icon: Icon
  }: {
    label: string;
    preview: string | null;
    inputRef: React.RefObject<HTMLInputElement>;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    icon: any;
  }) => (
    <div>
      <Label className="mb-2 block">{label}</Label>
      <input type="file" ref={inputRef} onChange={onChange} accept="image/*" className="hidden" />
      <div
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary transition-colors cursor-pointer"
      >
        {preview ? (
          <img src={preview} alt={label} className="w-full h-40 object-cover rounded-lg" />
        ) : (
          <>
            <Icon className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Click to upload</p>
          </>
        )}
      </div>
    </div>
  );

  const totalSteps = 4;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-start justify-center p-4 sm:p-6 md:p-10">
          <div className="relative w-full max-w-lg bg-card rounded-2xl card-shadow overflow-hidden animate-scale-in">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-6 h-6 text-primary" />
                <div>
                  <h2 className="text-lg font-bold">Seller Verification</h2>
                  <p className="text-xs text-muted-foreground">Step {step} of {totalSteps}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Progress bar */}
            <div className="h-1 bg-muted">
              <div
                className="h-full hero-gradient transition-all duration-300"
                style={{ width: `${(step / totalSteps) * 100}%` }}
              />
            </div>

            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              {isRejected && verification?.rejection_reason && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-destructive text-sm">Previous submission rejected</p>
                    <p className="text-sm text-muted-foreground mt-1">{verification.rejection_reason}</p>
                  </div>
                </div>
              )}

              {/* Step 1: Basic Info */}
              {step === 1 && (
                <div className="space-y-4">
                  <div className="text-center mb-4">
                    <User className="w-10 h-10 mx-auto text-primary mb-2" />
                    <h3 className="font-semibold">Basic Information</h3>
                    <p className="text-sm text-muted-foreground">Tell us about yourself</p>
                  </div>
                  <div>
                    <Label>Full Legal Name *</Label>
                    <Input
                      placeholder="Juan Dela Cruz"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label>Phone Number *</Label>
                    <Input
                      type="tel"
                      placeholder="09XX XXX XXXX"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label>Complete Address *</Label>
                    <Textarea
                      placeholder="House No., Street, Barangay, City, Province"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      rows={3}
                      required
                    />
                  </div>
                  <Button
                    className="w-full hero-gradient border-0"
                    onClick={() => {
                      if (!fullName || !phone || !address) {
                        toast.error('Please fill in all fields');
                        return;
                      }
                      setStep(2);
                    }}
                  >
                    Continue
                  </Button>
                </div>
              )}

              {/* Step 2: Phone Verification */}
              {step === 2 && (
                <div className="space-y-4">
                  <div className="text-center mb-4">
                    <Phone className="w-10 h-10 mx-auto text-primary mb-2" />
                    <h3 className="font-semibold">Verify Phone Number</h3>
                    <p className="text-sm text-muted-foreground">We'll send an OTP to {phone}</p>
                  </div>

                  {phoneVerified ? (
                    <div className="text-center space-y-4">
                      <CheckCircle className="w-16 h-16 mx-auto text-green-500" />
                      <p className="font-medium text-green-700">Phone verified successfully!</p>
                      <Button className="w-full hero-gradient border-0" onClick={() => setStep(3)}>
                        Continue
                      </Button>
                    </div>
                  ) : !otpSent ? (
                    <div className="space-y-4">
                      <Button
                        className="w-full hero-gradient border-0"
                        onClick={handleSendOtp}
                        disabled={loading}
                      >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send OTP'}
                      </Button>
                      <button
                        onClick={() => { setPhoneVerified(false); setStep(3); }}
                        className="text-sm text-muted-foreground hover:underline mx-auto block"
                      >
                        Skip for now (optional)
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex justify-center">
                        <InputOTP value={otpValue} onChange={setOtpValue} maxLength={6}>
                          <InputOTPGroup>
                            <InputOTPSlot index={0} />
                            <InputOTPSlot index={1} />
                            <InputOTPSlot index={2} />
                            <InputOTPSlot index={3} />
                            <InputOTPSlot index={4} />
                            <InputOTPSlot index={5} />
                          </InputOTPGroup>
                        </InputOTP>
                      </div>
                      <Button
                        className="w-full hero-gradient border-0"
                        onClick={handleVerifyOtp}
                        disabled={loading || otpValue.length !== 6}
                      >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify'}
                      </Button>
                    </div>
                  )}

                  <button
                    onClick={() => setStep(1)}
                    className="text-sm text-primary hover:underline mx-auto block"
                  >
                    ← Back
                  </button>
                </div>
              )}

              {/* Step 3: ID Upload */}
              {step === 3 && (
                <div className="space-y-4">
                  <div className="text-center mb-4">
                    <CreditCard className="w-10 h-10 mx-auto text-primary mb-2" />
                    <h3 className="font-semibold">Upload Government ID</h3>
                    <p className="text-sm text-muted-foreground">We need a valid government-issued ID</p>
                  </div>

                  <div>
                    <Label>ID Type *</Label>
                    <Select value={idType} onValueChange={setIdType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select ID type" />
                      </SelectTrigger>
                      <SelectContent>
                        {ID_TYPES.map(t => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <FileUploadBox
                    label="ID Front *"
                    preview={idFrontPreview}
                    inputRef={idFrontRef as React.RefObject<HTMLInputElement>}
                    onChange={(e) => handleFileChange(e, setIdFrontFile, setIdFrontPreview)}
                    icon={Upload}
                  />

                  <FileUploadBox
                    label="ID Back (Optional)"
                    preview={idBackPreview}
                    inputRef={idBackRef as React.RefObject<HTMLInputElement>}
                    onChange={(e) => handleFileChange(e, setIdBackFile, setIdBackPreview)}
                    icon={Upload}
                  />

                  <Button
                    className="w-full hero-gradient border-0"
                    onClick={() => {
                      if (!idType) { toast.error('Please select an ID type'); return; }
                      if (!idFrontFile) { toast.error('Please upload the front of your ID'); return; }
                      setStep(4);
                    }}
                  >
                    Continue
                  </Button>

                  <button onClick={() => setStep(2)} className="text-sm text-primary hover:underline mx-auto block">
                    ← Back
                  </button>
                </div>
              )}

              {/* Step 4: Selfie */}
              {step === 4 && (
                <div className="space-y-4">
                  <div className="text-center mb-4">
                    <Camera className="w-10 h-10 mx-auto text-primary mb-2" />
                    <h3 className="font-semibold">Take a Selfie</h3>
                    <p className="text-sm text-muted-foreground">
                      Upload a clear photo of yourself holding your ID
                    </p>
                  </div>

                  <FileUploadBox
                    label="Selfie with ID *"
                    preview={selfiePreview}
                    inputRef={selfieRef as React.RefObject<HTMLInputElement>}
                    onChange={(e) => handleFileChange(e, setSelfieFile, setSelfiePreview)}
                    icon={Camera}
                  />

                  <p className="text-xs text-muted-foreground text-center">
                    Hold your ID next to your face so we can verify your identity
                  </p>

                  <Button
                    className="w-full hero-gradient border-0"
                    onClick={handleSubmit}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      'Submit Verification'
                    )}
                  </Button>

                  <button onClick={() => setStep(3)} className="text-sm text-primary hover:underline mx-auto block">
                    ← Back
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
