import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldAlert, Sliders, CheckSquare, AlertCircle, Clock, LayoutGrid } from 'lucide-react';
import { endpoints } from '../../../lib/api';
import { Spinner, ErrorState } from '../../../components/ui/misc';
import { toast } from 'sonner';

import DisclaimerBanner from '../../../components/eventshield/DisclaimerBanner';
import ShieldHero from '../../../components/eventshield/ShieldHero';
import LiveMonitor from '../../../components/eventshield/LiveMonitor';
import ActionCenter from '../../../components/eventshield/ActionCenter';
import RiskCategoryGrid from '../../../components/eventshield/RiskCategoryGrid';
import WhatIfSimulator from '../../../components/eventshield/WhatIfSimulator';
import SafetyChecklist from '../../../components/eventshield/SafetyChecklist';
import RiskMatrix from '../../../components/eventshield/RiskMatrix';
import RiskHistory from '../../../components/eventshield/RiskHistory';
import AiExplanation from '../../../components/eventshield/AiExplanation';
import AlertsStrip from '../../../components/eventshield/AlertsStrip';
import SafetyConfigModal from '../../../components/eventshield/SafetyConfigModal';
import SafetyReportModal from '../../../components/eventshield/SafetyReportModal';

const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'categories', label: 'Risk categories', icon: ShieldAlert },
  { id: 'simulator', label: 'What-If', icon: Sliders },
  { id: 'checklist', label: 'Checklist', icon: CheckSquare },
  { id: 'matrix', label: 'Matrix', icon: AlertCircle },
  { id: 'history', label: 'History', icon: Clock },
];

function emptyConfig(event) {
  return {
    emergencyContact: {
      name: event.safetyConfig?.emergencyContact?.name || '',
      phone: event.safetyConfig?.emergencyContact?.phone || '',
      role: event.safetyConfig?.emergencyContact?.role || '',
    },
    firstAidStation: {
      location: event.safetyConfig?.firstAidStation?.location || '',
      details: event.safetyConfig?.firstAidStation?.details || '',
    },
    entryGates: event.safetyConfig?.entryGates || 2,
    checkInDesks: event.safetyConfig?.checkInDesks || 2,
    staffCount: event.safetyConfig?.staffCount || 0,
    parkingCapacity: event.safetyConfig?.parkingCapacity || 0,
    parkingInfo: event.safetyConfig?.parkingInfo || '',
    accessibilityInfo: {
      hasRampAccess: Boolean(event.safetyConfig?.accessibilityInfo?.hasRampAccess),
      hasWheelchairSeating: Boolean(event.safetyConfig?.accessibilityInfo?.hasWheelchairSeating),
      accessibilityContact: event.safetyConfig?.accessibilityInfo?.accessibilityContact || '',
      notes: event.safetyConfig?.accessibilityInfo?.notes || '',
    },
    evacuationInstructions: event.safetyConfig?.evacuationInstructions || '',
    isOutdoor: Boolean(event.safetyConfig?.isOutdoor),
  };
}

