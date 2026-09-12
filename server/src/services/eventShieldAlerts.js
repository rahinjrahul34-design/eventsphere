/**
 * EventShield AI - Realtime Alerts & Monitoring Service
 * Analyzes event metrics for safety threshold violations,
 * creates/resolves alerts, and broadcasts via Socket.IO.
 */

const EventRiskAlert = require('../models/EventRiskAlert');
const { emitToEvent, emitToUser } = require('../sockets');

/**
 * Evaluate conditions and sync active alerts for an event
 */
async function checkAndSyncAlerts(event, assessment, context = {}) {
  const eventId = event._id;
  const newAlerts = [];

  const registrations = context.registrationsCount ?? (event.registrationCount || 0);
  const capacity = Math.max(1, event.capacity || 100);
  const isOnline = event.eventType === 'online';
  const effectiveStaff = Math.max(
    context.volunteersCount ?? (context.volunteers?.length || 0),
    context.staffCount ?? (event.safetyConfig?.staffCount || 0)
  );
  const emergencyPhone = context.emergencyContact?.phone ?? event.safetyConfig?.emergencyContact?.phone;
  const isOutdoor = context.isOutdoor ?? event.safetyConfig?.isOutdoor ?? false;

  // 1. Capacity overflow (>100%)
  const isOvercapacity = registrations > capacity;
  const isNearCapacity = !isOvercapacity && registrations >= capacity * 0.95;

  await handleCondition({
    eventId,
    type: 'capacity_overflow',
    isActive: isOvercapacity,
    severity: 'critical',
    message: `Event registrations (${registrations}) exceed venue capacity (${capacity}) by ${registrations - capacity}.`,
    metricValue: registrations,
    threshold: capacity,
    actionRequired: 'Halt ticket sales or expand venue hall allocation.',
    newAlerts,
    organizerId: event.organizer,
  });

  await handleCondition({
    eventId,
    type: 'capacity_warning',
    isActive: isNearCapacity,
    severity: 'high',
    message: `Event capacity reaches ${Math.round((registrations / capacity) * 100)}% (${registrations}/${capacity}).`,
    metricValue: registrations,
    threshold: Math.round(capacity * 0.95),
    actionRequired: 'Enable waitlist and monitor remaining seat inventory.',
    newAlerts,
    organizerId: event.organizer,
  });

  // 2. Staffing shortage
  const isStaffShortage = !isOnline && registrations > 30 && effectiveStaff === 0;
  await handleCondition({
    eventId,
    type: 'staff_shortage',
    isActive: isStaffShortage,
    severity: 'critical',
    message: 'Zero volunteers or staff assigned for an in-person gathering.',
    metricValue: effectiveStaff,
    threshold: 2,
    actionRequired: 'Assign staff or volunteers to check-in desks and entrances.',
    newAlerts,
    organizerId: event.organizer,
  });

  // 3. Emergency protocol gap
  const isEmergencyGap = !isOnline && (!emergencyPhone || !emergencyPhone.trim());
  await handleCondition({
    eventId,
    type: 'emergency_gap',
    isActive: isEmergencyGap,
    severity: 'high',
    message: 'No on-site emergency phone contact configured.',
    metricValue: 'none',
    threshold: 'valid_phone',
    actionRequired: 'Specify emergency coordinator contact in Safety Settings.',
    newAlerts,
    organizerId: event.organizer,
  });

  // 4. Schedule conflicts
  const scheduleCat = assessment?.categories?.find((c) => c.id === 'schedule');
  const hasScheduleConflicts = (scheduleCat?.score || 100) < 80;
  await handleCondition({
    eventId,
    type: 'schedule_conflict',
    isActive: hasScheduleConflicts,
    severity: 'high',
    message: scheduleCat?.issues?.[0] || 'Room or speaker overlaps detected in agenda.',
    metricValue: scheduleCat?.issues?.length || 0,
    threshold: 0,
    actionRequired: 'Adjust overlapping session rooms or speaker timelines.',
    newAlerts,
    organizerId: event.organizer,
  });

  // 5. Outdoor weather exposure
  await handleCondition({
    eventId,
    type: 'weather_warning',
    isActive: isOutdoor,
    severity: 'medium',
    message: 'Outdoor venue vulnerable to adverse weather; contingency shelters required.',
    metricValue: 'outdoor',
    threshold: 'indoor',
    actionRequired: 'Confirm covered contingency tents or indoor backup hall.',
    newAlerts,
    organizerId: event.organizer,
  });

  return newAlerts;
}

/**
 * Helper to update or resolve an alert based on condition state
 */
async function handleCondition({
  eventId,
  type,
  isActive,
  severity,
  message,
  metricValue,
  threshold,
  actionRequired,
  newAlerts,
  organizerId,
}) {
  const existingActive = await EventRiskAlert.findOne({ eventId, type, status: 'active' });

  if (isActive) {
    if (!existingActive) {
      const alert = await EventRiskAlert.create({
        eventId,
        type,
        severity,
        message,
        metricValue,
        threshold,
        actionRequired,
        status: 'active',
      });
      newAlerts.push(alert);

      // Broadcast alert via Socket.IO
      emitToEvent(eventId.toString(), 'eventshield:alert', alert);
      if (organizerId) {
        emitToUser(organizerId.toString(), 'eventshield:alert', alert);
      }
    }
  } else if (existingActive) {
    // Condition resolved
    existingActive.status = 'resolved';
    existingActive.resolvedAt = new Date();
    await existingActive.save();

    emitToEvent(eventId.toString(), 'eventshield:alert_resolved', existingActive);
  }
}

/**
 * Manually resolve an alert
 */
async function resolveAlert(alertId, userId) {
  const alert = await EventRiskAlert.findById(alertId);
  if (!alert) return null;

  alert.status = 'resolved';
  alert.resolvedAt = new Date();
  alert.resolvedBy = userId;
  await alert.save();

  emitToEvent(alert.eventId.toString(), 'eventshield:alert_resolved', alert);
  return alert;
}

/**
 * Fetch all alerts for an event
 */
async function getEventAlerts(eventId) {
  return EventRiskAlert.find({ eventId }).sort({ createdAt: -1 }).limit(50);
}

module.exports = {
  checkAndSyncAlerts,
  resolveAlert,
  getEventAlerts,
};
