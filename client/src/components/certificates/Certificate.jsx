import { QRCodeSVG } from 'qrcode.react';
import { Award, Download } from 'lucide-react';
import { fmtDate } from '../../lib/format';
import { Button } from '../ui/button';

export default function Certificate({ cert }) {
  const verifyUrl = `${window.location.origin}/verify-certificate/${cert.certificateId}`;

  const print = () => window.print();

  return (
    <div id="print-area" className="relative overflow-hidden rounded-2xl border-8 border-double bg-card p-8 sm:p-12"
      style={{ borderColor: 'hsl(45 80% 50%)' }}>
      <div className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full bg-amber-400/10" />
      <div className="pointer-events-none absolute -bottom-20 -left-20 size-64 rounded-full bg-primary/10" />

      <div className="relative text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl gradient-brand text-white">
          <Award className="size-7" />
        </div>
        <p className="mt-3 text-xs font-bold uppercase tracking-[0.3em] text-muted-foreground">Certificate of {cert.type}</p>
        <p className="mt-4 font-display text-2xl font-extrabold text-muted-foreground/80">This certifies that</p>
        <h2 className="mt-2 font-display text-4xl font-extrabold gradient-text">{cert.recipientName}</h2>
        <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground">
          successfully participated in
        </p>
        <h3 className="mt-1 font-display text-2xl font-extrabold">{cert.eventTitle}</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          held on {fmtDate(cert.eventDate)} · organized by {cert.organizerName}
        </p>

        <div className="mt-8 flex items-end justify-between gap-6 text-left">
          <div>
            <div className="h-px w-40 bg-foreground/40" />
            <p className="mt-1 text-xs font-semibold text-muted-foreground">{cert.organizerName}</p>
            <p className="text-[10px] uppercase text-muted-foreground">Organizer</p>
          </div>
          <div className="text-center">
            <div className="rounded-lg bg-white p-1.5 ring-1 ring-border">
              <QRCodeSVG value={verifyUrl} size={84} />
            </div>
            <p className="mt-1 font-mono text-[9px] text-muted-foreground">{cert.certificateId}</p>
          </div>
        </div>
      </div>

      <div className="no-print relative mt-8 flex justify-center gap-2">
        <Button onClick={print}><Download /> Download / Print PDF</Button>
      </div>
    </div>
  );
}