export default function EventShieldTab() {
  const { event } = useOutletContext();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState('overview');
  const [expandedCategory, setExpandedCategory] = useState('capacity');
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reviewedIds, setReviewedIds] = useState(() => new Set());
  const [configForm, setConfigForm] = useState(() => emptyConfig(event));

  const simInitial = useMemo(() => ({
    capacity: event.capacity || 100,
    registrations: event.registrationCount || 0,
    entryGates: event.safetyConfig?.entryGates || 2,
    checkInDesks: event.safetyConfig?.checkInDesks || 2,
    staffCount: event.safetyConfig?.staffCount || 4,
    parkingCapacity: event.safetyConfig?.parkingCapacity || 0,
    isOutdoor: Boolean(event.safetyConfig?.isOutdoor),
    hasEmergencyContact: Boolean(event.safetyConfig?.emergencyContact?.phone),
    hasFirstAid: Boolean(event.safetyConfig?.firstAidStation?.location),
    hasAccessibility: Boolean(event.safetyConfig?.accessibilityInfo?.hasRampAccess),
  }), [event]);

  const assessmentQ = useQuery({
    queryKey: ['eventshield-assessment', event._id],
    queryFn: () => endpoints.eventShield.getAssessment(event._id),
  });

  const alertsQ = useQuery({
    queryKey: ['eventshield-alerts', event._id],
    queryFn: () => endpoints.eventShield.getAlerts(event._id),
    refetchInterval: 15000,
  });

  const historyQ = useQuery({
    queryKey: ['eventshield-history', event._id],
    queryFn: () => endpoints.eventShield.getHistory(event._id),
  });

  const reportQ = useQuery({
    queryKey: ['eventshield-report', event._id],
    queryFn: () => endpoints.eventShield.getReport(event._id),
    enabled: showReportModal,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['eventshield-assessment', event._id] });
    qc.invalidateQueries({ queryKey: ['eventshield-alerts', event._id] });
    qc.invalidateQueries({ queryKey: ['eventshield-history', event._id] });
  };

  const analyzeMutation = useMutation({
    mutationFn: () => endpoints.eventShield.analyze(event._id, { trigger: 'manual' }),
    onSuccess: () => {
      toast.success('EventShield risk assessment updated');
      invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateConfigMutation = useMutation({
    mutationFn: (body) => endpoints.eventShield.updateSafetyConfig(event._id, body),
    onSuccess: () => {
      toast.success('Safety configuration saved and risk recalculated');
      setShowConfigModal(false);
      invalidate();
      qc.invalidateQueries({ queryKey: ['manage-event', event._id] });
    },
    onError: (e) => toast.error(e.message),
  });

  const toggleChecklistMutation = useMutation({
    mutationFn: ({ itemId, status }) => endpoints.eventShield.updateChecklistItem(event._id, { itemId, status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['eventshield-assessment', event._id] }),
    onError: (e) => toast.error(e.message),
  });

  const resolveAlertMutation = useMutation({
    mutationFn: (alertId) => endpoints.eventShield.resolveAlert(event._id, alertId),
    onSuccess: () => {
      toast.success('Alert marked as resolved');
      qc.invalidateQueries({ queryKey: ['eventshield-alerts', event._id] });
    },
    onError: (e) => toast.error(e.message),
  });

  if (assessmentQ.isLoading) return <Spinner />;
  if (assessmentQ.isError) {
    return <ErrorState message={assessmentQ.error.message} onRetry={assessmentQ.refetch} />;
  }

  const assessment = assessmentQ.data;
  const activeAlerts = (alertsQ.data || []).filter((a) => a.status === 'active');

  const openConfig = () => {
    setConfigForm(emptyConfig(event));
    setShowConfigModal(true);
  };

  return (
    <div className="space-y-6">
      <DisclaimerBanner text={assessment.disclaimer} />

      <ShieldHero
        assessment={assessment}
        event={event}
        activeAlertCount={activeAlerts.length}
        analyzing={analyzeMutation.isPending}
        onAnalyze={() => analyzeMutation.mutate()}
        onOpenConfig={openConfig}
        onOpenReport={() => setShowReportModal(true)}
      />

      <AlertsStrip
        alerts={activeAlerts}
        onResolve={(id) => resolveAlertMutation.mutate(id)}
        pending={resolveAlertMutation.isPending}
      />

      <nav className="no-scrollbar flex gap-2 overflow-x-auto border-b border-border/80 pb-1" aria-label="EventShield sections">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold transition-all sm:text-sm ${
              activeTab === tab.id
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
            }`}
          >
            <tab.icon className="size-4" />
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <LiveMonitor event={event} assessment={assessment} alerts={activeAlerts} />
          <AiExplanation summary={assessment.summary} engine={assessment.engine} topRisks={assessment.topRisks} />
          <ActionCenter
            categories={assessment.categories}
            reviewedIds={reviewedIds}
            onFix={() => openConfig()}
            onReviewed={(item) => {
              setReviewedIds((prev) => new Set(prev).add(item.id));
              toast.success('Marked reviewed — internal note only');
            }}
          />
        </div>
      )}

      {activeTab === 'categories' && (
        <RiskCategoryGrid
          categories={assessment.categories}
          expandedId={expandedCategory}
          onToggle={setExpandedCategory}
        />
      )}

      {activeTab === 'simulator' && (
        <WhatIfSimulator eventId={event._id} event={event} initial={simInitial} />
      )}

      {activeTab === 'checklist' && (
        <SafetyChecklist
          items={assessment.checklist || []}
          pending={toggleChecklistMutation.isPending}
          onToggle={(itemId, status) => toggleChecklistMutation.mutate({ itemId, status })}
        />
      )}

      {activeTab === 'matrix' && <RiskMatrix matrix={assessment.matrix || []} />}

      {activeTab === 'history' && <RiskHistory history={historyQ.data || []} />}

      {showConfigModal && (
        <SafetyConfigModal
          form={configForm}
          setForm={setConfigForm}
          onClose={() => setShowConfigModal(false)}
          saving={updateConfigMutation.isPending}
          onSave={() => updateConfigMutation.mutate(configForm)}
        />
      )}

      {showReportModal && (
        <SafetyReportModal
          report={reportQ.data}
          loading={reportQ.isLoading}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </div>
  );
}
