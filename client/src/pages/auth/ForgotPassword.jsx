import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthShell from './AuthShell';
import { Button } from '../../components/ui/button';
import { Input, Label } from '../../components/ui/input';
import { endpoints } from '../../lib/api';
import { toast } from 'sonner';
import { ArrowLeft, Mail } from 'lucide-react';
import { usePageTitle } from '../../hooks/usePageTitle';

export default function ForgotPassword() {
  usePageTitle('Forgot Password');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      return toast.error('Please enter your email address');
    }
    setLoading(true);
    try {
      const data = await endpoints.forgotPassword({ email: email.trim().toLowerCase() });
      toast.success('Verification code sent. Please check your inbox.');
      // Navigate to OTP verification screen with email state
      navigate(`/verify-otp?email=${encodeURIComponent(email.trim().toLowerCase())}`, {
        state: {
          email: email.trim().toLowerCase(),
          demoOtp: data?.demoOtp || data?.data?.demoOtp || null,
        },
      });
    } catch (err) {
      toast.error(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Forgot password?"
      subtitle="Enter the email associated with your account."
      footer={
        <Link to="/login" className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline">
          <ArrowLeft className="size-4" /> Back to login
        </Link>
      }
    >
      <form onSubmit={submit} className="space-y-5">
        <div>
          <Label htmlFor="forgot-email">Email address</Label>
          <div className="relative mt-1.5">
            <Input
              id="forgot-email"
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="pl-10"
            />
            <Mail className="absolute left-3 top-2.5 size-4 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        <Button type="submit" className="w-full" size="lg" loading={loading}>
          {loading ? 'Sending...' : 'Send Verification Code'}
        </Button>
      </form>
    </AuthShell>
  );
}

