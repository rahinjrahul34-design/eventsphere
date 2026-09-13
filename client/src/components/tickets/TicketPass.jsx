import { QRCodeSVG } from 'qrcode.react';
import { CalendarDays, MapPin, User, Ticket as TicketIcon, Download, Share2 } from 'lucide-react';
import { fmtDate, fmtTime } from '../../lib/format';
import { Button } from '../ui/button';

// Digital boarding-pass style ticket.
export default function TicketPass({ ticket, size = 220 }) {
  const event = ticket.event || {};
  const share = async () => {
    const url = `${window.location.origin}/my-tickets/${ticket._id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: event.title, text: `My ticket for ${event.title}`, url });
      } catch { /* ignore */ }
    } else {
      await navigator.clipboard.writeText(url);
    }
  };
  const download = () => {
    const svg = document.getElementById('ticket-qr')?.querySelector('svg');
    if (!svg) return;
    const xml = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    img.src = `data:image/svg+xml;base64,${btoa(xml)}`;
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = 600; c.height = 600;
      c.getContext('2d').drawImage(img, 0, 0, 600, 600);
      const a = document.createElement('a');
      a.href = c.toDataURL('image/png');
      a.download = `${ticket.code}.png`;
      a.click();
    };
  };

  return (
    <div className="mx-auto max-w-md overflow-hidden rounded-3xl border bg-card shadow-lift">
      {/* Header */}
      <div className="relative h-32 bg-gradient-to-br from-primary via-primary to-info p-5 text-white">
        <p className="font-display text-lg font-extrabold">EventSphere Pass</p>
        <p className="mt-1 line-clamp-2 text-sm font-semibold">{event.title}</p>
        <div className="absolute -bottom-5 left-0 right-0 flex justify-between px-3">
          <span className="size-10 rounded-full bg-background" />
          <span className="size-10 rounded-full bg-background" />
        </div>
      </div>

      {/* Perforation */}
      <div className="border-b-2 border-dashed border-border" />

      <div className="p-6">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <Info icon={User} label="Attendee" value={ticket.attendeeName} />
          <Info icon={TicketIcon} label="Ticket" value={ticket.ticketType} />
          <Info icon={CalendarDays} label="Date" value={fmtDate(event.startDate, 'd MMM yyyy')} />
          <Info icon={MapPin} label="Venue" value={`${event.venue?.name || ''} ${event.venue?.city || 'Online'}`.trim()} />
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          Starts {fmtTime(event.startDate)} · {event.timezone}
        </div>

        <div id="ticket-qr" className="mt-6 flex flex-col items-center">
          <div className="rounded-2xl border-4 border-primary/15 bg-white p-4">
            <QRCodeSVG value={ticket.code} size={size} level="M" />
          </div>
          <p className="mt-3 font-mono text-base font-extrabold tracking-[0.25em]">{ticket.code}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {ticket.status === 'used' ? 'Checked in' : 'Present this code at the entrance'}
          </p>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" onClick={download}><Download className="size-4" /> Save QR</Button>
          <Button variant="outline" size="sm" onClick={share}><Share2 className="size-4" /> Share</Button>
        </div>
      </div>
    </div>
  );
}

function Info({ icon: Icon, label, value }) {
  return (
    <div>
      <p className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3" /> {label}
      </p>
      <p className="mt-0.5 font-semibold leading-tight">{value || '—'}</p>
    </div>
  );
}
