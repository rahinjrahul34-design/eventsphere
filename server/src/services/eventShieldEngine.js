/**
 * EventShield AI - Deterministic Rule & Risk Engine
 * Evaluates 15 core event safety and operational risk categories.
 * Computes deterministic Safety (0-100) & Readiness (0-100%) scores.
 */

const CATEGORY_WEIGHTS = {
  capacity: 0.15,
  emergency: 0.15,
  crowd: 0.10,
  medical: 0.10,
  security: 0.10,
  staffing: 0.10,
  accessibility: 0.10,
  weather: 0.08,
  venue: 0.07,
  schedule: 0.05,
};

const READINESS_WEIGHTS = {
  operational: 0.25,
  communication: 0.20,
  ticketing: 0.20,
  venue: 0.15,
  schedule: 0.10,
  registration: 0.10,
};

const DISCLAIMER_TEXT =
  'EventShield provides AI-assisted operational insights and planning recommendations. It does not replace qualified safety professionals, venue requirements, emergency services, or local laws and regulations.';

/**
 * Assess capacity risk
 */
function analyzeCapacity(event, ctx) {
  const capacity = Math.max(1, event.capacity || 100);
  const registrations = ctx.registrationsCount ?? (event.registrationCount || 0);
  const waitlist = ctx.waitlistCount ?? (event.waitlistCount || 0);
  const ratio = registrations / capacity;

  let score = 95;
  let riskLevel = 'low';
  let probability = 'low';
  let impact = 'medium';
  let priority = 'low';
  const issues = [];
  const recommendations = [];
  const evidence = [
    `${registrations} registered out of ${capacity} max capacity (${Math.round(ratio * 100)}%)`,
  ];
  if (waitlist > 0) evidence.push(`${waitlist} attendees currently on waitlist`);

  if (ratio > 1.1) {
    score = Math.max(15, Math.round(100 - (ratio - 1) * 200 - 45));
    riskLevel = 'critical';
    probability = 'high';
    impact = 'high';
    priority = 'critical';
    issues.push(`Severe overcapacity: Registrations exceed capacity by ${registrations - capacity} (${Math.round((ratio - 1) * 100)}% overflow).`);
    recommendations.push('Halt ticket sales immediately and implement capacity expansion or multi-batch scheduling.');
  } else if (ratio > 1.0) {
    score = 45;
    riskLevel = 'high';
    probability = 'high';
    impact = 'high';
    priority = 'high';
    issues.push(`Overcapacity detected: Total registrations (${registrations}) exceed venue capacity limit (${capacity}).`);
    recommendations.push('Cap registrations, enable waitlist queuing, or secure overflow venue access.');
  } else if (ratio >= 0.95) {
    score = 65;
    riskLevel = 'high';
    probability = 'high';
    impact = 'medium';
    priority = 'medium';
    issues.push(`Capacity nearing upper safety threshold (${Math.round(ratio * 100)}%).`);
    recommendations.push('Activate waitlist and prepare door access quota controls.');
  } else if (ratio >= 0.85) {
    score = 80;
    riskLevel = 'medium';
    probability = 'medium';
    impact = 'medium';
    priority = 'medium';
    issues.push(`High attendance density expected (${Math.round(ratio * 100)}% capacity).`);
    recommendations.push('Monitor ticket velocity and ensure entry staff are prepared.');
  } else {
    recommendations.push('Capacity is within safe operational thresholds.');
  }

  return {
    id: 'capacity',
    name: 'Capacity & Overcrowding',
    score: Math.min(100, Math.max(0, score)),
    riskLevel,
    confidence: 0.98,
    issues,
    recommendations,
    evidence,
    probability,
    impact,
    priority,
  };
}

/**
 * Assess crowd flow & entry bottlenecks
 */
function analyzeCrowd(event, ctx) {
  const registrations = ctx.registrationsCount ?? (event.registrationCount || 0);
  const gates = Math.max(1, ctx.entryGates ?? (event.safetyConfig?.entryGates || 2));
  const desks = Math.max(1, ctx.checkInDesks ?? (event.safetyConfig?.checkInDesks || 2));
  const isOnline = event.eventType === 'online';

  if (isOnline) {
    return {
      id: 'crowd',
      name: 'Crowd Flow & Dynamics',
      score: 98,
      riskLevel: 'low',
      confidence: 0.99,
      issues: [],
      recommendations: ['Virtual event: ensure CDN streaming capacity and room server limits are set.'],
      evidence: ['Online event format; physical ingress/egress risks not applicable.'],
      probability: 'low',
      impact: 'low',
      priority: 'low',
    };
  }

  const attendeesPerGate = Math.round(registrations / gates);
  const attendeesPerDesk = Math.round(registrations / desks);

  let score = 92;
  let riskLevel = 'low';
  let probability = 'low';
  let impact = 'low';
  let priority = 'low';
  const issues = [];
  const recommendations = [];
  const evidence = [
    `${gates} entry gates (${attendeesPerGate} attendees/gate)`,
    `${desks} check-in desks (${attendeesPerDesk} attendees/desk)`,
  ];

  if (attendeesPerGate > 500 || attendeesPerDesk > 350) {
    score = 35;
    riskLevel = 'critical';
    probability = 'high';
    impact = 'high';
    priority = 'critical';
    issues.push(`Severe ingress bottleneck risk: ${attendeesPerGate} attendees per gate (recommended <= 250).`);
    issues.push(`Check-in congestion risk: ${attendeesPerDesk} attendees per desk (recommended <= 125).`);
    recommendations.push(`Add at least ${Math.ceil(registrations / 250) - gates} additional entry gates.`);
    recommendations.push(`Add at least ${Math.ceil(registrations / 125) - desks} check-in desks or QR self-scan kiosks.`);
  } else if (attendeesPerGate > 300 || attendeesPerDesk > 180) {
    score = 65;
    riskLevel = 'medium';
    probability = 'medium';
    impact = 'medium';
    priority = 'medium';
    issues.push(`Moderate ingress queue delay anticipated at peak entry time.`);
    recommendations.push('Stagger attendee arrival windows or deploy express QR check-in lanes.');
  } else {
    recommendations.push('Entry gates and check-in desks meet standard flow throughput capacity.');
  }

  return {
    id: 'crowd',
    name: 'Crowd Flow & Dynamics',
    score: Math.min(100, Math.max(0, score)),
    riskLevel,
    confidence: 0.95,
    issues,
    recommendations,
    evidence,
    probability,
    impact,
    priority,
  };
}

