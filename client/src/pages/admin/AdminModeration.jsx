import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Flag, ExternalLink, CheckCircle2, Ban } from 'lucide-react';
import { endpoints } from '../../lib/api';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Avatar } from '../../components/ui/avatar';
import { Spinner, Tabs } from '../../components/ui/misc';
import { EmptyState } from '../../components/ui/states';
import { fmtDateTime } from '../../lib/format';
import { toast } from 'sonner';

export default function AdminModeration() {
  const [tab, setTab] = useState('open');
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['admin-reports', tab],
    queryFn: () => endpoints.adminReports(tab === 'all' ? {} : { status: tab }),
  });
  const resolve = useMutation({
    mutationFn: ({ id, status }) => endpoints.resolveReport(id, { status }),
    onSuccess: () => { toast.success('Report updated'); qc.invalidateQueries({ queryKey: ['admin-reports'] }); qc.invalidateQueries({ queryKey: ['admin-stats'] }); },
  });

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl font-extrabold">Reports &amp; Moderation</h2>
        <p className="text-sm text-muted-foreground">Community-reported events, users and messages.</p>
      </div>
      <Tabs active={tab} onChange={setTab} tabs={[
        { value: 'open', label: 'Open' },
        { value: 'reviewing', label: 'Reviewing' },
        { value: 'resolved', label: 'Resolved' },
        { value: 'dismissed', label: 'Dismissed' },
        { value: 'all', label: 'All' },
      ]} />

      {q.isLoading ? <Spinner /> : (q.data || []).length === 0 ? (
        <Card><CardContent><EmptyState icon={Flag} title="No reports here" description="The community is looking clean. 🎉" /></CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {q.data.map((r) => (
            <Card key={r._id}>
              <CardContent className="p-4">
                <div className="flex flex-wrap items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-destructive/10 text-destructive"><Flag className="size-5" /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="capitalize">{r.reason?.replace('_', ' ')}</Badge>
                      <Badge variant="outline" className="capitalize">{r.targetType}</Badge>
                      <Badge variant={r.status === 'open' ? 'destructive' : r.status === 'resolved' ? 'success' : 'secondary'} className="capitalize">{r.status}</Badge>
                      <span className="text-xs text-muted-foreground">{fmtDateTime(r.createdAt)}</span>
                    </div>
                    {r.targetInfo && (
                      <Link to={r.targetInfo.link} className="mt-1 inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline">
                        {r.targetInfo.label} <ExternalLink className="size-3.5" />
                      </Link>
                    )}
                    {r.details && <p className="mt-1 rounded-lg bg-muted p-2 text-sm">{r.details}</p>}
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Avatar name={r.reporter?.name} src={r.reporter?.avatar} className="size-5" /> Reported by {r.reporter?.name || r.reporter?.email}
                    </p>
                  </div>
                  {(r.status === 'open' || r.status === 'reviewing') && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => resolve.mutate({ id: r._id, status: 'reviewing' })}>Mark reviewing</Button>
                      <Button size="sm" onClick={() => resolve.mutate({ id: r._id, status: 'resolved' })}><CheckCircle2 className="size-4" /> Resolve</Button>
                      <Button size="sm" variant="ghost" onClick={() => resolve.mutate({ id: r._id, status: 'dismissed' })}><Ban className="size-4" /> Dismiss</Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
