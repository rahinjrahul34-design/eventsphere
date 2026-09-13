import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Sparkles, Check, Filter, ExternalLink } from 'lucide-react';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import { endpoints } from '../../lib/api';
import { toast } from 'sonner';

export default function ActionCenter({ actions = [], eventId, onActionResolved }) {
  const [filter, setFilter] = useState('ALL');
  const [resolvingId, setResolvingId] = useState(null);

  const filtered = actions.filter((a) => {
    if (filter === 'ALL') return true;
    return a.priority?.toUpperCase() === filter;
  });

  const counts = {
    ALL: actions.length,
    CRITICAL: actions.filter((a) => a.priority === 'Critical').length,
    HIGH: actions.filter((a) => a.priority === 'High').length,
    MEDIUM: actions.filter((a) => a.priority === 'Medium').length,
    LOW: actions.filter((a) => a.priority === 'Low').length,
  };

  const getPriorityBadge = (p) => {
    switch (p) {
      case 'Critical':
        return <Badge variant="destructive" className="font-bold uppercase tracking-wider text-[10px]">Critical</Badge>;
      case 'High':
        return <Badge variant="warning" className="font-bold uppercase tracking-wider text-[10px]">High</Badge>;
      case 'Medium':
        return <Badge variant="warning" className="font-bold uppercase tracking-wider text-[10px]">Medium</Badge>;
      case 'Low':
      default:
        return <Badge variant="outline" className="font-bold uppercase tracking-wider text-[10px]">Low</Badge>;
    }
  };

  const getSourceColor = (source) => {
    switch (source) {
      case 'eventshield':
        return 'text-destructive bg-destructive/10 border-destructive/25';
      case 'eventpulse':
        return 'text-info bg-info/10 border-info/25';
      case 'smartqueue':
        return 'text-warning bg-warning/10 border-warning/25';
      case 'eventboost':
        return 'text-primary bg-primary/10 border-primary/25';
      case 'trustsphere':
        return 'text-primary bg-primary/10 border-primary/25';
      default:
        return 'text-foreground bg-secondary border-border';
    }
  };

  const handleResolve = async (action) => {
    if (!action.sourceId) return;
    setResolvingId(action.id);
    try {
      await endpoints.commandCenter.updateAction(eventId, action.sourceId, { status: 'resolved' });
      toast.success('Action marked as resolved');
      if (onActionResolved) onActionResolved(action.id);
    } catch (err) {
      toast.error(err.message || 'Failed to update action');
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <div className="rounded-xl border bg-card p-5 shadow-soft space-y-5 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h3 className="font-display text-lg font-bold flex items-center gap-2">
            <span>Action Center</span>
            <span className="text-xs font-semibold text-muted-foreground">({actions.length} Identified Issues)</span>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Deduplicated operational interventions prioritized by severity, business impact, and urgency.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 bg-secondary/50 p-1 rounded-xl border">
          {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={cn(
                'px-2.5 py-1 text-xs font-bold rounded-lg transition flex items-center gap-1',
                filter === t
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <span>{t}</span>
              {counts[t] > 0 && (
                <span className={cn(
                  'text-[10px] px-1.5 py-0.2 rounded-full font-bold',
                  t === 'CRITICAL' ? 'bg-destructive text-destructive-foreground' : 'bg-muted text-foreground'
                )}>
                  {counts[t]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed py-10 px-4 text-center space-y-2">
          <div className="grid size-10 place-items-center rounded-xl bg-success/10 text-success mx-auto">
            <CheckCircle2 className="size-5" />
          </div>
          <h4 className="font-bold text-sm text-foreground">No Pending Actions Found</h4>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {filter === 'ALL'
              ? 'All operational systems are operating normally with zero critical alerts or required interventions.'
              : `No ${filter.toLowerCase()} priority actions currently registered.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((action) => (
            <div
              key={action.id}
              className={cn(
                'rounded-xl border p-4 transition-colors duration-150 space-y-3',
                action.priority === 'Critical' ? 'border-destructive/30 bg-destructive/[0.04] hover:border-destructive/50' : 'bg-secondary/30 hover:border-border-strong'
              )}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    {getPriorityBadge(action.priority)}
                    <span className={cn('text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border', getSourceColor(action.source))}>
                      {action.source}
                    </span>
                    <h4 className="text-sm font-bold text-foreground">
                      {action.title}
                    </h4>
                  </div>
                  <p className="text-xs text-foreground/90 font-medium">
                    {action.problem}
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    <strong className="text-foreground font-semibold">Why it matters:</strong> {action.whyItMatters}
                  </p>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0 pt-2 sm:pt-0">
                  <Link
                    to={action.ctaLink || `/dashboard/events/${eventId}/overview`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground shadow-soft transition-all duration-150 hover:bg-primary-hover hover:shadow-lift"
                  >
                    <span>{action.ctaText || 'Take Action'}</span>
                    <ExternalLink className="size-3" />
                  </Link>

                  {action.sourceId && (action.source === 'eventshield' || action.source === 'eventpulse') && (
                    <button
                      type="button"
                      disabled={resolvingId === action.id}
                      onClick={() => handleResolve(action)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition disabled:opacity-50"
                    >
                      <Check className="size-3" />
                      <span>{resolvingId === action.id ? 'Resolving...' : 'Mark Resolved'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Recommended Action Box */}
              <div className="rounded-lg bg-background/80 p-2.5 border text-xs text-muted-foreground flex items-start gap-2">
                <Sparkles className="size-3.5 text-primary shrink-0 mt-0.5" />
                <div>
                  <strong className="text-foreground font-semibold">Recommended Resolution: </strong>
                  <span>{action.recommendedAction}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