/**
 * Assess volunteer and staff adequacy
 */
function analyzeStaffing(event, ctx) {
  const registrations = ctx.registrationsCount ?? (event.registrationCount || 0);
  const volunteerCount = ctx.volunteersCount ?? (ctx.volunteers?.length || 0);
  const configuredStaff = ctx.staffCount ?? (event.safetyConfig?.staffCount || 0);
  const effectiveStaff = Math.max(volunteerCount, configuredStaff);

  const isOnline = event.eventType === 'online';
  let score = 95;
  let riskLevel = 'low';
  let probability = 'low';
  let impact = 'low';
  let priority = 'low';
  const issues = [];
  const recommendations = [];
  const evidence = [
    `${effectiveStaff} active staff/volunteers assigned for ${registrations} registered attendees.`,
  ];

  if (registrations > 30 && effectiveStaff === 0) {
    score = isOnline ? 55 : 30;
    riskLevel = isOnline ? 'medium' : 'critical';
    probability = 'high';
    impact = 'high';
    priority = isOnline ? 'high' : 'critical';
    issues.push('Zero staff or volunteers assigned to oversee attendees.');
    recommendations.push(
      isOnline
        ? 'Assign online moderators to manage chat, Q&A, and technical issues.'
        : `Recruit and deploy at least ${Math.max(2, Math.ceil(registrations / 40))} on-site staff/volunteers.`
    );
  } else if (registrations > 0) {
    const ratio = effectiveStaff / registrations;
    if (ratio < 0.02 && registrations > 100) {
      score = 55;
      riskLevel = 'high';
      probability = 'high';
      impact = 'medium';
      priority = 'high';
      issues.push(`Low staff-to-attendee ratio: 1 staff per ${Math.round(1 / ratio)} attendees (recommended 1:30).`);
      recommendations.push(`Assign ${Math.ceil(registrations / 30) - effectiveStaff} more staff or volunteers.`);
    } else if (ratio < 0.035 && registrations > 50) {
      score = 75;
      riskLevel = 'medium';
      probability = 'medium';
      impact = 'medium';
      priority = 'medium';
      issues.push('Staffing is thin for unexpected rushes or logistical shifts.');
      recommendations.push('Designate backup floaters among available staff.');
    } else {
      recommendations.push('Staff-to-attendee staffing ratio meets operational safety benchmarks.');
    }
  }

  return {
    id: 'staffing',
    name: 'Staff & Volunteer Adequacy',
    score: Math.min(100, Math.max(0, score)),
    riskLevel,
    confidence: 0.92,
    issues,
    recommendations,
    evidence,
    probability,
    impact,
    priority,
  };
}

/**
 * Assess venue and facilities readiness
 */
function analyzeVenue(event, ctx) {
  const isOnline = event.eventType === 'online';
  if (isOnline) {
    const hasLink = Boolean(event.venue?.onlineUrl);
    return {
      id: 'venue',
      name: 'Venue & Facilities Readiness',
      score: hasLink ? 98 : 70,
      riskLevel: hasLink ? 'low' : 'medium',
      confidence: 0.95,
      issues: hasLink ? [] : ['Online streaming URL or meeting link has not been published.'],
      recommendations: hasLink
        ? ['Virtual meeting link is configured. Test audio/video permissions before start.']
        : ['Add the virtual stream URL to ensure attendees can connect smoothly.'],
      evidence: [hasLink ? 'Online URL verified.' : 'Online URL is blank.'],
      probability: hasLink ? 'low' : 'medium',
      impact: hasLink ? 'low' : 'medium',
      priority: hasLink ? 'low' : 'medium',
    };
  }

  const venue = event.venue || {};
  const hasName = Boolean(venue.name && venue.name.trim());
  const hasAddress = Boolean(venue.address && venue.address.trim());
  const hasCity = Boolean(venue.city && venue.city.trim());

  let score = 90;
  let riskLevel = 'low';
  let probability = 'low';
  let impact = 'low';
  let priority = 'low';
  const issues = [];
  const recommendations = [];
  const evidence = [];

  if (!hasName || !hasAddress) {
    score = 45;
    riskLevel = 'high';
    probability = 'high';
    impact = 'high';
    priority = 'high';
    issues.push('Venue physical address or hall name is incomplete or missing.');
    recommendations.push('Specify the exact venue name, physical street address, and city for emergency services.');
    evidence.push('Physical address details incomplete.');
  } else {
    evidence.push(`Venue: ${venue.name}, ${venue.city || venue.address}`);
    recommendations.push('Confirm venue layout, power drops, and room signage prior to load-in.');
  }

  return {
    id: 'venue',
    name: 'Venue & Facilities Readiness',
    score: Math.min(100, Math.max(0, score)),
    riskLevel,
    confidence: 0.94,
    issues,
    recommendations,
    evidence,
    probability,
    impact,
    priority,
  };
}

/**
 * Assess schedule conflicts & program alignment
 */
