import { Link } from 'react-router-dom';
import {
  Users, ShieldCheck, Zap, Award, Sparkles, TrendingUp,
  ArrowUpRight, AlertTriangle, ShieldAlert, CheckCircle2,
  Clock, ArrowRight, Eye, MousePointerClick
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';

export default function IntelligenceCardsGrid({ data }) {
  if (!data) return null;

  const { attendance, safety, queue, trust, seo, recommendations, event } = data;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-base font-bold flex items-center gap-2">
          <span>Operational Intelligence Modules</span>
          <span className="text-xs font-semibold text-muted-foreground">(6 Active Systems)</span>
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 1. Attendance Intelligence (EventPulse) */}
        <div className="rounded-2xl border bg-card p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <span className="grid size-9 place-items-center rounded-xl bg-blue-500/10 text-blue-500">
                  <Users className="size-5" />
                </span>
                <div>
                  <h4 className="font-bold text-sm text-foreground">Attendance Intelligence</h4>
                  <p className="text-[11px] text-muted-foreground">EventPulse Predictive AI</p>
                </div>
              </div>
              <Badge variant={attendance?.available ? 'outline' : 'secondary'} className="text-[10px]">
                {attendance?.available ? 'Active' : 'Awaiting Data'}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="rounded-xl bg-secondary/40 p-2.5">
                <span className="text-[11px] font-semibold text-muted-foreground block">Forecasted Turnout</span>
                <span className="text-lg font-black font-display text-foreground block">
                  {attendance?.expectedAttendance ?? '—'}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {attendance?.attendanceRate ? `${attendance.attendanceRate}% conversion` : 'Estimating'}
                </span>
              </div>

              <div className="rounded-xl bg-secondary/40 p-2.5">
                <span className="text-[11px] font-semibold text-muted-foreground block">Registered Total</span>
                <span className="text-lg font-black font-display text-foreground block">
                  {attendance?.currentRegistrations ?? 0}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  +{attendance?.registrationVelocity ?? 0} / 24h
                </span>
              </div>
            </div>

            <div className="space-y-1.5 text-xs text-muted-foreground pt-1">
              <div className="flex justify-between items-center">
                <span>Predicted No-Shows:</span>
                <strong className="text-foreground">{attendance?.expectedNoShows ?? 0}</strong>
              </div>
              <div className="flex justify-between items-center">
                <span>Confidence Level:</span>
                <strong className="text-foreground">{attendance?.confidence ?? 75}%</strong>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Clock className="size-3" />
              {attendance?.lastUpdated ? 'Live Synced' : 'Syncing'}
            </span>
            <Link
              to={attendance?.ctaLink || `/dashboard/events/${event?._id}/eventpulse`}
              className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
            >
              <span>{attendance?.ctaText || 'View EventPulse'}</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>

        {/* 2. Safety Intelligence (EventShield) */}
        <div className={cn(
          'rounded-2xl border p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4',
          safety?.criticalRisksCount > 0 ? 'bg-destructive/5 border-destructive/30' : 'bg-card'
        )}>
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <span className={cn(
                  'grid size-9 place-items-center rounded-xl',
                  safety?.criticalRisksCount > 0 ? 'bg-destructive/10 text-destructive' : 'bg-emerald-500/10 text-emerald-500'
                )}>
                  <ShieldCheck className="size-5" />
                </span>
                <div>
                  <h4 className="font-bold text-sm text-foreground">Safety & Risk Shield</h4>
                  <p className="text-[11px] text-muted-foreground">EventShield Real-Time</p>
                </div>
              </div>
              <Badge variant={safety?.criticalRisksCount > 0 ? 'destructive' : 'success'} className="text-[10px]">
                {safety?.criticalRisksCount > 0 ? `${safety.criticalRisksCount} Critical Alert` : `${safety?.safetyScore ?? 75}/100 Safe`}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="rounded-xl bg-secondary/40 p-2.5">
                <span className="text-[11px] font-semibold text-muted-foreground block">Safety Score</span>
                <span className="text-lg font-black font-display text-foreground block">
                  {safety?.safetyScore ?? 75}
                </span>
                <span className="text-[10px] text-muted-foreground capitalize">
                  {safety?.currentRiskLevel || 'Low'} Risk Level
                </span>
              </div>

              <div className="rounded-xl bg-secondary/40 p-2.5">
                <span className="text-[11px] font-semibold text-muted-foreground block">Checklist Readiness</span>
                <span className="text-lg font-black font-display text-foreground block">
                  {safety?.operationalReadiness ?? 80}%
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {safety?.openAlertsCount || 0} Open Alerts
                </span>
              </div>
            </div>

            <div className="space-y-1.5 text-xs text-muted-foreground pt-1">
              <div className="flex justify-between items-center">
                <span>Active Safety Alerts:</span>
                <strong className={safety?.openAlertsCount > 0 ? 'text-amber-500' : 'text-foreground'}>
                  {safety?.openAlertsCount || 0}
                </strong>
              </div>
              <div className="flex justify-between items-center">
                <span>Checklist Protocol:</span>
                <strong className="text-foreground">{safety?.checklistCompletion || 100}% Completed</strong>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Clock className="size-3" />
              {safety?.lastUpdated ? 'Live Guard' : 'Active'}
            </span>
            <Link
              to={safety?.ctaLink || `/dashboard/events/${event?._id}/eventshield`}
              className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
            >
              <span>{safety?.ctaText || 'Review Safety'}</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>

        {/* 3. Queue Intelligence (SmartQueue) */}
        <div className="rounded-2xl border bg-card p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <span className="grid size-9 place-items-center rounded-xl bg-amber-500/10 text-amber-500">
                  <Zap className="size-5" />
                </span>
                <div>
                  <h4 className="font-bold text-sm text-foreground">Queue & Waitlist</h4>
                  <p className="text-[11px] text-muted-foreground">SmartQueue Dynamic Holds</p>
                </div>
              </div>
              <Badge variant={queue?.queuePressure === 'High' ? 'warning' : 'outline'} className="text-[10px]">
                {queue?.queuePressure || 'Normal'} Pressure
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="rounded-xl bg-secondary/40 p-2.5">
                <span className="text-[11px] font-semibold text-muted-foreground block">Waitlist Backlog</span>
                <span className="text-lg font-black font-display text-foreground block">
                  {queue?.waitingCount ?? 0}
                </span>
                <span className="text-[10px] text-muted-foreground">Waiting attendees</span>
              </div>

              <div className="rounded-xl bg-secondary/40 p-2.5">
                <span className="text-[11px] font-semibold text-muted-foreground block">Active Holds</span>
                <span className="text-lg font-black font-display text-foreground block">
                  {queue?.activeHolds ?? 0}
                </span>
                <span className="text-[10px] text-muted-foreground">Temporary reservations</span>
              </div>
            </div>

            <div className="space-y-1.5 text-xs text-muted-foreground pt-1">
              <div className="flex justify-between items-center">
                <span>Queue Efficiency:</span>
                <strong className="text-foreground">{queue?.efficiencyScore ?? 85}/100</strong>
              </div>
              <div className="flex justify-between items-center">
                <span>Avg Claim Time:</span>
                <strong className="text-foreground">{queue?.avgClaimTime || 'N/A'}</strong>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Clock className="size-3" />
              Dynamic Auto-Promotion
            </span>
            <Link
              to={queue?.ctaLink || `/dashboard/events/${event?._id}/smartqueue`}
              className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
            >
              <span>{queue?.ctaText || 'Manage Queue'}</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>

        {/* 4. Organizer Trust (TrustSphere) */}
        <div className="rounded-2xl border bg-card p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <span className="grid size-9 place-items-center rounded-xl bg-purple-500/10 text-purple-500">
                  <Award className="size-5" />
                </span>
                <div>
                  <h4 className="font-bold text-sm text-foreground">Organizer Trust</h4>
                  <p className="text-[11px] text-muted-foreground">TrustSphere Credibility</p>
                </div>
              </div>
              <Badge variant={trust?.verified ? 'success' : 'outline'} className="text-[10px]">
                {trust?.verified ? 'Verified Organizer' : 'Unverified'}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="rounded-xl bg-secondary/40 p-2.5">
                <span className="text-[11px] font-semibold text-muted-foreground block">Trust Score</span>
                <span className="text-lg font-black font-display text-foreground block">
                  {trust?.trustScore ?? 70}
                </span>
                <span className="text-[10px] text-muted-foreground">{trust?.trustLevel || 'Standard'} Tier</span>
              </div>

              <div className="rounded-xl bg-secondary/40 p-2.5">
                <span className="text-[11px] font-semibold text-muted-foreground block">Platform Status</span>
                <span className="text-sm font-bold text-foreground block mt-1">
                  {trust?.verified ? 'KYC Verified' : 'Standard'}
                </span>
                <span className="text-[10px] text-muted-foreground">{trust?.confidenceLevel || 'Moderate'} Confidence</span>
              </div>
            </div>

            <div className="space-y-1 text-xs text-muted-foreground pt-1">
              <p className="line-clamp-2 italic">
                "{trust?.strengths?.[0] || 'Established event organizer with good standing'}"
              </p>
            </div>
          </div>

          <div className="pt-2 border-t flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="size-3 text-purple-500" />
              Credibility Guard
            </span>
            <Link
              to={trust?.ctaLink || `/dashboard/trust`}
              className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
            >
              <span>{trust?.ctaText || 'View Trust'}</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>

        {/* 5. EventBoost AI (SEO & Content) */}
        <div className="rounded-2xl border bg-card p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <span className="grid size-9 place-items-center rounded-xl bg-pink-500/10 text-pink-500">
                  <Sparkles className="size-5" />
                </span>
                <div>
                  <h4 className="font-bold text-sm text-foreground">Content & SEO Boost</h4>
                  <p className="text-[11px] text-muted-foreground">EventBoost Intelligence</p>
                </div>
              </div>
              <Badge variant={seo?.seoScore >= 70 ? 'success' : 'outline'} className="text-[10px]">
                {seo?.seoScore ?? 50}/100 SEO
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="rounded-xl bg-secondary/40 p-2.5">
                <span className="text-[11px] font-semibold text-muted-foreground block">Content Score</span>
                <span className="text-lg font-black font-display text-foreground block">
                  {seo?.contentScore ?? 50}
                </span>
                <span className="text-[10px] text-muted-foreground">Listing quality</span>
              </div>

              <div className="rounded-xl bg-secondary/40 p-2.5">
                <span className="text-[11px] font-semibold text-muted-foreground block">Readability</span>
                <span className="text-lg font-black font-display text-foreground block">
                  {seo?.readabilityScore ?? 70}
                </span>
                <span className="text-[10px] text-muted-foreground">Clarity index</span>
              </div>
            </div>

            <div className="space-y-1 text-xs text-muted-foreground pt-1">
              <span className="text-[11px] font-semibold text-muted-foreground block">Top Opportunity:</span>
              <p className="line-clamp-2 text-foreground font-medium">
                {seo?.mainOpportunity || 'Enhance meta tags & headings with AI'}
              </p>
            </div>
          </div>

          <div className="pt-2 border-t flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Sparkles className="size-3 text-pink-500" />
              SEO Engine V1
            </span>
            <Link
              to={seo?.ctaLink || `/dashboard/events/${event?._id}/eventboost`}
              className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
            >
              <span>{seo?.ctaText || 'Optimize Event'}</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>

        {/* 6. Recommendation 2.0 Discovery Signals */}
        <div className="rounded-2xl border bg-card p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <span className="grid size-9 place-items-center rounded-xl bg-indigo-500/10 text-indigo-500">
                  <TrendingUp className="size-5" />
                </span>
                <div>
                  <h4 className="font-bold text-sm text-foreground">Discovery Signals</h4>
                  <p className="text-[11px] text-muted-foreground">Recommendation 2.0 Feed</p>
                </div>
              </div>
              <Badge variant="outline" className="text-[10px]">
                {recommendations?.visibilitySignal || 'Emerging'} Signal
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="rounded-xl bg-secondary/40 p-2.5">
                <span className="text-[11px] font-semibold text-muted-foreground block">Feed Impressions</span>
                <span className="text-lg font-black font-display text-foreground block">
                  {recommendations?.views ?? 0}
                </span>
                <span className="text-[10px] text-muted-foreground">Attendee discovery</span>
              </div>

              <div className="rounded-xl bg-secondary/40 p-2.5">
                <span className="text-[11px] font-semibold text-muted-foreground block">Click-Through Rate</span>
                <span className="text-lg font-black font-display text-foreground block">
                  {recommendations?.ctr ?? 0}%
                </span>
                <span className="text-[10px] text-muted-foreground">{recommendations?.clicks ?? 0} clicks</span>
              </div>
            </div>

            <div className="space-y-1.5 text-xs text-muted-foreground pt-1">
              <div className="flex justify-between items-center">
                <span>Attendee Saves & Bookmarks:</span>
                <strong className="text-foreground">{recommendations?.saves ?? 0}</strong>
              </div>
              <div className="flex justify-between items-center">
                <span>Positive Recommendation Feedback:</span>
                <strong className="text-foreground">{recommendations?.feedbackScore ?? 0}</strong>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Eye className="size-3" />
              Feed Visibility
            </span>
            <Link
              to="/events"
              className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
            >
              <span>Explore Public Feed</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
