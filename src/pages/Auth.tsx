import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Eye, EyeOff, Loader2, MailCheck } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Logo from '@/components/Logo';
import { SITE } from '@/config/site';
import { firstError, signUpSchema } from '@/lib/validation';

type View = 'signin' | 'signup' | 'forgot';

interface PasswordInputProps {
  id: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  minLength?: number;
}

const PasswordInput = ({ id, value, onChange, autoComplete, minLength }: PasswordInputProps) => {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={visible ? 'text' : 'password'}
        required
        minLength={minLength}
        autoComplete={autoComplete}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="pr-10"
      />
      <button
        type="button"
        onClick={() => setVisible(v => !v)}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
        aria-label={visible ? 'Hide password' : 'Show password'}
      >
        {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
};

const Auth = () => {
  usePageTitle('Sign in');
  const { user, loading, signIn, signUp, sendPasswordReset } = useAuth();
  const nav = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  const [view, setView] = useState<View>('signin');
  const [submitting, setSubmitting] = useState(false);
  const [signInForm, setSignInForm] = useState({ email: '', password: '' });
  const [signUpForm, setSignUpForm] = useState({ fullName: '', email: '', phone: '', password: '' });
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [signUpDone, setSignUpDone] = useState(false);

  if (loading) return <div className="min-h-screen grid place-items-center"><Loader2 className="w-6 h-6 animate-spin text-primary" aria-label="Loading" /></div>;
  // Route guards send staff to /admin and customers to /account.
  if (user) return <Navigate to={from || '/admin'} replace />;

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await signIn(signInForm.email, signInForm.password);
    setSubmitting(false);
    if (error) toast.error(error === 'Invalid login credentials' ? 'Incorrect email or password.' : error);
    else nav(from || '/admin', { replace: true });
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = signUpSchema.safeParse(signUpForm);
    const problem = firstError(parsed);
    if (problem || !parsed.success) { toast.error(problem); return; }
    setSubmitting(true);
    const { error } = await signUp(parsed.data.email, parsed.data.password, parsed.data.fullName, parsed.data.phone);
    setSubmitting(false);
    if (error) toast.error(error);
    else setSignUpDone(true);
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await sendPasswordReset(resetEmail);
    setSubmitting(false);
    if (error) toast.error(error);
    else setResetSent(true);
  };

  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-br from-background to-muted p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary mb-6">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to {SITE.name}
        </Link>
        <div className="flex items-center gap-3 justify-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-white ring-2 ring-primary/30 shadow-lg flex items-center justify-center overflow-hidden">
            <Logo className="w-12 h-12" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-semibold">{SITE.name}</h1>
            <p className="text-xs text-muted-foreground">
              {view === 'forgot' ? 'Reset your password' : view === 'signup' ? 'Create your account' : 'Sign in to your account'}
            </p>
          </div>
        </div>

        <div className="bg-card rounded-2xl border p-6 shadow-sm">
          {view === 'forgot' ? (
            resetSent ? (
              <div className="text-center space-y-4 py-4">
                <MailCheck className="w-10 h-10 text-primary mx-auto" />
                <p className="font-medium">Check your inbox</p>
                <p className="text-sm text-muted-foreground">
                  If an account exists for <strong>{resetEmail}</strong>, we've sent a link to choose a new password.
                </p>
                <Button variant="outline" className="w-full" onClick={() => { setView('signin'); setResetSent(false); }}>Back to sign in</Button>
              </div>
            ) : (
              <form onSubmit={handleReset} className="space-y-4">
                <p className="text-sm text-muted-foreground">Enter the email you signed up with and we'll send you a reset link.</p>
                <div className="space-y-1.5">
                  <Label htmlFor="reset-email">Email</Label>
                  <Input id="reset-email" type="email" required autoComplete="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)} />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Send reset link
                </Button>
                <button type="button" className="w-full text-xs text-muted-foreground hover:text-primary" onClick={() => setView('signin')}>
                  Back to sign in
                </button>
              </form>
            )
          ) : (
            <Tabs value={view} onValueChange={v => setView(v as View)}>
              <TabsList className="grid grid-cols-2 w-full mb-6">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Create Account</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="si-email">Email</Label>
                    <Input id="si-email" type="email" required autoComplete="email" value={signInForm.email} onChange={e => setSignInForm(p => ({ ...p, email: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="si-password">Password</Label>
                      <button type="button" className="text-xs text-primary hover:underline" onClick={() => { setResetEmail(signInForm.email); setView('forgot'); }}>
                        Forgot password?
                      </button>
                    </div>
                    <PasswordInput id="si-password" autoComplete="current-password" value={signInForm.password} onChange={v => setSignInForm(p => ({ ...p, password: v }))} />
                  </div>
                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign In'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                {signUpDone ? (
                  <div className="text-center space-y-4 py-4">
                    <MailCheck className="w-10 h-10 text-primary mx-auto" />
                    <p className="font-medium">Account created</p>
                    <p className="text-sm text-muted-foreground">
                      We've sent a confirmation link to <strong>{signUpForm.email}</strong>. Confirm your email, then sign in.
                    </p>
                    <Button variant="outline" className="w-full" onClick={() => { setSignUpDone(false); setSignInForm({ email: signUpForm.email, password: '' }); setView('signin'); }}>
                      Go to sign in
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="su-name">Full name</Label>
                      <Input id="su-name" required autoComplete="name" maxLength={100} value={signUpForm.fullName} onChange={e => setSignUpForm(p => ({ ...p, fullName: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="su-email">Email</Label>
                      <Input id="su-email" type="email" required autoComplete="email" value={signUpForm.email} onChange={e => setSignUpForm(p => ({ ...p, email: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="su-phone">Phone <span className="text-muted-foreground font-normal">(optional)</span></Label>
                      <Input id="su-phone" type="tel" autoComplete="tel" maxLength={20} placeholder="03XX XXXXXXX" value={signUpForm.phone} onChange={e => setSignUpForm(p => ({ ...p, phone: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="su-password">Password</Label>
                      <PasswordInput id="su-password" autoComplete="new-password" minLength={8} value={signUpForm.password} onChange={v => setSignUpForm(p => ({ ...p, password: v }))} />
                      <p className="text-xs text-muted-foreground">At least 8 characters.</p>
                    </div>
                    <Button type="submit" className="w-full" disabled={submitting}>
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Account'}
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                      Track your appointments, invoices and rewards in one place.
                    </p>
                    <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
                      By creating an account you agree to our{' '}
                      <Link to="/terms" className="underline underline-offset-2 hover:text-foreground">Terms</Link> and{' '}
                      <Link to="/privacy" className="underline underline-offset-2 hover:text-foreground">Privacy Policy</Link>.
                    </p>
                  </form>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
