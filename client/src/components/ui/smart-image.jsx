import { useMemo, useState } from 'react';

/**
 * SmartImage — an <img> that can never render blank.
 *
 * The project originally hot-linked covers and avatars from external CDNs
 * (images.unsplash.com, api.dicebear.com, i.pravatar.cc). On restricted or
 * offline networks those requests fail and the user sees a broken image icon or
 * an empty gap. SmartImage keeps the same <img> element (so existing layout and
 * class names are untouched) but swaps in a deterministic, inline SVG gradient
 * placeholder whenever the source is missing or fails to load.
 */

const PALETTES = [
  ['#7c3aed', '#a78bfa'],
  ['#2563eb', '#60a5fa'],
  ['#059669', '#34d399'],
  ['#d97706', '#fbbf24'],
  ['#db2777', '#f472b6'],
  ['#0891b2', '#22d3ee'],
];

const hash = (value) => {
  let h = 7;
  for (const ch of String(value || '')) h = (h * 31 + ch.codePointAt(0)) % 1000003;
  return h;
};

const cache = new Map();

/** Build a data-URI SVG placeholder (gradient + picture glyph). */
export function placeholderImage(seed = '') {
  const key = String(seed || '');
  if (cache.has(key)) return cache.get(key);

  const [from, to] = PALETTES[hash(key) % PALETTES.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 90" preserveAspectRatio="none">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/>
</linearGradient></defs>
<rect width="160" height="90" fill="url(#g)"/>
<g fill="none" stroke="#ffffff" stroke-opacity="0.8" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
<rect x="60" y="29" width="40" height="32" rx="5"/>
<path d="M63 56l11-11 8 8 6-5 9 8"/>
</g>
<circle cx="86" cy="40" r="3.4" fill="#ffffff" fill-opacity="0.8"/>
</svg>`;

  const uri = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  cache.set(key, uri);
  return uri;
}

export default function SmartImage({
  src,
  alt = '',
  fallbackSeed,
  className = '',
  onError,
  loading = 'lazy',
  ...rest
}) {
  const seed = fallbackSeed ?? alt ?? '';
  const fallback = useMemo(() => placeholderImage(seed), [seed]);

  // Reset the failure flag whenever the source changes (lists re-use DOM nodes).
  const [state, setState] = useState({ src, failed: false });
  if (state.src !== src) setState({ src, failed: false });

  const resolved = !src || state.failed ? fallback : src;

  return (
    <img
      src={resolved}
      alt={alt}
      loading={loading}
      onError={(e) => {
        onError?.(e);
        if (!state.failed) setState({ src, failed: true });
      }}
      className={className}
      {...rest}
    />
  );
}
