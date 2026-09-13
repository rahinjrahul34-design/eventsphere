import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, Link } from 'react-router-dom';
import { Activity, Plus, Radio, RefreshCw, ExternalLink } from 'lucide-react';
import { endpoints } from '../../lib/api';
import { getSocket } from '../../lib/socket';
import { ErrorState } from '../../components/ui/misc';
import { DashboardSkeleton } from '../../components/ui/skeleton';
import { EmptyState } from '../../components/ui/states';
import { Button } from '../../components/ui/button';
import ExecutiveSummaryCard from '../../components/commandCenter/ExecutiveSummaryCard';
import IntelligenceCardsGrid from '../../components/commandCenter/IntelligenceCardsGrid';
import ActionCenter from '../../components/commandCenter/ActionCenter';
import AiExecutiveBrief from '../../components/commandCenter/AiExecutiveBrief';
import WhatIfSimulator from '../../components/commandCenter/WhatIfSimulator';
import HealthTimelineChart from '../../components/commandCenter/HealthTimelineChart';
import UnifiedAlertFeed from '../../components/commandCenter/UnifiedAlertFeed';
import { toast } from 'sonner';

export default function CommandCenter() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [isLive, setIsLive] = useState(false);

  // 1. Fetch organizer's events list for the selector
  const eventsQuery = useQuery({
    queryKey: ['my-events-selector'],
    queryFn: async () => {
      const all = await endpoints.myEvents();
      return all || [];
    },
  });

  const events = eventsQuery.data || [];
  const queryEventId = searchParams.get('eventId');
  const selectedEventId = queryEventId || (events.length > 0 ? events[0]._id : null);

  // 2. Fetch Command Center intelligence for selected event
  const ccQuery = useQuery({
    queryKey: ['command-center', selectedEventId],
    queryFn: () => endpoints.commandCenter.get(selectedEventId),
    enabled: !!selectedEventId,
    staleTime: 1000 * 30, // 30s fresh
  });

  // 3. Socket.IO Realtime Integration
  useEffect(() => {
    if (!selectedEventId) return undefined;

    const socket = getSocket();
    if (!socket) return undefined;

    socket.emit('event:subscribe', selectedEventId);
    setIsLive(socket.connected);

    const onConnect = () => setIsLive(true);
    const onDisconnect = () => setIsLive(false);

    const onAlert = (alert) => {
      toast.warning(`Operational Alert: ${alert.message || 'Safety update'}`);
      queryClient.invalidateQueries({ queryKey: ['command-center', selectedEventId] });
    };

    const onAlertResolved = () => {
      queryClient.invalidateQueries({ queryKey: ['command-center', selectedEventId] });
    };

    const onPulseUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['command-center', selectedEventId] });
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('eventshield:alert', onAlert);
    socket.on('eventshield:alert_resolved', onAlertResolved);
    socket.on('eventpulse:updated', onPulseUpdate);

    return () => {
      socket.emit('event:unsubscribe', selectedEventId);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('eventshield:alert', onAlert);
      socket.off('eventshield:alert_resolved', onAlertResolved);
      socket.off('eventpulse:updated', onPulseUpdate);
    };
  }, [selectedEventId, queryClient]);

  const handleSelectEvent = (id) => {
    setSearchParams({ eventId: id });
  };

  const handleRefresh = async () => {
    await ccQuery.refetch();
    toast.success('Command Center intelligence refreshed');
  };

  if (eventsQuery.isLoading) return <DashboardSkeleton />;
  if (eventsQuery.isError) return <ErrorState message={eventsQuery.error.message} onRetry={eventsQuery.refetch} />;

  if (events.length === 0) {
    return (
      <EmptyState
        icon={Activity}
        title="No events created yet"
        description="The AI Command Center connects predictive models, safety shields, waitlists, and SEO profiles for your active events. Create your first event to activate the intelligence layer."
        className="mx-auto max-w-lg"
        action={
          <Link to="/dashboard/events/create">
            <Button>
              <Plus /> Create your first event
            </Button>
          </Link>
        }
      />
    );
  }

  const data = ccQuery.data;

  return (
    <div className="space-y-6 pb-12">
      {/* ── HEADER ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 border-b pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg gradient-brand text-white shadow-soft">
              <Activity className="size-4.5" style={{ width: 18, height: 18 }} aria-hidden="true" />
            </span>
            <h1 className="font-display text-2xl font-extrabold tracking-tight">AI Command Center</h1>
            {isLive ? (
              <span className="inline-flex items-center gap-1.5 rounded-md border border-success/25 bg-success/10 px-2 py-0.5 text-[11px] font-bold text-success">
                <span className="size-1.5 animate-pulse rounded-full bg-current" aria-hidden="true" />
                LIVE
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-md border bg-secondary px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
                <Radio className="size-3" aria-hidden="true" />
                Connecting
              </span>
            )}
          </div>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Unified event intelligence — predictive risks, automated waitlists and recommended actions in one place.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedEventId || ''}
            onChange={(e) => handleSelectEvent(e.target.value)}
            aria-label="Select event"
            className="h-9 max-w-[240px] cursor-pointer appearance-none rounded-lg border border-input bg-card pl-3 pr-9 text-sm font-semibold text-foreground shadow-soft transition-colors hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%23a1a1b5' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>\")",
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 0.65rem center',
              backgroundSize: '14px',
            }}
          >
            {events.map((e) => (
              <option key={e._id} value={e._id}>
                {e.title} ({e.status})
              </option>
            ))}
          </select>
          <Button variant="outline" size="sm" onClick={handleRefresh} loading={ccQuery.isRefetching}>
            <RefreshCw /> Refresh
          </Button>
          {selectedEventId && (
            <Link
              to={`/dashboard/events/${selectedEventId}`}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-bold text-foreground shadow-soft transition-colors hover:bg-secondary"
            >
              <ExternalLink className="size-3.5" aria-hidden="true" /> Manage
            </Link>
          )}
        </div>
      </div>

      {/* ── BODY ───────────────────────────────────────────────── */}
      {ccQuery.isLoading ? (
        <DashboardSkeleton />
      ) : ccQuery.isError ? (
        <ErrorState message={ccQuery.error.message} onRetry={ccQuery.refetch} />
      ) : !data ? null : (
        <div className="space-y-6">
          {/* Event summary + health score */}
          <ExecutiveSummaryCard
            overallHealth={data.overallHealth}
            onRefresh={handleRefresh}
            isRefreshing={ccQuery.isRefetching}
            isLive={isLive}
            lastUpdated={data.freshness?.aggregatedAt}
          />

          {/* Intelligence cards */}
          <IntelligenceCardsGrid data={data} />

          {/* Critical alerts */}
          <UnifiedAlertFeed alerts={data.alerts} />

          {/* Recommended actions */}
          <ActionCenter actions={data.actions} eventId={selectedEventId} onActionResolved={() => ccQuery.refetch()} />

          {/* AI executive brief */}
          <AiExecutiveBrief initialBrief={data.summary} eventId={selectedEventId} />

          {/* Trends / timeline */}
          <HealthTimelineChart trends={data.trends} />

          {/* What-if simulator */}
          <WhatIfSimulator eventId={selectedEventId} baselineHealth={data.overallHealth} />
        </div>
      )}
    </div>
  );
}