function analyzeSchedule(event, ctx) {
  const sessions = ctx.sessions || [];
  const overlaps = [];
  const speakerDoubleBookings = [];

  for (let i = 0; i < sessions.length; i++) {
    const a = sessions[i];
    const startA = new Date(a.startTime).getTime();
    const endA = new Date(a.endTime).getTime();

    for (let j = i + 1; j < sessions.length; j++) {
      const b = sessions[j];
      const startB = new Date(b.startTime).getTime();
      const endB = new Date(b.endTime).getTime();

      const timeOverlaps = Math.max(startA, startB) < Math.min(endA, endB);
      if (timeOverlaps) {
        // Room conflict
        if (a.room && b.room && a.room.trim().toLowerCase() === b.room.trim().toLowerCase()) {
          overlaps.push({
            sessionA: a.title,
            sessionB: b.title,
            room: a.room,
            start: new Date(Math.max(startA, startB)).toISOString(),
          });
        }
        // Speaker double-booking
        if (a.speaker && b.speaker && String(a.speaker) === String(b.speaker)) {
          speakerDoubleBookings.push({
            sessionA: a.title,
            sessionB: b.title,
            speaker: String(a.speaker),
          });
        }
      }
    }
  }

  let score = 95;
  let riskLevel = 'low';
  let probability = 'low';
  let impact = 'low';
  let priority = 'low';
  const issues = [];
  const recommendations = [];
  const evidence = [`${sessions.length} total scheduled sessions evaluated.`];

  if (overlaps.length > 0 || speakerDoubleBookings.length > 0) {
    const totalConflicts = overlaps.length + speakerDoubleBookings.length;
    score = Math.max(25, 80 - totalConflicts * 20);
    riskLevel = totalConflicts > 1 ? 'high' : 'medium';
    probability = 'high';
    impact = 'high';
    priority = totalConflicts > 1 ? 'high' : 'medium';

    if (overlaps.length > 0) {
      issues.push(
        `${overlaps.length} room schedule overlap(s) detected: ${overlaps
          .map((o) => `"${o.sessionA}" and "${o.sessionB}" in ${o.room}`)
          .join('; ')}`
      );
      recommendations.push('Reassign conflicting sessions to different rooms or adjust time slots.');
    }
    if (speakerDoubleBookings.length > 0) {
      issues.push(
        `${speakerDoubleBookings.length} speaker double-booking conflict(s): ${speakerDoubleBookings
          .map((s) => `"${s.sessionA}" & "${s.sessionB}"`)
          .join('; ')}`
      );
      recommendations.push('Stagger overlapping sessions for shared speakers.');
    }
  } else if (sessions.length === 0) {
    score = 85;
    recommendations.push('No sessions created yet. Add detailed schedule agenda to clarify logistics.');
  } else {
    recommendations.push('Schedule timeline validated with zero room or speaker overlaps.');
  }

  return {
    id: 'schedule',
    name: 'Schedule & Program Conflicts',
    score: Math.min(100, Math.max(0, score)),
    riskLevel,
    confidence: 0.96,
    issues,
    recommendations,
    evidence,
    probability,
    impact,
    priority,
  };
}

/**
 * Assess registration & check-in velocity
 */
function analyzeRegistration(event, ctx) {
  const registrations = ctx.registrationsCount ?? (event.registrationCount || 0);
  const checkedIn = ctx.checkedInCount ?? (event.checkedInCount || 0);
  const capacity = Math.max(1, event.capacity || 100);

  let score = 92;
  let riskLevel = 'low';
  let probability = 'low';
  let impact = 'low';
  let priority = 'low';
  const issues = [];
  const recommendations = [];
  const evidence = [
    `${registrations} registered, ${checkedIn} checked in.`,
  ];

  if (event.status === 'live' && registrations > 0) {
    const checkInRate = checkedIn / registrations;
    if (checkInRate > 0.85) {
      evidence.push(`High live check-in saturation: ${Math.round(checkInRate * 100)}% present.`);
    }
  }

  if (registrations >= capacity && !event.settings?.allowWaitlist) {
    score = 75;
    riskLevel = 'medium';
    probability = 'medium';
    impact = 'low';
    priority = 'medium';
    issues.push('Event is full and waitlist is currently disabled.');
    recommendations.push('Enable waitlist to capture demand overflow for cancellations.');
  } else {
    recommendations.push('Registration flow and attendee tracking operating smoothly.');
  }

  return {
    id: 'registration',
    name: 'Registration & Check-in Velocity',
    score: Math.min(100, Math.max(0, score)),
    riskLevel,
    confidence: 0.94,
    issues,
    recommendations,
    evidence,
    probability,
    impact,
    priority,
  };
}

/**
 * Assess parking & transit capacity
 */
function analyzeParking(event, ctx) {
  if (event.eventType === 'online') {
    return {
      id: 'parking',
      name: 'Parking & Transit Capacity',
      score: 100,
      riskLevel: 'low',
      confidence: 1.0,
      issues: [],
      recommendations: ['Not applicable for online events.'],
      evidence: ['Virtual event format.'],
      probability: 'low',
      impact: 'low',
      priority: 'low',
    };
  }

  const registrations = ctx.registrationsCount ?? (event.registrationCount || 0);
  const parkingCapacity = ctx.parkingCapacity ?? (event.safetyConfig?.parkingCapacity || 0);
  const parkingInfo = ctx.parkingInfo ?? (event.safetyConfig?.parkingInfo || '');

  let score = 90;
  let riskLevel = 'low';
  let probability = 'low';
  let impact = 'low';
  let priority = 'low';
  const issues = [];
  const recommendations = [];
  const evidence = [];

  const estimatedVehicles = Math.round(registrations * 0.35);

  if (parkingCapacity === 0 && !parkingInfo.trim() && registrations > 50) {
    score = 55;
    riskLevel = 'medium';
    probability = 'medium';
    impact = 'medium';
    priority = 'medium';
    issues.push('No parking capacity or transit guidance specified for an in-person event.');
    recommendations.push('Provide designated parking lot capacity or public transit directions in event info.');
    evidence.push(`Estimated ${estimatedVehicles} vehicles expected with no parking instructions.`);
  } else if (parkingCapacity > 0 && parkingCapacity < estimatedVehicles) {
    score = 65;
    riskLevel = 'medium';
    probability = 'medium';
    impact = 'medium';
    priority = 'medium';
    issues.push(`Designated parking (${parkingCapacity} bays) may fall short of estimated ${estimatedVehicles} vehicles.`);
    recommendations.push('Arrange auxiliary overflow parking or partner with nearby transit lots.');
    evidence.push(`${parkingCapacity} parking bays vs estimated ${estimatedVehicles} vehicles.`);
  } else {
    evidence.push(
      parkingCapacity > 0
        ? `${parkingCapacity} parking spots configured.`
        : 'Transit / parking instructions provided.'
    );
    recommendations.push('Parking and transit logistics are adequately addressed.');
  }

  return {
    id: 'parking',
    name: 'Parking & Transit Capacity',
    score: Math.min(100, Math.max(0, score)),
    riskLevel,
    confidence: 0.91,
    issues,
    recommendations,
    evidence,
    probability,
    impact,
    priority,
  };
}

