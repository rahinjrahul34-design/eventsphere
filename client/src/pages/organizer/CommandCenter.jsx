import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Activity, Calendar, ChevronDown, Plus, Radio, Clock,
  RefreshCw, ShieldCheck, Sparkles, AlertTriangle
} from 'lucide-react';
import { endpoints } from '../../lib/api';
import { getSocket } from '../../lib/socket';
import { Spinner, ErrorState } from '../../components/ui/misc';
import ExecutiveSummaryCard from '../../components/commandCenter/ExecutiveSummaryCard';
import IntelligenceCardsGrid from '../../components/commandCenter/IntelligenceCardsGrid';
import ActionCenter from '../../components/commandCenter/ActionCenter';
import AiExecutiveBrief from '../../components/commandCenter/AiExecutiveBrief';
import WhatIfSimulator from '../../components/commandCenter/WhatIfSimulator';
import HealthTimelineChart from '../../components/commandCenter/HealthTimelineChart';
import UnifiedAlertFeed from '../../components/commandCenter/UnifiedAlertFeed';
import { Badge } from '../../components/ui/badge';
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
    if (!selectedEventId) return;

    const socket = getSocket();
    if (!socket) return;

    socket.emit('event:subscribe', selectedEventId);
    setIsLive(socket.connected);

    const onConnect = () => setIsLive(true);
    const onDisconnect = () => setIsLive(false);

    const onAlert = (alert) => {
      toast.warning(`Operational Alert: ${alert.message || 'Safety update'}`);
      queryClient.invalidateQueries(['command-center', selectedEventId]);
    };

    const onAlertResolved = () => {
      queryClient.invalidateQueries(['command-center', selectedEventId]);
    };

    const onPulseUpdate = () => {
      queryClient.invalidateQueries(['command-center', selectedEventId]);
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

  if (eventsQuery.isLoading) return <Spinner />;
  if (eventsQuery.isError) return <ErrorState message={eventsQuery.error.message} onRetry={eventsQuery.refetch} />;

  if (events.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed py-16 px-6 text-center space-y-4 max-w-lg mx-auto">
        <div className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary mx-auto">
          <Activity className="size-6" />
        </div>
        <div className="space-y-1">
          <h3 className="font-display text-lg font-bold text-foreground">No Events Created Yet</h3>
          <p className="text-xs text-muted-foreground">
            The AI Command Center connects predictive models, safety shields, waitlists, and SEO profiles for your active events.
          </p>
        </div>
        <Link
          to="/dashboard/events/create"
          className="inline-flex items-center gap-2 rounded-xl gradient-brand px-5 py-2.5 text-xs font-bold text-white shadow hover:opacity-90 transition"
        >
          <Plus className="size-4" />
          <span>Create Your First Event</span>
        </Link>
      </div>
    );
  }

  const data = ccQuery.data;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Event Selector Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-xl gradient-brand text-white shadow-sm">
              <Activity className="size-4" />
            </span>
            <h1 className="font-display text-2xl font-black tracking-tight text-foreground">
              AI Command Center
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Unified event intelligence, predictive risks, automated waitlists, and recommended actions in one place.
          </p>
        </div>

        {/* Event Selector & Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Selector Dropdown */}
          <div className="relative">
            <select
              value={selectedEventId || ''}
              onChange={(e) => handleSelectEvent(e.target.value)}
              className="appearance-none rounded-xl border bg-card pl-3 pr-9 py-2 text-xs font-bold text-foreground shadow-sm hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition cursor-pointer"
            >
              {events.map((e) => (
                <option key={e._id} value={e._id}>
                  {e.title} ({e.status})
                </option>
              ))}
            </select>
            <ChevronDown className="size-3.5 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Direct Link to Manage Event */}
          {selectedEventId && (
            <Link
              to={`/dashboard/events/${selectedEventId}`}
              className="rounded-xl border bg-secondary/80 px-3 py-2 text-xs font-bold text-foreground hover:bg-secondary transition"
            >
              Manage Event
            </Link>
          )}
        </div>
      </div>

      {/* Main Content Loading / Error / Data */}
      {ccQuery.isLoading ? (
        <Spinner />
      ) : ccQuery.isError ? (
        <ErrorState message={ccQuery.error.message} onRetry={ccQuery.refetch} />
      ) : !data ? null : (
        <div className="space-y-6">
          {/* 1. Executive Summary + Event Health Score (hero) */}
          <ExecutiveSummaryCard
            overallHealth={data.overallHealth}
            onRefresh={handleRefresh}
            isRefreshing={ccQuery.isRefetching}
            isLive={isLive}
            lastUpdated={data.freshness?.aggregatedAt}
          />

          {/* 2. Modular Intelligence Cards */}
          <IntelligenceCardsGrid data={data} />

          {/* 3. Critical Alerts */}
          <UnifiedAlertFeed alerts={data.alerts} />

          {/* 4. Recommended Actions */}
          <ActionCenter
            actions={data.actions}
            eventId={selectedEventId}
            onActionResolved={() => ccQuery.refetch()}
          />

          {/* 5. AI Executive Brief */}
          <AiExecutiveBrief
            initialBrief={data.summary}
            eventId={selectedEventId}
          />

          {/* 6. Trends + 7. What-If Simulator */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <HealthTimelineChart trends={data.trends} />
            <WhatIfSimulator
              eventId={selectedEventId}
              baselineHealth={data.overallHealth}
            />
          </div>
        </div>
      )}
    </div>
  );
}
