import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import brandLogo from '@/assets/logo.png';

const Auth = () => {
  const { user, loading, signIn, signUp } = useAuth();
  const nav = useNavigate();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [signInForm, setSignInForm] = useState({ email: '', password: '' });
  const [signUpForm, setSignUpForm] = useState({ fullName: '', email: '', password: '' });

  if (loading) return <div className="min-h-screen grid place-items-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  if (user) return <Navigate to="/admin" replace />;

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await signIn(signInForm.email, signInForm.password);
    setSubmitting(false);
    if (error) toast({ title: 'Sign-in failed', description: error, variant: 'destructive' });
    else nav('/admin');
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await signUp(signUpForm.email, signUpForm.password, signUpForm.fullName);
    setSubmitting(false);
    if (error) toast({ title: 'Sign-up failed', description: error, variant: 'destructive' });
    else toast({ title: 'Account created', description: 'Check your email if confirmation is required, then sign in.' });
  };

  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-br from-background to-muted p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 justify-center mb-8">
          <div className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center">
            <Scissors className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-semibold">BeYou Stylin</h1>
            <p className="text-xs text-muted-foreground">Staff Portal</p>
          </div>
        </div>

        <div className="bg-card rounded-2xl border p-6 shadow-sm">
          <Tabs defaultValue="signin">
            <TabsList className="grid grid-cols-2 w-full mb-6">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Create Account</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <Label>Email</Label>
                  <Input type="email" required value={signInForm.email} onChange={e => setSignInForm(p => ({ ...p, email: e.target.value }))} />
                </div>
                <div>
                  <Label>Password</Label>
                  <Input type="password" required value={signInForm.password} onChange={e => setSignInForm(p => ({ ...p, password: e.target.value }))} />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign In'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div>
                  <Label>Full Name</Label>
                  <Input required value={signUpForm.fullName} onChange={e => setSignUpForm(p => ({ ...p, fullName: e.target.value }))} />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" required value={signUpForm.email} onChange={e => setSignUpForm(p => ({ ...p, email: e.target.value }))} />
                </div>
                <div>
                  <Label>Password</Label>
                  <Input type="password" required minLength={6} value={signUpForm.password} onChange={e => setSignUpForm(p => ({ ...p, password: e.target.value }))} />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Account'}
                </Button>
                <p className="text-xs text-muted-foreground text-center">First account becomes the Owner.</p>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Auth;
