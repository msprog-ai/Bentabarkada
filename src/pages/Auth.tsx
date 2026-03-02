import { useState, useEffect } from 'react';
import bentaBarkadaLogo from '@/assets/bentabarkada-logo.png';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { toast } from 'sonner';
import { z } from 'zod';
import { Loader2, Mail, Phone, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');
const phoneSchema = z.string().regex(/^(\+63|0)?9\d{9}$/, 'Please enter a valid Philippine phone number');

type AuthMode = 'login' | 'signup' | 'phone' | 'otp' | 'forgot-password' | 'reset-sent';

const Auth = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [otpValue, setOtpValue] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const formatPhoneNumber = (phone: string): string => {
    // Convert to +63 format
    if (phone.startsWith('0')) {
      return '+63' + phone.substring(1);
    }
    if (!phone.startsWith('+')) {
      return '+63' + phone;
    }
    return phone;
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      emailSchema.parse(email);
      passwordSchema.parse(password);

      if (mode === 'login') {
        const { error, data: signInData } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast.error('Invalid email or password');
          } else {
            toast.error(error.message);
          }
        } else {
          // Check if user is approved
          const { data: profile } = await supabase
            .from('profiles')
            .select('is_approved')
            .eq('user_id', signInData.user.id)
            .maybeSingle();
          
          if (profile && !profile.is_approved) {
            // Check if user is admin (admins bypass approval)
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
        }
      } else if (mode === 'signup') {
        const redirectUrl = `${window.location.origin}/`;
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectUrl,
            data: {
              display_name: displayName || email.split('@')[0],
            },
          },
        });
        if (error) {
          if (error.message.includes('already registered')) {
            toast.error('This email is already registered. Try logging in instead.');
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success('Account created! Please check your email to confirm. Your account will need admin approval before you can access the platform.');
        }
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneSignIn = async () => {
    setLoading(true);
    try {
      phoneSchema.parse(phone);
      const formattedPhone = formatPhoneNumber(phone);

      const { error } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success('OTP sent to your phone!');
        setMode('otp');
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      }
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
      const formattedPhone = formatPhoneNumber(phone);
      const { error } = await supabase.auth.verifyOtp({
        phone: formattedPhone,
        token: otpValue,
        type: 'sms',
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Welcome!');
        navigate('/');
      }
    } catch (error) {
      toast.error('Failed to verify OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const { error } = await lovable.auth.signInWithOAuth('google', {
        redirect_uri: window.location.origin,
      });

      if (error) {
        toast.error(error.message);
      }
    } catch (error) {
      toast.error('Failed to sign in with Google');
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

      if (error) {
        toast.error(error.message);
      } else {
        setMode('reset-sent');
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      }
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    switch (mode) {
      case 'phone':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Phone className="w-12 h-12 mx-auto text-primary mb-4" />
              <h2 className="text-xl font-semibold">Sign in with Phone</h2>
              <p className="text-muted-foreground text-sm mt-1">
                We'll send you a verification code via SMS
              </p>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Phone Number</label>
              <Input
                type="tel"
                placeholder="09XX XXX XXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Philippine mobile number starting with 09
              </p>
            </div>

            <Button 
              onClick={handlePhoneSignIn} 
              className="w-full hero-gradient border-0" 
              disabled={loading}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send OTP'}
            </Button>

            <button
              type="button"
              onClick={() => setMode('login')}
              className="flex items-center gap-2 text-sm text-primary hover:underline mx-auto"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to login
            </button>
          </div>
        );

      case 'otp':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold">Enter Verification Code</h2>
              <p className="text-muted-foreground text-sm mt-1">
                We sent a 6-digit code to {phone}
              </p>
            </div>

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
              onClick={handleVerifyOtp} 
              className="w-full hero-gradient border-0" 
              disabled={loading || otpValue.length !== 6}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify'}
            </Button>

            <button
              type="button"
              onClick={() => setMode('phone')}
              className="flex items-center gap-2 text-sm text-primary hover:underline mx-auto"
            >
              <ArrowLeft className="w-4 h-4" />
              Change phone number
            </button>
          </div>
        );

      case 'forgot-password':
        return (
          <form onSubmit={handleForgotPassword} className="space-y-6">
            <div className="text-center">
              <Mail className="w-12 h-12 mx-auto text-primary mb-4" />
              <h2 className="text-xl font-semibold">Reset Password</h2>
              <p className="text-muted-foreground text-sm mt-1">
                Enter your email and we'll send you a reset link
              </p>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Email</label>
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full hero-gradient border-0" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Reset Link'}
            </Button>

            <button
              type="button"
              onClick={() => setMode('login')}
              className="flex items-center gap-2 text-sm text-primary hover:underline mx-auto"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to login
            </button>
          </form>
        );

      case 'reset-sent':
        return (
          <div className="space-y-6 text-center">
            <Mail className="w-16 h-16 mx-auto text-primary" />
            <div>
              <h2 className="text-xl font-semibold">Check Your Email</h2>
              <p className="text-muted-foreground mt-2">
                We've sent a password reset link to <strong>{email}</strong>
              </p>
            </div>
            <Button onClick={() => setMode('login')} variant="outline" className="w-full">
              Back to Login
            </Button>
          </div>
        );

      default:
        return (
          <form onSubmit={handleEmailAuth} className="space-y-6">
            {mode === 'signup' && (
              <div>
                <label className="text-sm font-medium mb-2 block">Display Name</label>
                <Input
                  type="text"
                  placeholder="Your name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-2 block">Email</label>
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Password</label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => setMode('forgot-password')}
                    className="text-xs text-primary hover:underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full hero-gradient border-0" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : mode === 'login' ? 'Sign In' : 'Sign Up'}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                className="text-sm text-primary hover:underline"
              >
                {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
              </button>
            </div>
          </form>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">
        <div>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Marketplace
          </button>
          <div className="text-center">
          <img src={bentaBarkadaLogo} alt="BentaBarkada" className="h-32 mx-auto mb-2" />
          <p className="mt-2 text-muted-foreground">
            {mode === 'login' && 'Sign in to your account'}
            {mode === 'signup' && 'Create your account'}
            {mode === 'phone' && 'Sign in with your phone'}
            {mode === 'otp' && 'Verify your phone'}
            {mode === 'forgot-password' && 'Reset your password'}
            {mode === 'reset-sent' && 'Password reset email sent'}
          </p>
          </div>
        </div>
        <div className="bg-card p-8 rounded-2xl card-shadow">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default Auth;