/**
 * Assess emergency and evacuation preparedness
 */
function analyzeEmergency(event, ctx) {
  const safetyConfig = event.safetyConfig || {};
  const emergencyContact = ctx.emergencyContact ?? safetyConfig.emergencyContact ?? {};
  const evacuation = ctx.evacuationInstructions ?? safetyConfig.evacuationInstructions ?? '';
  const isOnline = event.eventType === 'online';

  if (isOnline) {
    const hasContact = Boolean(emergencyContact.phone || emergencyContact.email);
    return {
      id: 'emergency',
      name: 'Emergency & Incident Protocols',
      score: hasContact ? 95 : 80,
      riskLevel: 'low',
      confidence: 0.95,
      issues: hasContact ? [] : ['No emergency technical escalation contact defined.'],
      recommendations: ['Maintain an on-call technical point of contact for stream outages.'],
      evidence: ['Virtual event incident protocol.'],
      probability: 'low',
      impact: 'low',
      priority: 'low',
    };
  }

  const hasContact = Boolean(emergencyContact.phone && emergencyContact.phone.trim());
  const hasEvacuation = Boolean(evacuation && evacuation.trim().length > 15);

  let score = 95;
  let riskLevel = 'low';
  let probability = 'low';
  let impact = 'high';
  let priority = 'low';
  const issues = [];
  const recommendations = [];
  const evidence = [];

  if (!hasContact && !hasEvacuation) {
    score = 30;
    riskLevel = 'critical';
    probability = 'high';
    impact = 'high';
    priority = 'critical';
    issues.push('Critical safety gap: Missing emergency contact phone number and written evacuation instructions.');
    recommendations.push('Designate a 24/7 on-site emergency coordinator phone and upload clear evacuation procedures.');
    evidence.push('No emergency contact phone or evacuation plan found.');
  } else if (!hasContact) {
    score = 45;
    riskLevel = 'high';
    probability = 'medium';
    impact = 'high';
    priority = 'high';
    issues.push('No on-site emergency coordinator contact phone specified.');
    recommendations.push('Enter direct emergency phone number for first responders and organizers.');
    evidence.push('Emergency contact phone missing.');
  } else if (!hasEvacuation) {
    score = 70;
    riskLevel = 'medium';
    probability = 'low';
    impact = 'high';
    priority = 'medium';
    issues.push('No written evacuation instructions or assembly point documentation provided.');
    recommendations.push('Document building egress routes and primary outdoor assembly point.');
    evidence.push('Evacuation instructions empty.');
  } else {
    evidence.push(`Emergency Lead: ${emergencyContact.name || 'Assigned'} (${emergencyContact.phone})`);
    evidence.push('Evacuation procedures on file.');
    recommendations.push('Emergency protocols are complete. Ensure contacts are posted at check-in desks.');
  }

  return {
    id: 'emergency',
    name: 'Emergency & Incident Protocols',
    score: Math.min(100, Math.max(0, score)),
    riskLevel,
    confidence: 0.98,
    issues,
    recommendations,
    evidence,
    probability,
    impact,
    priority,
  };
}

/**
 * Assess security and access control protocols
 */
function analyzeSecurity(event, ctx) {
  const isOnline = event.eventType === 'online';
  const registrations = ctx.registrationsCount ?? (event.registrationCount || 0);

  let score = 90;
  let riskLevel = 'low';
  let probability = 'low';
  let impact = 'medium';
  let priority = 'low';
  const issues = [];
  const recommendations = [];
  const evidence = [];

  if (isOnline) {
    recommendations.push('Enforce authenticated ticket links to prevent unauthorized meeting access (Zoom bombing).');
    evidence.push('Digital access control via EventSphere ticket pass.');
    return {
      id: 'security',
      name: 'Security & Access Control',
      score: 95,
      riskLevel: 'low',
      confidence: 0.95,
      issues: [],
      recommendations,
      evidence,
      probability: 'low',
      impact: 'low',
      priority: 'low',
    };
  }

  const volunteers = ctx.volunteers || [];
  const hasSecurityVolunteer = volunteers.some((v) => v.role === 'Security');

  if (registrations > 250 && !hasSecurityVolunteer) {
    score = 60;
    riskLevel = 'medium';
    probability = 'medium';
    impact = 'medium';
    priority = 'medium';
    issues.push('No dedicated security personnel or volunteers assigned for a gathering over 250 attendees.');
    recommendations.push('Assign security personnel to main entrance and stage perimeter.');
    evidence.push(`Gathering size: ${registrations} attendees without dedicated security.`);
  } else {
    evidence.push('Entry QR verification active on EventSphere platform.');
    recommendations.push('Maintain strict QR scanning at all entrance gates to prevent unauthorized entry.');
  }

  return {
    id: 'security',
    name: 'Security & Access Control',
    score: Math.min(100, Math.max(0, score)),
    riskLevel,
    confidence: 0.92,
    issues,
    recommendations,
    evidence,
    probability,
    impact,
    priority,
  };
}

/**
 * Assess accessibility & inclusivity (ADA compliance)
 */
