import { Info } from 'lucide-react';

export default function DisclaimerBanner({ text }) {
  return (
    <aside
      role="note"
      className="flex items-start gap-3 rounded-2xl border border-amber-500/25 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-4 text-sm"
    >
      <Info className="mt-0.5 size-5 shrink-0 text-amber-500" aria-hidden />
      <div>
        <p className="font-bold text-amber-800 dark:text-amber-200">AI-generated operational assessment</p>
        <p className="mt-0.5 text-xs leading-relaxed text-amber-900/80 dark:text-amber-100/80">
          {text ||
            'EventShield provides AI-assisted operational insights and planning recommendations. It does not replace qualified safety professionals, venue requirements, emergency services, or local laws and regulations. Verify recommendations with qualified event/safety professionals and local requirements.'}
        </p>
      </div>
    </aside>
  );
}
