import { CheckSquare, Square } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Badge } from '../ui/badge';

export default function SafetyChecklist({ items = [], onToggle, pending }) {
  const done = items.filter((c) => c.status === 'completed').length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">Pre-event readiness checklist</CardTitle>
            <CardDescription className="text-xs">
              Completing items improves operational readiness. This is not a legal compliance certificate.
            </CardDescription>
          </div>
          <Badge variant="outline" className="font-mono text-xs">{done} / {items.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((item) => {
          const isDone = item.status === 'completed';
          return (
            <button
              key={item.id}
              type="button"
              disabled={pending}
              onClick={() => onToggle(item.id, isDone ? 'pending' : 'completed')}
              className={`flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition ${
                isDone ? 'border-success/30 bg-success/[0.04]' : 'bg-card hover:border-primary/40'
              }`}
            >
              {isDone ? <CheckSquare className="mt-0.5 size-5 text-success" /> : <Square className="mt-0.5 size-5 text-muted-foreground" />}
              <span className="flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className={`text-sm font-semibold ${isDone ? 'text-muted-foreground line-through' : ''}`}>{item.title}</span>
                  <Badge variant="outline" className="text-[10px] uppercase">{item.category}</Badge>
                  <Badge variant={item.priority === 'high' ? 'destructive' : item.priority === 'medium' ? 'warning' : 'secondary'} className="text-[10px] uppercase">
                    {item.priority}
                  </Badge>
                </span>
                {isDone && item.completedAt && (
                  <span className="mt-1 block text-[11px] text-success dark:text-success">
                    Completed {new Date(item.completedAt).toLocaleString()}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}
