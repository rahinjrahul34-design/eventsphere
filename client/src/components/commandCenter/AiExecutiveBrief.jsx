import { useState } from 'react';
import { Sparkles, CheckCircle2, AlertTriangle, ArrowRight, RefreshCw, Bot, Compass, ShieldCheck } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Link } from 'react-router-dom';
import { endpoints } from '../../lib/api';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';

export default function AiExecutiveBrief({ initialBrief, eventId }) {
  const [brief, setBrief] = useState(initialBrief);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleRefreshBrief = async () => {
    setIsGenerating(true);
    try {
      const res = await endpoints.commandCenter.getBrief(eventId);
      setBrief(res);
      toast.success('Generated fresh AI Executive Brief');
    } catch (err) {
      toast.error(err.message || 'Failed to refresh brief');
    } finally {
      setIsGenerating(false);
    }
  };

  if (!brief) return null;

  const { situation, positiveSignals = [], problems = [], topAction, outlook, engine, generatedAt } = brief;

  return (
    <div className="relative overflow-hidden card-surface p-6 space-y-5">
      {/* Subtle background glow */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 size-48 rounded-full bg-primary/5 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-xl gradient-brand text-white shadow-sm">
            <Sparkles className="size-4" />
          </span>
          <div>
            <h3 className="font-display text-base font-bold text-foreground">AI Executive Brief</h3>
            <p className="text-xs text-muted-foreground">High-level operational synthesis from verified event metrics.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] font-semibold flex items-center gap-1">
            <Bot className="size-3" />
            <span>{engine === 'gemini' ? 'Gemini AI Verified' : 'Local Deterministic Fallback'}</span>
          </Badge>

          <button
            type="button"
            onClick={handleRefreshBrief}
            disabled={isGenerating}
            className="inline-flex items-center gap-1.5 rounded-xl border bg-secondary/80 px-3 py-1 text-xs font-bold text-foreground hover:bg-secondary transition disabled:opacity-50"
          >
            <RefreshCw className={cn('size-3', isGenerating && 'animate-spin')} />
            <span>{isGenerating ? 'Synthesizing...' : 'Regenerate'}</span>
          </button>
        </div>
      </div>

      {/* Current Situation */}
      <div className="space-y-1.5">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Current Situation</span>
        <p className="text-sm text-foreground leading-relaxed font-medium bg-secondary/30 p-3.5 rounded-xl border">
          {situation}
        </p>
      </div>

      {/* Two-Column Breakdown: Positive Signals vs Problems */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Positive Signals */}
        <div className="rounded-xl border bg-emerald-500/5 border-emerald-500/20 p-4 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="size-4" />
            <span>Positive Operational Signals</span>
          </div>
          <ul className="space-y-1.5 text-xs text-muted-foreground">
            {positiveSignals.map((sig, i) => (
              <li key={i} className="flex items-start gap-1.5 leading-relaxed">
                <span className="text-emerald-500 font-bold">•</span>
                <span>{sig}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Problems & Risks */}
        <div className="rounded-xl border bg-amber-500/5 border-amber-500/20 p-4 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
            <AlertTriangle className="size-4" />
            <span>Identified Vulnerabilities & Risks</span>
          </div>
          <ul className="space-y-1.5 text-xs text-muted-foreground">
            {problems.map((prob, i) => (
              <li key={i} className="flex items-start gap-1.5 leading-relaxed">
                <span className="text-amber-500 font-bold">•</span>
                <span>{prob}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Top Action Box */}
      {topAction && (
        <div className="rounded-xl border bg-gradient-to-r from-primary/5 via-card to-primary/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">
                Highest Impact Next Step
              </span>
              <span className="text-xs font-bold text-foreground">{topAction.action}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {topAction.recommended || topAction.reason}
            </p>
          </div>

          <Link
            to={topAction.link || `/dashboard/events/${eventId}/overview`}
            className="inline-flex items-center gap-1.5 rounded-xl gradient-brand px-4 py-2 text-xs font-bold text-white shadow hover:opacity-90 transition shrink-0 self-start sm:self-auto"
          >
            <span>{topAction.cta || 'Execute Action'}</span>
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      )}

      {/* Short-Term Outlook */}
      {outlook && (
        <div className="flex items-start gap-2 text-xs text-muted-foreground pt-1">
          <Compass className="size-4 text-primary shrink-0 mt-0.5" />
          <div>
            <strong className="text-foreground font-semibold">Short-Term Outlook: </strong>
            <span>{outlook}</span>
          </div>
        </div>
      )}
    </div>
  );
}
