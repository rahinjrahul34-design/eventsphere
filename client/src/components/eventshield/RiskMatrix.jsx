import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Badge } from '../ui/badge';
import { riskBadgeVariant, riskLabel } from './shieldUtils';

const tone = (v) => (v === 'high' ? 'text-rose-500' : v === 'medium' ? 'text-amber-500' : 'text-emerald-500');

export default function RiskMatrix({ matrix = [] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Risk priority matrix</CardTitle>
        <CardDescription className="text-xs">Probability × impact of detected operational gaps.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b bg-muted/40 font-bold uppercase text-muted-foreground">
                <th className="p-3">Risk</th>
                <th className="p-3">Probability</th>
                <th className="p-3">Impact</th>
                <th className="p-3">Priority</th>
                <th className="p-3">Recommended action</th>
              </tr>
            </thead>
            <tbody>
              {matrix.map((m, idx) => (
                <tr key={idx} className="border-b hover:bg-muted/10">
                  <td className="max-w-xs p-3 font-semibold">{m.risk}</td>
                  <td className={`p-3 font-bold capitalize ${tone(m.probability)}`}>{m.probability}</td>
                  <td className={`p-3 font-bold capitalize ${tone(m.impact)}`}>{m.impact}</td>
                  <td className="p-3"><Badge variant={riskBadgeVariant(m.priority)}>{riskLabel(m.priority)}</Badge></td>
                  <td className="max-w-sm p-3 text-muted-foreground">{m.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
