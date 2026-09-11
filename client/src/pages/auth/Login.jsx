import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Zap } from 'lucide-react';
import AuthShell from './AuthShell';
import { Button } from '../../components/ui/button';
import { Input, Label } from '../../components/ui/input';
import { useAuth } from '../../store/auth';
import { toast } from 'sonner';

const DEMO = [
  { role: 'Admin', email: 'admin@eventsphere.demo' },
  { role: 'Organizer', email: 'organizer@eventsphere.demo' },
  { role: 'Attendee', email: 'attendee@eventsphere.demo' },
  { role: 'Volunteer', email: 'volunteer@eventsphere.demo' },
  { role: 'Speaker', email: 'speaker@eventsphere.demo' },
];

export default function Login() {
  const { register, handleSubmit, setValue, formState: { errors } } = useForm();
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const googleRef = useRef(null);
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      setGoogleReady(false);
      return;
    }

    const existingScript = document.getElementById('google-gsi-script');
    const render = () => {
      if (!window.google?.accounts?.id || !googleRef.current) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response) => {
          try {
            const user = await loginWithGoogle(response.credential);
            toast.success(`Welcome, ${user.name.split(' ')[0]}!`);
            const dest = location.state?.from;
            if (dest && !dest.startsWith('/login')) return navigate(dest);
            navigate(
              user.role === 'admin' ? '/admin'
                : user.role === 'organizer' ? '/dashboard/overview'
                  : user.role === 'volunteer' ? '/dashboard/assignments'
                    : user.role === 'speaker' ? '/dashboard/speaking'
                      : '/home'
            );
          } catch (e) {
            toast.error(e.message || 'Google sign-in failed');
          }
        },
      });
      window.google.accounts.id.renderButton(googleRef.current, {
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'pill',
        width: '100%',
      });
      setGoogleReady(true);
    };

    if (existingScript) {
      if (window.google?.accounts?.id) render();
      else existingScript.addEventListener('load', render, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-gsi-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = render;
    document.body.appendChild(script);
  }, [location.state?.from, loginWithGoogle, navigate]);

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const user = await login(data.email, data.password);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`);
      const dest = location.state?.from;
      if (dest && !dest.startsWith('/login')) return navigate(dest);
      navigate(
        user.role === 'admin' ? '/admin'
          : user.role === 'organizer' ? '/dashboard/overview'
            : user.role === 'volunteer' ? '/dashboard/assignments'
              : user.role === 'speaker' ? '/dashboard/speaking'
                : '/home'
      );
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const quick = (email) => {
    setValue('email', email);
    setValue('password', 'Event@123');
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to continue to your events, tickets and network."
      footer={<>New to EventSphere? <Link to="/register" className="font-bold text-primary hover:underline">Create an account</Link></>}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label>Email</Label>
          <div className="mt-1">
            <Input type="email" placeholder="you@example.com" error={errors.email}
              {...register('email', { required: 'Email is required' })} />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between">
            <Label>Password</Label>
            <Link to="/forgot-password" className="text-xs font-semibold text-primary hover:underline">Forgot?</Link>
          </div>
          <div className="relative mt-1">
            <Input type={show ? 'text' : 'password'} placeholder="••••••••" error={errors.password}
              {...register('password', { required: 'Password is required' })} />
            <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-3 top-2.5 text-muted-foreground">
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>
        <Button type="submit" className="w-full" size="lg" loading={loading}>Log in</Button>
      </form>

      <div className="mt-4 space-y-3">
        <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          or continue with
          <span className="h-px flex-1 bg-border" />
        </div>
        {googleReady ? (
          <div ref={googleRef} className="min-h-[44px]" />
        ) : (
          <Button type="button" variant="outline" className="w-full" disabled>
            Google sign-in needs VITE_GOOGLE_CLIENT_ID
          </Button>
        )}
      </div>

      <div className="mt-8 rounded-xl border bg-muted/40 p-4">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          <Zap className="size-3.5 text-warning" /> Demo accounts · password <code className="rounded bg-card px-1.5 py-0.5">Event@123</code>
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {DEMO.map((d) => (
            <button
              key={d.email}
              type="button"
              onClick={() => quick(d.email)}
              className="rounded-lg border bg-card px-3 py-2 text-left text-xs font-semibold hover:border-primary hover:text-primary transition"
            >
              {d.role}
            </button>
          ))}
        </div>
      </div>
    </AuthShell>
  );
}
