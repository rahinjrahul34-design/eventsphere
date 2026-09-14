/**
 * Blank-image regression guard.
 *
 * The app is served offline / on restricted networks where external CDNs
 * (images.unsplash.com, api.dicebear.com, i.pravatar.cc) are unreachable. Every
 * image the app renders must therefore be a bundled local asset that actually
 * exists on disk. This suite fails loudly if:
 *
 *   1. the seeder reintroduces an external image URL,
 *   2. the seeded cover/avatar/logo values point at files that are not bundled,
 *   3. any source file references /images/... that does not exist,
 *   4. a model default points somewhere that is not a local asset.
 *
 * These tests are pure file-system checks — no database required.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const PUBLIC_IMAGES = path.join(ROOT, 'client', 'public', 'images');

const seed = require('../src/seeders/seed');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const existsUnderPublic = (url) => fs.existsSync(path.join(ROOT, 'client', 'public', url.replace(/^\//, '')));

/** Recursively collect source files, skipping build output and dependencies. */
function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (/\.(js|jsx|json|html|css)$/.test(entry.name)) acc.push(full);
  }
  return acc;
}

const SEARCH_DIRS = [
  path.join(ROOT, 'client', 'src'),
  path.join(ROOT, 'client', 'index.html'),
  path.join(ROOT, 'server', 'src'),
];

function sourceFiles() {
  return SEARCH_DIRS.flatMap((p) => (fs.statSync(p).isDirectory() ? walk(p) : [p]));
}

const rel = (p) => path.relative(ROOT, p);

describe('Local image assets', () => {
  test('the bundled image directories exist and are populated', () => {
    for (const sub of ['events', 'avatars', 'sponsors']) {
      const dir = path.join(PUBLIC_IMAGES, sub);
      expect(fs.existsSync(dir)).toBe(true);
      const files = fs.readdirSync(dir);
      expect(files.length).toBeGreaterThan(0);
    }
    // 20 seeded events each need a cover
    expect(fs.readdirSync(path.join(PUBLIC_IMAGES, 'events')).length).toBeGreaterThanOrEqual(20);
    expect(fs.readdirSync(path.join(PUBLIC_IMAGES, 'avatars')).length).toBeGreaterThanOrEqual(16);
    expect(fs.readdirSync(path.join(PUBLIC_IMAGES, 'sponsors')).length).toBeGreaterThanOrEqual(12);
  });

  test('no source file references an external image CDN', () => {
    // Hosts that are unreachable in sandboxed/offline deployments and rendered blank.
    const banned = [
      'images.unsplash.com',
      'api.dicebear.com',
      'i.pravatar.cc',
      'source.unsplash.com',
      'via.placeholder.com',
      'placehold.co',
      'loremflickr.com',
      'picsum.photos',
    ];

    const offenders = [];
    for (const file of sourceFiles()) {
      const text = fs.readFileSync(file, 'utf8');
      text.split('\n').forEach((line, i) => {
        // Ignore comments that merely document the migration away from these hosts.
        if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
        for (const host of banned) {
          if (line.includes(host)) offenders.push(`${rel(file)}:${i + 1} -> ${host}`);
        }
      });
    }

    expect(offenders).toEqual([]);
  });

  test('every /images/... literal referenced in source resolves to a bundled file', () => {
    const re = /["'`](\/images\/[A-Za-z0-9._/-]+)["'`]/g;
    const missing = [];
    let checked = 0;

    for (const file of sourceFiles()) {
      const text = fs.readFileSync(file, 'utf8');
      for (const match of text.matchAll(re)) {
        checked += 1;
        if (!existsUnderPublic(match[1])) missing.push(`${rel(file)} -> ${match[1]}`);
      }
    }

    expect(checked).toBeGreaterThan(0);
    expect(missing).toEqual([]);
  });

  test('all 20 seeded event covers resolve to bundled files', () => {
    const missing = [];
    for (const [unsplashId, stem] of Object.entries(seed.LOCAL_COVERS)) {
      const url = `/images/events/${stem}.jpg`;
      if (!existsUnderPublic(url)) missing.push(`${unsplashId} -> ${url}`);
    }
    expect(missing).toEqual([]);
  });

  test('the seeder image helpers only ever return bundled local assets', () => {
    // Seeded covers (mapped + unmapped ids) must be local and present.
    for (const id of [...Object.keys(seed.LOCAL_COVERS), 'photo-does-not-exist']) {
      const url = seed.img(id);
      expect(url).toMatch(/^\/images\//);
      expect(existsUnderPublic(url)).toBe(true);
    }

    // Every avatar variant the seeder can emit must exist.
    for (let i = 0; i < 200; i += 1) {
      const url = seed.avatar(i);
      expect(url).toMatch(/^\/images\/avatars\//);
      expect(existsUnderPublic(url)).toBe(true);
    }
    for (const name of ['DevForge', 'CloudNova', 'FinEdge', 'Stackly', 'FirstSpark Ventures', 'PixelForge']) {
      const url = seed.logo(name);
      expect(url).toMatch(/^\/images\/sponsors\//);
      expect(existsUnderPublic(url)).toBe(true);
    }

    // Deterministic: the same seed always yields the same asset.
    expect(seed.avatar(44)).toBe(seed.avatar(44));
    expect(seed.logo('DevForge')).toBe(seed.logo('DevForge'));
    // Variants spread across the bundled set rather than collapsing to one file.
    const distinct = new Set([...Array(16).keys()].map((i) => seed.avatar(i)));
    expect(distinct.size).toBeGreaterThanOrEqual(8);
  });

  test('Speaker.photo and Sponsor.logo model defaults are bundled local assets', () => {
    const Speaker = require('../src/models/Speaker');
    const Sponsor = require('../src/models/Sponsor');

    const speakerDefault = Speaker.schema.path('photo').defaultValue;
    const sponsorDefault = Sponsor.schema.path('logo').defaultValue;

    expect(speakerDefault).toMatch(/^\/images\//);
    expect(sponsorDefault).toMatch(/^\/images\//);
    expect(existsUnderPublic(speakerDefault)).toBe(true);
    expect(existsUnderPublic(sponsorDefault)).toBe(true);
  });
});
