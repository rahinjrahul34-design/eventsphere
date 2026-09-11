import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, ShieldCheck, Ban, CheckCircle2 } from 'lucide-react';
import { endpoints } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input, Select } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Avatar } from '../../components/ui/avatar';
import { Spinner, Dropdown, MenuItem } from '../../components/ui/misc';
import { ConfirmDialog } from '../../components/ui/dialog';
import { fmtDate } from '../../lib/format';
import { toast } from 'sonner';

const ROLES = ['attendee', 'organizer', 'volunteer', 'speaker', 'admin'];

export default function AdminUsers() {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [role, setRole] = useState('all');
  const [confirm, setConfirm] = useState(null);

  const usersQ = useQuery({
    queryKey: ['admin-users', q, role],
    queryFn: () => endpoints.adminUsers({ q, role }),
  });

  const update = useMutation({
    mutationFn: ({ id, body }) => endpoints.updateUser(id, body),
    onSuccess: () => { toast.success('User updated'); qc.invalidateQueries({ queryKey: ['admin-users'] }); qc.invalidateQueries({ queryKey: ['admin-stats'] }); setConfirm(null); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl font-extrabold">Users &amp; Organizers</h2>
        <p className="text-sm text-muted-foreground">Manage roles, organizer applications and suspensions.</p>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3">
          <CardTitle>All users</CardTitle>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9 w-48 sm:w-64" placeholder="Search name or email…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <Select value={role} onChange={(e) => setRole(e.target.value)} className="w-36">
              <option value="all">All roles</option>
              {ROLES.map((r) => <option key={r} value={r} className="capitalize">{r}</option>)}
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {usersQ.isLoading ? <Spinner /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                    <th className="p-3">User</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Organizer status</th>
                    <th className="p-3">Joined</th>
                    <th className="p-3">State</th>
                    <th className="p-3" />
                  </tr>
                </thead>
                <tbody>
                  {(usersQ.data || []).map((u) => (
                    <tr key={u._id} className="border-b last:border-0 hover:bg-muted/40">
                      <td className="p-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={u.name} src={u.avatar} className="size-9" />
                          <div className="min-w-0">
                            <p className="font-semibold leading-tight">{u.name}</p>
                            <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3"><Badge variant="secondary" className="capitalize">{u.role}</Badge></td>
                      <td className="p-3">
                        {u.role === 'organizer' || u.organizerStatus ? (
                          <Badge variant={u.organizerStatus === 'approved' ? 'success' : u.organizerStatus === 'pending' ? 'warning' : u.organizerStatus === 'rejected' ? 'destructive' : 'secondary'} className="capitalize">
                            {u.organizerStatus || '—'}
                          </Badge>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">{fmtDate(u.createdAt, 'd MMM yyyy')}</td>
                      <td className="p-3">
                        {u.isActive === false ? <Badge variant="destructive">Suspended</Badge> : <Badge variant="success">Active</Badge>}
                      </td>
                      <td className="p-3">
                        <Dropdown trigger={<Button variant="ghost" size="sm">Actions</Button>}>
                          {u.organizerStatus === 'pending' && (
                            <>
                              <MenuItem icon={ShieldCheck} onClick={() => update.mutate({ id: u._id, body: { organizerStatus: 'approved' } })}>Approve organizer</MenuItem>
                              <MenuItem icon={Ban} danger onClick={() => update.mutate({ id: u._id, body: { organizerStatus: 'rejected' } })}>Reject application</MenuItem>
                            </>
                          )}
                          {ROLES.filter((r) => r !== u.role).map((r) => (
                            <MenuItem key={r} icon={CheckCircle2} onClick={() => update.mutate({ id: u._id, body: { role: r } })}>
                              Set role: {r}
                            </MenuItem>
                          ))}
                          {u.isActive !== false ? (
                            <MenuItem icon={Ban} danger onClick={() => setConfirm({ u, body: { isActive: false }, title: `Suspend ${u.name}?` })}>Suspend account</MenuItem>
                          ) : (
                            <MenuItem icon={CheckCircle2} onClick={() => update.mutate({ id: u._id, body: { isActive: true } })}>Reactivate account</MenuItem>
                          )}
                        </Dropdown>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => update.mutate({ id: confirm.u._id, body: confirm.body })}
        loading={update.isPending}
        variant="destructive"
        title={confirm?.title}
        message="The user will be notified by the platform."
        confirmLabel="Confirm"
      />
    </div>
  );
}
