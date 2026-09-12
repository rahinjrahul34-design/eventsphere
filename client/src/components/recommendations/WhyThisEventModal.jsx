import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Sparkles, Brain, Heart, History, MapPin, ThumbsUp, ThumbsDown, CheckCircle2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Dialog } from '../ui/dialog';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Spinner } from '../ui/misc';
import { endpoints } from '../../lib/api';

export default function WhyThisEventModal({ open, onClose, event, onFeedbackSubmitted }) {
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [selectedDislikeReason, setSelectedDislikeReason] = useState('');
  const [showDislikeReasons, setShowDislikeReasons] = useState(false);

  const { data: explanationData, isLoading } = useQuery({
    queryKey: ['recommendation-explanation', event?._id],
    queryFn: () => endpoints.recommendationExplanation(event._id),
    enabled: open && !!event?._id,
  });

  if (!event) return null;

  const matchPct = explanationData?.matchPercentage || event.matchPercentage || 85;
  const reasons = explanationData?.reasons || event.reasons || [];
  const narrative = explanationData?.aiExplanation || event.topReason;
  const evidence = explanationData?.evidence || {};

  const handleFeedback = async (type, reason = '') => {
    try {
      await endpoints.recommendationFeedback({
        eventId: event._id,
        feedbackType: type,
        feedbackReason: reason,
        recommendationSource: event.recommendationSource || 'PERSONALIZED',
      });
      setFeedbackSent(true);
      setShowDislikeReasons(false);
      onFeedbackSubmitted?.(event._id, type);
    } catch (err) {
      console.warn('Failed to submit feedback:', err);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Why We Recommended This Event"
      description="Personalized operational intelligence based on your verified profile and activity."
      size="md"
    >
      <div className="p-5 space-y-6">
        {/* Match Header */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-violet-600/10 via-indigo-600/10 to-primary/10 border border-primary/20">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Match Rating</span>
            <h3 className="text-xl font-display font-extrabold text-foreground flex items-center gap-2">
              {event.title}
            </h3>
          </div>
          <div className="text-right">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-extrabold bg-primary text-white shadow-soft">
              <Sparkles className="size-4" /> {matchPct}% Match
            </span>
          </div>
        </div>

        {/* Loading Spinner */}
        {isLoading ? (
          <div className="py-8 flex justify-center">
            <Spinner />
          </div>
        ) : (
          <>
            {/* AI Narrative Narrative */}
            {narrative && (
              <div className="rounded-xl border border-primary/20 bg-card p-4 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 size-24 bg-primary/5 rounded-full blur-xl pointer-events-none" />
                <div className="flex items-start gap-3">
                  <div className="size-8 rounded-lg bg-primary/15 text-primary grid place-items-center shrink-0 mt-0.5">
                    <Sparkles className="size-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase text-primary tracking-wider mb-1">
                      Intelligence Synthesis
                    </h4>
                    <p className="text-sm text-foreground/90 leading-relaxed font-medium">
                      "{narrative}"
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Verifiable Evidence Checklist */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Verified Match Factors
              </h4>

              {/* Skills match */}
              {evidence.matchedSkills?.length > 0 && (
                <div className="flex items-start gap-3 p-3 rounded-xl border bg-muted/30">
                  <Brain className="size-4 text-violet-500 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs font-bold">Your Profile Skills</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {evidence.matchedSkills.map((s, idx) => (
                        <span
                          key={idx}
                          className="rounded-md bg-violet-500/10 text-violet-600 dark:text-violet-400 font-semibold text-[11px] px-2 py-0.5"
                        >
                          ✓ {s}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Interests match */}
              {evidence.matchedInterests?.length > 0 && (
                <div className="flex items-start gap-3 p-3 rounded-xl border bg-muted/30">
                  <Heart className="size-4 text-pink-500 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs font-bold">Matched Interests</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {evidence.matchedInterests.map((i, idx) => (
                        <span
                          key={idx}
                          className="rounded-md bg-pink-500/10 text-pink-600 dark:text-pink-400 font-semibold text-[11px] px-2 py-0.5"
                        >
                          ✓ {i}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Attendance history */}
              {evidence.pastAttendedCount > 0 && (
                <div className="flex items-start gap-3 p-3 rounded-xl border bg-muted/30">
                  <History className="size-4 text-amber-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-bold">Past Event History</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      You attended {evidence.pastAttendedCount} related event{evidence.pastAttendedCount > 1 ? 's' : ''} in this topic.
                    </p>
                  </div>
                </div>
              )}

              {/* Location */}
              <div className="flex items-start gap-3 p-3 rounded-xl border bg-muted/30">
                <MapPin className="size-4 text-emerald-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-bold">Location Proximity</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {event.eventType === 'online' ? 'Online event — join from anywhere' : `Taking place in ${event.venue?.city || 'your area'}`}
                  </p>
                </div>
              </div>
            </div>

            {/* Feedback Section */}
            <div className="pt-2 border-t">
              {feedbackSent ? (
                <p className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                  <CheckCircle2 className="size-4" /> Thank you! Your feedback improves future recommendations.
                </p>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">Was this recommendation useful?</p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs font-bold"
                      onClick={() => handleFeedback('like')}
                    >
                      <ThumbsUp className="size-3.5 text-emerald-500" /> Yes, relevant
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs font-bold text-muted-foreground"
                      onClick={() => setShowDislikeReasons(!showDislikeReasons)}
                    >
                      <ThumbsDown className="size-3.5 text-rose-500" /> Not for me
                    </Button>
                  </div>

                  {showDislikeReasons && (
                    <div className="mt-3 p-3 rounded-xl bg-muted/50 border space-y-2">
                      <p className="text-[11px] font-bold text-muted-foreground">Why wasn't this a good match?</p>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          'Not interested',
                          'Too far away',
                          'Already attended',
                          'Wrong skill level',
                          'Wrong category',
                          'Not available that day',
                          'Other',
                        ].map((reason) => (
                          <button
                            key={reason}
                            type="button"
                            onClick={() => handleFeedback('dislike', reason)}
                            className="text-[11px] px-2.5 py-1 rounded-lg border bg-card hover:bg-secondary font-medium transition"
                          >
                            {reason}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* View Event Button */}
        <div className="pt-2">
          <Link to={`/events/${event.slug}`} onClick={onClose} className="w-full inline-block">
            <Button className="w-full gradient-brand text-white font-bold gap-1.5">
              View Event Details <ArrowRight className="size-4" />
            </Button>
          </Link>
        </div>
      </div>
    </Dialog>
  );
}
