import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { LayoutGrid, List, CalendarDays, ArrowDownWideNarrow, Search, X } from 'lucide-react';
import { endpoints } from '../lib/api';
import EventCard from '../components/events/EventCard';
import EventFilters, { FilterDrawer } from '../components/events/EventFilters';
import EventCalendarView from '../components/events/EventCalendarView';
import { EmptyState, ErrorState } from '../components/ui/states';
import { GridSkeleton } from '../components/ui/skeleton';
import { Button } from '../components/ui/button';
import { Select } from '../components/ui/input';
import { Link } from 'react-router-dom';
import { fmtDate, fmtTime, inr, typeLabel, categoryMeta } from '../lib/format';
import FavoriteButton from '../components/events/FavoriteButton';

const EMPTY = { q: '', category: '', type: '', city: '', price: '', date: 'upcoming', sort: 'date' };

export default function Events() {
  const [params, setParams] = useSearchParams();
  const [filters, setFilters] = useState({
    ...EMPTY,
    q: params.get('q') || '',
    category: params.get('category') || '',
  });
  const [view, setView] = useState('grid');
  const [page, setPage] = useState(1);
  const [allEvents, setAllEvents] = useState([]);

  useEffect(() => {
    const q = params.get('q') || '';
    const category = params.get('category') || '';
    setFilters((f) => ({ ...f, q, category }));
  }, [params]);

  const query = useQuery({
    queryKey: ['events', filters, page],
    queryFn: () => endpoints.events({ ...filters, page, limit: 9 }),
    onSuccess: undefined,
  });
  // React Query v5 doesn't support onSuccess; sync via effect:
  useEffect(() => {
    if (query.data) {
      setAllEvents((prev) => (page === 1 ? query.data.events : [...prev, ...query.data.events.filter((e) => !prev.some((p) => p._id === e._id))]));
    }
  }, [query.data, page]);

  useEffect(() => setPage(1), [filters]);

  const updateFilters = (f) => {
    setFilters(f);
    setParams((p) => {
      const next = {};
      if (f.q) next.q = f.q;
      if (f.category) next.category = f.category;
      return new URLSearchParams(next);
    });
  };

  const pagination = query.data?.pagination;
  const hasMore = pagination && page < pagination.pages;
  const hasFilters = Object.entries(filters).some(([k, v]) => v && k !== 'date' && k !== 'sort');

  return (
    <div className="container py-8">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-extrabold">Discover events</h1>
        <p className="mt-1 text-muted-foreground">Find your next hackathon, workshop, meetup or summit.</p>
      </div>

      {/* Search + sort bar */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <input
            value={filters.q}
            onChange={(e) => updateFilters({ ...filters, q: e.target.value })}
            placeholder="Search events…"
            className="h-10 w-full rounded-lg border border-input bg-card pl-9 pr-9 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          {filters.q && (
            <button className="absolute right-3 top-2.5 text-muted-foreground" onClick={() => updateFilters({ ...filters, q: '' })} aria-label="Clear">
              <X className="size-4" />
            </button>
          )}
        </div>
        <FilterDrawer filters={filters} setFilters={updateFilters} onClear={() => updateFilters({ ...EMPTY })} />
        <div className="flex items-center gap-2">
          <div className="relative">
            <ArrowDownWideNarrow className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Select
              value={filters.sort}
              onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
              className="pl-9 w-auto"
            >
              <option value="date">Date</option>
              <option value="popular">Most popular</option>
              <option value="newest">Newest</option>
              <option value="price-low">Price: low to high</option>
            </Select>
          </div>
          <div className="flex rounded-lg border bg-card p-1">
            {[['grid', LayoutGrid], ['list', List], ['calendar', CalendarDays]].map(([v, Icon]) => (
              <button
                key={v}
                onClick={() => setView(v)}
                aria-label={`${v} view`}
                className={`grid size-8 place-items-center rounded-md transition ${view === v ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary'}`}
              >
                <Icon className="size-4" />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-xl border bg-card p-5">
            <h2 className="mb-4 font-bold">Filters</h2>
            <EventFilters filters={filters} setFilters={updateFilters} onClear={() => updateFilters({ ...EMPTY })} />
          </div>
        </aside>

        <div>
          {query.isLoading && <GridSkeleton count={6} />}
          {query.isError && <ErrorState message={query.error.message} onRetry={query.refetch} />}
          {query.data && allEvents.length === 0 && (
            <EmptyState
              icon={Search}
              title="No events match your filters"
              description="Try widening your date range, clearing the category filter, or explore everything happening nearby."
              action={hasFilters ? <Button variant="outline" onClick={() => updateFilters({ ...EMPTY })}>Clear filters</Button> : <Link to="/dashboard/events/create"><Button>Create an event</Button></Link>}
            />
          )}

          {query.data && view === 'grid' && allEvents.length > 0 && (
            <>
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {allEvents.map((e, i) => <EventCard key={e._id} event={e} index={i} />)}
              </div>
              {hasMore && (
                <div className="mt-8 text-center">
                  <Button variant="outline" size="lg" loading={query.isFetching} onClick={() => setPage((p) => p + 1)}>
                    Load more events
                  </Button>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Showing {allEvents.length} of {pagination.total}
                  </p>
                </div>
              )}
            </>
          )}

          {query.data && view === 'list' && allEvents.length > 0 && (
            <div className="space-y-3">
              {allEvents.map((e) => <EventRow key={e._id} event={e} />)}
            </div>
          )}

          {query.data && view === 'calendar' && <EventCalendarView events={allEvents} />}
        </div>
      </div>
    </div>
  );
}

function EventRow({ event }) {
  const cat = categoryMeta(event.categorySlug);
  return (
    <Link to={`/events/${event.slug}`} className="group flex gap-4 rounded-xl border bg-card p-3 shadow-soft hover:shadow-lift transition">
      <img src={event.coverImage} alt="" className="hidden sm:block size-28 rounded-lg object-cover" />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-[11px] font-bold" style={{ color: cat.color }}>{cat.name} · {typeLabel[event.eventType]}</span>
            <h3 className="font-display text-lg font-bold leading-tight group-hover:text-primary">{event.title}</h3>
          </div>
          <FavoriteButton eventId={event._id} favorite={event.isFavorite} size="sm" />
        </div>
        <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{event.shortDescription}</p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>{fmtDate(event.startDate)} · {fmtTime(event.startDate)}</span>
          <span>{event.venue?.city || 'Online'}</span>
          <span>{event.registrationCount} registered</span>
          <span className="font-bold">{inr(event.price)}</span>
        </div>
      </div>
    </Link>
  );
}