function analyzeAccessibility(event, ctx) {
  const isOnline = event.eventType === 'online';
  if (isOnline) {
    return {
      id: 'accessibility',
      name: 'Accessibility & Inclusivity',
      score: 92,
      riskLevel: 'low',
      confidence: 0.9,
      issues: [],
      recommendations: ['Enable live closed captioning and provide transcripts for recorded sessions.'],
      evidence: ['Virtual format accessibility.'],
      probability: 'low',
      impact: 'low',
      priority: 'low',
    };
  }

  const info = ctx.accessibilityInfo ?? event.safetyConfig?.accessibilityInfo ?? {};
  const hasRamp = Boolean(info.hasRampAccess);
  const hasSeating = Boolean(info.hasWheelchairSeating);
  const hasContact = Boolean(info.accessibilityContact && info.accessibilityContact.trim());

  let score = 95;
  let riskLevel = 'low';
  let probability = 'low';
  let impact = 'medium';
  let priority = 'low';
  const issues = [];
  const recommendations = [];
  const evidence = [];

  if (!hasRamp && !hasSeating && !hasContact) {
    score = 45;
    riskLevel = 'high';
    probability = 'high';
    impact = 'medium';
    priority = 'high';
    issues.push('No wheelchair ramps, accessible seating, or accessibility liaison designated.');
    recommendations.push('Audit venue for wheelchair ramps, reserve accessible seating, and designate an accessibility contact.');
    evidence.push('Accessibility provisions unconfigured.');
  } else if (!hasRamp || !hasSeating) {
    score = 70;
    riskLevel = 'medium';
    probability = 'medium';
    impact = 'medium';
    priority = 'medium';
    issues.push('Partial accessibility: Wheelchair ramp or reserved seating missing.');
    recommendations.push('Complete physical accessibility setup for wheelchair users.');
    evidence.push(`Ramp: ${hasRamp ? 'Yes' : 'No'}, Accessible Seating: ${hasSeating ? 'Yes' : 'No'}`);
  } else {
    evidence.push('Wheelchair ramp access and dedicated seating verified.');
    recommendations.push('Keep accessibility pathways clear of cables and clutter.');
  }

  return {
    id: 'accessibility',
    name: 'Accessibility & Inclusivity',
    score: Math.min(100, Math.max(0, score)),
    riskLevel,
    confidence: 0.94,
    issues,
    recommendations,
    evidence,
    probability,
    impact,
    priority,
  };
}

/**
 * Assess weather & environmental impact
 */
function analyzeWeather(event, ctx) {
  const isOnline = event.eventType === 'online';
  if (isOnline) {
    return {
      id: 'weather',
      name: 'Weather & Environmental Impact',
      score: 100,
      riskLevel: 'low',
      confidence: 1.0,
      issues: [],
      recommendations: ['Weather has no impact on virtual events.'],
      evidence: ['Online event format.'],
      probability: 'low',
      impact: 'low',
      priority: 'low',
    };
  }

  const isOutdoor = ctx.isOutdoor ?? event.safetyConfig?.isOutdoor ?? false;

  if (!isOutdoor) {
    return {
      id: 'weather',
      name: 'Weather & Environmental Impact',
      score: 95,
      riskLevel: 'low',
      confidence: 0.95,
      issues: [],
      recommendations: ['Indoor venue protected from precipitation and extreme temperature.'],
      evidence: ['Indoor venue configuration.'],
      probability: 'low',
      impact: 'low',
      priority: 'low',
    };
  }

  let score = 55;
  let riskLevel = 'medium';
  let probability = 'medium';
  let impact = 'high';
  let priority = 'medium';
  const issues = [
    'Outdoor event setup is vulnerable to precipitation, high winds, or extreme temperatures.',
  ];
  const recommendations = [
    'Prepare rain tarps/tents, secure stage canopy rigging, and designate indoor backup space.',
    'Weather telemetry: Simulated fallback active (monitor local meteorological alerts 24h prior).',
  ];
  const evidence = [
    'Outdoor event flag enabled. Weather contingency plan required.',
  ];

  return {
    id: 'weather',
    name: 'Weather & Environmental Impact',
    score: Math.min(100, Math.max(0, score)),
    riskLevel,
    confidence: 0.9,
    issues,
    recommendations,
    evidence,
    probability,
    impact,
    priority,
  };
}

/**
 * Assess operational readiness & timeline logistics
 */
function analyzeOperational(event, ctx) {
  const now = Date.now();
  const start = new Date(event.startDate).getTime();
  const daysUntil = (start - now) / (1000 * 60 * 60 * 24);

  let score = 90;
  let riskLevel = 'low';
  let probability = 'low';
  let impact = 'low';
  let priority = 'low';
  const issues = [];
  const recommendations = [];
  const evidence = [];

  if (daysUntil < 0 && event.status !== 'completed') {
    evidence.push('Event currently active or past scheduled start.');
  } else {
    evidence.push(`${Math.max(0, Math.round(daysUntil))} days until scheduled event start.`);
  }

  if (event.status === 'draft' && daysUntil <= 7 && daysUntil > 0) {
    score = 55;
    riskLevel = 'high';
    probability = 'high';
    impact = 'high';
    priority = 'high';
    issues.push('Event starts in less than 7 days but remains in unpublished Draft status.');
    recommendations.push('Review event details and publish to launch attendee onboarding.');
  } else if (daysUntil <= 2 && daysUntil >= 0) {
    score = 80;
    recommendations.push('Conduct final AV, badge printing, and volunteer walkthrough 24h prior.');
  } else {
    recommendations.push('Operational milestone timeline aligns with standard launch cycle.');
  }

  return {
    id: 'operational',
    name: 'Operational & Milestone Logistics',
    score: Math.min(100, Math.max(0, score)),
    riskLevel,
    confidence: 0.93,
    issues,
    recommendations,
    evidence,
    probability,
    impact,
    priority,
  };
}

/**
 * Assess attendee & stakeholder communication
 */
