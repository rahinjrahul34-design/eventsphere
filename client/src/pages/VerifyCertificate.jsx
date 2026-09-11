import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ShieldCheck, ShieldX, Loader2 } from 'lucide-react';
import { endpoints } from '../lib/api';
import { fmtDate } from '../lib/format';
import { Button } from '../components/ui/button';

export default function VerifyCertificate() {
  const { id } = useParams();
  const q = useQuery({ queryKey: ['verify-cert', id], queryFn: () => endpoints.verifyCertificate(id), retry: false });

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-br from-primary/10 to-background p-6">
      <div className="w-full max-w-md rounded-3xl border bg-card p-8 text-center shadow-lift">
        {q.isLoading ? (
          <Loader2 className="mx-auto size-12 animate-spin text-primary" />
        ) : q.data?.valid ? (
          <>
            <ShieldCheck className="mx-auto size-16 text-success" />
            <h1 className="mt-4 font-display text-2xl font-extrabold text-success">Certificate verified</h1>
            <p className="mt-1 text-sm text-muted-foreground">This is an authentic EventSphere certificate.</p>
            <dl className="mt-6 space-y-3 rounded-2xl bg-muted/50 p-5 text-left text-sm">
              <Row label="Certificate ID" value={id} mono />
              <Row label="Recipient" value={q.data.certificate.recipientName} />
              <Row label="Event" value={q.data.certificate.eventTitle} />
              <Row label="Organizer" value={q.data.certificate.organizerName} />
              <Row label="Type" value={<span className="capitalize">{q.data.certificate.type}</span>} />
              <Row label="Issued" value={fmtDate(q.data.certificate.issuedAt)} />
            </dl>
          </>
        ) : (
          <>
            <ShieldX className="mx-auto size-16 text-destructive" />
            <h1 className="mt-4 font-display text-2xl font-extrabold text-destructive">Certificate not valid</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {q.data?.reason === 'REVOKED'
                ? 'This certificate has been revoked by the organizer.'
                : 'No certificate matches this ID. Check the QR code or link.'}
            </p>
          </>
        )}
        <Link to="/"><Button variant="outline" className="mt-6">Back to EventSphere</Button></Link>
      </div>
    </div>
  );
}

function Row({ label, value, mono }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={`text-right font-semibold ${mono ? 'font-mono text-xs' : ''}`}>{value}</dd>
    </div>
  );
}
