import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import AuthShell from './AuthShell';
import { Button } from '../../components/ui/button';
import { CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react';
import { usePageTitle } from '../../hooks/usePageTitle';

export default function PasswordResetSuccess() {
  usePageTitle('Password Reset Successful');

  // Clear any residual password-reset client state on mount
  useEffect(() => {
    try {
      sessionStorage.removeItem('es-reset-token');
      sessionStorage.removeItem('es-reset-email');
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <AuthShell
      title="Password reset successfully"
      subtitle="Your password has been updated. You can now securely log in."
    >
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center rounded-xl border border-success/25 bg-success/[0.06] p-6 text-center">
          <div className="grid size-16 place-items-center rounded-full bg-success/15 text-success mb-3">
            <CheckCircle2 className="size-9" />
          </div>
          <h2 className="text-base font-bold text-success">
            Account Secured
          </h2>
          <p className="mt-1 text-xs text-success dark:text-success max-w-xs">
            All previous reset sessions and temporary verification codes have been invalidated.
          </p>
        </div>

        <div className="rounded-xl border bg-muted/30 p-4">
          <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
            <ShieldCheck className="size-4 text-primary shrink-0" />
            <span>You will need to use your new password next time you sign in.</span>
          </div>
        </div>

        <Link to="/login" className="block">
          <Button className="w-full" size="lg">
            Back to Login <ArrowRight className="ml-1 size-4" />
          </Button>
        </Link>
      </div>
    </AuthShell>
  );
}
