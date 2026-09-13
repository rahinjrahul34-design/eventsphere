import { useState, useEffect } from 'react';

import { Clock, Sparkles, Ticket, AlertTriangle, Loader2, Lock, ArrowRight } from 'lucide-react';
import { Dialog } from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { inr } from '../../lib/format';
import { endpoints } from '../../lib/api';
import { toast } from 'sonner';

export default function SmartHoldModal({
  open,
  onClose,
  event,
  hold,
  onClaimSuccess,
  onDeclineSuccess,
}) {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const [showDeclineConfirm, setShowDeclineConfirm] = useState(false);

  // Sync remaining seconds on mount and tick every second
  useEffect(() => {
    if (!hold?.holdExpiresAt) return;

    const calculateRemaining = () => {
      const ms = new Date(hold.holdExpiresAt).getTime() - Date.now();
      return Math.max(0, Math.floor(ms / 1000));
    };

    setSecondsLeft(calculateRemaining());

    const interval = setInterval(() => {
      const remaining = calculateRemaining();
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [hold]);

  const isExpired = secondsLeft <= 0;
  const isUrgent = secondsLeft > 0 && secondsLeft <= 60;
  const isWarning = secondsLeft > 60 && secondsLeft <= 300;

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const ticketPrice = hold?.ticketType?.price || 0;
  const isFree = ticketPrice === 0;

  const handleClaim = async () => {
    if (isExpired) {
      toast.error('Seat hold has expired and was released to the waitlist');
      return;
    }

    setIsClaiming(true);
    try {
      const res = await endpoints.smartQueue.acceptHold(event._id, { holdId: hold._id });

      if (res.accepted) {
        toast.success('Seat claimed successfully! Registration confirmed.');
        onClaimSuccess?.(res);
        onClose();
        return;
      }

      // If payment required (demo payment flow)
      if (res.requiresPayment && res.order) {
        toast.info('Processing demo payment confirmation...');
        await new Promise((resolve) => setTimeout(resolve, 1400));

        const verified = await endpoints.verifyPayment({
          orderId: res.order.orderId,
          paymentId: `pay_demo_${Date.now()}`,
          signature: 'demo',
          registrationId: res.registration?._id,
        });

        toast.success('Payment verified! Your ticket has been issued.');
        onClaimSuccess?.(verified);
        onClose();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to claim seat reservation');
    } finally {
      setIsClaiming(false);
    }
  };

  const handleDecline = async () => {
    setIsDeclining(true);
    try {
      await endpoints.smartQueue.declineHold(event._id);
      toast.info('Seat released. It has been offered to the next waitlisted attendee.');
      setShowDeclineConfirm(false);
      onDeclineSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to release seat');
    } finally {
      setIsDeclining(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="">
      <div className="relative overflow-hidden p-1">
        {/* Glow Header */}
        <div className="relative rounded-xl bg-gradient-to-br from-primary/15 via-primary/10 to-primary/5 p-6 border border-primary/20 text-center">
          <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-xl bg-primary/15 text-primary dark:text-primary shadow-inner">
            <Sparkles className="size-7 animate-pulse" />
          </div>

          <Badge variant="default" className="bg-primary text-white font-semibold text-xs tracking-wider uppercase">
            SmartQueue Priority Allocation
          </Badge>

          <h2 className="mt-3 font-display text-2xl font-bold tracking-tight text-foreground">
            A Seat Just Opened For You!
          </h2>

          <p className="mt-1.5 text-sm text-muted-foreground max-w-md mx-auto">
            You were promoted from the waitlist for <strong className="text-foreground">{event?.title}</strong>.
            This seat is exclusively reserved in your name for a limited time.
          </p>

          {/* Countdown Clock Display */}
          <div className="mt-5">
            <div
              className={`inline-flex flex-col items-center justify-center px-6 py-3 rounded-xl border transition-all ${
                isExpired
                  ? 'bg-destructive/10 border-destructive/30 text-destructive'
                  : isUrgent
                  ? 'bg-destructive/10 border-destructive/30 text-destructive dark:text-destructive animate-pulse'
                  : isWarning
                  ? 'bg-warning/10 border-warning/30 text-warning dark:text-warning'
                  : 'bg-primary/[0.06] border-primary/25 text-primary'
              }`}
            >
              <div className="flex items-center gap-2">
                <Clock className={`size-5 ${isUrgent ? 'animate-spin' : ''}`} />
                <span className="font-mono text-3xl font-extrabold tracking-wider">
                  {isExpired ? '00:00' : formattedTime}
                </span>
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider mt-0.5 opacity-90">
                {isExpired
                  ? 'Hold Expired'
                  : isUrgent
                  ? 'Final minute — confirm now!'
                  : isWarning
                  ? 'Expiring in under 5 minutes'
                  : 'Reservation Window Remaining'}
              </span>
            </div>
          </div>
        </div>

        {/* Ticket & Details Box */}
        <div className="mt-4 rounded-xl border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
              <Ticket className="size-4 text-primary" /> Ticket Tier
            </span>
            <span className="font-bold text-foreground">{hold?.ticketType?.name || 'General'}</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
              <Lock className="size-4 text-primary" /> Reservation Price
            </span>
            <span className="font-extrabold text-foreground">
              {isFree ? (
                <Badge variant="outline" className="text-success border-success/30 bg-success/10 font-bold">
                  Free Admission
                </Badge>
              ) : (
                inr(ticketPrice)
              )}
            </span>
          </div>

          <div className="pt-2 border-t text-xs text-muted-foreground">
            <p>
              <strong>Fair queue rule:</strong> If unclaimed by expiration, this reservation is automatically released
              and offered to the next waitlisted attendee.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="mt-6 space-y-2">
          {!showDeclineConfirm ? (
            <>
              <Button
                onClick={handleClaim}
                disabled={isExpired || isClaiming}
                size="lg"
                className="w-full text-base font-bold shadow-lg shadow-primary/20"
              >
                {isClaiming ? (
                  <>
                    <Loader2 className="size-5 animate-spin mr-2" />
                    Securing Your Seat...
                  </>
                ) : isExpired ? (
                  'Reservation Expired'
                ) : (
                  <>
                    Claim Seat Now {isFree ? '(Free)' : `(${inr(ticketPrice)})`}
                    <ArrowRight className="size-4 ml-2" />
                  </>
                )}
              </Button>

              <Button
                variant="ghost"
                onClick={() => setShowDeclineConfirm(true)}
                disabled={isClaiming || isDeclining}
                size="sm"
                className="w-full text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              >
                Decline and pass to next in line
              </Button>
            </>
          ) : (
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-center space-y-3">
              <div className="flex items-center justify-center gap-2 text-destructive font-bold text-sm">
                <AlertTriangle className="size-4" />
                Release your reserved seat?
              </div>
              <p className="text-xs text-muted-foreground">
                This will immediately cancel your hold and promote the next candidate. This cannot be undone.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeclineConfirm(false)}
                  className="flex-1 text-xs"
                >
                  Keep My Hold
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDecline}
                  disabled={isDeclining}
                  className="flex-1 text-xs font-bold"
                >
                  {isDeclining ? <Loader2 className="size-3.5 animate-spin" /> : 'Yes, Release Seat'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
}
