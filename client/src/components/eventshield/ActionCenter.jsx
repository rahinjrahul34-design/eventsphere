import { AlertTriangle, CheckCircle2, Wrench } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { groupActions, riskBadgeVariant, riskLabel } from './shieldUtils';

const SECTIONS = [
  { key: 'high', title: 'High priority', empty: 'No high-priority operational issues.' },
  { key: 'medium', title: 'Medium', empty: 'No medium-priority issues.' },
  { key: 'low', title: 'Low', empty: 'No low-priority notes.' },
];

export default function ActionCenter({ categories = [], onFix, onReviewed, reviewedIds = new Set() }) {
  const groups = groupActions(categories);
  const openHigh = groups.high.filter((a) => !reviewedIds.has(a.id)).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className={`size-4 ${openHigh ? 'text-rose-500' : 'text-emerald-500'}`} />
              Action Center
            </CardTitle>
            <CardDescription className="text-xs">
              Ranked operational gaps with evidence. Fix Now opens safety settings — it does not contact emergency services.
            </CardDescription>
          </div>
          <Badge variant={openHigh ? 'destructive' : 'success'}>
            {openHigh} high issue{openHigh === 1 ? '' : 's'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {SECTIONS.map((sec) => (
          <div key={sec.key}>
            <h3 className="mb-2 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
              {sec.title} · {groups[sec.key].length}
            </h3>
            {groups[sec.key].length === 0 ? (
              <p className="rounded-xl border border-dashed px-3 py-2 text-xs text-muted-foreground">{sec.empty}</p>
            ) : (
              <ul className="space-y-2">
                {groups[sec.key].map((item) => {
                  const done = reviewedIds.has(item.id);
                  return (
                    <li
                      key={item.id}
                      className={`rounded-xl border p-3.5 ${done ? 'bg-emerald-500/[0.04] border-emerald-500/25' : 'bg-card'}`}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={riskBadgeVariant(item.priority)}>{riskLabel(item.priority)}</Badge>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                              {item.category}
                            </span>
                          </div>
                          <p className={`mt-1 text-sm font-semibold ${done ? 'line-through text-muted-foreground' : ''}`}>
                            {item.title}
                          </p>
                          {item.recommendation && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              <strong className="text-foreground">Why / next step:</strong> {item.recommendation}
                            </p>
                          )}
                          {item.evidence?.length > 0 && (
                            <p className="mt-1 text-[11px] text-muted-foreground">Evidence: {item.evidence.join(' · ')}</p>
                          )}
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2">
                          <Button size="sm" variant="outline" className="h-8 text-xs font-bold" onClick={() => onFix?.(item)}>
                            <Wrench className="size-3.5" /> Fix now
                          </Button>
                          <Button
                            size="sm"
                            variant={done ? 'secondary' : 'outline'}
                            className="h-8 text-xs font-bold"
                            onClick={() => onReviewed?.(item)}
                          >
                            <CheckCircle2 className="size-3.5" /> {done ? 'Reviewed' : 'Mark reviewed'}
                          </Button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
