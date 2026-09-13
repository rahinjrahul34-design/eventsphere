import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import { Activity, Clock, Info } from 'lucide-react';

export default function HealthTimelineChart({ trends = [] }) {
  const hasHistory = trends && trends.length > 1;

  return (
    <div className="card-surface p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-4">
        <div>
          <h3 className="font-display text-base font-bold flex items-center gap-2">
            <Activity className="size-4 text-primary" />
            <span>Health & Operational Timeline</span>
          </h3>
          <p className="text-xs text-muted-foreground">Historical progression of health score, registrations, and predicted turnout.</p>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-primary" /> Health (0–100)
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-blue-500" /> Attendance Forecast
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-emerald-500" /> Registrations
          </span>
        </div>
      </div>

      {!hasHistory ? (
        <div className="rounded-xl border border-dashed py-12 px-4 text-center space-y-2">
          <div className="grid size-10 place-items-center rounded-xl bg-secondary text-muted-foreground mx-auto">
            <Clock className="size-5" />
          </div>
          <h4 className="font-bold text-sm text-foreground">Awaiting Historical Trend Data</h4>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            More historical timeline snapshots will appear as your event generates continuous registration and check-in activity.
          </p>
        </div>
      ) : (
        <div className="h-[280px] w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="healthGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="attGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="regGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-xl border bg-popover/95 p-3 shadow-lg backdrop-blur-sm text-xs space-y-1">
                        <p className="font-bold text-popover-foreground">{label}</p>
                        {payload.map((p, i) => (
                          <div key={i} className="flex items-center justify-between gap-4">
                            <span style={{ color: p.color }} className="font-semibold">{p.name}:</span>
                            <span className="font-bold font-mono text-popover-foreground">{p.value}</span>
                          </div>
                        ))}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area type="monotone" dataKey="healthScore" name="Health Score" stroke="hsl(var(--primary))" strokeWidth={2.5} fillOpacity={1} fill="url(#healthGrad)" />
              <Area type="monotone" dataKey="predictedAttendance" name="Predicted Attendance" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#attGrad)" />
              <Area type="monotone" dataKey="registrations" name="Registrations" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#regGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
