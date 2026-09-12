import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ShieldCheck, ShieldX, Loader2, Search } from 'lucide-react';
import { endpoints } from '../lib/api';
import { fmtDate } from '../lib/format';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { usePageTitle } from '../hooks/usePageTitle';

export default function VerifyCertificate() {
  usePageTitle('Verify Certificate');
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchId, setSearchId] = useState('');

  const q = useQuery({
    queryKey: ['verify-cert', id],
    queryFn: () => endpoints.verifyCertificate(id),
    enabled: !!id,
    retry: false,
  });

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchId.trim()) navigate(`/verify-certificate/${searchId.trim()}`);
  };

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-br from-primary/10 to-background p-6">
      <div className="w-full max-w-md rounded-3xl border bg-card p-8 text-center shadow-lift">
        {!id ? (
          <>
            <div className="mx-auto grid size-16 place-items-center rounded-2xl gradient-brand text-white shadow-soft">
              <ShieldCheck className="size-8" />
            </div>
            <h1 className="mt-4 font-display text-2xl font-extrabold">Verify Certificate</h1>
            <p className="mt-1 text-sm text-muted-foreground">Enter the unique certificate ID found on the digital pass.</p>
            <form onSubmit={handleSearch} className="mt-6 space-y-3">
              <Input
                placeholder="e.g. CERT-..."
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                className="text-center font-mono tracking-wide"
                required
              />
              <Button type="submit" className="w-full">
                <Search className="size-4" /> Verify Now
              </Button>
            </form>
          </>
        ) : q.isLoading ? (
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
            <Button variant="secondary" className="mt-4 w-full" onClick={() => navigate('/verify-certificate')}>
              Try another ID
            </Button>
          </>
        )}
        <Link to="/"><Button variant="outline" className="mt-6 w-full">Back to EventSphere</Button></Link>
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
