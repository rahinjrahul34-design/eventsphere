import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend, RadialBarChart, RadialBar,
} from 'recharts';

const COLORS = ['#7c3aed', '#2563eb', '#16a34a', '#d97706', '#db2777', '#0891b2', '#dc2626', '#4f46e5'];
const GRID = 'rgba(130,130,150,0.2)';

const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid hsl(var(--border))',
  background: 'hsl(var(--card))',
  color: 'hsl(var(--card-foreground))',
  fontSize: 12,
};

export function TrendChart({ data, xKey = 'date', lines, height = 260 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <defs>
          {lines.map((l) => (
            <linearGradient key={l.key} id={`grad-${l.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={l.color || COLORS[0]} stopOpacity={0.35} />
              <stop offset="100%" stopColor={l.color || COLORS[0]} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} width={48} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} />
        {lines.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
        {lines.map((l) => (
          <Area key={l.key} type="monotone" dataKey={l.key} name={l.label || l.key} stroke={l.color || COLORS[0]}
            strokeWidth={2.5} fill={`url(#grad-${l.key})`} />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function BarsChart({ data, xKey = 'name', valueKey = 'value', height = 260, color = COLORS[0], layout = 'horizontal' }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout={layout} margin={{ top: 8, right: 12, left: layout === 'vertical' ? 24 : -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={layout === 'horizontal'} horizontal={layout === 'vertical'} />
        {layout === 'horizontal' ? (
          <>
            <XAxis dataKey={xKey} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} allowDecimals={false} />
          </>
        ) : (
          <>
            <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey={xKey} width={110} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
          </>
        )}
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'hsl(var(--muted) / 0.5)' }} />
        <Bar dataKey={valueKey} fill={color} radius={layout === 'horizontal' ? [6, 6, 0, 0] : [0, 6, 6, 0]} maxBarSize={42} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DonutChart({ data, height = 260, nameKey = 'name', valueKey = 'value' }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} dataKey={valueKey} nameKey={nameKey} innerRadius={55} outerRadius={85} paddingAngle={3} strokeWidth={0}>
          {data.map((d, i) => <Cell key={i} fill={d.color || COLORS[i % COLORS.length]} />)}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function GaugeChart({ value, label = '' }) {
  const data = [{ name: 'x', value, fill: COLORS[0] }];
  return (
    <ResponsiveContainer width="100%" height={190}>
      <RadialBarChart cx="50%" cy="60%" innerRadius="70%" outerRadius="100%" data={data} startAngle={180} endAngle={0}>
        <RadialBar background={{ fill: 'hsl(var(--muted))' }} dataKey="value" cornerRadius={12} />
        <text x="50%" y="58%" textAnchor="middle" style={{ fontSize: 30, fontWeight: 800, fill: 'hsl(var(--foreground))' }}>
          {value}%
        </text>
        {label && <text x="50%" y="78%" textAnchor="middle" style={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}>{label}</text>}
      </RadialBarChart>
    </ResponsiveContainer>
  );
}

export { COLORS };
