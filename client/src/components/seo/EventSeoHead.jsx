import { useEffect } from 'react';

/**
 * EventSeoHead dynamically injects SEO metadata, Open Graph tags,
 * Twitter cards, canonical links, robots indexability rules, and
 * Schema.org Event JSON-LD structured data into document head.
 */
export default function EventSeoHead({ event }) {
  useEffect(() => {
    if (!event) return;

    const prevTitle = document.title;
    const pageTitle = event.metaTitle
      ? `${event.metaTitle} · EventSphere`
      : `${event.title} · EventSphere`;
    document.title = pageTitle;

    const pageDesc = event.metaDescription || event.shortDescription || (event.description || '').slice(0, 155) || 'Discover and register for this event on EventSphere.';
    const pageImage = event.coverImage || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1400&q=70';
    const canonicalUrl = `${window.location.origin}/events/${event.slug}`;

    // Search Indexability Rules (respect draft, unlisted, private, cancelled)
    const isIndexable =
      event.visibility === 'public' &&
      event.approvalStatus === 'approved' &&
      ['published', 'live', 'completed'].includes(event.status);

    const robotsDirective = isIndexable ? 'index, follow' : 'noindex, nofollow';

    // Helper to set or create meta tag
    const setMeta = (selector, attr, val, content) => {
      let el = document.querySelector(selector);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, val);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
      return el;
    };

    // Standard Meta
    setMeta('meta[name="description"]', 'name', 'description', pageDesc);
    setMeta('meta[name="robots"]', 'name', 'robots', robotsDirective);

    // Open Graph
    setMeta('meta[property="og:title"]', 'property', 'og:title', event.metaTitle || event.title);
    setMeta('meta[property="og:description"]', 'property', 'og:description', pageDesc);
    setMeta('meta[property="og:image"]', 'property', 'og:image', pageImage);
    setMeta('meta[property="og:url"]', 'property', 'og:url', canonicalUrl);
    setMeta('meta[property="og:type"]', 'property', 'og:type', 'website');

    // Twitter Card
    setMeta('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');
    setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', event.metaTitle || event.title);
    setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', pageDesc);
    setMeta('meta[name="twitter:image"]', 'name', 'twitter:image', pageImage);

    // Canonical link
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', canonicalUrl);

    // Schema.org Structured Data
    let locationSchema;
    if (event.eventType === 'online') {
      locationSchema = {
        '@type': 'VirtualLocation',
        url: event.venue?.onlineUrl || canonicalUrl,
      };
    } else if (event.eventType === 'hybrid') {
      locationSchema = [
        {
          '@type': 'Place',
          name: event.venue?.name || 'Event Venue',
          address: {
            '@type': 'PostalAddress',
            streetAddress: event.venue?.address || '',
            addressLocality: event.venue?.city || '',
            addressCountry: 'IN',
          },
        },
        {
          '@type': 'VirtualLocation',
          url: event.venue?.onlineUrl || canonicalUrl,
        },
      ];
    } else {
      locationSchema = {
        '@type': 'Place',
        name: event.venue?.name || 'Event Venue',
        address: {
          '@type': 'PostalAddress',
          streetAddress: event.venue?.address || '',
          addressLocality: event.venue?.city || '',
          addressCountry: 'IN',
        },
      };
    }

    const attendanceModeMap = {
      offline: 'https://schema.org/OfflineEventAttendanceMode',
      online: 'https://schema.org/OnlineEventAttendanceMode',
      hybrid: 'https://schema.org/MixedEventAttendanceMode',
    };

    const eventStatusMap = {
      cancelled: 'https://schema.org/EventCancelled',
      completed: 'https://schema.org/EventScheduled',
      published: 'https://schema.org/EventScheduled',
      live: 'https://schema.org/EventScheduled',
      draft: 'https://schema.org/EventPostponed',
    };

    const offers = (event.ticketTypes && event.ticketTypes.length > 0)
      ? event.ticketTypes.map((t) => ({
          '@type': 'Offer',
          name: t.name,
          price: t.price || 0,
          priceCurrency: 'INR',
          availability: (t.quantity === 0 || (t.soldCount || 0) < t.quantity)
            ? 'https://schema.org/InStock'
            : 'https://schema.org/SoldOut',
          url: canonicalUrl,
          validFrom: event.createdAt || new Date().toISOString(),
        }))
      : [
          {
            '@type': 'Offer',
            name: 'General Admission',
            price: event.price || 0,
            priceCurrency: 'INR',
            availability: event.isFull ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock',
            url: canonicalUrl,
          },
        ];

    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Event',
      name: event.metaTitle || event.title,
      description: pageDesc,
      startDate: event.startDate ? new Date(event.startDate).toISOString() : undefined,
      endDate: event.endDate ? new Date(event.endDate).toISOString() : undefined,
      eventStatus: eventStatusMap[event.status] || 'https://schema.org/EventScheduled',
      eventAttendanceMode: attendanceModeMap[event.eventType] || 'https://schema.org/OfflineEventAttendanceMode',
      location: locationSchema,
      image: [event.coverImage, ...(event.images || [])].filter(Boolean),
      organizer: {
        '@type': 'Organization',
        name: event.organizer?.name || 'EventSphere Organizer',
        url: window.location.origin,
      },
      offers: isIndexable ? offers : undefined,
    };

    // Inject script[type="application/ld+json"]
    let scriptTag = document.getElementById('eventsphere-schema-jsonld');
    if (!scriptTag) {
      scriptTag = document.createElement('script');
      scriptTag.id = 'eventsphere-schema-jsonld';
      scriptTag.type = 'application/ld+json';
      document.head.appendChild(scriptTag);
    }
    scriptTag.textContent = JSON.stringify(jsonLd, null, 2);

    return () => {
      document.title = prevTitle;
      const jsonEl = document.getElementById('eventsphere-schema-jsonld');
      if (jsonEl) jsonEl.remove();
    };
  }, [event]);

  return null;
}
