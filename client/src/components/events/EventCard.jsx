import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, CalendarDays, Users, IndianRupee, Radio, Video, Building2 } from 'lucide-react';
import { Badge } from '../ui/badge';
import FavoriteButton from './FavoriteButton';
import { fmtDate, inr, typeLabel, categoryMeta } from '../../lib/format';

const typeIcon = { offline: Building2, online: Video, hybrid: Radio };

export default function EventCard({ event, index = 0, compact = false }) {
  const cat = categoryMeta(event.categorySlug);
  const TypeIcon = typeIcon[event.eventType] || Building2;
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
        className="group flex h-full flex-col overflow-hidden rounded-xl border bg-card shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lift"
      >
        <div className="relative aspect-[16/9] overflow-hidden">
          <img
            src={event.coverImage}
            alt={event.title}
            loading="lazy"
            className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
          <div className="absolute left-3 top-3 flex gap-2">
            <span
              className="rounded-full px-2.5 py-1 text-[11px] font-bold text-white shadow"
              style={{ backgroundColor: cat.color || '#6d28d9' }}
            >
              {cat.name}
            </span>
            {isLive && (
              <Badge variant="live" className="animate-pulse">
                <span className="size-1.5 rounded-full bg-white" /> LIVE
              </Badge>
            )}
          </div>
          <div className="absolute right-3 top-3" onClick={(e) => e.preventDefault()}>
            <FavoriteButton eventId={event._id} favorite={event.isFavorite} size="sm" />
          </div>
          <div className="absolute bottom-3 left-3 rounded-lg bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur flex items-center gap-1">
            <TypeIcon className="size-3" /> {typeLabel[event.eventType]}
          </div>
        </div>

        <div className="flex flex-1 flex-col p-4">
          <h3 className="font-display text-base font-bold leading-snug line-clamp-2 group-hover:text-primary transition">
            {event.title}
          </h3>
          <div className="mt-2 space-y-1.5 text-xs text-muted-foreground">
            <p className="flex items-center gap-1.5">
              <CalendarDays className="size-3.5 shrink-0" />
              {fmtDate(event.startDate, compact ? 'd MMM' : 'EEE, d MMM')}
            </p>
            <p className="flex items-center gap-1.5">
              <MapPin className="size-3.5 shrink-0" />
              {event.venue?.city || event.venue?.name || 'Online'}
            </p>
          </div>

          {!compact && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1"><Users className="size-3" /> {event.registrationCount || 0} registered</span>
                <span className={seatsLeft < 10 ? 'font-bold text-warning' : ''}>
                  {seatsLeft === 0 ? 'Full — waitlist' : `${seatsLeft} seats left`}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full ${fillPct > 90 ? 'bg-warning' : 'gradient-brand'}`}
                  style={{ width: `${fillPct}%` }}
                />
              </div>
            </div>
          )}

          <div className="mt-auto flex items-center justify-between pt-4">
            <span className="font-display font-extrabold text-base">
              {event.price > 0 || (event.ticketTypes || []).some((t) => t.price > 0) ? (
                <span className="flex items-center"><IndianRupee className="size-4" />{Math.min(...[event.price || Infinity, ...event.ticketTypes.filter((t) => t.price > 0).map((t) => t.price)])} onward</span>
              ) : (
                <span className="text-success">Free</span>
              )}
            </span>
            <span className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary transition group-hover:bg-primary group-hover:text-white">
              Register
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
