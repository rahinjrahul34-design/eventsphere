import { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthShell from './AuthShell';
import { Button } from '../../components/ui/button';
import { Input, Label } from '../../components/ui/input';
import { endpoints } from '../../lib/api';
import { toast } from 'sonner';
import { MailCheck } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await endpoints.forgotPassword({ email });
      setSent(data.demoResetLink || null);
      toast.success('Reset link sent (check email)');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Forgot password?" subtitle="Enter your email and we’ll send you a reset link.">
      {sent ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-xl bg-success/10 p-4 text-sm">
            <MailCheck className="size-5 text-success shrink-0" />
            <p>Demo mode: no real email is sent. Use this one-time link:</p>
          </div>
          <Link to={sent} className="block break-all rounded-lg border bg-muted p-3 text-xs font-semibold text-primary">{sent}</Link>
          <Link to="/login"><Button className="w-full">Back to login</Button></Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label>Email</Label>
            <div className="mt-1">
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
          </div>
          <Button type="submit" className="w-full" loading={loading}>Send reset link</Button>
          <p className="text-center text-sm"><Link to="/login" className="font-semibold text-primary">Back to login</Link></p>
        </form>
      )}
    </AuthShell>
  );
}