function analyzeCommunication(event, ctx) {
  const faq = event.faq || [];
  const hasEmergencyInFaq = faq.some((f) => /emergency|help|contact|lost|safety/i.test(f.q + ' ' + f.a));

  let score = 92;
  let riskLevel = 'low';
  let probability = 'low';
  let impact = 'low';
  let priority = 'low';
  const issues = [];
  const recommendations = [];
  const evidence = [`${faq.length} FAQ questions published.`];

  if (faq.length === 0) {
    score = 68;
    riskLevel = 'medium';
    probability = 'medium';
    impact = 'medium';
    priority = 'medium';
    issues.push('No attendee FAQs published. Attendees lack clear guidance on arrival and policy.');
    recommendations.push('Publish at least 3-5 FAQs covering arrival time, ID requirements, and venue entry.');
  } else if (!hasEmergencyInFaq && event.eventType !== 'online') {
    score = 82;
    recommendations.push('Add a safety FAQ addressing help desk and first aid location for attendees.');
  } else {
    recommendations.push('Attendee communication channels and FAQs are well established.');
  }

  return {
    id: 'communication',
    name: 'Attendee & Stakeholder Communication',
    score: Math.min(100, Math.max(0, score)),
    riskLevel,
    confidence: 0.95,
    issues,
    recommendations,
    evidence,
    probability,
    impact,
    priority,
  };
}

/**
 * Assess ticketing & registration quota alignment
 */
function analyzeTicketing(event, ctx) {
  const ticketTypes = event.ticketTypes || [];
  const capacity = Math.max(1, event.capacity || 100);

  let score = 95;
  let riskLevel = 'low';
  let probability = 'low';
  let impact = 'low';
  let priority = 'low';
  const issues = [];
  const recommendations = [];
  const evidence = [`${ticketTypes.length} ticket tiers configured.`];

  if (event.price > 0 && ticketTypes.length === 0) {
    score = 45;
    riskLevel = 'high';
    probability = 'high';
    impact = 'high';
    priority = 'high';
    issues.push('Paid event has no ticket types defined.');
    recommendations.push('Configure at least one ticket tier with price and quantity limits.');
  } else if (ticketTypes.length > 0) {
    const totalTicketAllocation = ticketTypes.reduce((sum, t) => sum + (t.quantity || 0), 0);
    const hasUnlimited = ticketTypes.some((t) => !t.quantity || t.quantity === 0);

    if (!hasUnlimited && totalTicketAllocation > capacity * 1.15) {
      score = 65;
      riskLevel = 'medium';
      probability = 'medium';
      impact = 'medium';
      priority = 'medium';
      issues.push(`Total ticket allocation (${totalTicketAllocation}) significantly exceeds venue capacity (${capacity}).`);
      recommendations.push('Recalibrate ticket quotas so combined tiers do not exceed room capacity.');
      evidence.push(`Allocated ${totalTicketAllocation} tickets vs ${capacity} capacity.`);
    } else {
      recommendations.push('Ticket quotas and pricing tiers align with venue capacity.');
    }
  }

  return {
    id: 'ticketing',
    name: 'Ticketing & Payment Setup',
    score: Math.min(100, Math.max(0, score)),
    riskLevel,
    confidence: 0.95,
    issues,
    recommendations,
    evidence,
    probability,
    impact,
    priority,
  };
}

/**
 * Assess medical & first-aid preparedness
 */
function analyzeMedical(event, ctx) {
  const isOnline = event.eventType === 'online';
  if (isOnline) {
    return {
      id: 'medical',
      name: 'Medical & First-Aid Preparedness',
      score: 100,
      riskLevel: 'low',
      confidence: 1.0,
      issues: [],
      recommendations: ['Medical protocols not required for virtual events.'],
      evidence: ['Online event format.'],
      probability: 'low',
      impact: 'low',
      priority: 'low',
    };
  }

  const registrations = ctx.registrationsCount ?? (event.registrationCount || 0);
  const safetyConfig = event.safetyConfig || {};
  const firstAid = ctx.firstAidStation ?? safetyConfig.firstAidStation ?? {};
  const hasFirstAid = Boolean(firstAid.location && firstAid.location.trim());

  let score = 95;
  let riskLevel = 'low';
  let probability = 'low';
  let impact = 'high';
  let priority = 'low';
  const issues = [];
  const recommendations = [];
  const evidence = [];

  if (!hasFirstAid && registrations > 150) {
    score = 40;
    riskLevel = 'high';
    probability = 'medium';
    impact = 'high';
    priority = 'high';
    issues.push(`No first-aid station or medical response team assigned for a gathering of ${registrations} people.`);
    recommendations.push('Designate a marked first-aid booth with basic medical supplies and trained first responder.');
    evidence.push('First aid station location not defined.');
  } else if (!hasFirstAid) {
    score = 65;
    riskLevel = 'medium';
    probability = 'low';
    impact = 'high';
    priority = 'medium';
    issues.push('First-aid kit / medical desk location not specified in safety settings.');
    recommendations.push('Specify location of first aid kit at registration or organizer desk.');
    evidence.push('First aid info missing.');
  } else {
    evidence.push(`First Aid Station: ${firstAid.location}`);
    recommendations.push('First-aid coverage verified with designated station.');
  }

  return {
    id: 'medical',
    name: 'Medical & First-Aid Preparedness',
    score: Math.min(100, Math.max(0, score)),
    riskLevel,
    confidence: 0.96,
    issues,
    recommendations,
    evidence,
    probability,
    impact,
    priority,
  };
}

/**
 * Generate 3x3 Risk Matrix items
 */
function buildRiskMatrix(categories) {
  const matrix = [];
  for (const cat of categories) {
    if (cat.issues.length > 0) {
      matrix.push({
        risk: cat.issues[0],
        probability: cat.probability,
        impact: cat.impact,
        priority: cat.priority,
        action: cat.recommendations[0] || 'Monitor category closely.',
      });
    }
  }

  // If no issues at all, add a positive baseline item
  if (matrix.length === 0) {
    matrix.push({
      risk: 'Standard operational routine',
      probability: 'low',
      impact: 'low',
      priority: 'low',
      action: 'Maintain existing safety protocols and volunteer brief.',
    });
  }

  return matrix;
}

/**
 * Generate Top Risks list
 */
function buildTopRisks(categories) {
  const ranked = [];
  const severityWeight = { critical: 4, high: 3, medium: 2, low: 1 };

  for (const cat of categories) {
    if (cat.issues.length > 0) {
      ranked.push({
        title: cat.issues[0],
        category: cat.name,
        severity: cat.riskLevel,
        reason: cat.issues.slice(1).join(' ') || cat.issues[0],
        evidence: cat.evidence.join('; '),
        recommendation: cat.recommendations[0] || '',
        weight: severityWeight[cat.riskLevel] * 100 + (100 - cat.score),
      });
    }
  }

  ranked.sort((a, b) => b.weight - a.weight);
  return ranked.slice(0, 5).map(({ title, category, severity, reason, evidence, recommendation }) => ({
    title,
    category,
    severity,
    reason,
    evidence,
    recommendation,
  }));
}

