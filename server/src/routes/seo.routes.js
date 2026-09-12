/**
 * Server-side SEO infrastructure (CORE SPEC §41 — SEARCH INDEXABILITY)
 *
 * EventSphere is a client-rendered SPA: the same bare index.html is served for
 * every route. Client-side <EventSeoHead /> patches the DOM after hydration,
 * but crawlers and social scrapers (Facebook/LinkedIn/WhatsApp/X do NOT execute
 * app JS bundles) would otherwise see no event metadata at all.
 *
 * This router provides:
 *   1. GET /events/:slug        → event-specific <head> injection (title, meta
 *                                 description, Open Graph, canonical, JSON-LD
 *                                 structured data) rendered SERVER-SIDE.
 *   2. GET /robots.txt          → crawl directives + sitemap reference.
 *   3. GET /sitemap.xml         → static routes + all publicly indexable events.
 *
 * Privacy rules (mirrors client EventSeoHead): only public + approved +
 * published/live/completed events are indexable. Draft/unlisted/private/
 * cancelled events receive `noindex, nofollow` metadata or default tags.
 */

const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const config = require('../config');

const INDEXABLE_STATUSES = ['published', 'live', 'completed'];
const SITEMAP_CACHE_MS = 15 * 60 * 1000; // 15 minutes

let sitemapCache = { xml: null, generatedAt: 0 };

/** Escape user-generated content for safe HTML head injection (XSS-safe). */
function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function truncate(str = '', max) {
  const s = String(str).trim().replace(/\s+/g, ' ');
  return s.length <= max ? s : `${s.slice(0, max - 1).trimEnd()}…`;
}

/**
 * Loads a publicly visible event (with organizer name) for head injection.
 * Non-public/unapproved events resolve to null → generic tags are served,
 * never leaking private event details into crawler-visible markup.
 */
async function loadPublicEvent(slug) {
  if (!slug || slug.length > 200) return null;
  try {
    return await Event.findOne({
      slug: String(slug).toLowerCase(),
      visibility: 'public',
      approvalStatus: 'approved',
      status: { $in: [...INDEXABLE_STATUSES, 'cancelled'] },
    })
      .select('title shortDescription description metaTitle metaDescription coverImage slug startDate endDate status eventType venue price ticketTypes isFull organizer images')
      .populate('organizer', 'name')
      .lean();
  } catch (e) {
    return null;
  }
}

function buildHeadTags(event, baseUrl, canonicalUrl) {
  const title = event
    ? truncate(event.metaTitle || event.title, 70)
    : 'EventSphere — Discover Events';
  const description = event
    ? truncate(event.metaDescription || event.shortDescription || String(event.description || '').replace(/<[^>]*>/g, ' '), 160)
    : 'Find, register for, and attend the best events near you on EventSphere.';
  const image = event?.coverImage || `${baseUrl}/favicon.ico`;
  const isIndexable = event ? INDEXABLE_STATUSES.includes(event.status) : true;
  const robots = isIndexable ? 'index, follow' : 'noindex, nofollow';

  const tag = (name, attr, content) =>
    `<meta ${attr}="${name}" content="${escapeHtml(content)}" />`;

  let head =
    `<title>${escapeHtml(title)}</title>\n` +
    tag('description', 'name', description) + '\n' +
    tag('robots', 'name', robots) + '\n' +
    `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />\n` +
    tag('og:title', 'property', title) + '\n' +
    tag('og:description', 'property', description) + '\n' +
    tag('og:image', 'property', image) + '\n' +
    tag('og:url', 'property', canonicalUrl) + '\n' +
    tag('og:type', 'property', 'website') + '\n' +
    tag('twitter:card', 'name', 'summary_large_image') + '\n' +
    tag('twitter:title', 'name', title) + '\n' +
    tag('twitter:description', 'name', description);

  if (event) {
    // Schema.org Event structured data — only verified fields, matching the
    // client-side EventSeoHead shape so hydration updates the same node.
    const attendanceMode = {
      online: 'https://schema.org/OnlineEventAttendanceMode',
      hybrid: 'https://schema.org/MixedEventAttendanceMode',
      offline: 'https://schema.org/OfflineEventAttendanceMode',
    }[event.eventType] || 'https://schema.org/OfflineEventAttendanceMode';

    const eventStatus = event.status === 'cancelled'
      ? 'https://schema.org/EventCancelled'
      : 'https://schema.org/EventScheduled';

    let locationSchema;
    if (event.eventType === 'online') {
      locationSchema = { '@type': 'VirtualLocation', url: event.venue?.onlineUrl || canonicalUrl };
    } else {
      locationSchema = {
        '@type': 'Place',
        name: event.venue?.name || 'Event Venue',
        ...(event.venue?.address || event.venue?.city
          ? {
              address: {
                '@type': 'PostalAddress',
                ...(event.venue?.address ? { streetAddress: event.venue.address } : {}),
                ...(event.venue?.city ? { addressLocality: event.venue.city } : {}),
                addressCountry: 'IN',
              },
            }
          : {}),
      };
    }

    const offers = (event.ticketTypes?.length > 0
      ? event.ticketTypes.map((t) => ({
          '@type': 'Offer',
          name: t.name,
          price: t.price || 0,
          priceCurrency: 'INR',
          availability: (t.quantity > 0 && (t.soldCount || 0) >= t.quantity)
            ? 'https://schema.org/SoldOut'
            : 'https://schema.org/InStock',
          url: canonicalUrl,
        }))
      : [{
          '@type': 'Offer',
          name: 'General Admission',
          price: event.price || 0,
          priceCurrency: 'INR',
          availability: event.isFull ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock',
          url: canonicalUrl,
        }]);

    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Event',
      name: title,
      description,
      ...(event.startDate ? { startDate: new Date(event.startDate).toISOString() } : {}),
      ...(event.endDate ? { endDate: new Date(event.endDate).toISOString() } : {}),
      eventStatus,
      eventAttendanceMode: attendanceMode,
      location: locationSchema,
      ...(event.coverImage ? { image: [event.coverImage, ...(event.images || [])].filter(Boolean) } : {}),
      organizer: { '@type': 'Organization', name: event.organizer?.name || 'EventSphere Organizer', url: baseUrl },
      offers,
    };

    head +=
      `\n<script type="application/ld+json" id="eventsphere-schema-jsonld">${JSON.stringify(jsonLd)}</script>`;
  }

  return head;
}

