import { Sparkles, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Card } from './card';
import { AiBadge } from './badge';

/** Semantic score buckets shared by every intelligence module */
export function scoreTone(score) {
  if (score >= 80) return 'success';
  if (score >= 60) return 'primary';
  if (score >= 40) return 'warning';
  return 'destructive';
}

const TONE_TEXT = {
  success: 'text-success',
  primary: 'text-primary',
  warning: 'text-warning',
  destructive: 'text-destructive',
};
const TONE_STROKE = {
  success: 'hsl(var(--success))',
  primary: 'hsl(var(--primary))',
  warning: 'hsl(var(--warning))',
  destructive: 'hsl(var(--destructive))',
};

/** Circular score gauge — used for health, trust, SEO and risk scores */
export function ScoreRing({ value, size = 96, thickness = 7, label, sub, className }) {
  const tone = scoreTone(value);
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className={cn('relative inline-grid place-items-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={thickness} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={TONE_STROKE[tone]}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (pct / 100) * c}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <span className={cn('block font-display text-2xl font-extrabold tabular leading-none', TONE_TEXT[tone])}>
            {Math.round(pct)}
          </span>
          {(label || sub) && (
            <span className="mt-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {label || sub}
            </span>
          )}
        </div>
      </div>
      <span className="sr-only">{`${label || 'Score'}: ${Math.round(pct)} of 100`}</span>
    </div>
  );
}

/** Compact confidence indicator for AI outputs */
export function ConfidenceMeter({ value = 0, label = 'Confidence', className }) {
  const tone = scoreTone(value);
  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
        <span className={cn('text-xs font-bold tabular', TONE_TEXT[tone])}>{value}%</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            tone === 'success' && 'bg-success',
            tone === 'primary' && 'bg-primary',
            tone === 'warning' && 'bg-warning',
            tone === 'destructive' && 'bg-destructive'
          )}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
}

/** Delta indicator — green up / red down / neutral */
export function TrendDelta({ value, suffix = '', invert = false, className }) {
  if (value == null || value === 0)
    return (
      <span className={cn('inline-flex items-center gap-0.5 text-xs font-semibold text-muted-foreground', className)}>
        <Minus className="size-3" aria-hidden="true" /> 0{suffix}
      </span>
    );
  const up = invert ? value < 0 : value > 0;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-xs font-bold tabular',
        up ? 'text-success' : 'text-destructive',
        className
      )}
    >
      {up ? <TrendingUp className="size-3" aria-hidden="true" /> : <TrendingDown className="size-3" aria-hidden="true" />}
      {Math.abs(value)}
      {suffix}
    </span>
  );
}

/**
 * AiCard — the shared container for every intelligence module
 * (EventShield, EventPulse, SmartQueue, TrustSphere, EventBoost, Command Center).
 * Featured surface + module header with icon, name and status badge.
 */
export function AiCard({ icon: Icon, title, subtitle, badge, actions, children, className, footer, interactive = true, danger = false }) {
  return (
    <Card
      featured={!danger}
      className={cn('flex flex-col', interactive && 'card-hover', danger && 'border-destructive/35 bg-gradient-to-b from-destructive/[0.05] to-card', className)}
    >
      <div className="flex items-start justify-between gap-3 border-b border-border/70 px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          {Icon && (
            <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-primary/15 bg-gradient-to-br from-primary/12 to-info/10 text-primary">
              <Icon className="size-4.5" style={{ width: 18, height: 18 }} aria-hidden="true" />
            </span>
          )}
          <div className="min-w-0">
            <h3 className="truncate text-sm font-bold leading-tight text-foreground">{title}</h3>
            {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {badge}
          {actions}
        </div>
      </div>
      <div className="flex-1 px-5 py-4">{children}</div>
      {footer && <div className="flex items-center justify-between gap-3 border-t border-border/70 px-5 py-3">{footer}</div>}
    </Card>
  );
}

/** Consistent "insight" callout inside AI cards — e.g. model recommendations */
export function InsightNote({ children, tone = 'primary', icon: Icon = Sparkles, className }) {
  const tones = {
    primary: 'border-primary/20 bg-primary/[0.06] text-foreground',
    success: 'border-success/20 bg-success/[0.06]',
    warning: 'border-warning/25 bg-warning/[0.06]',
    destructive: 'border-destructive/20 bg-destructive/[0.06]',
    info: 'border-info/20 bg-info/[0.06]',
  };
  return (
    <div className={cn('flex items-start gap-2.5 rounded-lg border px-3.5 py-2.5 text-xs leading-relaxed', tones[tone], className)}>
      <Icon className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden="true" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** Section label used to group intelligence modules on a page */
export function ModuleHeading({ children, count, className }) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <h2 className="font-display text-base font-bold tracking-tight">{children}</h2>
      {count != null && (
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
          {count}
        </span>
      )}
      <AiBadge className="ml-1 hidden sm:inline-flex">AI</AiBadge>
      <span className="h-px flex-1 bg-border" aria-hidden="true" />
    </div>
  );
}
