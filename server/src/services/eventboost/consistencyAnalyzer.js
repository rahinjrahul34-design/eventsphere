/**
 * Content consistency checker comparing title, description, event mode, venue, pricing, dates, and certificates.
 *
 * @param {object} event
 * @returns {Array<object>} inconsistencies [{ type, severity, message, suggestion }]
 */
function analyzeConsistency(event = {}) {
  const inconsistencies = [];
  const desc = (event.description || '').toLowerCase();
  const title = (event.title || '').toLowerCase();
  const mode = event.eventType || 'offline';

  // 1. Mode Mismatch: Online event referencing physical venue
  if (mode === 'online') {
    const physicalMarkers = [
      'auditorium', 'hall', 'campus', 'road', 'street', 'reach the venue',
      'at the gate', 'building', 'ground', 'in-person', 'physical entry',
    ];
    const foundMarker = physicalMarkers.find((m) => desc.includes(m) || title.includes(m));
    if (foundMarker || (event.venue?.address && event.venue.address.length > 5)) {
      inconsistencies.push({
        type: 'mode_venue_mismatch',
        severity: 'warning',
        message: 'Event is set as Online, but text or venue details reference a physical location.',
        suggestion: 'If this is an online webinar, remove physical room/campus references and provide a meeting link; or switch event mode to Hybrid/In-Person.',
      });
    }
  }

  // 2. Mode Mismatch: Offline event referencing online webinar only
  if (mode === 'offline') {
    const onlineMarkers = ['zoom link', 'google meet', 'streamed online only', 'webinar link will be emailed'];
    const foundOnline = onlineMarkers.find((m) => desc.includes(m));
    if (foundOnline) {
      inconsistencies.push({
        type: 'mode_online_mismatch',
        severity: 'warning',
        message: 'Event is marked Offline (In-Person), but description mentions online-only webinar details.',
        suggestion: 'If remote attendees can join, update event mode to Hybrid.',
      });
    }

    if (!event.venue?.city && !event.venue?.name && !event.venue?.address) {
      inconsistencies.push({
        type: 'missing_physical_venue',
        severity: 'warning',
        message: 'In-person event is missing a physical venue name and city.',
        suggestion: 'Specify the venue name and city in the Venue step to enable local search discovery.',
      });
    }
  }

  // 3. Pricing Mismatch: Free event vs Paid claims
  const isFree = (event.price === 0 || !event.price) &&
    (!event.ticketTypes || event.ticketTypes.every((t) => (t.price || 0) === 0));

  if (isFree) {
    const paidRegex = /₹\s*\d+|rs\.?\s*\d+|\d+\s*rupees|tickets?\s*(?:cost|are)\s*₹?\d+|paid entry|registration fee of/i;
    if (paidRegex.test(desc)) {
      inconsistencies.push({
        type: 'pricing_mismatch',
        severity: 'warning',
        message: 'Event is configured as Free, but the description mentions paid ticket fees.',
        suggestion: 'Ensure ticket prices in the Tickets tab match any fee mentioned in the text.',
      });
    }
  } else {
    // Paid event marked free in text
    if (/free entry for all|100%\s*free|no fee required|completely free to attend/i.test(desc) && (event.price > 0 || (event.ticketTypes || []).some((t) => t.price > 0))) {
      inconsistencies.push({
        type: 'pricing_free_claim_mismatch',
        severity: 'warning',
        message: 'Event has paid ticket tiers, but description claims free entry.',
        suggestion: 'Clarify which ticket passes are paid vs complimentary.',
      });
    }
  }

  // 4. Date Mismatch: Start date month vs description month
  if (event.startDate) {
    const start = new Date(event.startDate);
    const monthNames = [
      'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december',
    ];
    const actualMonth = monthNames[start.getMonth()];

    // Find any conflicting months mentioned with year or day
    monthNames.forEach((m, idx) => {
      if (idx !== start.getMonth() && Math.abs(idx - start.getMonth()) > 1) {
        const pattern = new RegExp(`\\b(?:in|on|this)\\s+${m}\\b`, 'i');
        if (pattern.test(desc)) {
          inconsistencies.push({
            type: 'date_conflict',
            severity: 'info',
            message: `Event date is scheduled in ${actualMonth.toUpperCase()}, but text references "${m}".`,
            suggestion: `Verify date consistency between event settings and description copy.`,
          });
        }
      }
    });
  }

  // 5. Certificate Guarantee Mismatch
  const claimsCert = /verifiable (?:digital )?certificate|receive a certificate|certificate of participation/i.test(desc);
  const certSetting = event.settings?.certificatesIssued;
  if (claimsCert && certSetting === false) {
    inconsistencies.push({
      type: 'certificate_promise_mismatch',
      severity: 'info',
      message: 'Description promises digital certificates, but certificate issuance setting is currently off.',
      suggestion: 'Enable "Issue Certificates" in event settings when ready.',
    });
  }

  return inconsistencies;
}

module.exports = { analyzeConsistency };
