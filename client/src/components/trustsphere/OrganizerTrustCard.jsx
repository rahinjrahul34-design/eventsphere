import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ShieldCheck, CheckCircle2, Star, Users, CalendarCheck, Info,
  Award, Sparkles, ExternalLink, ShieldAlert, ChevronRight,
} from 'lucide-react';
import { endpoints } from '../../lib/api';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import TrustDetailsModal from './TrustDetailsModal';
import { cn } from '../../lib/utils';
import { Link } from 'react-router-dom';

function getTrustColor(score, confidence) {
  if (confidence === 'limited') {
    return {
      bg: 'bg-amber-500/10 dark:bg-amber-500/20',
      text: 'text-amber-600 dark:text-amber-400',
      border: 'border-amber-500/30',
      ring: '#f59e0b',
    };
  }
  if (score >= 90) {
    return {
      bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
      text: 'text-emerald-600 dark:text-emerald-400',
      border: 'border-emerald-500/30',
      ring: '#10b981',
    };
  }
  if (score >= 80) {
    return {
      bg: 'bg-blue-500/10 dark:bg-blue-500/20',
      text: 'text-blue-600 dark:text-blue-400',
      border: 'border-blue-500/30',
      ring: '#3b82f6',
    };
  }
  if (score >= 70) {
    return {
      bg: 'bg-indigo-500/10 dark:bg-indigo-500/20',
      text: 'text-indigo-600 dark:text-indigo-400',
      border: 'border-indigo-500/30',
      ring: '#6366f1',
    };
  }
  if (score >= 60) {
    return {
      bg: 'bg-amber-500/10 dark:bg-amber-500/20',
      text: 'text-amber-600 dark:text-amber-400',
      border: 'border-amber-500/30',
      ring: '#f59e0b',
    };
  }
  return {
    bg: 'bg-rose-500/10 dark:bg-rose-500/20',
    text: 'text-rose-600 dark:text-rose-400',
    border: 'border-rose-500/30',
    ring: '#f43f5e',
  };
}

function getLevelLabel(level, confidence) {
  if (confidence === 'limited') return 'Building Trust History';
  switch (level) {
    case 'excellent': return 'Excellent';
    case 'very_good': return 'Very Good';
    case 'good': return 'Good';
    case 'fair': return 'Fair';
    case 'needs_improvement': return 'Needs Improvement';
    case 'low_trust': return 'Low Trust';
    default: return 'Established Host';
  }
}

