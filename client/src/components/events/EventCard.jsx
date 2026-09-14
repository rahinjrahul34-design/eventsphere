import { Link } from 'react-router-dom';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, CalendarDays, Users, IndianRupee, Radio, Video, Building2, ArrowRight } from 'lucide-react';
import { Badge } from '../ui/badge';
import FavoriteButton from './FavoriteButton';
import { fmtDate, typeLabel, categoryMeta } from '../../lib/format';

const typeIcon = { offline: Building2, online: Video, hybrid: Radio };

export default function EventCard({ event, index = 0, compact = false }) {
  const cat = categoryMeta(event.categorySlug);
  const TypeIcon = typeIcon[event.eventType] || Building2;
  const [imgFailed, setImgFailed] = useState(false);
  const seatsLeft = Math.max(0, (event.capacity || 0) - (event.registrationCount || 0));
  const fillPct = Math.min(100, Math.round(((event.registrationCount || 0) / Math.max(1, event.capacity)) * 100));
  const isLive = event.status === 'live';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.05, 0.3) }}
      className="h-full"
    >
      <Link
        to={`/events/${event.slug}`}
        className="group flex h-full flex-col overflow-hidden rounded-xl border bg-card shadow-soft transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-border-strong hover:shadow-lift"
      >
        <div className="relative aspect-[16/9] overflow-hidden">
          {!imgFailed && event.coverImage ? (
            <img
              src={event.coverImage}
              alt={event.title}
              loading="lazy"
              onError={() => setImgFailed(true)}
              className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            />
          ) : (
            <div
              className="grid size-full place-items-center bg-gradient-to-br from-primary/30 via-primary/15 to-accent/20"
              aria-hidden="true"
            >
              <span className="font-display text-4xl font-extrabold text-white/70">{cat.name?.[0] || 'E'}</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/5 to-transparent" />
          <div className="absolute left-3 top-3 flex gap-2">
            <span
              className="rounded-md px-2 py-1 text-[11px] font-bold text-white shadow-soft"
              style={{ backgroundColor: cat.color || '#6d28d9' }}
            >
              {cat.name}
            </span>
            {isLive && (
              <Badge variant="live">
                <span className="size-1.5 animate-pulse rounded-full bg-white" aria-hidden="true" />
                LIVE
              </Badge>
            )}
          </div>
          <div className="absolute right-3 top-3" onClick={(e) => e.preventDefault()}>
            <FavoriteButton eventId={event._id} favorite={event.isFavorite} size="sm" />
          </div>
          <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-md bg-black/60 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
            <TypeIcon className="size-3" aria-hidden="true" /> {typeLabel[event.eventType]}
          </div>
        </div>

        <div className="flex flex-1 flex-col p-4 sm:p-5">
          <h3 className="line-clamp-2 font-display text-base font-bold leading-snug tracking-tight transition-colors group-hover:text-primary">
            {event.title}
          </h3>
          <div className="mt-2.5 space-y-1.5 text-xs text-muted-foreground">
            <p className="flex items-center gap-1.5">
              <CalendarDays className="size-3.5 shrink-0" aria-hidden="true" />
              {fmtDate(event.startDate, compact ? 'd MMM' : 'EEE, d MMM')}
            </p>
            <p className="flex items-center gap-1.5">
              <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
              {event.venue?.city || event.venue?.name || 'Online'}
            </p>
          </div>

          {!compact && (
            <div className="mt-3.5">
              <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="size-3" aria-hidden="true" /> {event.registrationCount || 0} registered
                </span>
                <span className={seatsLeft < 10 ? 'font-bold text-warning' : ''}>
                  {seatsLeft === 0 ? 'Full — waitlist' : `${seatsLeft} seats left`}
                </span>
              </div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={fillPct} aria-valuemin={0} aria-valuemax={100} aria-label="Seats filled">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${fillPct > 90 ? 'bg-warning' : 'bg-primary'}`}
                  style={{ width: `${fillPct}%` }}
                />
              </div>
            </div>
          )}

          <div className="mt-auto flex items-center justify-between pt-4">
            <span className="font-display text-base font-extrabold tabular">
              {event.price > 0 || (event.ticketTypes || []).some((t) => t.price > 0) ? (
                <span className="flex items-center">
                  <IndianRupee className="size-4" aria-hidden="true" />
                  {Math.min(...[event.price || Infinity, ...event.ticketTypes.filter((t) => t.price > 0).map((t) => t.price)])}
                  <span className="ml-1 text-xs font-semibold text-muted-foreground">onward</span>
                </span>
              ) : (
                <span className="text-success">Free</span>
              )}
            </span>
            <span className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary transition-colors duration-150 group-hover:bg-primary group-hover:text-primary-foreground">
              Register
              <ArrowRight className="size-3.5 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
