import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShieldAlert, ShieldCheck, AlertTriangle, AlertCircle, CheckCircle2,
  RefreshCw, Printer, Sliders, ChevronDown, ChevronRight, Info,
  Flame, Sparkles, Building2, Users2, Clock, PhoneCall, Stethoscope,
  CloudSun, Accessibility, Car, HelpCircle, Ticket, XCircle, CheckSquare,
  Square, Settings2, Save, X, Activity, ExternalLink,
} from 'lucide-react';
import { endpoints } from '../../../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Spinner, ErrorState } from '../../../components/ui/misc';
import { TrendChart } from '../../../components/charts/Charts';
import { toast } from 'sonner';

export default function EventShieldTab() {
  const { event } = useOutletContext();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState('categories'); // 'categories' | 'simulator' | 'checklist' | 'matrix' | 'history'
  const [expandedCategory, setExpandedCategory] = useState('capacity');
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  // Safety Config Form State
  const [configForm, setConfigForm] = useState({
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
  });

  // Simulator Params State
  const [simParams, setSimParams] = useState({
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
  });
  const [simResult, setSimResult] = useState(null);
  const [simLoading, setSimLoading] = useState(false);

  // Queries
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

  // Mutations
  const analyzeMutation = useMutation({
    mutationFn: () => endpoints.eventShield.analyze(event._id, { trigger: 'manual' }),
    onSuccess: (data) => {
      toast.success('EventShield AI risk assessment updated!');
      qc.invalidateQueries({ queryKey: ['eventshield-assessment', event._id] });
      qc.invalidateQueries({ queryKey: ['eventshield-alerts', event._id] });
      qc.invalidateQueries({ queryKey: ['eventshield-history', event._id] });
    },
    onError: (e) => toast.error(e.message),
  });

  const updateConfigMutation = useMutation({
    mutationFn: (body) => endpoints.eventShield.updateSafetyConfig(event._id, body),
    onSuccess: () => {
      toast.success('Safety configuration saved and risk recalculated!');
      setShowConfigModal(false);
      qc.invalidateQueries({ queryKey: ['eventshield-assessment', event._id] });
      qc.invalidateQueries({ queryKey: ['eventshield-alerts', event._id] });
      qc.invalidateQueries({ queryKey: ['manage-event', event._id] });
    },
    onError: (e) => toast.error(e.message),
  });

  const toggleChecklistMutation = useMutation({
    mutationFn: ({ itemId, status }) =>
      endpoints.eventShield.updateChecklistItem(event._id, { itemId, status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['eventshield-assessment', event._id] });
    },
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

  // Run Simulator on param change
  const runSimulation = async (params) => {
    setSimLoading(true);
    try {
      const res = await endpoints.eventShield.simulate(event._id, params);
      setSimResult(res);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSimLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'simulator' && !simResult) {
      runSimulation(simParams);
    }
  }, [activeTab]);

  if (assessmentQ.isLoading) return <Spinner />;
  if (assessmentQ.isError) {
    return <ErrorState message={assessmentQ.error.message} onRetry={assessmentQ.refetch} />;
  }

  const assessment = assessmentQ.data;
  const activeAlerts = (alertsQ.data || []).filter((a) => a.status === 'active');

  const getScoreColor = (score) => {
    if (score >= 85) return 'text-emerald-500 border-emerald-500/30 bg-emerald-500/10';
    if (score >= 70) return 'text-amber-500 border-amber-500/30 bg-amber-500/10';
    return 'text-rose-500 border-rose-500/30 bg-rose-500/10';
  };

  const getRiskBadge = (level) => {
    switch (level?.toLowerCase()) {
      case 'critical':
        return <Badge variant="destructive" className="uppercase font-bold tracking-wider">Critical Risk</Badge>;
      case 'high':
        return <Badge variant="destructive" className="bg-rose-600 uppercase font-bold tracking-wider">High Risk</Badge>;
      case 'medium':
        return <Badge className="bg-amber-500 text-white uppercase font-bold tracking-wider">Medium Risk</Badge>;
      default:
        return <Badge variant="success" className="uppercase font-bold tracking-wider">Low Risk</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Official Legal / Operational Safety Disclaimer Banner */}
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-600 dark:text-amber-400 flex items-start gap-3 shadow-sm">
        <Info className="size-5 shrink-0 mt-0.5 text-amber-500" />
        <div className="flex-1">
          <p className="font-semibold text-amber-700 dark:text-amber-300">Safety & Operational Intelligence Notice</p>
          <p className="text-xs leading-relaxed mt-0.5 text-amber-800/90 dark:text-amber-200/90">
            {assessment.disclaimer}
          </p>
        </div>
      </div>

      {/* Top Banner & Action Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border bg-gradient-to-r from-card to-card/60 p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ShieldAlert className="size-5" />
            </span>
            <div>
              <h1 className="font-display text-2xl font-black tracking-tight">EventShield AI</h1>
              <p className="text-xs font-semibold text-muted-foreground">
                Safety & Operations Intelligence Engine • Hybrid Rule & AI Reasoning
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1 font-medium">
              <Activity className="size-3.5 text-primary" />
              Engine: <strong className="text-foreground">{assessment.engine || 'hybrid'}</strong>
            </span>
            <span>•</span>
            <span>Last analyzed: {new Date(assessment.analyzedAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            <span>•</span>
            <span>Version v{assessment.version || 1}.0</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowConfigModal(true)}
            className="font-bold"
          >
            <Settings2 className="mr-1.5 size-4" /> Safety Settings
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowReportModal(true)}
            className="font-bold"
          >
            <Printer className="mr-1.5 size-4" /> Export Report
          </Button>

          <Button
            size="sm"
            onClick={() => analyzeMutation.mutate()}
            disabled={analyzeMutation.isPending}
            className="gradient-brand font-bold text-white shadow-md hover:opacity-95"
          >
            <RefreshCw className={`mr-1.5 size-4 ${analyzeMutation.isPending ? 'animate-spin' : ''}`} />
            {analyzeMutation.isPending ? 'Analyzing Risk...' : 'Run AI Analysis'}
          </Button>
        </div>
      </div>

      {/* Primary Intelligence Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Safety Score */}
        <Card className="relative overflow-hidden border-2">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Event Safety Score</p>
              <ShieldCheck className="size-5 text-primary" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className={`font-display text-4xl font-extrabold ${getScoreColor(assessment.safetyScore).split(' ')[0]}`}>
                {assessment.safetyScore}
              </span>
              <span className="text-sm font-semibold text-muted-foreground">/ 100</span>
            </div>
            <div className="mt-2 text-xs font-medium text-muted-foreground">
              Deterministic weighted evaluation of 15 safety vectors
            </div>
          </CardContent>
        </Card>

        {/* Operational Readiness */}
        <Card className="relative overflow-hidden border-2">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Readiness Index</p>
              <Building2 className="size-5 text-primary" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-display text-4xl font-extrabold text-blue-500">
                {assessment.readinessScore}%
              </span>
              <span className="text-xs font-semibold text-muted-foreground">Ready</span>
            </div>
            <div className="mt-2 text-xs font-medium text-muted-foreground">
              Logistics, ticketing, checklist & venue setup progress
            </div>
          </CardContent>
        </Card>

        {/* Overall Risk Level */}
        <Card className="relative overflow-hidden border-2">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Overall Risk Level</p>
              <Flame className="size-5 text-amber-500" />
            </div>
            <div className="mt-3">
              {getRiskBadge(assessment.overallRiskLevel)}
            </div>
            <div className="mt-3 text-xs font-medium text-muted-foreground">
              {assessment.topRisks?.length || 0} active vulnerabilities identified
            </div>
          </CardContent>
        </Card>

        {/* Active Realtime Alerts */}
        <Card className="relative overflow-hidden border-2">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Realtime Alerts</p>
              <AlertTriangle className={`size-5 ${activeAlerts.length > 0 ? 'text-rose-500 animate-pulse' : 'text-emerald-500'}`} />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className={`font-display text-4xl font-extrabold ${activeAlerts.length > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                {activeAlerts.length}
              </span>
              <span className="text-xs font-semibold text-muted-foreground">Active</span>
            </div>
            <div className="mt-2 text-xs font-medium text-muted-foreground">
              {activeAlerts.length > 0 ? 'Requires immediate action' : 'Thresholds fully nominal'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Realtime Critical Alerts Banner */}
      {activeAlerts.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-rose-500 flex items-center gap-1.5">
            <AlertTriangle className="size-4 animate-bounce" /> Live Operational Alerts ({activeAlerts.length})
          </h3>
          <div className="grid gap-3 md:grid-cols-2">
            {activeAlerts.map((alert) => (
              <div
                key={alert._id}
                className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display text-xs font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">
                      [{alert.severity}] {alert.type.replace('_', ' ')}
                    </span>
                    <Badge variant="destructive" className="text-[10px] py-0 font-bold">Active</Badge>
                  </div>
                  <p className="mt-1 text-sm font-semibold text-foreground">{alert.message}</p>
                  {alert.actionRequired && (
                    <p className="mt-2 text-xs font-medium text-muted-foreground bg-card/60 p-2 rounded-lg border">
                      <strong>Action Required:</strong> {alert.actionRequired}
                    </p>
                  )}
                </div>
                <div className="mt-3 pt-2 border-t border-rose-500/20 flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">
                    Triggered {new Date(alert.createdAt).toLocaleTimeString()}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs border-rose-500/40 text-rose-600 hover:bg-rose-500 hover:text-white"
                    onClick={() => resolveAlertMutation.mutate(alert._id)}
                    disabled={resolveAlertMutation.isPending}
                  >
                    Mark Resolved
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Executive Summary Narrative */}
      {assessment.summary && (
        <Card className="border-primary/20 bg-primary/[0.02]">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              <CardTitle className="text-base font-bold">AI Executive Safety Summary & Reasoning</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Contextual analysis synthesized from current attendee volume, venue capacity, and emergency settings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {assessment.summary}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sub-Navigation Tabs */}
      <div className="flex border-b border-border/80 gap-2 overflow-x-auto no-scrollbar pb-1">
        {[
          { id: 'categories', label: '15 Risk Categories', icon: ShieldAlert },
          { id: 'simulator', label: 'What-If Simulator', icon: Sliders },
          { id: 'checklist', label: 'Safety Checklist', icon: CheckSquare },
          { id: 'matrix', label: 'Priority Matrix (3x3)', icon: AlertCircle },
          { id: 'history', label: 'Score Timeline', icon: Clock },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${
              activeTab === tab.id
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
            }`}
          >
            <tab.icon className="size-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* TAB 1: 15 Risk Categories Accordion & Breakdown */}
      {activeTab === 'categories' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-muted-foreground">
              Comprehensive Category Evaluation
            </h3>
            <span className="text-xs font-semibold text-muted-foreground">15 of 15 Evaluated</span>
          </div>

          <div className="space-y-2.5">
            {assessment.categories?.map((cat) => {
              const isExpanded = expandedCategory === cat.id;
              const hasIssues = cat.issues && cat.issues.length > 0;

              return (
                <div
                  key={cat.id}
                  className={`rounded-xl border transition-all ${
                    isExpanded ? 'border-primary/50 shadow-md bg-card' : 'border-border bg-card/60 hover:border-border/80'
                  }`}
                >
                  <button
                    onClick={() => setExpandedCategory(isExpanded ? null : cat.id)}
                    className="w-full flex items-center justify-between p-4 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl font-display font-black text-sm border ${getScoreColor(cat.score)}`}>
                        {cat.score}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-foreground">{cat.name}</h4>
                          {getRiskBadge(cat.riskLevel)}
                          {hasIssues && (
                            <span className="text-xs font-semibold text-rose-500">
                              • {cat.issues.length} issue(s)
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {cat.issues?.[0] || cat.recommendations?.[0] || 'Nominal operational status.'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-muted-foreground hidden sm:inline">
                        {Math.round(cat.confidence * 100)}% confidence
                      </span>
                      {isExpanded ? (
                        <ChevronDown className="size-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="size-4 text-muted-foreground" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t px-4 py-4 space-y-4 bg-muted/10 text-xs">
                      {/* Issues */}
                      {hasIssues && (
                        <div>
                          <p className="font-extrabold uppercase tracking-wider text-rose-500 mb-1.5 flex items-center gap-1">
                            <AlertCircle className="size-3.5" /> Issues Detected
                          </p>
                          <ul className="list-disc pl-5 space-y-1 text-rose-600 dark:text-rose-400 font-medium">
                            {cat.issues.map((issue, idx) => (
                              <li key={idx}>{issue}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Recommendations */}
                      {cat.recommendations?.length > 0 && (
                        <div>
                          <p className="font-extrabold uppercase tracking-wider text-primary mb-1.5 flex items-center gap-1">
                            <CheckCircle2 className="size-3.5" /> Actionable Recommendations
                          </p>
                          <ul className="list-disc pl-5 space-y-1 text-foreground/90 font-medium">
                            {cat.recommendations.map((rec, idx) => (
                              <li key={idx}>{rec}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Evidence */}
                      {cat.evidence?.length > 0 && (
                        <div className="bg-card p-3 rounded-lg border">
                          <p className="font-extrabold uppercase tracking-wider text-muted-foreground mb-1">
                            Telemetry Evidence
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {cat.evidence.map((ev, idx) => (
                              <Badge key={idx} variant="secondary" className="font-mono text-[11px]">
                                {ev}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: Fast What-If Simulator (Pure In-Memory) */}
      {activeTab === 'simulator' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sliders className="size-5 text-primary" />
                <CardTitle className="text-base font-bold">What-If Risk & Capacity Simulator</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Test parameter changes in real time. Runs purely in-memory with zero database mutations.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Sliders Grid */}
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {/* Capacity */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span>Venue Capacity</span>
                    <span className="font-mono text-primary">{simParams.capacity} attendees</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="5000"
                    step="10"
                    value={simParams.capacity}
                    onChange={(e) => {
                      const updated = { ...simParams, capacity: Number(e.target.value) };
                      setSimParams(updated);
                      runSimulation(updated);
                    }}
                    className="w-full accent-primary"
                  />
                </div>

                {/* Expected Attendees */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span>Expected Registrations</span>
                    <span className="font-mono text-primary">{simParams.registrations} attendees</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="5000"
                    step="10"
                    value={simParams.registrations}
                    onChange={(e) => {
                      const updated = { ...simParams, registrations: Number(e.target.value) };
                      setSimParams(updated);
                      runSimulation(updated);
                    }}
                    className="w-full accent-primary"
                  />
                </div>

                {/* Entry Gates */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span>Entry Gates</span>
                    <span className="font-mono text-primary">{simParams.entryGates} gates</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    step="1"
                    value={simParams.entryGates}
                    onChange={(e) => {
                      const updated = { ...simParams, entryGates: Number(e.target.value) };
                      setSimParams(updated);
                      runSimulation(updated);
                    }}
                    className="w-full accent-primary"
                  />
                </div>

                {/* Check-in Desks */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span>Check-in Desks</span>
                    <span className="font-mono text-primary">{simParams.checkInDesks} desks</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="30"
                    step="1"
                    value={simParams.checkInDesks}
                    onChange={(e) => {
                      const updated = { ...simParams, checkInDesks: Number(e.target.value) };
                      setSimParams(updated);
                      runSimulation(updated);
                    }}
                    className="w-full accent-primary"
                  />
                </div>

                {/* Staff / Volunteers */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span>Staff / Volunteers</span>
                    <span className="font-mono text-primary">{simParams.staffCount} staff</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={simParams.staffCount}
                    onChange={(e) => {
                      const updated = { ...simParams, staffCount: Number(e.target.value) };
                      setSimParams(updated);
                      runSimulation(updated);
                    }}
                    className="w-full accent-primary"
                  />
                </div>

                {/* Parking Capacity */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span>Parking Bays</span>
                    <span className="font-mono text-primary">{simParams.parkingCapacity} spots</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="2000"
                    step="20"
                    value={simParams.parkingCapacity}
                    onChange={(e) => {
                      const updated = { ...simParams, parkingCapacity: Number(e.target.value) };
                      setSimParams(updated);
                      runSimulation(updated);
                    }}
                    className="w-full accent-primary"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 pt-2 border-t">
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={simParams.hasEmergencyContact}
                    onChange={(e) => {
                      const updated = { ...simParams, hasEmergencyContact: e.target.checked };
                      setSimParams(updated);
                      runSimulation(updated);
                    }}
                    className="rounded text-primary"
                  />
                  <span>24/7 Emergency Contact</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={simParams.hasFirstAid}
                    onChange={(e) => {
                      const updated = { ...simParams, hasFirstAid: e.target.checked };
                      setSimParams(updated);
                      runSimulation(updated);
                    }}
                    className="rounded text-primary"
                  />
                  <span>First-Aid Station Ready</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={simParams.hasAccessibility}
                    onChange={(e) => {
                      const updated = { ...simParams, hasAccessibility: e.target.checked };
                      setSimParams(updated);
                      runSimulation(updated);
                    }}
                    className="rounded text-primary"
                  />
                  <span>Ramp & Wheelchair Access</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={simParams.isOutdoor}
                    onChange={(e) => {
                      const updated = { ...simParams, isOutdoor: e.target.checked };
                      setSimParams(updated);
                      runSimulation(updated);
                    }}
                    className="rounded text-primary"
                  />
                  <span>Outdoor Venue</span>
                </label>
              </div>

              {/* Simulation Result Comparison */}
              {simResult && (
                <div className="rounded-xl border bg-muted/20 p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                        Simulated Outcome Comparison
                      </p>
                      <div className="mt-1 flex items-baseline gap-3">
                        <span className="text-sm font-medium text-muted-foreground">
                          Baseline: <strong>{simResult.baselineSafetyScore}/100</strong>
                        </span>
                        <span className="text-lg">➔</span>
                        <span className={`font-display text-3xl font-black ${getScoreColor(simResult.simulatedSafetyScore).split(' ')[0]}`}>
                          {simResult.simulatedSafetyScore}/100
                        </span>
                        <Badge
                          variant={simResult.deltaSafety >= 0 ? 'success' : 'destructive'}
                          className="font-bold text-xs"
                        >
                          {simResult.deltaSafety > 0 ? `+${simResult.deltaSafety}` : simResult.deltaSafety} pts
                        </Badge>
                      </div>
                    </div>

                    <div>
                      {getRiskBadge(simResult.simulatedRiskLevel)}
                    </div>
                  </div>

                  {simResult.recommendations?.length > 0 && (
                    <div className="space-y-1 border-t pt-3">
                      {simResult.recommendations.map((rec, i) => (
                        <p key={i} className="text-xs font-medium text-foreground flex items-center gap-1.5">
                          <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
                          {rec}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 3: Dynamic Safety Checklist */}
      {activeTab === 'checklist' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold">Dynamic Safety & Operational Checklist</CardTitle>
                <CardDescription className="text-xs">
                  Actionable compliance items prioritized by severity. Completing items improves Operational Readiness.
                </CardDescription>
              </div>
              <Badge variant="outline" className="font-mono text-xs">
                {assessment.checklist?.filter((c) => c.status === 'completed').length || 0} / {assessment.checklist?.length || 0} Complete
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            {assessment.checklist?.map((item) => {
              const isDone = item.status === 'completed';

              return (
                <div
                  key={item.id}
                  onClick={() =>
                    toggleChecklistMutation.mutate({
                      itemId: item.id,
                      status: isDone ? 'pending' : 'completed',
                    })
                  }
                  className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                    isDone ? 'bg-emerald-500/[0.04] border-emerald-500/30' : 'bg-card hover:border-primary/40'
                  }`}
                >
                  <button className="mt-0.5 text-primary">
                    {isDone ? (
                      <CheckSquare className="size-5 text-emerald-500" />
                    ) : (
                      <Square className="size-5 text-muted-foreground" />
                    )}
                  </button>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold ${isDone ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                        {item.title}
                      </span>
                      <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider">
                        {item.category}
                      </Badge>
                      <Badge
                        variant={item.priority === 'high' ? 'destructive' : item.priority === 'medium' ? 'warning' : 'secondary'}
                        className="text-[10px] uppercase font-bold"
                      >
                        {item.priority}
                      </Badge>
                    </div>

                    {isDone && item.completedAt && (
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">
                        Completed {new Date(item.completedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* TAB 4: 3x3 Risk Priority Matrix */}
      {activeTab === 'matrix' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold">3x3 Risk Priority Matrix</CardTitle>
            <CardDescription className="text-xs">
              Probability vs Impact distribution of evaluated event operational risks.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/40 font-bold uppercase text-muted-foreground">
                      <th className="p-3">Risk Scenario</th>
                      <th className="p-3">Probability</th>
                      <th className="p-3">Impact</th>
                      <th className="p-3">Priority</th>
                      <th className="p-3">Mitigation Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assessment.matrix?.map((m, idx) => (
                      <tr key={idx} className="border-b hover:bg-muted/10">
                        <td className="p-3 font-semibold text-foreground max-w-xs">{m.risk}</td>
                        <td className="p-3">
                          <span className={`font-bold capitalize ${m.probability === 'high' ? 'text-rose-500' : m.probability === 'medium' ? 'text-amber-500' : 'text-emerald-500'}`}>
                            {m.probability}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`font-bold capitalize ${m.impact === 'high' ? 'text-rose-500' : m.impact === 'medium' ? 'text-amber-500' : 'text-emerald-500'}`}>
                            {m.impact}
                          </span>
                        </td>
                        <td className="p-3">
                          {getRiskBadge(m.priority)}
                        </td>
                        <td className="p-3 text-muted-foreground max-w-sm">{m.action}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* TAB 5: Historical Score Evolution */}
      {activeTab === 'history' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold">Risk Assessment Evolution</CardTitle>
            <CardDescription className="text-xs">
              Historical progression of Event Safety and Operational Readiness over time.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {historyQ.data?.length > 1 ? (
              <TrendChart
                data={historyQ.data.map((h) => ({
                  date: new Date(h.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  safety: h.safetyScore,
                  readiness: h.readinessScore,
                }))}
                xKey="date"
                lines={[
                  { key: 'safety', label: 'Safety Score (0-100)', color: '#10b981' },
                  { key: 'readiness', label: 'Readiness (%)', color: '#3b82f6' },
                ]}
                height={280}
              />
            ) : (
              <p className="text-xs text-muted-foreground py-4 text-center">
                Baseline assessment recorded. Additional snapshots are generated as registrations change or AI evaluations run.
              </p>
            )}

            <div className="space-y-2 border-t pt-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Snapshot History</h4>
              {historyQ.data?.slice(-5).reverse().map((h) => (
                <div key={h._id} className="flex items-center justify-between p-3 rounded-lg border bg-card/60 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground">Safety: {h.safetyScore}/100</span>
                      <span className="text-muted-foreground">• Readiness: {h.readinessScore}%</span>
                      {getRiskBadge(h.overallRiskLevel)}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Trigger: <span className="capitalize font-medium text-foreground">{h.trigger}</span> • {new Date(h.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {h.delta !== 0 && (
                    <Badge variant={h.delta > 0 ? 'success' : 'destructive'} className="font-bold">
                      {h.delta > 0 ? `+${h.delta}` : h.delta}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Safety Settings Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-2xl border bg-card p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Settings2 className="size-5 text-primary" />
                <h3 className="font-display text-lg font-black">Event Safety & Operations Settings</h3>
              </div>
              <button onClick={() => setShowConfigModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Emergency Contact */}
              <div className="space-y-2">
                <h4 className="font-bold uppercase tracking-wider text-primary">Emergency Lead Contact</h4>
                <div className="grid gap-2 sm:grid-cols-3">
                  <div>
                    <label className="text-muted-foreground font-semibold">Contact Name</label>
                    <input
                      type="text"
                      className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-foreground"
                      placeholder="e.g. Officer John Smith"
                      value={configForm.emergencyContact.name}
                      onChange={(e) => setConfigForm({
                        ...configForm,
                        emergencyContact: { ...configForm.emergencyContact, name: e.target.value },
                      })}
                    />
                  </div>
                  <div>
                    <label className="text-muted-foreground font-semibold">Phone Number *</label>
                    <input
                      type="text"
                      className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-foreground"
                      placeholder="e.g. +1-555-0199"
                      value={configForm.emergencyContact.phone}
                      onChange={(e) => setConfigForm({
                        ...configForm,
                        emergencyContact: { ...configForm.emergencyContact, phone: e.target.value },
                      })}
                    />
                  </div>
                  <div>
                    <label className="text-muted-foreground font-semibold">Role / Title</label>
                    <input
                      type="text"
                      className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-foreground"
                      placeholder="e.g. Safety Coordinator"
                      value={configForm.emergencyContact.role}
                      onChange={(e) => setConfigForm({
                        ...configForm,
                        emergencyContact: { ...configForm.emergencyContact, role: e.target.value },
                      })}
                    />
                  </div>
                </div>
              </div>

              {/* Medical / First Aid */}
              <div className="space-y-2 border-t pt-3">
                <h4 className="font-bold uppercase tracking-wider text-primary">Medical & First-Aid Station</h4>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <label className="text-muted-foreground font-semibold">Station Location</label>
                    <input
                      type="text"
                      className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-foreground"
                      placeholder="e.g. Lobby North, Booth 12"
                      value={configForm.firstAidStation.location}
                      onChange={(e) => setConfigForm({
                        ...configForm,
                        firstAidStation: { ...configForm.firstAidStation, location: e.target.value },
                      })}
                    />
                  </div>
                  <div>
                    <label className="text-muted-foreground font-semibold">Equipment / Staffing Details</label>
                    <input
                      type="text"
                      className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-foreground"
                      placeholder="e.g. Defibrillator (AED), 2 paramedics"
                      value={configForm.firstAidStation.details}
                      onChange={(e) => setConfigForm({
                        ...configForm,
                        firstAidStation: { ...configForm.firstAidStation, details: e.target.value },
                      })}
                    />
                  </div>
                </div>
              </div>

              {/* Ingress / Egress & Staffing */}
              <div className="space-y-2 border-t pt-3">
                <h4 className="font-bold uppercase tracking-wider text-primary">Gates, Desks & Staffing</h4>
                <div className="grid gap-2 sm:grid-cols-3">
                  <div>
                    <label className="text-muted-foreground font-semibold">Active Entry Gates</label>
                    <input
                      type="number"
                      min="1"
                      className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-foreground"
                      value={configForm.entryGates}
                      onChange={(e) => setConfigForm({ ...configForm, entryGates: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="text-muted-foreground font-semibold">Check-in Desks</label>
                    <input
                      type="number"
                      min="1"
                      className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-foreground"
                      value={configForm.checkInDesks}
                      onChange={(e) => setConfigForm({ ...configForm, checkInDesks: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="text-muted-foreground font-semibold">Dedicated Staff / Volunteers</label>
                    <input
                      type="number"
                      min="0"
                      className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-foreground"
                      value={configForm.staffCount}
                      onChange={(e) => setConfigForm({ ...configForm, staffCount: Number(e.target.value) })}
                    />
                  </div>
                </div>
              </div>

              {/* Parking & Transit */}
              <div className="space-y-2 border-t pt-3">
                <h4 className="font-bold uppercase tracking-wider text-primary">Parking & Transit</h4>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <label className="text-muted-foreground font-semibold">Parking Bays Capacity</label>
                    <input
                      type="number"
                      min="0"
                      className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-foreground"
                      placeholder="Number of parking bays"
                      value={configForm.parkingCapacity}
                      onChange={(e) => setConfigForm({ ...configForm, parkingCapacity: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="text-muted-foreground font-semibold">Transit & Parking Instructions</label>
                    <input
                      type="text"
                      className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-foreground"
                      placeholder="e.g. Metro Line 2 stop directly outside hall"
                      value={configForm.parkingInfo}
                      onChange={(e) => setConfigForm({ ...configForm, parkingInfo: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Accessibility */}
              <div className="space-y-2 border-t pt-3">
                <h4 className="font-bold uppercase tracking-wider text-primary">Accessibility Provisions</h4>
                <div className="flex flex-wrap gap-4 pt-1">
                  <label className="flex items-center gap-2 font-semibold">
                    <input
                      type="checkbox"
                      checked={configForm.accessibilityInfo.hasRampAccess}
                      onChange={(e) => setConfigForm({
                        ...configForm,
                        accessibilityInfo: { ...configForm.accessibilityInfo, hasRampAccess: e.target.checked },
                      })}
                      className="rounded text-primary"
                    />
                    <span>Wheelchair Ramp Access Available</span>
                  </label>

                  <label className="flex items-center gap-2 font-semibold">
                    <input
                      type="checkbox"
                      checked={configForm.accessibilityInfo.hasWheelchairSeating}
                      onChange={(e) => setConfigForm({
                        ...configForm,
                        accessibilityInfo: { ...configForm.accessibilityInfo, hasWheelchairSeating: e.target.checked },
                      })}
                      className="rounded text-primary"
                    />
                    <span>Reserved Accessible Seating</span>
                  </label>
                </div>
              </div>

              {/* Evacuation & Outdoor Flag */}
              <div className="space-y-2 border-t pt-3">
                <h4 className="font-bold uppercase tracking-wider text-primary">Evacuation & Environment</h4>
                <div>
                  <label className="text-muted-foreground font-semibold">Evacuation Instructions</label>
                  <textarea
                    rows={2}
                    className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-foreground"
                    placeholder="e.g. Exit through East emergency stairs, assemble at North parking lot."
                    value={configForm.evacuationInstructions}
                    onChange={(e) => setConfigForm({ ...configForm, evacuationInstructions: e.target.value })}
                  />
                </div>

                <div className="pt-1">
                  <label className="flex items-center gap-2 font-semibold">
                    <input
                      type="checkbox"
                      checked={configForm.isOutdoor}
                      onChange={(e) => setConfigForm({ ...configForm, isOutdoor: e.target.checked })}
                      className="rounded text-primary"
                    />
                    <span>This is an outdoor or open-air event (requires weather contingency)</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t pt-4">
              <Button variant="outline" size="sm" onClick={() => setShowConfigModal(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="gradient-brand font-bold text-white"
                onClick={() => updateConfigMutation.mutate(configForm)}
                disabled={updateConfigMutation.isPending}
              >
                <Save className="mr-1.5 size-4" /> Save & Re-analyze
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Printable / Exportable Safety Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-4xl rounded-2xl border bg-card p-6 sm:p-8 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto print:max-h-none print:p-0">
            <div className="flex items-center justify-between border-b pb-4 print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="size-5 text-primary" />
                <h3 className="font-display text-lg font-black">Official Safety & Operations Audit Report</h3>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={() => window.print()} className="font-bold">
                  Print / Save as PDF
                </Button>
                <button onClick={() => setShowReportModal(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="size-5" />
                </button>
              </div>
            </div>

            {reportQ.isLoading ? (
              <Spinner />
            ) : reportQ.data ? (
              <div className="space-y-6 text-foreground print:text-black">
                {/* Header */}
                <div className="flex items-start justify-between border-b pb-4">
                  <div>
                    <h2 className="font-display text-2xl font-black">{reportQ.data.event.title}</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Report Ref: <strong className="font-mono text-foreground">{reportQ.data.reportId}</strong>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Generated on {new Date(reportQ.data.generatedAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="font-mono text-sm px-3 py-1 font-bold">
                      Safety Score: {reportQ.data.scores.safetyScore}/100
                    </Badge>
                    <div className="mt-1">
                      {getRiskBadge(reportQ.data.scores.overallRiskLevel)}
                    </div>
                  </div>
                </div>

                {/* Event Details */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-muted/20 border text-xs">
                  <div>
                    <span className="text-muted-foreground font-semibold">Event Format:</span>
                    <p className="font-bold capitalize">{reportQ.data.event.eventType}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground font-semibold">Capacity:</span>
                    <p className="font-bold">{reportQ.data.event.capacity} seats</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground font-semibold">Registrations:</span>
                    <p className="font-bold">{reportQ.data.event.registrationCount}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground font-semibold">Readiness Index:</span>
                    <p className="font-bold text-blue-500">{reportQ.data.scores.readinessScore}%</p>
                  </div>
                </div>

                {/* Executive Summary */}
                {reportQ.data.executiveSummary && (
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Executive Assessment</h4>
                    <p className="text-xs leading-relaxed whitespace-pre-line text-muted-foreground">
                      {reportQ.data.executiveSummary}
                    </p>
                  </div>
                )}

                {/* Categories Table */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">15 Category Risk Breakdown</h4>
                  <table className="w-full text-xs text-left border-collapse border">
                    <thead>
                      <tr className="bg-muted/40 font-bold border-b">
                        <th className="p-2 border-r">Category</th>
                        <th className="p-2 border-r">Score</th>
                        <th className="p-2 border-r">Risk Level</th>
                        <th className="p-2">Primary Recommendation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportQ.data.categories?.map((cat) => (
                        <tr key={cat.id} className="border-b">
                          <td className="p-2 font-semibold border-r">{cat.name}</td>
                          <td className="p-2 font-mono font-bold border-r">{cat.score}</td>
                          <td className="p-2 border-r uppercase text-[10px] font-bold">{cat.riskLevel}</td>
                          <td className="p-2 text-muted-foreground">{cat.recommendations?.[0] || 'Nominal.'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Disclaimer */}
                <div className="border-t pt-4 text-[11px] text-muted-foreground leading-relaxed">
                  <strong>Notice:</strong> {reportQ.data.disclaimer}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
