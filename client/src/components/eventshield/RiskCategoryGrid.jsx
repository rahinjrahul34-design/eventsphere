import {
  Users2, Building2, Clock, Ticket, Car, PhoneCall, ShieldCheck, Accessibility,
  CloudSun, Activity, HelpCircle, TicketCheck, Stethoscope, Hand, ChevronDown,
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { CATEGORY_META, scoreToneClass, scoreStroke, riskBadgeVariant, riskLabel } from './shieldUtils';

const ICONS = {
  Users2, Hand, Building2, Clock, Ticket, Car, PhoneCall,
  ShieldCheck, Accessibility, CloudSun, Activity, HelpCircle, TicketCheck, Stethoscope,
};

export default function RiskCategoryGrid({ categories = [], expandedId, onToggle }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-extrabold uppercase tracking-wider text-muted-foreground">
          Risk categories
        </h3>
        <span className="text-xs font-semibold text-muted-foreground">{categories.length} evaluated</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {categories.map((cat) => {
          const meta = CATEGORY_META[cat.id] || { icon: 'ShieldCheck', accent: 'from-primary/10 to-transparent' };
          const Icon = ICONS[meta.icon] || ShieldCheck;
          const open = expandedId === cat.id;
          const issues = cat.issues?.length || 0;

          return (
            <article
              key={cat.id}
              className={`overflow-hidden rounded-2xl border bg-gradient-to-br ${meta.accent} transition ${
                open ? 'border-primary/50 shadow-md sm:col-span-2 xl:col-span-3' : 'hover:border-primary/30'
              }`}
            >
              <button
                type="button"
                onClick={() => onToggle(open ? null : cat.id)}
                aria-expanded={open}
                className="flex w-full items-start gap-3 p-4 text-left"
              >
                <span
                  className="grid size-11 shrink-0 place-items-center rounded-xl border bg-card font-display text-sm font-black"
                  style={{ color: scoreStroke(cat.score), borderColor: `${scoreStroke(cat.score)}44` }}
                >
                  {cat.score}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Icon className="size-4 text-primary" aria-hidden />
                    <h4 className="text-sm font-bold">{cat.name}</h4>
                    <Badge variant={riskBadgeVariant(cat.riskLevel)}>{riskLabel(cat.riskLevel)}</Badge>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {cat.issues?.[0] || cat.recommendations?.[0] || 'Nominal operational status.'}
                  </p>
                  <p className="mt-1 text-[11px] font-semibold text-muted-foreground">
                    {Math.round((cat.confidence || 0) * 100)}% confidence
                    {issues ? ` · ${issues} issue${issues === 1 ? '' : 's'}` : ''}
                  </p>
                </div>
                <ChevronDown className={`mt-1 size-4 shrink-0 text-muted-foreground transition ${open ? 'rotate-180' : ''}`} />
              </button>

              {open && (
                <div className="space-y-3 border-t bg-card/70 px-4 py-4 text-xs">
                  {issues > 0 && (
                    <div>
                      <p className="mb-1 font-extrabold uppercase tracking-wider text-rose-500">Issues</p>
                      <ul className="list-disc space-y-1 pl-4 font-medium text-rose-600 dark:text-rose-400">
                        {cat.issues.map((issue, i) => <li key={i}>{issue}</li>)}
                      </ul>
                    </div>
                  )}
                  {cat.recommendations?.length > 0 && (
                    <div>
                      <p className="mb-1 font-extrabold uppercase tracking-wider text-primary">Recommendations</p>
                      <ul className="list-disc space-y-1 pl-4 font-medium">
                        {cat.recommendations.map((rec, i) => <li key={i}>{rec}</li>)}
                      </ul>
                    </div>
                  )}
                  {cat.evidence?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {cat.evidence.map((ev, i) => (
                        <Badge key={i} variant="secondary" className="font-mono text-[11px]">{ev}</Badge>
                      ))}
                    </div>
                  )}
                  <p className={`text-[11px] font-bold ${scoreToneClass(cat.score)}`}>
                    Score {cat.score}/100 · P {cat.probability} · I {cat.impact}
                  </p>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
