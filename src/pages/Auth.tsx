import { useState, useEffect } from 'react';
import bentaBarkadaLogo from '@/assets/bentabarkada-logo.png';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { z } from 'zod';
import { Loader2, Mail, ArrowLeft, ShoppingBag, Store, Upload, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');
const phoneSchema = z.string().regex(/^(\+63|0)?9\d{9}$/, 'Please enter a valid Philippine phone number');

type AuthMode = 'login' | 'signup-select' | 'signup-buyer' | 'signup-seller' | 'forgot-password' | 'reset-sent';

const ID_TYPES = [
  { value: 'philippine_id', label: 'Philippine National ID' },
  { value: 'drivers_license', label: "Driver's License" },
  { value: 'passport', label: 'Passport' },
  { value: 'sss_id', label: 'SSS ID' },
  { value: 'philhealth_id', label: 'PhilHealth ID' },
  { value: 'voters_id', label: "Voter's ID" },
  { value: 'postal_id', label: 'Postal ID' },
];

const Auth = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Common fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');

  // Seller-specific fields
  const [shopName, setShopName] = useState('');
  const [idType, setIdType] = useState('');
  const [idFile, setIdFile] = useState<File | null>(null);
  const [idPreview, setIdPreview] = useState('');
  const [address, setAddress] = useState('');
  const [socialLink, setSocialLink] = useState('');

  useEffect(() => {
    if (user) navigate('/');
  }, [user, navigate]);

  const handleIdFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File must be less than 5MB');
      return;
    }
    setIdFile(file);
    const reader = new FileReader();
    reader.onload = () => setIdPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const uploadIdFile = async (userId: string, file: File): Promise<string> => {
    const ext = file.name.split('.').pop();
    const path = `${userId}/gov-id.${ext}`;
    const { error } = await supabase.storage
      .from('verification-documents')
      .upload(path, file, { upsert: true });
    if (error) throw error;
    return path;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      emailSchema.parse(email);
      passwordSchema.parse(password);

      const { error, data: signInData } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(error.message.includes('Invalid login credentials') ? 'Invalid email or password' : error.message);
        return;
      }

      // Check approval
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_approved')
        .eq('user_id', signInData.user.id)
        .maybeSingle();

      if (profile && !profile.is_approved) {
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', signInData.user.id)
          .eq('role', 'admin')
          .maybeSingle();

        if (!roleData) {
          await supabase.auth.signOut();
          toast.error('Your account is pending admin approval. Please wait for approval before signing in.');
          return;
        }
      }
      toast.success('Welcome back!');
      navigate('/');
    } catch (error) {
      if (error instanceof z.ZodError) toast.error(error.errors[0].message);
    } finally {
      setLoading(false);
    }
  };

  const handleBuyerSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      emailSchema.parse(email);
      passwordSchema.parse(password);
      if (!fullName.trim()) throw new Error('Full name is required');
      phoneSchema.parse(phone);
      if (password !== confirmPassword) throw new Error('Passwords do not match');

      const { error, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: { display_name: fullName },
        },
      });
      if (error) {
        toast.error(error.message.includes('already registered') ? 'This email is already registered.' : error.message);
        return;
      }

      // Update profile with phone and user_type
      if (data.user) {
        await supabase.from('profiles').update({
          phone,
          user_type: 'buyer',
          display_name: fullName,
        }).eq('user_id', data.user.id);
      }

      toast.success('Account created! Please check your email to verify. Your account will need admin approval.');
      setMode('login');
    } catch (error: any) {
      if (error instanceof z.ZodError) toast.error(error.errors[0].message);
      else toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSellerSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      emailSchema.parse(email);
      passwordSchema.parse(password);
      if (!fullName.trim()) throw new Error('Full name is required');
      if (!shopName.trim()) throw new Error('Shop name is required');
      phoneSchema.parse(phone);
      if (password !== confirmPassword) throw new Error('Passwords do not match');
      if (!idType) throw new Error('Please select an ID type');
      if (!idFile) throw new Error('Please upload your government ID');
      if (!address.trim()) throw new Error('Address is required');

      const { error, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: { display_name: fullName },
        },
      });
      if (error) {
        toast.error(error.message.includes('already registered') ? 'This email is already registered.' : error.message);
        return;
      }

      if (data.user) {
        // Update profile
        await supabase.from('profiles').update({
          phone,
          user_type: 'seller',
          display_name: fullName,
        }).eq('user_id', data.user.id);

        // Upload ID
        const idPath = await uploadIdFile(data.user.id, idFile);

        // Create seller verification
        await supabase.from('seller_verifications').insert({
          user_id: data.user.id,
          full_name: fullName,
          phone,
          address,
          id_type: idType,
          id_front_url: idPath,
          shop_name: shopName,
          social_link: socialLink || null,
          status: 'pending',
        });
      }

      toast.success('Seller account created! Please verify your email. Your account will be reviewed by our admin team.');
      setMode('login');
    } catch (error: any) {
      if (error instanceof z.ZodError) toast.error(error.errors[0].message);
      else toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      emailSchema.parse(email);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?mode=reset`,
      });
      if (error) toast.error(error.message);
      else setMode('reset-sent');
    } catch (error) {
      if (error instanceof z.ZodError) toast.error(error.errors[0].message);
    } finally {
      setLoading(false);
    }
  };

  const PasswordInput = ({ value, onChange, placeholder = '••••••••' }: { value: string; onChange: (v: string) => void; placeholder?: string }) => (
    <div className="relative">
      <Input
        type={showPassword ? 'text' : 'password'}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
      />
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
      >
        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );

  const renderContent = () => {
    switch (mode) {
      case 'signup-select':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold">Join BentaBarkada</h2>
              <p className="text-muted-foreground text-sm mt-1">How would you like to use the platform?</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <button
                onClick={() => setMode('signup-buyer')}
                className="flex items-center gap-4 p-5 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all text-left group"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <ShoppingBag className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-lg">I'm a Buyer</p>
                  <p className="text-sm text-muted-foreground">Browse and buy pre-loved items</p>
                </div>
              </button>

              <button
                onClick={() => setMode('signup-seller')}
                className="flex items-center gap-4 p-5 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all text-left group"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Store className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-lg">I'm a Seller</p>
                  <p className="text-sm text-muted-foreground">List and sell your pre-loved items</p>
                </div>
              </button>
            </div>

            <div className="text-center">
              <button onClick={() => setMode('login')} className="text-sm text-primary hover:underline">
                Already have an account? Sign in
              </button>
            </div>
          </div>
        );

      case 'signup-buyer':
        return (
          <form onSubmit={handleBuyerSignup} className="space-y-4">
            <div className="text-center mb-2">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-2">
                <ShoppingBag className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">Buyer Registration</h2>
              <p className="text-muted-foreground text-sm">Create your buyer account</p>
            </div>

            <div>
              <Label>Full Name *</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Juan Dela Cruz" required />
            </div>
            <div>
              <Label>Email *</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
            </div>
            <div>
              <Label>Mobile Number *</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="09XX XXX XXXX" required />
              <p className="text-xs text-muted-foreground mt-1">Philippine mobile number starting with 09</p>
            </div>
            <div>
              <Label>Password *</Label>
              <PasswordInput value={password} onChange={setPassword} />
            </div>
            <div>
              <Label>Confirm Password *</Label>
              <PasswordInput value={confirmPassword} onChange={setConfirmPassword} placeholder="Confirm password" />
            </div>

            <Button type="submit" className="w-full hero-gradient border-0" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Buyer Account'}
            </Button>

            <button type="button" onClick={() => setMode('signup-select')} className="flex items-center gap-2 text-sm text-primary hover:underline mx-auto">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          </form>
        );

      case 'signup-seller':
        return (
          <form onSubmit={handleSellerSignup} className="space-y-4">
            <div className="text-center mb-2">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-2">
                <Store className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">Seller Registration</h2>
              <p className="text-muted-foreground text-sm">Your account will be reviewed before activation</p>
            </div>

            <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg text-sm">
              <p className="font-medium text-warning">📋 Seller accounts require admin approval</p>
              <p className="text-muted-foreground mt-1">Please provide accurate information. Your account will remain pending until verified.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Full Name *</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Juan Dela Cruz" required />
              </div>
              <div>
                <Label>Shop Name *</Label>
                <Input value={shopName} onChange={(e) => setShopName(e.target.value)} placeholder="My Shop PH" required />
              </div>
            </div>

            <div>
              <Label>Email *</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
            </div>
            <div>
              <Label>Mobile Number *</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="09XX XXX XXXX" required />
            </div>
            <div>
              <Label>Address *</Label>
              <Textarea value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Complete address" rows={2} required />
            </div>
            <div>
              <Label>Government ID Type *</Label>
              <Select value={idType} onValueChange={setIdType}>
                <SelectTrigger><SelectValue placeholder="Select ID type" /></SelectTrigger>
                <SelectContent>
                  {ID_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Upload Government ID *</Label>
              <div className="mt-1">
                {idPreview ? (
                  <div className="relative">
                    <img src={idPreview} alt="ID Preview" className="w-full h-40 object-cover rounded-lg border" />
                    <button type="button" onClick={() => { setIdFile(null); setIdPreview(''); }} className="absolute top-2 right-2 bg-background/80 rounded-full p-1 text-xs">✕</button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                    <Upload className="w-6 h-6 text-muted-foreground mb-2" />
                    <span className="text-sm text-muted-foreground">Click to upload (max 5MB)</span>
                    <input type="file" accept="image/*" onChange={handleIdFileChange} className="hidden" />
                  </label>
                )}
              </div>
            </div>
            <div>
              <Label>Social Media / Store Link (Optional)</Label>
              <Input value={socialLink} onChange={(e) => setSocialLink(e.target.value)} placeholder="https://facebook.com/myshop" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Password *</Label>
                <PasswordInput value={password} onChange={setPassword} />
              </div>
              <div>
                <Label>Confirm Password *</Label>
                <PasswordInput value={confirmPassword} onChange={setConfirmPassword} placeholder="Confirm" />
              </div>
            </div>

            <Button type="submit" className="w-full hero-gradient border-0" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Seller Application'}
            </Button>

            <button type="button" onClick={() => setMode('signup-select')} className="flex items-center gap-2 text-sm text-primary hover:underline mx-auto">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          </form>
        );

      case 'forgot-password':
        return (
          <form onSubmit={handleForgotPassword} className="space-y-6">
            <div className="text-center">
              <Mail className="w-12 h-12 mx-auto text-primary mb-4" />
              <h2 className="text-xl font-semibold">Reset Password</h2>
              <p className="text-muted-foreground text-sm mt-1">Enter your email and we'll send you a reset link</p>
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full hero-gradient border-0" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Reset Link'}
            </Button>
            <button type="button" onClick={() => setMode('login')} className="flex items-center gap-2 text-sm text-primary hover:underline mx-auto">
              <ArrowLeft className="w-4 h-4" /> Back to login
            </button>
          </form>
        );

      case 'reset-sent':
        return (
          <div className="space-y-6 text-center">
            <Mail className="w-16 h-16 mx-auto text-primary" />
            <div>
              <h2 className="text-xl font-semibold">Check Your Email</h2>
              <p className="text-muted-foreground mt-2">We've sent a password reset link to <strong>{email}</strong></p>
            </div>
            <Button onClick={() => setMode('login')} variant="outline" className="w-full">Back to Login</Button>
          </div>
        );

      default: // login
        return (
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <Label>Email</Label>
              <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label>Password</Label>
                <button type="button" onClick={() => setMode('forgot-password')} className="text-xs text-primary hover:underline">Forgot password?</button>
              </div>
              <PasswordInput value={password} onChange={setPassword} />
            </div>

            <Button type="submit" className="w-full hero-gradient border-0" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign In'}
            </Button>

            <div className="text-center">
              <button type="button" onClick={() => setMode('signup-select')} className="text-sm text-primary hover:underline">
                Don't have an account? Sign up
              </button>
            </div>
          </form>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md space-y-6">
        <div>
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="w-4 h-4" /> Back to Marketplace
          </button>
          <div className="text-center">
            <img src={bentaBarkadaLogo} alt="BentaBarkada" className="h-28 mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">
              {mode === 'login' && 'Sign in to your account'}
              {mode === 'signup-select' && 'Choose your account type'}
              {mode === 'signup-buyer' && 'Create a buyer account'}
              {mode === 'signup-seller' && 'Apply as a seller'}
              {mode === 'forgot-password' && 'Reset your password'}
              {mode === 'reset-sent' && 'Password reset email sent'}
            </p>
          </div>
        </div>
        <div className="bg-card p-6 sm:p-8 rounded-2xl card-shadow">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default Auth;
