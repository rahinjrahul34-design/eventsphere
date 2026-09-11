import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { fmtDate } from '../../lib/format';
import { categoryMeta } from '../../lib/format';

function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export default function EventCalendarView({ events = [] }) {
  const [cursor, setCursor] = useState(() => {
    const first = events[0]?.startDate ? new Date(events[0].startDate) : new Date();
    return new Date(first.getFullYear(), first.getMonth(), 1);
  });

  const byDay = useMemo(() => {
    const map = {};
    events.forEach((e) => {
      const d = new Date(e.startDate);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      (map[key] ||= []).push(e);
    });
    return map;
  }, [events]);

  const first = startOfMonth(cursor);
  const gridStart = new Date(first);
  gridStart.setDate(1 - first.getDay());
  const weeks = [];
  for (let w = 0; w < 6; w += 1) {
    weeks.push(Array.from({ length: 7 }, (_, d) => {
      const day2 = new Date(gridStart);
      day2.setDate(gridStart.getDate() + w * 7 + d);
      return day2;
    }));
  }

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-lg font-bold">{fmtDate(cursor, 'MMMM yyyy')}</h3>
        <div className="flex gap-1">
          <button className="grid size-9 place-items-center rounded-lg border hover:bg-secondary" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} aria-label="Previous month">
            <ChevronLeft className="size-4" />
          </button>
          <button className="grid size-9 place-items-center rounded-lg border hover:bg-secondary" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} aria-label="Next month">
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold uppercase text-muted-foreground">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <div key={d} className="py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {weeks.flat().map((d, i) => {
          const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
          const dayEvents = byDay[key] || [];
          const inMonth = d.getMonth() === cursor.getMonth();
          return (
            <div key={i} className={`min-h-[72px] rounded-lg border p-1 ${inMonth ? 'bg-background' : 'bg-muted/30 opacity-50'}`}>
              <span className="text-[11px] font-bold text-muted-foreground">{d.getDate()}</span>
              <div className="mt-0.5 space-y-0.5">
                {dayEvents.slice(0, 2).map((e) => (
                  <Link key={e._id} to={`/events/${e.slug}`}
                    className="block truncate rounded px-1 py-0.5 text-[10px] font-semibold text-white"
                    style={{ backgroundColor: categoryMeta(e.categorySlug).color }}
                    title={e.title}>
                    {e.title}
                  </Link>
                ))}
                {dayEvents.length > 2 && <p className="px-1 text-[10px] font-bold text-primary">+{dayEvents.length - 2} more</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
