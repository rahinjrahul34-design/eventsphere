import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import AuthShell from './AuthShell';
import { Button } from '../../components/ui/button';
import { Input, Label } from '../../components/ui/input';
import { endpoints } from '../../lib/api';
import { useAuth } from '../../store/auth';
import { toast } from 'sonner';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { setSession } = useAuth();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    if (password.length < 6) return toast.error('Password must be at least 6 characters');
    setLoading(true);
    try {
      const data = await endpoints.resetPassword({ token: params.get('token'), password });
      setSession({ token: data.token, user: data.user });
      toast.success('Password reset successfully — you’re logged in');
      navigate('/home');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Set a new password" subtitle="Choose a strong password for your EventSphere account.">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <Label>New password</Label>
          <div className="mt-1">
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" />
          </div>
        </div>
        <Button type="submit" className="w-full" loading={loading}>Reset password</Button>
        <p className="text-center text-sm"><Link to="/login" className="font-semibold text-primary">Back to login</Link></p>
      </form>
    </AuthShell>
  );
}