/** Injects tags right after <head> (idempotent with the client-side updater). */
function injectIntoHtml(html, headTags) {
  if (html.includes('<!--eventboost-seo-->')) return html; // already injected
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head[^>]*>/i, (m) => `${m}\n<!--eventboost-seo-->\n${headTags}`);
  }
  return html;
}

// ---------------------------------------------------------------------------
// 1. Event pages — server-rendered head metadata for crawlers & scrapers
// ---------------------------------------------------------------------------
router.get('/events/:slug([a-z0-9-]+)', async (req, res, next) => {
  try {
    const clientDist = require('path').join(__dirname, '..', '..', 'web-static');
    const indexFile = require('path').join(clientDist, 'index.html');
    const fs = require('fs');
    if (!fs.existsSync(indexFile)) return next();

    const [event, html] = await Promise.all([
      loadPublicEvent(req.params.slug),
      fs.promises.readFile(indexFile, 'utf8'),
    ]);

    const baseUrl = config.clientUrl || `${req.protocol}://${req.get('host')}`;
    const canonicalUrl = `${baseUrl}/events/${req.params.slug}`;
    const out = injectIntoHtml(html, buildHeadTags(event, baseUrl, canonicalUrl));
    res.set('Content-Type', 'text/html; charset=utf-8').send(out);
  } catch (e) {
    next(); // never break the SPA — fall through to the default handler
  }
});

// ---------------------------------------------------------------------------
// 2. robots.txt — crawl directives + sitemap discovery
// ---------------------------------------------------------------------------
router.get('/robots.txt', (req, res) => {
  const baseUrl = config.clientUrl || `${req.protocol}://${req.get('host')}`;
  res.set('Content-Type', 'text/plain; charset=utf-8').send(
    [
      'User-agent: *',
      'Allow: /',
      'Disallow: /dashboard/',
      'Disallow: /admin/',
      'Disallow: /my-tickets/',
      'Disallow: /profile/',
      'Disallow: /login',
      'Disallow: /register',
      'Disallow: /api/',
      '',
      `Sitemap: ${baseUrl}/sitemap.xml`,
      '',
    ].join('\n')
  );
});

// ---------------------------------------------------------------------------
// 3. sitemap.xml — static routes + all publicly indexable events (cached 15m)
// ---------------------------------------------------------------------------
router.get('/sitemap.xml', async (req, res, next) => {
  try {
    const baseUrl = config.clientUrl || `${req.protocol}://${req.get('host')}`;
    const now = Date.now();

    if (!sitemapCache.xml || now - sitemapCache.generatedAt > SITEMAP_CACHE_MS) {
      let eventUrls = '';
      try {
        const events = await Event.find({
          visibility: 'public',
          approvalStatus: 'approved',
          status: { $in: INDEXABLE_STATUSES },
        })
          .select('slug updatedAt')
          .sort({ updatedAt: -1 })
          .limit(5000)
          .lean();

        eventUrls = events
          .map(
            (e) =>
              `  <url><loc>${baseUrl}/events/${e.slug}</loc><lastmod>${new Date(e.updatedAt || Date.now()).toISOString().slice(0, 10)}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`
          )
          .join('\n');
      } catch (dbErr) {
        // Database hiccup: serve the static-only sitemap rather than failing
      }

      const staticUrls = ['', '/events', '/login', '/register']
        .map(
          (p) =>
            `  <url><loc>${baseUrl}${p}</loc><changefreq>daily</changefreq><priority>${p === '' ? '1.0' : '0.6'}</priority></url>`
        )
        .join('\n');

      sitemapCache = {
        generatedAt: now,
        xml:
          `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${staticUrls}\n${eventUrls}\n</urlset>`,
      };
    }

    res.set('Content-Type', 'application/xml; charset=utf-8').send(sitemapCache.xml);
  } catch (e) {
    next();
  }
});

module.exports = router;
