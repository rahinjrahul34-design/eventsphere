import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Award, ChevronRight, CheckCircle2 } from 'lucide-react';
import { endpoints } from '../lib/api';
import { EmptyState, ErrorState } from '../components/ui/states';
import { Spinner } from '../components/ui/misc';
import { Badge } from '../components/ui/badge';
import { Dialog } from '../components/ui/dialog';
import Certificate from '../components/certificates/Certificate';
import { fmtDate } from '../lib/format';

export default function MyCertificates() {
  const q = useQuery({ queryKey: ['certificates'], queryFn: endpoints.myCertificates });
  const [active, setActive] = useState(null);

  if (q.isLoading) return <Spinner />;
  if (q.isError) return <ErrorState message={q.error.message} onRetry={q.refetch} />;
  const certs = q.data || [];

  return (
    <div className="container py-8">
      <h1 className="font-display text-3xl font-extrabold">My Certificates</h1>
      <p className="mt-1 text-muted-foreground">Verifiable digital certificates issued after check-in.</p>

      {certs.length === 0 ? (
        <EmptyState
          icon={Award}
          title="No certificates yet"
          description="Certificates are issued by organizers after you’ve checked in and attended an event."
        />
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {certs.map((c) => (
            <button key={c._id} onClick={() => setActive(c)}
              className="group rounded-2xl border bg-card p-5 text-left shadow-soft hover:shadow-lift transition">
              <div className="flex items-center justify-between">
                <span className="grid size-12 place-items-center rounded-xl bg-amber-400/15 text-amber-500">
                  <Award className="size-6" />
                </span>
                <ChevronRight className="size-4 text-muted-foreground transition group-hover:translate-x-1" />
              </div>
              <p className="mt-3 font-bold leading-tight">{c.eventTitle}</p>
              <p className="mt-1 text-xs text-muted-foreground">{fmtDate(c.issuedAt, 'd MMM yyyy')} · <span className="capitalize">{c.type}</span></p>
              <p className="mt-2 font-mono text-[10px] text-muted-foreground">{c.certificateId}</p>
              <Badge variant="success" className="mt-2"><CheckCircle2 className="size-3" /> Verified</Badge>
            </button>
          ))}
        </div>
      )}

      <Dialog open={!!active} onClose={() => setActive(null)} size="xl" title="Certificate">
        {active && <Certificate cert={active} />}
      </Dialog>
    </div>
  );
}
