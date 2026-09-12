import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { User as UserIcon, Award, Shield, Sparkles, Briefcase } from 'lucide-react';
import { endpoints } from '../lib/api';
import { useAuth } from '../store/auth';
import { Button } from '../components/ui/button';
import { Input, Textarea, Label, Select } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, Chip, Spinner } from '../components/ui/misc';
import { Avatar } from '../components/ui/avatar';
import { INTERESTS, SKILLS, GOALS } from '../lib/format';
import { timeAgo, cn } from '../lib/utils';
import { toast } from 'sonner';
import { usePageTitle } from '../hooks/usePageTitle';

export default function Profile() {
  usePageTitle('Profile');
  const { user, patchUser } = useAuth();
  const [tab, setTab] = useState('profile');

  return (
    <div className="container max-w-4xl py-8">
      <div className="flex flex-wrap items-center gap-4">
        <Avatar name={user.name} src={user.avatar} className="size-16" fallbackClass="text-xl" />
        <div>
          <h1 className="font-display text-2xl font-extrabold">{user.name}</h1>
          <p className="text-sm text-muted-foreground">{user.title} {user.company ? `· ${user.company}` : ''}</p>
          <span className="mt-1 inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold uppercase text-primary">{user.role}</span>
        </div>
        <div className="ml-auto text-right">
          <p className="font-display text-3xl font-extrabold gradient-text">{user.points || 0}</p>
          <p className="text-xs text-muted-foreground">event points</p>
        </div>
      </div>

      <Tabs className="mt-6 w-fit" active={tab} onChange={setTab}
        tabs={[
          { value: 'profile', label: 'Profile', icon: UserIcon },
          { value: 'interests', label: 'Interests & Networking', icon: Sparkles },
          { value: 'rewards', label: 'Badges & Activity', icon: Award },
          { value: 'security', label: 'Security', icon: Shield },
        ]}
      />

      <div className="mt-6">
        {tab === 'profile' && <ProfileForm user={user} patchUser={patchUser} />}
        {tab === 'interests' && <InterestsForm user={user} patchUser={patchUser} />}
        {tab === 'rewards' && <Rewards />}
        {tab === 'security' && <Security />}
      </div>
    </div>
  );
}

function ProfileForm({ user, patchUser }) {
  const [form, setForm] = useState({
    name: user.name, title: user.title || '', company: user.company || '', location: user.location || '',
    phone: user.phone || '', website: user.website || '', bio: user.bio || '', avatar: user.avatar || '',
  });
  const qc = useQueryClient();
  const save = useMutation({
    mutationFn: () => endpoints.updateMe(form),
    onSuccess: (u) => { patchUser(u); qc.invalidateQueries({ queryKey: ['me'] }); toast.success('Profile updated'); },
  });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  return (
    <Card>
      <CardContent className="p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name"><Input value={form.name} onChange={set('name')} /></Field>
          <Field label="Headline"><Input value={form.title} onChange={set('title')} placeholder="Student / Developer / Designer" /></Field>
          <Field label="College / Company"><Input value={form.company} onChange={set('company')} /></Field>
          <Field label="City"><Input value={form.location} onChange={set('location')} /></Field>
          <Field label="Phone"><Input value={form.phone} onChange={set('phone')} /></Field>
          <Field label="Website"><Input value={form.website} onChange={set('website')} /></Field>
          <div className="sm:col-span-2">
            <Label>Avatar URL</Label>
            <div className="mt-1 flex gap-3">
              <Input value={form.avatar} onChange={set('avatar')} placeholder="https://…" />
              <Avatar name={form.name} src={form.avatar} className="size-10 shrink-0" />
            </div>
          </div>
          <div className="sm:col-span-2">
            <Label>Bio</Label>
            <Textarea className="mt-1" value={form.bio} onChange={set('bio')} placeholder="Tell attendees and organizers about yourself" />
          </div>
        </div>
        <Button className="mt-5" loading={save.isPending} onClick={() => save.mutate()}>Save changes</Button>
      </CardContent>
    </Card>
  );
}