/**
 * Build dynamic safety checklist items
 */
function buildSafetyChecklist(categories, existingChecklist = []) {
  const existingMap = new Map();
  for (const item of existingChecklist) {
    existingMap.set(item.id, item);
  }

  const items = [];

  const addChecklist = (id, title, category, priority) => {
    const existing = existingMap.get(id);
    items.push({
      id,
      title,
      category,
      priority,
      status: existing ? existing.status : 'pending',
      completedAt: existing ? existing.completedAt : null,
      completedBy: existing ? existing.completedBy : null,
    });
  };

  for (const cat of categories) {
    if (cat.id === 'emergency') {
      addChecklist('chk_emergency_lead', 'Designate and verify 24/7 on-site emergency phone contact', 'Emergency', 'high');
      addChecklist('chk_evac_plan', 'Post clear emergency evacuation procedures and assembly signage', 'Emergency', 'high');
    } else if (cat.id === 'medical') {
      addChecklist('chk_first_aid_kit', 'Set up marked First-Aid station with certified responders', 'Medical', 'high');
    } else if (cat.id === 'capacity' && cat.score < 80) {
      addChecklist('chk_capacity_gate', 'Enforce registration caps and prepare overflow queue management', 'Capacity', 'high');
    } else if (cat.id === 'crowd') {
      addChecklist('chk_entry_desks', 'Test QR check-in scanners and balance entrance gate lanes', 'Crowd', 'medium');
    } else if (cat.id === 'accessibility') {
      addChecklist('chk_accessibility_ramp', 'Inspect wheelchair ramps, step-free paths, and reserved seating', 'Accessibility', 'medium');
    } else if (cat.id === 'weather' && cat.score < 80) {
      addChecklist('chk_weather_tarps', 'Secure outdoor rain canopies, stage ties, and indoor contingency space', 'Weather', 'high');
    } else if (cat.id === 'schedule' && cat.score < 85) {
      addChecklist('chk_resolve_overlaps', 'Resolve overlapping room schedules and speaker double-bookings', 'Schedule', 'high');
    } else if (cat.id === 'staffing') {
      addChecklist('chk_volunteer_briefing', 'Conduct volunteer safety briefing and emergency assignment walk-through', 'Staffing', 'medium');
    }
  }

  // Standard universal safety checklist items
  addChecklist('chk_av_rehearsal', 'Conduct AV, microphone, and emergency broadcast rehearsal', 'Operations', 'low');
  addChecklist('chk_announcement_pin', 'Prepare welcome & emergency announcement templates', 'Communication', 'low');

  return items;
}

/**
 * Composite deterministic risk calculation
 */
function evaluateEventRisk(event, context = {}, existingAssessment = null) {
  const ctx = {
    registrationsCount: context.registrationsCount ?? event.registrationCount ?? 0,
    checkedInCount: context.checkedInCount ?? event.checkedInCount ?? 0,
    waitlistCount: context.waitlistCount ?? event.waitlistCount ?? 0,
    volunteersCount: context.volunteersCount ?? context.volunteers?.length ?? 0,
    volunteers: context.volunteers || [],
    sessions: context.sessions || [],
    entryGates: context.entryGates ?? event.safetyConfig?.entryGates ?? 2,
    checkInDesks: context.checkInDesks ?? event.safetyConfig?.checkInDesks ?? 2,
    staffCount: context.staffCount ?? event.safetyConfig?.staffCount ?? 0,
    parkingCapacity: context.parkingCapacity ?? event.safetyConfig?.parkingCapacity ?? 0,
    parkingInfo: context.parkingInfo ?? event.safetyConfig?.parkingInfo ?? '',
    emergencyContact: context.emergencyContact ?? event.safetyConfig?.emergencyContact ?? {},
    evacuationInstructions: context.evacuationInstructions ?? event.safetyConfig?.evacuationInstructions ?? '',
    firstAidStation: context.firstAidStation ?? event.safetyConfig?.firstAidStation ?? {},
    accessibilityInfo: context.accessibilityInfo ?? event.safetyConfig?.accessibilityInfo ?? {},
    isOutdoor: context.isOutdoor ?? event.safetyConfig?.isOutdoor ?? false,
  };

  const categories = [
    analyzeCapacity(event, ctx),
    analyzeCrowd(event, ctx),
    analyzeStaffing(event, ctx),
    analyzeVenue(event, ctx),
    analyzeSchedule(event, ctx),
    analyzeRegistration(event, ctx),
    analyzeParking(event, ctx),
    analyzeEmergency(event, ctx),
    analyzeSecurity(event, ctx),
    analyzeAccessibility(event, ctx),
    analyzeWeather(event, ctx),
    analyzeOperational(event, ctx),
    analyzeCommunication(event, ctx),
    analyzeTicketing(event, ctx),
    analyzeMedical(event, ctx),
  ];

  // Calculate Weighted Safety Score (0-100)
  let safetyScoreSum = 0;
  let safetyWeightSum = 0;
  for (const cat of categories) {
    const w = CATEGORY_WEIGHTS[cat.id];
    if (w) {
      safetyScoreSum += cat.score * w;
      safetyWeightSum += w;
    }
  }
  const safetyScore = Math.min(100, Math.max(0, Math.round(safetyScoreSum / (safetyWeightSum || 1))));

  // Calculate Weighted Operational Readiness Score (0-100%)
  let readinessScoreSum = 0;
  let readinessWeightSum = 0;
  for (const cat of categories) {
    const w = READINESS_WEIGHTS[cat.id];
    if (w) {
      readinessScoreSum += cat.score * w;
      readinessWeightSum += w;
    }
  }
  const readinessScore = Math.min(100, Math.max(0, Math.round(readinessScoreSum / (readinessWeightSum || 1))));

  // Overall risk level determination
  let overallRiskLevel = 'low';
  if (safetyScore < 50) {
    overallRiskLevel = 'critical';
  } else if (safetyScore < 70) {
    overallRiskLevel = 'high';
  } else if (safetyScore < 85) {
    overallRiskLevel = 'medium';
  } else {
    overallRiskLevel = 'low';
  }

  const matrix = buildRiskMatrix(categories);
  const topRisks = buildTopRisks(categories);
  const checklist = buildSafetyChecklist(
    categories,
    existingAssessment?.checklist || []
  );

  const metricsSnapshot = {
    capacity: event.capacity,
    registrations: ctx.registrationsCount,
    checkedIn: ctx.checkedInCount,
    waitlist: ctx.waitlistCount,
    effectiveStaff: Math.max(ctx.volunteersCount, ctx.staffCount),
    entryGates: ctx.entryGates,
    checkInDesks: ctx.checkInDesks,
    isOutdoor: ctx.isOutdoor,
    hasEmergencyPhone: Boolean(ctx.emergencyContact?.phone),
    hasFirstAid: Boolean(ctx.firstAidStation?.location),
    hasRamp: Boolean(ctx.accessibilityInfo?.hasRampAccess),
  };

  return {
    safetyScore,
    readinessScore,
    overallRiskLevel,
    categories,
    matrix,
    topRisks,
    checklist,
    metricsSnapshot,
    disclaimer: DISCLAIMER_TEXT,
  };
}

