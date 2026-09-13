import { Info } from 'lucide-react';

export default function DisclaimerBanner({ text }) {
  return (
    <aside
      role="note"
      className="flex items-start gap-3 rounded-xl border border-warning/25 bg-gradient-to-r from-warning/10 via-warning/5 to-transparent p-4 text-sm"
    >
      <Info className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden />
      <div>
        <p className="font-bold text-warning">AI-generated operational assessment</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
          {text ||
            'EventShield provides AI-assisted operational insights and planning recommendations. It does not replace qualified safety professionals, venue requirements, emergency services, or local laws and regulations. Verify recommendations with qualified event/safety professionals and local requirements.'}
        </p>
      </div>
    </aside>
  );
}
