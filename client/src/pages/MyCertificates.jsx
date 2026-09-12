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
import { usePageTitle } from '../hooks/usePageTitle';

export default function MyCertificates() {
  usePageTitle('My Certificates');
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
            <button
              key={c._id}
              onClick={() => setActive(c)}
              className="group relative overflow-hidden rounded-2xl border border-[#d4af37]/30 bg-gradient-to-b from-card via-card to-amber-500/5 p-5 text-left shadow-soft hover:shadow-lift hover:border-[#d4af37]/70 transition-all"
            >
              <div className="absolute top-0 right-0 h-16 w-16 bg-gradient-to-bl from-[#d4af37]/15 to-transparent rounded-bl-full pointer-events-none" />
              <div className="flex items-center justify-between">
                <span
                  className="grid size-12 place-items-center rounded-xl shadow-md text-amber-950 font-bold"
                  style={{
                    background: 'linear-gradient(135deg, #f7e690 0%, #d4af37 60%, #aa7c11 100%)',
                  }}
                >
                  <Award className="size-6 text-amber-950 stroke-[2.5]" />
                </span>
                <ChevronRight className="size-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
              </div>
              <p className="mt-3 font-bold text-base leading-tight group-hover:text-primary transition">
                {c.eventTitle}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {fmtDate(c.issuedAt, 'd MMM yyyy')} · <span className="capitalize font-semibold text-foreground/80">{c.type}</span>
              </p>
              <div className="mt-3 flex items-center justify-between pt-2 border-t border-border/50">
                <p className="font-mono text-[10px] text-muted-foreground tracking-tight">{c.certificateId}</p>
                <Badge variant="success" className="text-[10px] py-0.5 px-2 font-semibold">
                  <CheckCircle2 className="size-2.5 mr-1" /> Verified
                </Badge>
              </div>
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