function InterestsForm({ user, patchUser }) {
  const [interests, setInterests] = useState(user.interests || []);
  const [skills, setSkills] = useState(user.skills || []);
  const [goal, setGoal] = useState(user.networkingGoal || '');
  const toggle = (list, set, v) => set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const save = useMutation({
    mutationFn: () => endpoints.updateMe({ interests, skills, networkingGoal: goal }),
    onSuccess: (u) => { patchUser(u); toast.success('Preferences saved — recommendations updated'); },
  });
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader><CardTitle>Interests</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {INTERESTS.map((i) => (
            <Chip key={i} active={interests.includes(i)} onClick={() => toggle(interests, setInterests, i)}>{i}</Chip>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Skills</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {SKILLS.map((s) => (
            <Chip key={s} active={skills.includes(s)} onClick={() => toggle(skills, setSkills, s)}>{s}</Chip>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>I’m open to…</CardTitle></CardHeader>
        <CardContent>
          <Select value={goal} onChange={(e) => setGoal(e.target.value)}>
            <option value="">Select a goal</option>
            {GOALS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
          </Select>
        </CardContent>
      </Card>
      <Button loading={save.isPending} onClick={() => save.mutate()}>Save preferences</Button>
    </div>
  );
}

function Rewards() {
  const q = useQuery({ queryKey: ['gamification'], queryFn: endpoints.gamification });
  if (q.isLoading) return <Spinner />;
  const { badges = [], activities = [], catalogue = [] } = q.data || {};
  const earnedCodes = new Set(badges.map((b) => b.code));
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader><CardTitle>Badges ({badges.length})</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {catalogue.map((b) => {
              const earned = earnedCodes.has(b.code);
              return (
                <div key={b.code} className={cn('rounded-xl border p-4 text-center', earned ? 'bg-amber-400/10 border-amber-400/40' : 'opacity-45 grayscale')}>
                  <span className="text-3xl">🏅</span>
                  <p className="mt-1 text-xs font-bold leading-tight">{b.name}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">{b.description}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Recent point activity</CardTitle></CardHeader>
        <CardContent className="space-y-1.5">
          {activities.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">No activity yet.</p>}
          {activities.map((a) => (
            <div key={a._id} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
              <span>{a.reason}{a.event ? ` · ${a.event.title}` : ''}</span>
              <span className="font-bold text-primary">+{a.points}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Security() {
  const { user } = useAuth();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '' });
  const pwd = useMutation({
    mutationFn: endpoints.changePassword,
    onSuccess: () => { toast.success('Password changed'); setForm({ currentPassword: '', newPassword: '' }); },
    onError: (e) => toast.error(e.message),
  });
  const apply = useMutation({
    mutationFn: (b) => endpoints.applyOrganizer(b),
    onSuccess: () => toast.success('Organizer application submitted — an admin will review it'),
  });

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader><CardTitle>Change password</CardTitle></CardHeader>
        <CardContent className="grid max-w-md gap-3">
          <Input type="password" placeholder="Current password" value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} />
          <Input type="password" placeholder="New password (min 6 chars)" value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} />
          <Button className="w-fit" loading={pwd.isPending} onClick={() => pwd.mutate(form)}>Update password</Button>
        </CardContent>
      </Card>
      {user.role === 'attendee' && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Briefcase className="size-5 text-primary" /> Become an organizer</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Create and manage your own events on EventSphere. An admin approves applications.</p>
            <OrganizerApply onSubmit={(b) => apply.mutate(b)} loading={apply.isPending} />
          </CardContent>
        </Card>
      )}
      {(user.role === 'volunteer' || user.role === 'speaker') && (
        <Card>
          <CardHeader><CardTitle>Your role dashboard</CardTitle></CardHeader>
          <CardContent>
            <Link to={user.role === 'volunteer' ? '/dashboard/assignments' : '/dashboard/speaking'}>
              <Button variant="outline">Open {user.role} dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function OrganizerApply({ onSubmit, loading }) {
  const [form, setForm] = useState({ organization: '', reason: '' });
  return (
    <div className="mt-3 grid max-w-md gap-3">
      <Input placeholder="Organization / club name" value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })} />
      <Textarea placeholder="Why do you want to organize events?" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
      <Button className="w-fit" loading={loading} onClick={() => form.organization && onSubmit(form)}>Apply to organize</Button>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
