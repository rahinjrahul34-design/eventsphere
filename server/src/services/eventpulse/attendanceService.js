/**
 * Attendance & No-Show Prediction Service
 * Computes expected attendees, no-show estimates, prediction ranges, and live event arrival trajectories.
 */

function calculateExpectedAttendance(features, predictedRegistrations, attendanceRate) {
  const { event, registrations, timing } = features;
  const { totalConfirmed, currentCheckedIns } = registrations;
  const { isLive, isCompleted } = event;
  const { daysRemaining, durationHours } = timing;

  // For completed events, actuals are ground truth
  if (isCompleted) {
    const noShows = Math.max(0, totalConfirmed - currentCheckedIns);
    const actualRate = totalConfirmed > 0 ? (currentCheckedIns / totalConfirmed) * 100 : 0;
    return {
      expectedAttendees: currentCheckedIns,
      expectedNoShows: noShows,
      attendanceRate: Number(actualRate.toFixed(1)),
      noShowRate: Number((100 - actualRate).toFixed(1)),
      lowerBound: currentCheckedIns,
      upperBound: currentCheckedIns,
      isLiveAdjustment: false,
    };
  }

  // During Live Mode: We observe actual check-ins in real time!
  if (isLive) {
    // Fraction of event elapsed
    const now = Date.now();
    const start = new Date(event.startDate).getTime();
    const end = new Date(event.endDate).getTime();
    const elapsedRatio = Math.min(1.0, Math.max(0.0, (now - start) / Math.max(1, end - start)));

    // Late arrival rate decays exponentially: late attendees arrive early in the session
    const lateArrivalDecay = Math.exp(-2.8 * elapsedRatio);
    const remainingUnchecked = Math.max(0, totalConfirmed - currentCheckedIns);
    const expectedLateArrivals = Math.round(remainingUnchecked * attendanceRate * lateArrivalDecay);

    const liveExpectedAttendance = Math.min(totalConfirmed, currentCheckedIns + expectedLateArrivals);
    const liveExpectedNoShows = Math.max(0, totalConfirmed - liveExpectedAttendance);
    const liveAttendanceRate = totalConfirmed > 0 ? (liveExpectedAttendance / totalConfirmed) * 100 : attendanceRate * 100;

    return {
      expectedAttendees: liveExpectedAttendance,
      expectedNoShows: liveExpectedNoShows,
      attendanceRate: Number(liveAttendanceRate.toFixed(1)),
      noShowRate: Number((100 - liveAttendanceRate).toFixed(1)),
      lowerBound: currentCheckedIns,
      upperBound: Math.min(totalConfirmed, Math.round(liveExpectedAttendance + 1.2 * Math.sqrt(Math.max(1, expectedLateArrivals)))),
      isLiveAdjustment: true,
      currentCheckedIns,
    };
  }

  // Pre-Event Mode: Use predicted registrations as pool of registered users
  // (Or current confirmed registrations if event is about to start)
  const pool = daysRemaining > 1 ? predictedRegistrations : totalConfirmed;
  const expectedAttendees = Math.round(pool * attendanceRate);
  const expectedNoShows = Math.max(0, pool - expectedAttendees);
  const attRatePct = Number((attendanceRate * 100).toFixed(1));
  const noShowRatePct = Number((100 - attRatePct).toFixed(1));

  // 90% Confidence Interval (Binomial approximation: z = 1.645)
  const sigma = Math.sqrt(Math.max(1, pool * attendanceRate * (1 - attendanceRate)));
  const margin = Math.round(1.645 * sigma);

  const lowerBound = Math.max(currentCheckedIns, Math.max(0, expectedAttendees - margin));
  const upperBound = Math.min(pool, expectedAttendees + margin);

  return {
    expectedAttendees,
    expectedNoShows,
    attendanceRate: attRatePct,
    noShowRate: noShowRatePct,
    lowerBound,
    upperBound,
    isLiveAdjustment: false,
    currentCheckedIns,
  };
}

module.exports = {
  calculateExpectedAttendance,
};
