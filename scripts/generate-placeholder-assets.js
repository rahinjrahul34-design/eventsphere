#!/usr/bin/env node
/**
 * Generates the self-hosted placeholder avatars and sponsor logos used by the
 * seeder and by the Speaker / Sponsor model defaults.
 *
 * Why: the project previously hot-linked illustrated avatars from
 * api.dicebear.com (and, before that, i.pravatar.cc). Those are external CDNs —
 * in sandboxed / offline / restricted-network environments they fail to load and
 * every avatar and sponsor logo renders blank. These files are plain SVG, written
 * into `client/public/images/...`, so Vite serves them in dev and copies them
 * into `server/web-static/images/...` at build time for production.
 *
 * Run:  node scripts/generate-placeholder-assets.js
 *       (or: npm run assets)
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const AVATAR_DIR = path.join(ROOT, 'client/public/images/avatars');
const SPONSOR_DIR = path.join(ROOT, 'client/public/images/sponsors');

// ---------------------------------------------------------------------------
// Avatars — flat, friendly, illustrated people. 16 deterministic variants that
// vary in background, skin tone, hair colour/style and shirt colour.
// ---------------------------------------------------------------------------
const BG = [
  ['#a78bfa', '#7c3aed'], ['#60a5fa', '#2563eb'], ['#34d399', '#059669'],
  ['#fbbf24', '#d97706'], ['#f472b6', '#db2777'], ['#22d3ee', '#0891b2'],
  ['#818cf8', '#4f46e5'], ['#fb7185', '#e11d48'], ['#4ade80', '#16a34a'],
  ['#c084fc', '#9333ea'], ['#38bdf8', '#0284c7'], ['#facc15', '#ca8a04'],
];
const SKIN = ['#f2d0b6', '#e8b894', '#d69a6f', '#c07e50', '#a86337', '#8a4b28', '#f7dcc4'];
const HAIR = ['#2f2a26', '#4a3728', '#6b4a2f', '#1c1c1c', '#7d5a3c', '#3b3b3b', '#5b3a29'];
const SHIRT = ['#1e293b', '#0f766e', '#b91c1c', '#4338ca', '#047857', '#7e22ce', '#c2410c', '#1d4ed8', '#be185d'];
// 0 = short, 1 = fringe/bob, 2 = bun, 3 = curly
const HAIR_STYLE = [0, 1, 2, 3];

const avatarSvg = (i) => {
  const [bg1, bg2] = BG[i % BG.length];
  const skin = SKIN[(i * 3) % SKIN.length];
  const hair = HAIR[(i * 5) % HAIR.length];
  const shirt = SHIRT[(i * 7) % SHIRT.length];
  const style = HAIR_STYLE[i % HAIR_STYLE.length];
  const uid = `a${i}`;
  const darker = (hex) => hex; // shirt shadow handled inline below

  const hairShapes = {
    // short
    0: `<path d="M120 46c-30 0-46 20-46 46 0 7 2 13 4 18 2-20 12-33 42-33s40 13 42 33c2-5 4-11 4-18 0-26-16-46-46-46z" fill="${hair}"/>`,
    // bob / fringe, longer at the sides
    1: `<path d="M120 44c-32 0-48 21-48 50 0 14 3 26 6 38l10-4c-4-14-6-26-6-36 0-6 2-11 6-15 8 9 22 14 40 13 14-1 22-5 26-11 2 4 3 9 3 15 0 11-2 24-6 38l10 4c3-13 5-26 5-42 0-29-14-50-46-50z" fill="${hair}"/>`,
    // bun
    2: `<circle cx="120" cy="40" r="15" fill="${hair}"/><path d="M120 48c-30 0-46 20-46 46 0 8 2 15 5 21l8-3c-2-6-3-12-3-18 0-19 13-32 36-32s36 13 36 32c0 6-1 12-3 18l8 3c3-6 5-13 5-21 0-26-16-46-46-46z" fill="${hair}"/>`,
    // curly
    3: `<g fill="${hair}"><circle cx="92" cy="66" r="17"/><circle cx="120" cy="52" r="20"/><circle cx="148" cy="66" r="17"/><circle cx="80" cy="88" r="13"/><circle cx="160" cy="88" r="13"/><circle cx="120" cy="70" r="19"/></g>`,
  };

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="240" height="240" role="img" aria-label="Illustrated avatar ${i + 1}">
  <defs>
    <linearGradient id="bg${uid}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${bg1}"/><stop offset="100%" stop-color="${bg2}"/>
    </linearGradient>
    <clipPath id="clip${uid}"><circle cx="120" cy="120" r="120"/></clipPath>
  </defs>
  <g clip-path="url(#clip${uid})">
    <rect width="240" height="240" fill="url(#bg${uid})"/>
    <circle cx="120" cy="255" r="86" fill="${shirt}"/>
    <rect x="106" y="150" width="28" height="34" rx="12" fill="${skin}"/>
    <circle cx="120" cy="112" r="50" fill="${skin}"/>
    ${hairShapes[style]}
    <circle cx="103" cy="114" r="5" fill="#1f2937"/>
    <circle cx="137" cy="114" r="5" fill="#1f2937"/>
    <circle cx="104.5" cy="112.5" r="1.6" fill="#fff"/>
    <circle cx="138.5" cy="112.5" r="1.6" fill="#fff"/>
    <path d="M108 134c4 5 9 7 12 7s8-2 12-7" fill="none" stroke="#8a5a44" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M96 96c3-4 8-6 12-6M132 90c4 0 9 2 12 6" fill="none" stroke="${darker(hair)}" stroke-width="3.5" stroke-linecap="round"/>
  </g>
</svg>
`;
};

// ---------------------------------------------------------------------------
// Sponsor logos — abstract monogram marks. The seeder picks a variant from the
// company name, so each sponsor keeps a stable, recognisable mark.
// ---------------------------------------------------------------------------
const LOGO = [
  ['#4f46e5', '#7c3aed', 'M'], ['#0284c7', '#22d3ee', 'B'], ['#059669', '#34d399', 'S'],
  ['#d97706', '#fbbf24', 'F'], ['#db2777', '#f472b6', 'P'], ['#0891b2', '#67e8f9', 'C'],
  ['#7c3aed', '#c084fc', 'D'], ['#e11d48', '#fb7185', 'T'], ['#16a34a', '#86efac', 'N'],
  ['#9333ea', '#f0abfc', 'K'], ['#2563eb', '#93c5fd', 'V'], ['#ca8a04', '#fde047', 'Z'],
];

// Simple geometric marks drawn behind the monogram, one per variant.
const MARKS = [
  `<rect x="44" y="44" width="70" height="70" rx="18" fill="#fff" fill-opacity="0.14"/>`,
  `<circle cx="84" cy="84" r="40" fill="#fff" fill-opacity="0.14"/>`,
  `<path d="M52 130 L92 52 L132 130 Z" fill="#fff" fill-opacity="0.13"/>`,
  `<g fill="#fff" fill-opacity="0.13"><circle cx="80" cy="76" r="26"/><circle cx="112" cy="112" r="26"/></g>`,
  `<rect x="46" y="46" width="88" height="88" rx="44" fill="none" stroke="#fff" stroke-opacity="0.2" stroke-width="10"/>`,
  `<g fill="#fff" fill-opacity="0.13"><rect x="56" y="56" width="34" height="34" rx="8"/><rect x="98" y="56" width="34" height="34" rx="8"/><rect x="56" y="98" width="34" height="34" rx="8"/><rect x="98" y="98" width="34" height="34" rx="8"/></g>`,
];

const logoSvg = (i) => {
  const [c1, c2, letter] = LOGO[i % LOGO.length];
  const mark = MARKS[i % MARKS.length];
  const uid = `l${i}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180" width="180" height="180" role="img" aria-label="Sponsor logo ${i + 1}">
  <defs>
    <linearGradient id="bg${uid}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/>
    </linearGradient>
  </defs>
  <rect width="180" height="180" rx="40" fill="url(#bg${uid})"/>
  ${mark}
  <text x="90" y="90" text-anchor="middle" dominant-baseline="central"
        font-family="Inter, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
        font-size="74" font-weight="700" fill="#ffffff">${letter}</text>
</svg>
`;
};

// Neutral fallbacks used by the model defaults (no specific seed/name available).
const defaultAvatarSvg = () => {
  const s = avatarSvg(0).replace('Illustrated avatar 1', 'Default speaker photo');
  return s;
};
const defaultLogoSvg = () =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180" width="180" height="180" role="img" aria-label="Sponsor logo">
  <defs><linearGradient id="bgDef" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#64748b"/><stop offset="100%" stop-color="#334155"/>
  </linearGradient></defs>
  <rect width="180" height="180" rx="40" fill="url(#bgDef)"/>
  <path d="M90 46l38 66H52z" fill="#fff" fill-opacity="0.18"/>
  <text x="90" y="92" text-anchor="middle" dominant-baseline="central"
        font-family="Inter, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
        font-size="70" font-weight="700" fill="#ffffff">S</text>
</svg>
`;

const AVATAR_COUNT = 16;
const LOGO_COUNT = 12;

fs.mkdirSync(AVATAR_DIR, { recursive: true });
fs.mkdirSync(SPONSOR_DIR, { recursive: true });

const written = [];
for (let i = 0; i < AVATAR_COUNT; i += 1) {
  const name = `avatar-${String(i + 1).padStart(2, '0')}.svg`;
  fs.writeFileSync(path.join(AVATAR_DIR, name), avatarSvg(i));
  written.push(path.join('images/avatars', name));
}
fs.writeFileSync(path.join(AVATAR_DIR, 'default.svg'), defaultAvatarSvg());
written.push('images/avatars/default.svg');

for (let i = 0; i < LOGO_COUNT; i += 1) {
  const name = `logo-${String(i + 1).padStart(2, '0')}.svg`;
  fs.writeFileSync(path.join(SPONSOR_DIR, name), logoSvg(i));
  written.push(path.join('images/sponsors', name));
}
fs.writeFileSync(path.join(SPONSOR_DIR, 'default.svg'), defaultLogoSvg());
written.push('images/sponsors/default.svg');

// eslint-disable-next-line no-console
console.log(`Generated ${written.length} self-hosted placeholder assets:`);
written.forEach((f) => console.log(`  client/public/${f}`));
