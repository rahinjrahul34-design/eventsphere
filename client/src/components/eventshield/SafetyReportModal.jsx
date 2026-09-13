import { Printer, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Spinner } from '../ui/misc';
import { riskBadgeVariant, riskLabel } from './shieldUtils';

export default function SafetyReportModal({ report, loading, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="relative max-h-[92vh] w-full max-w-4xl space-y-6 overflow-y-auto card-surface p-6 shadow-2xl sm:p-8 print:max-h-none print:p-0">
        <div className="flex items-center justify-between border-b pb-4 print:hidden">
          <div className="flex items-center gap-2">
            <Printer className="size-5 text-primary" />
            <h3 className="font-display text-lg font-black">AI-assisted operational planning report</h3>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => window.print()} className="font-bold">Print / Save as PDF</Button>
            <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label="Close">
              <X className="size-5" />
            </button>
          </div>
        </div>

        {loading ? (
          <Spinner />
        ) : report ? (
          <div id="print-area" className="space-y-6 print:text-black">
            <div className="flex items-start justify-between border-b pb-4">
              <div>
                <h2 className="font-display text-2xl font-black">{report.event.title}</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Report ref: <strong className="font-mono text-foreground">{report.reportId}</strong>
                </p>
                <p className="text-xs text-muted-foreground">Generated {new Date(report.generatedAt).toLocaleString()}</p>
              </div>
              <div className="text-right">
                <Badge variant="outline" className="px-3 py-1 font-mono text-sm font-bold">
                  Safety {report.scores.safetyScore}/100
                </Badge>
                <div className="mt-1">
                  <Badge variant={riskBadgeVariant(report.scores.overallRiskLevel)}>
                    {riskLabel(report.scores.overallRiskLevel)}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 rounded-xl border bg-muted/20 p-4 text-xs sm:grid-cols-4">
              <Meta label="Format" value={report.event.eventType} />
              <Meta label="Capacity" value={`${report.event.capacity} seats`} />
              <Meta label="Registrations" value={report.event.registrationCount} />
              <Meta label="Readiness" value={`${report.scores.readinessScore}%`} />
            </div>

            {report.executiveSummary && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Executive assessment</h4>
                <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-muted-foreground">{report.executiveSummary}</p>
              </div>
            )}

            <div>
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Category breakdown</h4>
              <table className="w-full border-collapse border text-left text-xs">
                <thead>
                  <tr className="border-b bg-muted/40 font-bold">
                    <th className="border-r p-2">Category</th>
                    <th className="border-r p-2">Score</th>
                    <th className="border-r p-2">Risk</th>
                    <th className="p-2">Primary recommendation</th>
                  </tr>
                </thead>
                <tbody>
                  {report.categories?.map((cat) => (
                    <tr key={cat.id} className="border-b">
                      <td className="border-r p-2 font-semibold">{cat.name}</td>
                      <td className="border-r p-2 font-mono font-bold">{cat.score}</td>
                      <td className="border-r p-2 text-[10px] font-bold uppercase">{cat.riskLevel}</td>
                      <td className="p-2 text-muted-foreground">{cat.recommendations?.[0] || 'Nominal.'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="border-t pt-4 text-[11px] leading-relaxed text-muted-foreground">
              <strong>Notice:</strong> {report.disclaimer} This is an AI-assisted operational planning report, not a legal safety certification.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Meta({ label, value }) {
  return (
    <div>
      <span className="font-semibold text-muted-foreground">{label}</span>
      <p className="font-bold capitalize">{value}</p>
    </div>
  );
}
