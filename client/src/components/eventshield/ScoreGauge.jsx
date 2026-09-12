import { scoreBand, scoreStroke, scoreToneClass } from './shieldUtils';

export default function ScoreGauge({ value = 0, label = 'Score', size = 128, suffix = '' }) {
  const n = Math.min(100, Math.max(0, Math.round(Number(value) || 0)));
  const r = 46;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - n / 100);
  const stroke = scoreStroke(n);
  const band = scoreBand(n);

  return (
    <div className="flex flex-col items-center" style={{ width: size }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        role="img"
        aria-label={`${label}: ${n}${suffix} — ${band.label}`}
      >
        <circle cx="60" cy="60" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke={stroke}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform="rotate(-90 60 60)"
        />
        <text
          x="60"
          y="56"
          textAnchor="middle"
          className="font-display"
          style={{ fontSize: 28, fontWeight: 800, fill: 'hsl(var(--foreground))' }}
        >
          {n}{suffix}
        </text>
        <text
          x="60"
          y="74"
          textAnchor="middle"
          style={{ fontSize: 10, fontWeight: 700, fill: 'hsl(var(--muted-foreground))', letterSpacing: '0.08em' }}
        >
          {label.toUpperCase()}
        </text>
      </svg>
      <p className={`mt-1 text-xs font-bold ${scoreToneClass(n)}`}>{band.label}</p>
    </div>
  );
}
