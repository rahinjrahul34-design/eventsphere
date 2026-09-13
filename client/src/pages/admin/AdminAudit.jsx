import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ScrollText, Search } from 'lucide-react';
import { endpoints } from '../../lib/api';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Avatar } from '../../components/ui/avatar';

import { EmptyState } from '../../components/ui/states';
import { fmtDateTime } from '../../lib/format';
import { TableSkeleton } from '../../components/ui/skeleton';

const tone = (action) => {
  if (/approved|activated|resolved/.test(action)) return 'success';
  if (/rejected|suspended|deleted|report/.test(action)) return 'destructive';
  if (/role_changed|changed/.test(action)) return 'warning';
  return 'secondary';
};

export default function AdminAudit() {
  const [filter, setFilter] = useState('');
  const q = useQuery({ queryKey: ['audit-logs'], queryFn: endpoints.auditLogs });
  if (q.isLoading) return <TableSkeleton rows={8} cols={5} />;
  const logs = (q.data || []).filter((l) =>
    !filter ||
    l.action.toLowerCase().includes(filter.toLowerCase()) ||
    l.actor?.name?.toLowerCase().includes(filter.toLowerCase()) ||
    l.targetType?.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl font-extrabold">Audit Logs</h2>
        <p className="text-sm text-muted-foreground">Every admin and moderation action, immutable.</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Filter actions, actors…" value={filter} onChange={(e) => setFilter(e.target.value)} />
      </div>

      <Card>
        <CardContent className="p-0">
          {logs.length === 0 ? <EmptyState icon={ScrollText} title="No matching logs" /> : (
            <div className="divide-y">
              {logs.map((l) => (
                <div key={l._id} className="flex items-center gap-3 p-3.5">
                  <Avatar name={l.actor?.name || l.actorName} src={l.actor?.avatar} className="size-9" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">
                      {l.actor?.name || l.actorName || 'System'}
                      <span className="ml-2 font-normal text-muted-foreground">{l.action.replace('.', ' ').replace(/_/g, ' ')}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {l.targetType}
                      {l.meta && Object.keys(l.meta).length > 0 && ` · ${JSON.stringify(l.meta).slice(0, 120)}`}
                      {l.ip && ` · ${l.ip}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant={tone(l.action)}>{l.action.split('.')[0]}</Badge>
                    <p className="mt-1 text-[11px] text-muted-foreground">{fmtDateTime(l.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
