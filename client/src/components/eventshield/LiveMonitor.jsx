import { Radio, Users2, QrCode, DoorOpen, Timer } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Badge } from '../ui/badge';
import { scoreBand } from './shieldUtils';

export default function LiveMonitor({ event, assessment, alerts = [] }) {
  const snap = assessment?.metricsSnapshot || {};
  const capacity = Math.max(1, snap.capacity || event?.capacity || 1);
  const registered = snap.registrations ?? event?.registrationCount ?? 0;
  const checkedIn = snap.checkedIn ?? event?.checkedInCount ?? 0;
  const waitlist = snap.waitlist ?? event?.waitlistCount ?? 0;
  const staff = snap.effectiveStaff ?? 0;
  const gates = snap.entryGates ?? event?.safetyConfig?.entryGates ?? 2;
  const desks = snap.checkInDesks ?? event?.safetyConfig?.checkInDesks ?? 2;

  const util = Math.round((registered / capacity) * 1000) / 10;
  const checkPct = registered > 0 ? Math.round((checkedIn / registered) * 1000) / 10 : 0;
  const remaining = Math.max(0, capacity - registered);
  const live = event?.status === 'live';
  const utilBand = scoreBand(Math.max(0, 100 - Math.max(0, util - 70)));

  const metrics = [
    { icon: Users2, label: 'Registered', value: `${registered} / ${capacity}`, hint: `${util}% of capacity · ${remaining} seats left` },
    { icon: QrCode, label: 'Checked in', value: `${checkedIn}`, hint: `${checkPct}% of registrations` },
    { icon: DoorOpen, label: 'Entry ops', value: `${gates} gates · ${desks} desks`, hint: `${staff} staff / volunteers` },
    { icon: Timer, label: 'Waitlist', value: String(waitlist), hint: waitlist ? 'Overflow demand captured' : 'No overflow queue' },
  ];

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Radio className={`size-4 ${live ? 'text-destructive animate-pulse' : 'text-primary'}`} />
              Live monitoring
            </CardTitle>
            <CardDescription className="text-xs">
              Deterministic occupancy from registrations and QR check-ins. Not a crowd-forecast guarantee.
            </CardDescription>
          </div>
          <Badge variant={live ? 'live' : 'secondary'}>{live ? 'Event live' : event?.status || 'scheduled'}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="mb-1 flex items-center justify-between text-xs font-bold">
            <span>Capacity utilization</span>
            <span className="font-mono">{util}%</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={util} aria-valuemin={0} aria-valuemax={100}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(100, util)}%`,
                background: util >= 100 ? 'hsl(var(--destructive))' : util >= 85 ? 'hsl(var(--warning))' : 'hsl(var(--success))',
              }}
            />
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Occupancy band: {utilBand.label}. {util >= 95 ? 'Near or over configured capacity — review entry ops.' : 'Within configured capacity envelope.'}
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((m) => (
            <div key={m.label} className="rounded-xl border bg-muted/20 p-3">
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <m.icon className="size-3.5 text-primary" /> {m.label}
              </p>
              <p className="mt-1 font-display text-lg font-extrabold">{m.value}</p>
              <p className="text-[11px] text-muted-foreground">{m.hint}</p>
            </div>
          ))}
        </div>
        {alerts.length > 0 && (
          <p className="mt-3 text-xs font-semibold text-destructive">
            {alerts.length} live operational alert{alerts.length === 1 ? '' : 's'} require organizer review.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
