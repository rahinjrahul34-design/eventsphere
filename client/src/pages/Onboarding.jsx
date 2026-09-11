import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, Check, ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/button';
import { INTERESTS } from '../lib/format';
import { endpoints } from '../lib/api';
import { useAuth } from '../store/auth';
import { toast } from 'sonner';

export default function Onboarding() {
  const { user, patchUser } = useAuth();
  const [interests, setInterests] = useState(user?.interests || []);
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState({ title: user?.title || '', company: user?.company || '', location: user?.location || '' });
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  const toggle = (i) => setInterests((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]));

  const finish = async () => {
    setSaving(true);
    try {
      const updated = await endpoints.updateMe({ ...profile, interests, onboardingCompleted: true });
      patchUser(updated);
      toast.success('Your feed is now personalized 🎯');
      navigate('/home');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/10 via-background to-background">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:py-20">
        <div className="mb-8 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
            <Sparkles className="size-3.5" /> Personalize EventSphere
          </span>
          <h1 className="mt-4 font-display text-3xl sm:text-4xl font-extrabold">
            {step === 0 ? 'What are you interested in?' : 'Tell us about you'}
          </h1>
          <p className="mt-2 text-muted-foreground">This powers your “For You” recommendations and smart networking matches.</p>
        </div>

        {step === 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex flex-wrap justify-center gap-3">
              {INTERESTS.map((i) => {
                const active = interests.includes(i);
                return (
                  <button
                    key={i}
                    onClick={() => toggle(i)}
                    className={`rounded-2xl border-2 px-5 py-3 text-sm font-semibold transition flex items-center gap-2 ${
                      active ? 'border-primary bg-primary text-primary-foreground shadow-soft' : 'bg-card hover:border-primary/40'
                    }`}
                  >
                    {active && <Check className="size-4" />} {i}
                  </button>
                );
              })}
            </div>
            <div className="text-center">
              <Button size="lg" disabled={interests.length < 2} onClick={() => setStep(1)}>
                Continue · {interests.length} selected <ArrowRight className="size-4" />
              </Button>
              <p className="mt-2 text-xs text-muted-foreground">Pick at least 2 interests</p>
            </div>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="grid gap-4 rounded-2xl border bg-card p-6 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="text-sm font-semibold">Headline</label>
              <input className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                placeholder="e.g. Final-year CS student / Product Designer"
                value={profile.title} onChange={(e) => setProfile({ ...profile, title: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-semibold">College / Company</label>
              <input className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                value={profile.company} onChange={(e) => setProfile({ ...profile, company: e.target.value })} placeholder="KKWIEER" />
            </div>
            <div>
              <label className="text-sm font-semibold">City</label>
              <input className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                value={profile.location} onChange={(e) => setProfile({ ...profile, location: e.target.value })} placeholder="Nashik" />
            </div>
            <div className="sm:col-span-2 flex justify-between pt-2">
              <Button variant="ghost" onClick={() => setStep(0)}>Back</Button>
              <Button size="lg" loading={saving} onClick={finish}>Finish <ArrowRight className="size-4" /></Button>
            </div>
          </motion.div>
        )}

        <button onClick={() => navigate('/home')} className="mx-auto mt-8 block text-sm text-muted-foreground hover:underline">
          Skip for now
        </button>
      </div>
    </div>
  );
}
