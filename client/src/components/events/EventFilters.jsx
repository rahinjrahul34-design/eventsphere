import { X, SlidersHorizontal } from 'lucide-react';
import { Chip } from '../ui/misc';
import { Button } from '../ui/button';
import { EVENT_CATEGORIES } from '../../lib/format';
import { useState } from 'react';

const DATE_OPTIONS = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This week' },
  { value: 'past', label: 'Past' },
];
const TYPE_OPTIONS = [
  { value: 'offline', label: 'In person' },
  { value: 'online', label: 'Online' },
  { value: 'hybrid', label: 'Hybrid' },
];
const PRICE_OPTIONS = [
  { value: 'free', label: 'Free' },
  { value: 'paid', label: 'Paid' },
];

function FilterGroup({ label, children }) {
  return (
    <div>
      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export default function EventFilters({ filters, setFilters, onClear, categories = EVENT_CATEGORIES, className = '' }) {
  return (
    <div className={`space-y-5 ${className}`}>
      <FilterGroup label="Date">
        {DATE_OPTIONS.map((o) => (
          <Chip key={o.value} active={filters.date === o.value} onClick={() => setFilters({ ...filters, date: filters.date === o.value ? '' : o.value })}>
            {o.label}
          </Chip>
        ))}
      </FilterGroup>
      <FilterGroup label="Format">
        {TYPE_OPTIONS.map((o) => (
          <Chip key={o.value} active={filters.type === o.value} onClick={() => setFilters({ ...filters, type: filters.type === o.value ? '' : o.value })}>
            {o.label}
          </Chip>
        ))}
      </FilterGroup>
      <FilterGroup label="Price">
        {PRICE_OPTIONS.map((o) => (
          <Chip key={o.value} active={filters.price === o.value} onClick={() => setFilters({ ...filters, price: filters.price === o.value ? '' : o.value })}>
            {o.label}
          </Chip>
        ))}
      </FilterGroup>
      <FilterGroup label="Category">
        {categories.map((c) => (
          <Chip key={c.slug} active={filters.category === c.slug} onClick={() => setFilters({ ...filters, category: filters.category === c.slug ? '' : c.slug })}>
            <span className="size-2 rounded-full" style={{ backgroundColor: c.color }} />
            {c.name}
          </Chip>
        ))}
      </FilterGroup>
      <FilterGroup label="Location">
        <input
          value={filters.city || ''}
          onChange={(e) => setFilters({ ...filters, city: e.target.value })}
          placeholder="e.g. Nashik"
          className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </FilterGroup>
      <Button variant="outline" size="sm" className="w-full" onClick={onClear}>
        <X className="size-4" /> Clear all filters
      </Button>
    </div>
  );
}

export function FilterDrawer(props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" size="sm" className="lg:hidden" onClick={() => setOpen(true)}>
        <SlidersHorizontal className="size-4" /> Filters
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-80 max-w-[85vw] overflow-y-auto bg-card p-5 animate-fade-in">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-bold text-lg">Filters</h3>
              <button onClick={() => setOpen(false)} aria-label="Close"><X className="size-5" /></button>
            </div>
            <EventFilters {...props} onClear={() => { props.onClear(); setOpen(false); }} />
          </div>
        </div>
      )}
    </>
  );
}
