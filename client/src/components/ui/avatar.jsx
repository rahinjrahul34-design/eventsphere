import { useState } from 'react';
import { cn, initials } from '../../lib/utils';

const COLORS = [
  'bg-violet-500', 'bg-blue-500', 'bg-emerald-500', 'bg-rose-500',
  'bg-amber-500', 'bg-cyan-500', 'bg-fuchsia-500', 'bg-indigo-500',
];

export function Avatar({ name = '', src, className = '', fallbackClass = '' }) {
  const color = COLORS[(name || '').charCodeAt(0) % COLORS.length] || COLORS[0];
  const [failed, setFailed] = useState(false);
  if (src && !failed) {
    return (
      <img
        src={src}
        alt={name}
        loading="lazy"
        className={cn('rounded-full object-cover ring-2 ring-background', className)}
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full text-white font-semibold ring-2 ring-background',
        color,
        fallbackClass,
        className
      )}
    >
      {initials(name)}
    </span>
  );
}
