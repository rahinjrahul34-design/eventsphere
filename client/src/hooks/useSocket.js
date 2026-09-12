import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { connectSocket, getSocket } from '../lib/socket';
import { useAuth } from '../store/auth';

// Connects the socket once for an authenticated session and wires
// global real-time events to React Query invalidation + toasts.
export function useGlobalSocket() {
  const { token, user } = useAuth();
  const qc = useQueryClient();
  const connected = useRef(false);

  useEffect(() => {
    if (!token || connected.current) return;
    const socket = connectSocket();
    connected.current = true;

    const onNotification = (n) => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      toast(n.title, { description: n.message?.slice(0, 120), icon: '🔔' });
    };
    const onPoints = (p) => {
      toast.success(`+${p.points} points earned!`, { description: p.reason });
      qc.invalidateQueries({ queryKey: ['me'] });
      qc.invalidateQueries({ queryKey: ['gamification'] });
    };
    const onBadge = (b) => {
      toast(`Badge unlocked: ${b.name}`, { description: b.description, icon: '🏅' });
      qc.invalidateQueries({ queryKey: ['gamification'] });
    };
    const onDM = (m) => {
      qc.invalidateQueries({ queryKey: ['threads'] });
      qc.invalidateQueries({ queryKey: ['dm', m.sender] });
      toast.message(`💬 ${m.senderName}`, { description: m.text });
    };

    // ---- SmartQueue AI real-time events (FEATURES 2/8/26/68) ----
    const onSeatHeld = (d) => {
      qc.invalidateQueries({ queryKey: ['smartqueue-hold'] });
      qc.invalidateQueries({ queryKey: ['event', d?.eventId] });
      toast('⚡ A seat opened for you!', {
        description: `${d?.eventTitle || 'An event'} — complete your claim before the countdown ends.`,
        icon: '🎟',
        duration: 15000,
      });
    };
    const onHoldExpired = (d) => {
      qc.invalidateQueries({ queryKey: ['smartqueue-hold'] });
      qc.invalidateQueries({ queryKey: ['my-waitlist'] });
      toast.error(`Seat reservation expired${d?.eventTitle ? ` — ${d.eventTitle}` : ''}`, {
        description: 'The seat was released. You are back on the waitlist.',
      });
    };
    const onReminder = (d) => {
      toast(`⏳ Only ${d?.remainingMinutes ?? 'a few'} minute(s) left!`, {
        description: 'Your temporary seat reservation is about to expire.',
        duration: 10000,
      });
    };
    const onPosition = (d) => {
      qc.invalidateQueries({ queryKey: ['my-waitlist'] });
      qc.invalidateQueries({ queryKey: ['events'] });
      if (d?.position) {
        toast.message(`Waitlist update: you are now #${d.position}`, {
          description: d.previousPosition ? `Moved from #${d.previousPosition} → #${d.position}` : undefined,
        });
      }
    };
    const onQueueUpdate = () => {
      qc.invalidateQueries({ queryKey: ['smartqueue-metrics'] });
      qc.invalidateQueries({ queryKey: ['events'] });
    };

    socket.on('notification:new', onNotification);
    socket.on('points:awarded', onPoints);
    socket.on('badge:awarded', onBadge);
    socket.on('dm:message', onDM);
    socket.on('smartqueue:seat_held', onSeatHeld);
    socket.on('smartqueue:hold_expired', onHoldExpired);
    socket.on('smartqueue:reminder', onReminder);
    socket.on('smartqueue:position', onPosition);
    socket.on('smartqueue:update', onQueueUpdate);
    return () => {
      socket.off('notification:new', onNotification);
      socket.off('points:awarded', onPoints);
      socket.off('badge:awarded', onBadge);
      socket.off('dm:message', onDM);
      socket.off('smartqueue:seat_held', onSeatHeld);
      socket.off('smartqueue:hold_expired', onHoldExpired);
      socket.off('smartqueue:reminder', onReminder);
      socket.off('smartqueue:position', onPosition);
      socket.off('smartqueue:update', onQueueUpdate);
    };
  }, [token, qc, user?.id]);
}

export function useEventSocket(eventId, { enabled = true, onAttendance } = {}) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!enabled || !eventId) return undefined;
    const socket = connectSocket();
    socket.emit('event:subscribe', eventId);

    const refresh = () => qc.invalidateQueries({ queryKey: ['live', eventId] });
    const refreshAnalytics = () => qc.invalidateQueries({ queryKey: ['analytics', eventId] });
    const refreshRegs = () => qc.invalidateQueries({ queryKey: ['registrations', eventId] });
    const onAttendanceUpdate = (p) => {
      refresh();
      refreshAnalytics();
      refreshRegs();
      onAttendance?.(p);
    };

    socket.on('event:announcement', refresh);
    socket.on('event:announcement-removed', refresh);
    socket.on('event:schedule-update', () => {
      refresh();
      qc.invalidateQueries({ queryKey: ['sessions', eventId] });
    });
    socket.on('poll:new', refresh);
    socket.on('poll:update', refresh);
    socket.on('qna:new', refresh);
    socket.on('qna:update', refresh);
    socket.on('event:attendance-update', onAttendanceUpdate);
    socket.on('registration:update', () => {
      refresh();
      refreshRegs();
      refreshAnalytics();
    });
    socket.on('event:leaderboard-update', () => qc.invalidateQueries({ queryKey: ['leaderboard', eventId] }));
    socket.on('event:status', refresh);
    socket.on('notification:live', (p) => toast.info(p.title, { description: p.question }));

    return () => {
      socket.emit('event:unsubscribe', eventId);
      socket.off('event:announcement', refresh);
      socket.off('event:schedule-update');
      socket.off('poll:new', refresh);
      socket.off('poll:update', refresh);
      socket.off('qna:new', refresh);
      socket.off('qna:update', refresh);
      socket.off('event:attendance-update', onAttendanceUpdate);
      socket.off('registration:update');
      socket.off('event:leaderboard-update');
      socket.off('event:status', refresh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, enabled]);

  return getSocket();
}

// Chat socket helper used by the live page.
export function eventSocket() {
  return connectSocket();
}
