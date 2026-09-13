/**
 * Risk Alert Service
 * Evaluates operational and predictive risk signals, deduplicates alerts, and manages alert records.
 */

const EventPulseAlert = require('../../models/EventPulseAlert');
const config = require('./config');
const notificationService = require('../notificationService');

async function evaluateRiskAlerts(eventId, features, velocityData, attendanceData, engagementData) {
  const { event, registrations, timing } = features;
  const alertsToUpsert = [];

  // 1. REGISTRATION_SLOWDOWN
  if (
    velocityData.growthRate <= config.ALERT_THRESHOLDS.VELOCITY_SLOWDOWN_DROP &&
    timing.daysRemaining > 1 &&
    registrations.capacityUtilization < 0.8
  ) {
    alertsToUpsert.push({
      type: 'REGISTRATION_SLOWDOWN',
      severity: 'medium',
      message: `Registration velocity slowed by ${Math.abs(velocityData.growthRatePct)}% over the last 24h.`,
      metricValue: velocityData.growthRatePct,
      threshold: config.ALERT_THRESHOLDS.VELOCITY_SLOWDOWN_DROP * 100,
      actionRecommended: 'Launch a targeted promotional push or announce featured speakers.',
    });
  }

  // 2. HIGH_NO_SHOW_RISK
  if (attendanceData.noShowRate >= config.ALERT_THRESHOLDS.HIGH_NO_SHOW_RATE && !event.isCompleted) {
    alertsToUpsert.push({
      type: 'HIGH_NO_SHOW_RISK',
      severity: 'high',
      message: `Predicted no-show rate of ${attendanceData.noShowRate}% is elevated compared to platform averages.`,
      metricValue: attendanceData.noShowRate,
      threshold: config.ALERT_THRESHOLDS.HIGH_NO_SHOW_RATE,
      actionRecommended: 'Send a readiness check-in email and emphasize live venue highlights.',
    });
  }

  // 3. CAPACITY_PRESSURE
  const utilPct = registrations.capacityUtilization * 100;
  if (utilPct >= config.ALERT_THRESHOLDS.CAPACITY_PRESSURE_UTILIZATION && !event.isCompleted) {
    alertsToUpsert.push({
      type: 'CAPACITY_PRESSURE',
      severity: 'medium',
      message: `Registrations have reached ${Math.round(utilPct)}% of total event capacity.`,
      metricValue: Math.round(utilPct),
      threshold: config.ALERT_THRESHOLDS.CAPACITY_PRESSURE_UTILIZATION,
      actionRecommended: 'Monitor waitlist queue or consider expanding tier capacity.',
    });
  }

  // 4. LOW_ENGAGEMENT_PACE
  if (event.isLive && engagementData.score < config.ALERT_THRESHOLDS.LOW_ENGAGEMENT_PACE_SCORE) {
    alertsToUpsert.push({
      type: 'LOW_ENGAGEMENT_PACE',
      severity: 'high',
      message: `Live session engagement score (${engagementData.score}/100) is tracking below expected participation levels.`,
      metricValue: engagementData.score,
      threshold: config.ALERT_THRESHOLDS.LOW_ENGAGEMENT_PACE_SCORE,
      actionRecommended: 'Conduct an audience poll or address unanswered questions on the live stage.',
    });
  }

  // 5. ATTENDANCE_PACE_DEFICIT
  if (event.isLive) {
    const expectedSoFar = Math.round(attendanceData.expectedAttendees * 0.6);
    if (registrations.currentCheckedIns < expectedSoFar && registrations.currentCheckedIns > 0) {
      alertsToUpsert.push({
        type: 'ATTENDANCE_PACE_DEFICIT',
        severity: 'high',
        message: `Current check-ins (${registrations.currentCheckedIns}) are lagging behind the projected arrival curve.`,
        metricValue: registrations.currentCheckedIns,
        threshold: expectedSoFar,
        actionRecommended: 'Verify entry desk scanner connectivity and send a "Session Starting Now" ping.',
      });
    }
  }

  // Save / deduplicate active alerts in MongoDB. Notification policy
  // (CORE FEATURE 18): an organizer is notified ONLY when an alert type
  // transitions into its active state — updates to an already-active alert
  // never re-notify, which acts as a natural cooldown per alert type.
  const activeAlerts = [];
  for (const item of alertsToUpsert) {
    const existing = await EventPulseAlert.findOne({ eventId, type: item.type, status: 'active' }).lean();
    const alert = await EventPulseAlert.findOneAndUpdate(
      { eventId, type: item.type, status: 'active' },
      {
        $set: {
          severity: item.severity,
          message: item.message,
          metricValue: item.metricValue,
          threshold: item.threshold,
          actionRecommended: item.actionRecommended,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();
    activeAlerts.push(alert);

    if (!existing && ['high', 'critical'].includes(item.severity) && event.organizer) {
      notificationService
        .notify({
          user: event.organizer,
          type: 'eventpulse_alert',
          title: `⚠ ${item.type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())} — ${event.title}`,
          message: `${item.message} Recommended: ${item.actionRecommended}`,
          link: `/dashboard/events/${eventId}/eventpulse`,
          data: { eventId: String(eventId), alertType: item.type, severity: item.severity },
        })
        .catch(() => {}); // alerts must never fail the prediction pipeline
    }
  }

  // Return active alerts
  return activeAlerts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

module.exports = {
  evaluateRiskAlerts,
};
