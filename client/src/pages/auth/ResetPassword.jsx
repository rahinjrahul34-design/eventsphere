import { useState, useMemo } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import AuthShell from './AuthShell';
import { Button } from '../../components/ui/button';
import { Input, Label } from '../../components/ui/input';
import { endpoints } from '../../lib/api';
import { toast } from 'sonner';
import { Eye, EyeOff, Check, X, ShieldAlert, ArrowLeft } from 'lucide-react';
import { usePageTitle } from '../../hooks/usePageTitle';

export default function ResetPassword() {
  usePageTitle('Reset Password');
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const resetToken = location.state?.resetToken || searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  // Real-time password validation rules
  const rules = useMemo(() => {
    return [
      { id: 'len', label: 'At least 8 characters', met: newPassword.length >= 8 },
      { id: 'upper', label: 'Uppercase letter', met: /[A-Z]/.test(newPassword) },
      { id: 'lower', label: 'Lowercase letter', met: /[a-z]/.test(newPassword) },
      { id: 'number', label: 'Number', met: /[0-9]/.test(newPassword) },
      { id: 'special', label: 'Special character', met: /[^A-Za-z0-9]/.test(newPassword) },
    ];
  }, [newPassword]);

  const metCount = rules.filter((r) => r.met).length;
  const isAllMet = metCount === rules.length;

  const strength = useMemo(() => {
    if (!newPassword) return { label: 'None', pct: 0, color: 'bg-muted' };
    if (metCount <= 2) return { label: 'Weak', pct: 25, color: 'bg-destructive' };
    if (metCount <= 4) return { label: 'Medium', pct: 65, color: 'bg-amber-500' };
    return { label: 'Strong', pct: 100, color: 'bg-emerald-500' };
  }, [newPassword, metCount]);

  const submit = async (e) => {
    e.preventDefault();

    if (!resetToken) {
      return toast.error('Reset session is missing or expired. Please request a new code.');
    }
    if (!isAllMet) {
      return toast.error('Please meet all password requirements before continuing.');
    }
    if (newPassword !== confirmPassword) {
      return toast.error('Passwords do not match.');
    }

    setLoading(true);
    try {
      await endpoints.resetPassword({
        resetToken,
        newPassword,
        confirmPassword,
      });

      toast.success('Password reset successfully!');
      // Navigate to success screen
      navigate('/password-reset-success', { replace: true });
    } catch (err) {
      toast.error(err.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Reset Password"
      subtitle="Choose a strong, secure password for your EventSphere account."
      footer={
        <Link to="/login" className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline">
          <ArrowLeft className="size-4" /> Back to login
        </Link>
      }
    >
      {!resetToken ? (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
            <ShieldAlert className="size-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Reset session missing or expired</p>
              <p className="mt-1 text-xs opacity-90">
                To reset your password, please request a verification code first.
              </p>
            </div>
          </div>
          <Link to="/forgot-password" className="block">
            <Button className="w-full">Request Verification Code</Button>
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5">
          {/* New Password */}
          <div>
            <Label htmlFor="new-password">New password</Label>
            <div className="relative mt-1.5">
              <Input
                id="new-password"
                type={showNew ? 'text' : 'password'}
                required
                autoFocus
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                aria-label={showNew ? 'Hide password' : 'Show password'}
              >
                {showNew ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>

            {/* Strength meter */}
            {newPassword && (
              <div className="mt-2 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Password strength:</span>
                  <span className="font-semibold">{strength.label}</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full transition-all duration-300 ${strength.color}`}
                    style={{ width: `${strength.pct}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Requirements checklist */}
          <div className="rounded-xl border bg-muted/30 p-3.5 space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Requirements</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className={`flex items-center gap-1.5 transition-colors ${
                    rule.met ? 'text-emerald-600 font-medium' : 'text-muted-foreground'
                  }`}
                >
                  {rule.met ? (
                    <Check className="size-3.5 text-emerald-600 shrink-0" />
                  ) : (
                    <X className="size-3.5 text-muted-foreground/60 shrink-0" />
                  )}
                  <span>{rule.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <Label htmlFor="confirm-password">Confirm password</Label>
            <div className="relative mt-1.5">
              <Input
                id="confirm-password"
                type={showConfirm ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
              >
                {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="mt-1 text-xs text-destructive font-medium">Passwords do not match</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            size="lg"
            loading={loading}
            disabled={!isAllMet || newPassword !== confirmPassword}
          >
            Reset Password
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
