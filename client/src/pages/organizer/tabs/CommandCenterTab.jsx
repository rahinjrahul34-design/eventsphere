import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { endpoints } from '../../../lib/api';
import { getSocket } from '../../../lib/socket';
import { Spinner, ErrorState } from '../../../components/ui/misc';
import ExecutiveSummaryCard from '../../../components/commandCenter/ExecutiveSummaryCard';
import IntelligenceCardsGrid from '../../../components/commandCenter/IntelligenceCardsGrid';
import ActionCenter from '../../../components/commandCenter/ActionCenter';
import AiExecutiveBrief from '../../../components/commandCenter/AiExecutiveBrief';
import WhatIfSimulator from '../../../components/commandCenter/WhatIfSimulator';
import HealthTimelineChart from '../../../components/commandCenter/HealthTimelineChart';
import UnifiedAlertFeed from '../../../components/commandCenter/UnifiedAlertFeed';
import { toast } from 'sonner';

export default function CommandCenterTab() {
  const { event } = useOutletContext();
  const eventId = event?._id;
  const queryClient = useQueryClient();
  const [isLive, setIsLive] = useState(false);

  const ccQuery = useQuery({
    queryKey: ['command-center', eventId],
    queryFn: () => endpoints.commandCenter.get(eventId),
    enabled: !!eventId,
    staleTime: 1000 * 30,
  });

  // Realtime Socket.IO synchronization
  useEffect(() => {
    if (!eventId) return;

    const socket = getSocket();
    if (!socket) return;

    socket.emit('event:subscribe', eventId);
    setIsLive(socket.connected);

    const onConnect = () => setIsLive(true);
    const onDisconnect = () => setIsLive(false);

    const onAlert = (alert) => {
      toast.warning(`Operational Alert: ${alert.message || 'Safety update'}`);
      queryClient.invalidateQueries(['command-center', eventId]);
    };

    const onAlertResolved = () => {
      queryClient.invalidateQueries(['command-center', eventId]);
    };

    const onPulseUpdate = () => {
      queryClient.invalidateQueries(['command-center', eventId]);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('eventshield:alert', onAlert);
    socket.on('eventshield:alert_resolved', onAlertResolved);
    socket.on('eventpulse:updated', onPulseUpdate);

    return () => {
      socket.emit('event:unsubscribe', eventId);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('eventshield:alert', onAlert);
      socket.off('eventshield:alert_resolved', onAlertResolved);
      socket.off('eventpulse:updated', onPulseUpdate);
    };
  }, [eventId, queryClient]);

  const handleRefresh = async () => {
    await ccQuery.refetch();
    toast.success('Command Center intelligence refreshed');
  };

  if (ccQuery.isLoading) return <Spinner />;
  if (ccQuery.isError) return <ErrorState message={ccQuery.error.message} onRetry={ccQuery.refetch} />;
  const data = ccQuery.data;
  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Executive Summary Card */}
      <ExecutiveSummaryCard
        overallHealth={data.overallHealth}
        onRefresh={handleRefresh}
        isRefreshing={ccQuery.isRefetching}
        isLive={isLive}
        lastUpdated={data.freshness?.aggregatedAt}
      />

      {/* AI Executive Brief */}
      <AiExecutiveBrief
        initialBrief={data.summary}
        eventId={eventId}
      />

      {/* 6 Modular Intelligence Cards Grid */}
      <IntelligenceCardsGrid data={data} />

      {/* Action Center */}
      <ActionCenter
        actions={data.actions}
        eventId={eventId}
        onActionResolved={() => ccQuery.refetch()}
      />

      {/* What-If Scenario Simulator */}
      <WhatIfSimulator
        eventId={eventId}
        baselineHealth={data.overallHealth}
      />

      {/* Bottom Grid: Health Timeline Chart + Unified Alert Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <HealthTimelineChart trends={data.trends} />
        <UnifiedAlertFeed alerts={data.alerts} />
      </div>
    </div>
  );
}