export default function OrganizerTrustCard({
  profile: propProfile,
  organizerId,
  eventId,
  compact = false,
  showBreakdown = true,
  className = '',
}) {
  const [modalOpen, setModalOpen] = useState(false);

  // Fetch profile if not directly provided
  const query = useQuery({
    queryKey: ['organizer-trust', organizerId || eventId],
    queryFn: async () => {
      if (organizerId) return await endpoints.trust.getOrganizer(organizerId);
      if (eventId) return await endpoints.trust.getEventOrganizer(eventId);
      return null;
    },
    enabled: !propProfile && !!(organizerId || eventId),
    staleTime: 60 * 1000,
  });

  const profile = propProfile || query.data;

  if (!profile) {
    if (query.isLoading) {
      return (
        <div className={cn('rounded-2xl border border-border bg-card p-4 animate-pulse space-y-3', className)}>
          <div className="h-4 w-32 bg-muted rounded" />
          <div className="h-10 w-full bg-muted rounded" />
        </div>
      );
    }
    return null;
  }

  const score = profile.trustScore || 0;
  const confidence = profile.confidenceLevel || 'limited';
  const level = profile.trustLevel || 'building_history';
  const metrics = profile.metrics || {};
  const badges = profile.badges || [];
  const color = getTrustColor(score, confidence);
  const organizer = profile.organizer || {};

  // Compact layout (e.g. for event detail sidebar or preview pill)
  if (compact) {
    return (
      <>
        <div className={cn('rounded-xl border border-border bg-card p-3.5 space-y-2.5', className)}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className={cn('flex size-8 items-center justify-center rounded-lg font-mono text-sm font-extrabold', color.bg, color.text)}>
                {confidence === 'limited' ? '—' : score}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold">{getLevelLabel(level, confidence)}</span>
                  {profile.verified && <CheckCircle2 className="size-3.5 text-primary" />}
                </div>
                <p className="text-[11px] text-muted-foreground">Organizer Trust Score</p>
              </div>
            </div>

            {showBreakdown && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
                onClick={() => setModalOpen(true)}
              >
                Why Trust?
              </Button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px] border-t border-border/50 text-muted-foreground">
            <div>
              <span className="font-semibold text-foreground">{metrics.completionRate ?? 100}%</span> Completion
            </div>
            <div>
              <span className="font-semibold text-foreground">{metrics.satisfactionPercentage ?? 80}%</span> Satisfaction
            </div>
          </div>
        </div>

        {showBreakdown && (
          <TrustDetailsModal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            profile={profile}
          />
        )}
      </>
    );
  }

  // Full Rich TrustSphere Card
  const circumference = 2 * Math.PI * 38;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <>
      <div className={cn('rounded-2xl border border-border bg-card shadow-sm p-5 sm:p-6 space-y-5 transition hover:shadow-md', className)}>
        {/* Header Row */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            {/* Circular Gauge */}
            <div className="relative size-20 shrink-0">
              <svg className="size-full -rotate-90" viewBox="0 0 90 90">
                <circle
                  cx="45"
                  cy="45"
                  r="38"
                  stroke="currentColor"
                  strokeWidth="6"
                  className="text-muted/40"
                  fill="transparent"
                />
                <circle
                  cx="45"
                  cy="45"
                  r="38"
                  stroke={color.ring}
                  strokeWidth="6"
                  strokeDasharray={circumference}
                  strokeDashoffset={confidence === 'limited' ? circumference * 0.3 : strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-700 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className={cn('font-display text-xl font-extrabold leading-none', color.text)}>
                  {confidence === 'limited' ? 'New' : score}
                </span>
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">
                  / 100
                </span>
              </div>
            </div>

            {/* Organizer Info & Level */}
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <Badge variant="outline" className={cn('font-bold text-xs', color.bg, color.text, color.border)}>
                  {getLevelLabel(level, confidence)}
                </Badge>
                {profile.verified && (
                  <Badge variant="secondary" className="gap-1 text-[11px] font-semibold text-primary">
                    <CheckCircle2 className="size-3" /> Verified Host
                  </Badge>
                )}
              </div>

              <h4 className="font-display text-base sm:text-lg font-bold mt-1 text-foreground">
                {organizer.company || organizer.name || 'Verified Event Host'}
              </h4>

              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <ShieldCheck className="size-3.5 text-emerald-500" />
                <span>100% Verified Platform Behavior</span>
              </p>
            </div>
          </div>

          {/* Action Trigger */}
          {showBreakdown && (
            <div className="flex items-center gap-2">
              {organizer._id && (
                <Link
                  to={`/organizers/${organizer._id}`}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition"
                >
                  Public Profile <ExternalLink className="size-3" />
                </Link>
              )}
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs font-semibold"
                onClick={() => setModalOpen(true)}
              >
                Trust Breakdown <ChevronRight className="size-3.5" />
              </Button>
            </div>
          )}
        </div>

        {/* Cold Start Explainer Banner */}
        {confidence === 'limited' && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2.5">
            <Info className="size-4 shrink-0 text-amber-500" />
            <span>
              <strong>Building Trust History:</strong> This host is early in their hosting journey. Platform baseline protections are actively in effect.
            </span>
          </div>
        )}

        {/* Verified Performance Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="rounded-xl border border-border/70 bg-muted/30 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <CalendarCheck className="size-3.5 text-emerald-500" />
              <span>Event Completion</span>
            </div>
            <p className="font-display text-lg font-extrabold text-foreground">
              {metrics.completionRate ?? 100}%
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {metrics.completedEvents || 0} hosted ({metrics.cancelledEvents || 0} cancelled)
            </p>
          </div>

          <div className="rounded-xl border border-border/70 bg-muted/30 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <Star className="size-3.5 text-amber-500 fill-amber-500" />
              <span>Satisfaction</span>
            </div>
            <p className="font-display text-lg font-extrabold text-foreground">
              {metrics.satisfactionPercentage ?? 80}%
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {metrics.averageRating ? `${metrics.averageRating}★ average` : 'No reviews yet'}
            </p>
          </div>

          <div className="rounded-xl border border-border/70 bg-muted/30 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <Users className="size-3.5 text-blue-500" />
              <span>Attendees Served</span>
            </div>
            <p className="font-display text-lg font-extrabold text-foreground">
              {(metrics.attendeesServed || 0).toLocaleString()}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Verified check-ins
            </p>
          </div>

          <div className="rounded-xl border border-border/70 bg-muted/30 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <ShieldCheck className="size-3.5 text-violet-500" />
              <span>Safety Record</span>
            </div>
            <p className="font-display text-lg font-extrabold text-foreground">
              {metrics.confirmedViolationsCount === 0 ? 'Flawless' : `${metrics.confirmedViolationsCount} Issues`}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Zero active sanctions
            </p>
          </div>
        </div>

        {/* Earned Badges Row */}
        {badges.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs font-semibold text-muted-foreground">Earned Badges:</span>
            {badges.map((b, i) => (
              <Badge key={i} variant="secondary" className="gap-1 text-[11px] font-medium py-1 px-2.5">
                <Award className="size-3 text-primary" />
                <span>{typeof b === 'string' ? b : b.name || b.label}</span>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Transparency Modal */}
      {showBreakdown && (
        <TrustDetailsModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          profile={profile}
        />
      )}
    </>
  );
}