/**
 * Fast What-If Simulator (Pure in-memory, no DB write, no LLM calls)
 */
function simulateEventRisk(event, params = {}) {
  // Compute baseline
  const baseline = evaluateEventRisk(event);

  // Compute simulated context
  const simulatedContext = {
    registrationsCount: params.registrations !== undefined ? Number(params.registrations) : event.registrationCount,
    entryGates: params.entryGates !== undefined ? Number(params.entryGates) : event.safetyConfig?.entryGates,
    checkInDesks: params.checkInDesks !== undefined ? Number(params.checkInDesks) : event.safetyConfig?.checkInDesks,
    staffCount: params.staffCount !== undefined ? Number(params.staffCount) : event.safetyConfig?.staffCount,
    parkingCapacity: params.parkingCapacity !== undefined ? Number(params.parkingCapacity) : event.safetyConfig?.parkingCapacity,
    isOutdoor: params.isOutdoor !== undefined ? Boolean(params.isOutdoor) : event.safetyConfig?.isOutdoor,
    emergencyContact: {
      phone: params.hasEmergencyContact !== undefined
        ? (params.hasEmergencyContact ? '911-555-0199' : '')
        : event.safetyConfig?.emergencyContact?.phone,
    },
    firstAidStation: {
      location: params.hasFirstAid !== undefined
        ? (params.hasFirstAid ? 'Main Gate Medical Booth' : '')
        : event.safetyConfig?.firstAidStation?.location,
    },
    accessibilityInfo: {
      hasRampAccess: params.hasAccessibility !== undefined
        ? Boolean(params.hasAccessibility)
        : event.safetyConfig?.accessibilityInfo?.hasRampAccess,
      hasWheelchairSeating: params.hasAccessibility !== undefined
        ? Boolean(params.hasAccessibility)
        : event.safetyConfig?.accessibilityInfo?.hasWheelchairSeating,
    },
  };

  const simulatedEvent = {
    ...event.toObject ? event.toObject() : event,
    capacity: params.capacity !== undefined ? Number(params.capacity) : event.capacity,
  };

  const simulated = evaluateEventRisk(simulatedEvent, simulatedContext);

  const deltaSafety = simulated.safetyScore - baseline.safetyScore;
  const deltaReadiness = simulated.readinessScore - baseline.readinessScore;

  // Track category score differences
  const categoryDeltas = simulated.categories.map((simCat) => {
    const baseCat = baseline.categories.find((c) => c.id === simCat.id) || { score: simCat.score };
    const diff = simCat.score - baseCat.score;
    return {
      id: simCat.id,
      name: simCat.name,
      baselineScore: baseCat.score,
      simulatedScore: simCat.score,
      delta: diff,
      explanation: diff > 0
        ? `Score improved by +${diff} points due to enhanced risk mitigations.`
        : diff < 0
        ? `Score dropped by ${diff} points due to heightened operational strain.`
        : 'Score remained constant.',
    };
  });

  const recommendations = [];
  if (deltaSafety > 0) {
    recommendations.push(`These adjustments increase overall event safety by +${deltaSafety} points.`);
  } else if (deltaSafety < 0) {
    recommendations.push(`Simulated changes reduce safety score by ${Math.abs(deltaSafety)} points. Check capacity and staffing.`);
  }

  if (simulated.overallRiskLevel === 'low' && baseline.overallRiskLevel !== 'low') {
    recommendations.push('Proposed mitigations successfully lower overall event risk to LOW.');
  }

  return {
    baselineSafetyScore: baseline.safetyScore,
    simulatedSafetyScore: simulated.safetyScore,
    baselineReadinessScore: baseline.readinessScore,
    simulatedReadinessScore: simulated.readinessScore,
    simulatedRiskLevel: simulated.overallRiskLevel,
    deltaSafety,
    deltaReadiness,
    categoryDeltas,
    recommendations,
    disclaimer: DISCLAIMER_TEXT,
  };
}

module.exports = {
  DISCLAIMER_TEXT,
  CATEGORY_WEIGHTS,
  READINESS_WEIGHTS,
  analyzeCapacity,
  analyzeCrowd,
  analyzeStaffing,
  analyzeVenue,
  analyzeSchedule,
  analyzeRegistration,
  analyzeParking,
  analyzeEmergency,
  analyzeSecurity,
  analyzeAccessibility,
  analyzeWeather,
  analyzeOperational,
  analyzeCommunication,
  analyzeTicketing,
  analyzeMedical,
  evaluateEventRisk,
  simulateEventRisk,
};
