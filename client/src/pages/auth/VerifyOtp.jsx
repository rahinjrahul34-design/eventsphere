import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import AuthShell from './AuthShell';
import { Button } from '../../components/ui/button';
import { endpoints } from '../../lib/api';
import { toast } from 'sonner';
import { ArrowLeft, Clock, RotateCw, ShieldCheck, Zap } from 'lucide-react';
import { usePageTitle } from '../../hooks/usePageTitle';

export default function VerifyOtp() {
  usePageTitle('Verify Code');
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Retrieve email from navigation state or URL search parameters
  const email = location.state?.email || searchParams.get('email') || '';
  const initialDemoOtp = location.state?.demoOtp || null;
  const [demoOtp, setDemoOtp] = useState(initialDemoOtp);

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  // OTP expiration timer: 10 minutes (600 seconds)
  const [expirySeconds, setExpirySeconds] = useState(600);
  // Resend cooldown timer: 60 seconds
  const [cooldownSeconds, setCooldownSeconds] = useState(60);

  const inputRefs = useRef([]);

  // Auto-focus first input on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  // Expiration countdown
  useEffect(() => {
    if (expirySeconds <= 0) return;
    const timer = setInterval(() => {
      setExpirySeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [expirySeconds]);

  // Resend cooldown countdown
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  const formatTime = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleInputChange = (index, value) => {
    // Only accept numeric digits
    const cleaned = value.replace(/\D/g, '');

    // Handle single digit entry
    if (cleaned.length <= 1) {
      const newOtp = [...otp];
      newOtp[index] = cleaned;
      setOtp(newOtp);

      // Auto-advance to next input if digit entered
      if (cleaned && index < 5 && inputRefs.current[index + 1]) {
        inputRefs.current[index + 1].focus();
      }
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pastedData) return;

    const newOtp = [...otp];
    pastedData.split('').forEach((char, idx) => {
      if (idx < 6) newOtp[idx] = char;
    });
    setOtp(newOtp);

    // Focus on the next empty box or the last box
    const nextEmptyIndex = newOtp.findIndex((v) => !v);
    const focusIndex = nextEmptyIndex === -1 ? 5 : nextEmptyIndex;
    if (inputRefs.current[focusIndex]) {
      inputRefs.current[focusIndex].focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (otp[index]) {
        // Clear current box
        const newOtp = [...otp];
        newOtp[index] = '';
        setOtp(newOtp);
      } else if (index > 0 && inputRefs.current[index - 1]) {
        // Move to previous box and clear it
        inputRefs.current[index - 1].focus();
        const newOtp = [...otp];
        newOtp[index - 1] = '';
        setOtp(newOtp);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const submit = async (e) => {
    if (e) e.preventDefault();
    const code = otp.join('');

    if (code.length !== 6) {
      return toast.error('Please enter the full 6-digit verification code');
    }
    if (expirySeconds <= 0) {
      return toast.error('Verification code has expired. Please request a new code.');
    }
    if (!email) {
      return toast.error('Email address is missing. Please restart from forgot password.');
    }

    setLoading(true);
    try {
      const data = await endpoints.verifyOtp({ email, otp: code });
      const resetToken = data?.resetToken || data?.data?.resetToken;

      if (!resetToken) {
        throw new Error('Failed to obtain password reset authorization.');
      }

      toast.success('Code verified successfully!');
      // Navigate to reset password with resetToken
      navigate('/reset-password', {
        state: { resetToken, email },
      });
    } catch (err) {
      toast.error(err.message || 'Invalid or expired verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldownSeconds > 0 || resending) return;
    if (!email) {
      return toast.error('Email address is missing. Please restart from forgot password.');
    }

    setResending(true);
    try {
      const data = await endpoints.resendOtp({ email });
      toast.success('A new verification code has been sent.');
      setCooldownSeconds(60);
      setExpirySeconds(600);
      setOtp(['', '', '', '', '', '']);
      if (data?.demoOtp || data?.data?.demoOtp) {
        setDemoOtp(data.demoOtp || data.data.demoOtp);
      }
      if (inputRefs.current[0]) {
        inputRefs.current[0].focus();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to resend verification code.');
    } finally {
      setResending(false);
    }
  };

  const quickFill = (code) => {
    if (!code) return;
    const digits = code.slice(0, 6).split('');
    const newOtp = [...otp];
    digits.forEach((d, i) => {
      newOtp[i] = d;
    });
    setOtp(newOtp);
    if (inputRefs.current[5]) inputRefs.current[5].focus();
  };

  return (
    <AuthShell
      title="Verification Code"
      subtitle={
        email ? (
          <>
            We sent a 6-digit verification code to{' '}
            <strong className="text-foreground font-semibold">{email}</strong>.
          </>
        ) : (
          'Enter the 6-digit verification code sent to your email.'
        )
      }
      footer={
        <Link to="/forgot-password" className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline">
          <ArrowLeft className="size-4" /> Change email address
        </Link>
      }
    >
      <form onSubmit={submit} className="space-y-6">
        {/* 6-box OTP input */}
        <div>
          <div className="flex justify-between gap-2 sm:gap-3" onPaste={handlePaste}>
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                autoComplete="one-time-code"
                value={digit}
                onChange={(e) => handleInputChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="h-12 sm:h-14 w-10 sm:w-12 text-center text-xl sm:text-2xl font-bold rounded-xl border border-input bg-background shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary disabled:opacity-50"
              />
            ))}
          </div>

          {/* Expiration status */}
          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-3.5 text-muted-foreground" />
              {expirySeconds > 0 ? (
                <>Code expires in: <strong className="font-mono text-foreground">{formatTime(expirySeconds)}</strong></>
              ) : (
                <span className="text-destructive font-semibold">Code has expired</span>
              )}
            </span>
            <span className="inline-flex items-center gap-1 text-emerald-600">
              <ShieldCheck className="size-3.5" /> 256-bit encrypted
            </span>
          </div>
        </div>

        {/* Action button */}
        <Button
          type="submit"
          className="w-full"
          size="lg"
          loading={loading}
          disabled={otp.join('').length !== 6 || expirySeconds <= 0}
        >
          Verify Code
        </Button>

        {/* Resend section */}
        <div className="rounded-xl border bg-muted/30 p-4 text-center space-y-2">
          <p className="text-xs text-muted-foreground">Didn&apos;t receive the code?</p>
          {cooldownSeconds > 0 ? (
            <p className="text-xs font-medium text-muted-foreground">
              Resend available after:{' '}
              <strong className="font-mono font-bold text-foreground">{formatTime(cooldownSeconds)}</strong>
            </p>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline disabled:opacity-50"
            >
              <RotateCw className={`size-3.5 ${resending ? 'animate-spin' : ''}`} />
              Resend code
            </button>
          )}
        </div>

        {/* Demo Helper */}
        {demoOtp && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 dark:bg-amber-950/20 dark:border-amber-900/40 p-3.5">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300">
                <Zap className="size-3.5" /> Demo verification code:{' '}
                <code className="rounded bg-white/80 dark:bg-amber-900/60 px-2 py-0.5 font-mono text-sm">
                  {demoOtp}
                </code>
              </p>
              <button
                type="button"
                onClick={() => quickFill(demoOtp)}
                className="text-xs font-semibold text-primary underline hover:text-primary/80"
              >
                Auto-fill
              </button>
            </div>
          </div>
        )}
      </form>
    </AuthShell>
  );
}
