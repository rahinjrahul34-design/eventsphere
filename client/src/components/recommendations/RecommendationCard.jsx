import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CalendarDays,
  MapPin,
  Sparkles,
  Users,
  IndianRupee,
  Building2,
  Video,
  Radio,
  HelpCircle,
  X,
} from 'lucide-react';
import FavoriteButton from '../events/FavoriteButton';
import WhyThisEventModal from './WhyThisEventModal';
import { fmtDate, categoryMeta, typeLabel } from '../../lib/format';
import { endpoints } from '../../lib/api';

const typeIcon = { offline: Building2, online: Video, hybrid: Radio };

export default function RecommendationCard({ event, index = 0, onDismiss, debug = false }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const cat = categoryMeta(event.categorySlug);
  const TypeIcon = typeIcon[event.eventType] || Building2;
  const matchPct = event.matchPercentage || 85;

  const handleDismiss = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDismissed(true);
    try {
      await endpoints.recommendationInteraction({
        eventId: event._id,
        interactionType: 'dismiss',
        recommendationSource: event.recommendationSource || 'PERSONALIZED',
      });
      onDismiss?.(event._id);
    } catch (err) {
      console.warn('Failed to record dismissal:', err);
    }
  };

  const handleCardClick = () => {
    endpoints
      .recommendationInteraction({
        eventId: event._id,
        interactionType: 'click',
        recommendationSource: event.recommendationSource || 'PERSONALIZED',
      })
      .catch(() => {});
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.4, delay: Math.min(index * 0.05, 0.3) }}
        className="h-full flex flex-col"
      >
        <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-card shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lift">
          {/* Cover Image & Badges */}
          <Link to={`/events/${event.slug}`} onClick={handleCardClick} className="block relative aspect-[16/9] overflow-hidden">
            <img
              src={event.coverImage}
              alt={event.title}
              loading="lazy"
              className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

            {/* Category badge */}
            <div className="absolute left-3 top-3 flex items-center gap-2">
              <span
                className="rounded-full px-2.5 py-1 text-[11px] font-bold text-white shadow-sm"
                style={{ backgroundColor: cat.color || '#6d28d9' }}
              >
                {cat.name}
              </span>
              {event.explorationTag && (
                <span className="rounded-full px-2.5 py-1 text-[10px] font-extrabold bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm">
                  🚀 {event.explorationTag}
                </span>
              )}
            </div>

            {/* Favorite & Dismiss */}
            <div className="absolute right-3 top-3 flex items-center gap-1.5" onClick={(e) => e.preventDefault()}>
              <FavoriteButton eventId={event._id} favorite={event.isFavorite} size="sm" />
              <button
                type="button"
                onClick={handleDismiss}
                title="Not interested (Dismiss)"
                className="grid size-8 place-items-center rounded-full bg-black/40 text-white/80 hover:text-white hover:bg-black/70 backdrop-blur transition"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Event Type & Match Score Badge */}
            <div className="absolute bottom-3 inset-x-3 flex items-center justify-between">
              <span className="rounded-lg bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur flex items-center gap-1">
                <TypeIcon className="size-3" /> {typeLabel[event.eventType]}
              </span>

              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-extrabold bg-primary/95 text-white backdrop-blur shadow-soft">
                <Sparkles className="size-3" /> {matchPct}% Match
              </span>
            </div>
          </Link>

          {/* Card Body */}
          <div className="flex flex-1 flex-col p-4 space-y-3">
            <Link to={`/events/${event.slug}`} onClick={handleCardClick}>
              <h3 className="font-display text-base font-bold leading-snug line-clamp-2 group-hover:text-primary transition">
                {event.title}
              </h3>
            </Link>

            <div className="space-y-1 text-xs text-muted-foreground">
              <p className="flex items-center gap-1.5">
                <CalendarDays className="size-3.5 shrink-0 text-primary" />
                {fmtDate(event.startDate, 'EEE, d MMM')}
              </p>
              <p className="flex items-center gap-1.5">
                <MapPin className="size-3.5 shrink-0 text-primary" />
                {event.venue?.city || event.venue?.name || 'Online'}
              </p>
            </div>

            {/* Why this event pill */}
            <div className="mt-1 pt-2 border-t border-muted/50">
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="w-full text-left group/why flex items-start gap-1.5 rounded-lg bg-primary/8 hover:bg-primary/12 px-2.5 py-2 text-xs font-medium text-primary transition"
              >
                <Sparkles className="size-3.5 mt-0.5 shrink-0 text-primary group-hover/why:rotate-12 transition-transform" />
                <span className="flex-1 line-clamp-1">{event.topReason || 'Matches your interests and skills'}</span>
                <HelpCircle className="size-3.5 shrink-0 opacity-70 group-hover/why:opacity-100" />
              </button>
            </div>

            {/* Developer debug preview */}
            {debug && event._debug && (
              <div className="rounded-lg bg-muted p-2 text-[10px] font-mono text-muted-foreground space-y-0.5">
                <p>RawScore: {(event._debug.rawScore * 100).toFixed(1)}%</p>
                <p>Skill: {(event._debug.skillMatchScore * 100).toFixed(0)}% | Int: {(event._debug.interestMatchScore * 100).toFixed(0)}%</p>
                <p>Loc: {(event._debug.locationMatchScore * 100).toFixed(0)}% | Beh: {(event._debug.behaviorMatchScore * 100).toFixed(0)}%</p>
              </div>
            )}

            {/* Footer / CTA */}
            <div className="mt-auto flex items-center justify-between pt-2">
              <span className="font-display font-extrabold text-sm">
                {event.price > 0 || (event.ticketTypes || []).some((t) => t.price > 0) ? (
                  <span className="flex items-center">
                    <IndianRupee className="size-3.5" />
                    {Math.min(
                      ...[event.price || Infinity, ...event.ticketTypes.filter((t) => t.price > 0).map((t) => t.price)]
                    )}{' '}
                    onward
                  </span>
                ) : (
                  <span className="text-success font-bold">Free</span>
                )}
              </span>

              <Link
                to={`/events/${event.slug}`}
                onClick={handleCardClick}
                className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary transition group-hover:bg-primary group-hover:text-white"
              >
                Register
              </Link>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Explanation Modal */}
      <WhyThisEventModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        event={event}
      />
    </>
  );
}
