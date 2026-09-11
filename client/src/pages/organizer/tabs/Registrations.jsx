import { useOutletContext } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Search, Download, ArrowUpCircle, Mail, Users as UsersIcon } from 'lucide-react';
import { endpoints, api } from '../../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import { Avatar } from '../../../components/ui/avatar';
import { Spinner, Tabs } from '../../../components/ui/misc';
import { EmptyState } from '../../../components/ui/states';
import { fmtDateTime, inr } from '../../../lib/format';
import { toast } from 'sonner';
import { cn } from '../../../lib/utils';

const STATUS_VARIANT = {
  confirmed: 'success', checked_in: 'live', pending: 'warning', waitlisted: 'warning', cancelled: 'destructive',
};

export default function Registrations() {
  const { event } = useOutletContext();
  const qc = useQueryClient();
  const [tab, setTab] = useState('attendees');
  const [search, setSearch] = useState('');

  const q = useQuery({
    queryKey: ['event-registrations', event._id],
    queryFn: () => endpoints.eventRegistrations(event._id),
    refetchInterval: 15000,
  });

  const promote = useMutation({
    mutationFn: (id) => endpoints.promoteWaitlist(id),
    onSuccess: (d) => {
      toast.success(d.ticket ? 'Waitlisted attendee promoted and ticket issued' : 'Attendee notified to complete payment');
      qc.invalidateQueries({ queryKey: ['event-registrations', event._id] });
    },
    onError: (e) => toast.error(e.message),
  });

  const exportCsv = async () => {
    const res = await api.get(`/events/${event._id}/registrations/export`, { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url; a.download = `${event.slug}-registrations.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  if (q.isLoading) return <Spinner />;
  const regs = (q.data?.registrations || []).filter((r) => {
    const s = search.toLowerCase();
    return !s || r.user?.name?.toLowerCase().includes(s) || r.user?.email?.toLowerCase().includes(s) || r.ticketType?.name?.toLowerCase().includes(s);
  });
  const waitlist = q.data?.waitlist || [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          active={tab}
          onChange={setTab}
          tabs={[
            { value: 'attendees', label: `Attendees (${q.data?.registrations?.length || 0})` },
            { value: 'waitlist', label: `Waitlist (${waitlist.length})` },
          ]}
        />
        <Button variant="outline" size="sm" onClick={exportCsv}><Download className="size-4" /> Export CSV</Button>
      </div>

      {tab === 'attendees' && (
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2"><UsersIcon className="size-5 text-primary" /> Registered attendees</CardTitle>
            <div className="relative w-56">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search name or email…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {regs.length === 0 ? (
              <EmptyState icon={UsersIcon} title="No registrations" description="Attendees will appear here as they register." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                      <th className="p-3 font-semibold">Attendee</th>
                      <th className="p-3 font-semibold">Ticket</th>
                      <th className="p-3 font-semibold">Paid</th>
                      <th className="p-3 font-semibold">Status</th>
                      <th className="p-3 font-semibold">Registered</th>
                      <th className="p-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {regs.map((r) => (
                      <tr key={r._id} className="border-b last:border-0 hover:bg-muted/40">
                        <td className="p-3">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={r.user?.name} src={r.user?.avatar} className="size-9" />
                            <div className="min-w-0">
                              <p className="font-semibold leading-tight">{r.user?.name || 'Unknown'}</p>
                              <p className="text-xs text-muted-foreground">{r.user?.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3">{r.ticketType?.name || 'General'}</td>
                        <td className="p-3 font-semibold">{inr(r.amountPaid || r.ticketType?.price || 0)}</td>
                        <td className="p-3">
                          <Badge variant={STATUS_VARIANT[r.status] || 'secondary'} className="capitalize">
                            {r.status === 'checked_in' ? 'Checked in' : r.status}
                          </Badge>
                          {r.checkedInAt && <p className="mt-0.5 text-[10px] text-muted-foreground">{fmtDateTime(r.checkedInAt)}</p>}
                        </td>
                        <td className="p-3 text-xs text-muted-foreground">{fmtDateTime(r.createdAt)}</td>
                        <td className="p-3">
                          {r.user?.email && (
                            <Button variant="ghost" size="icon-sm" title="Email attendee"
                              onClick={() => { window.location.href = `mailto:${r.user.email}`; }}>
                              <Mail className="size-4" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tab === 'waitlist' && (
        <Card>
          <CardHeader><CardTitle>Waitlist queue</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {waitlist.length === 0 && <EmptyState icon={ArrowUpCircle} title="Waitlist is empty" description="Nobody is waiting for a seat right now." />}
            {waitlist.map((w) => (
              <div key={w._id} className={cn('flex items-center gap-3 rounded-xl border p-3', w.status !== 'waiting' && 'opacity-60')}>
                <span className="grid size-9 place-items-center rounded-full bg-warning/15 font-bold text-warning">#{w.position}</span>
                <div className="flex-1">
                  <p className="text-sm font-bold">{w.user?.name}</p>
                  <p className="text-xs text-muted-foreground">{w.user?.email} · {w.status}</p>
                </div>
                {w.status === 'waiting' && (
                  <Button size="sm" variant="outline" loading={promote.isPending} onClick={() => promote.mutate(w._id)}>
                    <ArrowUpCircle className="size-4" /> Promote
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
