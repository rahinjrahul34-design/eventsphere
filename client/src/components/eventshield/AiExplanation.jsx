import { Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';

export default function AiExplanation({ summary, engine, topRisks = [] }) {
  return (
    <Card className="border-primary/20 bg-primary/[0.03]">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="size-4 text-primary" />
          AI explanation
        </CardTitle>
        <CardDescription className="text-xs">
          {engine === 'hybrid-gemini'
            ? 'Contextual narrative from Gemini on top of deterministic scores. Scores are never invented by the model.'
            : 'AI explanation running in local rule-based mode. Deterministic scores remain authoritative.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {summary ? (
          <div className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{summary}</div>
        ) : (
          <p className="text-sm text-muted-foreground">AI explanation temporarily unavailable. Deterministic risk analysis is still shown above.</p>
        )}
        {topRisks.length > 0 && (
          <ol className="space-y-2 border-t pt-3">
            {topRisks.slice(0, 5).map((r, i) => (
              <li key={i} className="text-xs">
                <span className="font-bold text-foreground">{i + 1}. {r.title}</span>
                <span className="mt-0.5 block text-muted-foreground">
                  Why: {r.reason || r.evidence} · Recommendation: {r.recommendation}
                </span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
