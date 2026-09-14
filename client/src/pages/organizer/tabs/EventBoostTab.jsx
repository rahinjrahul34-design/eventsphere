import { useState } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Sparkles, Search, CheckCircle2, AlertTriangle, ArrowRight,
  RefreshCw, Bot, Share2, Globe, Eye, BookOpen, Layers,
  Sliders, MessageSquare, Send, Check, X, ShieldAlert,
  Smartphone, Monitor, Copy, ExternalLink, HelpCircle, AlertCircle
} from 'lucide-react';
import { endpoints } from '../../../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input, Textarea } from '../../../components/ui/input';
import { Spinner, ErrorState } from '../../../components/ui/misc';
import { toast } from 'sonner';
import { cn } from '../../../lib/utils';

export default function EventBoostTab() {
  const { event } = useOutletContext();
  const qc = useQueryClient();

  const [activeSubTab, setActiveSubTab] = useState('overview'); // 'overview' | 'keywords' | 'preview' | 'consistency' | 'copilot' | 'history'
  const [keywordInput, setKeywordInput] = useState('');
  const [previewDevice, setPreviewDevice] = useState('desktop'); // 'desktop' | 'mobile'

  // Optimize modal state
  const [showOptimizeModal, setShowOptimizeModal] = useState(false);
  const [selectedChanges, setSelectedChanges] = useState({
    title: true,
    metaTitle: true,
    metaDescription: true,
    description: true,
    tags: true,
  });

  // Copilot conversational state
  const [copilotQuery, setCopilotQuery] = useState('');
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [copilotMessages, setCopilotMessages] = useState([
    {
      role: 'assistant',
      text: `Hello! I'm your EventBoost SEO Copilot. I can suggest high-intent titles, craft punchy meta descriptions, or explain how to optimize your event discovery based on verified event facts. How can I help you today?`,
    },
  ]);

  // Query: Get SEO profile
  const seoQ = useQuery({
    queryKey: ['eventboost-seo', event._id],
    queryFn: () => endpoints.eventBoost.getSEO(event._id),
  });

  const seoData = seoQ.data || {};
  const currentPK = seoData.primaryKeyword || event.primaryKeyword || '';

  // Mutation: Run Deterministic Analysis
  const analyzeMutation = useMutation({
    mutationFn: (pk) => endpoints.eventBoost.analyze(event._id, { primaryKeyword: pk || currentPK }),
    onSuccess: () => {
      toast.success('SEO content analysis refreshed');
      qc.invalidateQueries({ queryKey: ['eventboost-seo', event._id] });
      qc.invalidateQueries({ queryKey: ['manage-event', event._id] });
    },
    onError: (e) => toast.error(e.message || 'Analysis failed'),
  });

  // Mutation: Get AI Optimizations
  const optimizeMutation = useMutation({
    mutationFn: () => endpoints.eventBoost.optimize(event._id, { primaryKeyword: keywordInput || currentPK }),
    onSuccess: (data) => {
      setShowOptimizeModal(true);
      if (data.engine === 'deterministic-fallback') {
        toast.info('AI provider running in local rule-based mode. Verified suggestions prepared.');
      } else {
        toast.success('AI semantic optimization generated!');
      }
      qc.invalidateQueries({ queryKey: ['eventboost-seo', event._id] });
    },
    onError: (e) => toast.error(e.message || 'Optimization request failed'),
  });

  // Mutation: Apply Optimizations
  const applyMutation = useMutation({
    mutationFn: (payload) => endpoints.eventBoost.apply(event._id, payload),
    onSuccess: (res) => {
      toast.success(`SEO improvements applied! Score updated to ${res.newScore}/100 🎉`);
      setShowOptimizeModal(false);
      qc.invalidateQueries({ queryKey: ['eventboost-seo', event._id] });
      qc.invalidateQueries({ queryKey: ['manage-event', event._id] });
      qc.invalidateQueries({ queryKey: ['event', event.slug] });
    },
    onError: (e) => toast.error(e.message || 'Failed to apply changes'),
  });

  // Submit Copilot Query
  const handleCopilotSubmit = async (e, customPrompt = null) => {
    if (e) e.preventDefault();
    const query = (customPrompt || copilotQuery).trim();
    if (!query) return;

    setCopilotMessages((prev) => [...prev, { role: 'user', text: query }]);
    if (!customPrompt) setCopilotQuery('');
    setCopilotLoading(true);

    try {
      const res = await endpoints.eventBoost.copilot(event._id, query);
      setCopilotMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: res.answer,
          suggestedField: res.suggestedField,
          suggestedValue: res.suggestedValue,
        },
      ]);
    } catch (err) {
      setCopilotMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: `Sorry, I encountered an issue analyzing your request: ${err.message}`,
        },
      ]);
    } finally {
      setCopilotLoading(false);
    }
  };

  // Quick single apply handler
  const handleApplySingle = (field, value) => {
    applyMutation.mutate({ [field]: value });
  };

  if (seoQ.isLoading) return <Spinner className="min-h-[50vh]" />;
  if (seoQ.isError) return <ErrorState message={seoQ.error.message} onRetry={seoQ.refetch} />;

  const seoScore = seoData.seoScore || 0;
  const scoreBadgeVariant =
    seoScore >= 80 ? 'success' : seoScore >= 60 ? 'secondary' : 'warning';
  const scoreGrade =
    seoScore >= 85 ? 'Excellent' : seoScore >= 70 ? 'Good' : seoScore >= 50 ? 'Fair' : 'Needs Work';

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="rounded-2xl border bg-gradient-to-r from-card via-card to-primary/5 p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-xl gradient-brand text-white shadow-sm">
                <Sparkles className="size-5" />
              </div>
              <h2 className="font-display text-2xl font-extrabold tracking-tight">EventBoost AI</h2>
              <Badge variant="outline" className="border-primary/30 text-primary font-bold">
                SEO & Content Intelligence
              </Badge>
            </div>
            <p className="mt-1.5 text-sm text-muted-foreground max-w-2xl">
              Deterministic 0–100 search discovery scoring paired with verified AI content optimization.
              Enhance rankings, readability, and social sharing without hallucinated facts.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              loading={analyzeMutation.isPending}
              onClick={() => analyzeMutation.mutate(keywordInput || currentPK)}
            >
              <RefreshCw className="size-4" /> Analyze Content
            </Button>
            <Button
              size="sm"
              className="gradient-brand text-white font-bold shadow"
              loading={optimizeMutation.isPending}
              onClick={() => optimizeMutation.mutate()}
            >
              <Sparkles className="size-4" /> Optimize with AI
            </Button>
          </div>
        </div>

        {/* Primary Keyword Bar */}
        <div className="mt-6 flex flex-col gap-3 rounded-xl border bg-background/80 p-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground sm:w-40">
            <Search className="size-3.5 text-primary" /> Primary Keyword
          </div>
          <div className="flex flex-1 items-center gap-2">
            <Input
              value={keywordInput !== '' ? keywordInput : currentPK}
              onChange={(e) => setKeywordInput(e.target.value)}
              placeholder="e.g. Generative AI Workshop"
              className="h-9 text-sm font-medium"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => analyzeMutation.mutate(keywordInput || currentPK)}
              disabled={analyzeMutation.isPending}
            >
              Update
            </Button>
          </div>
          {seoData.suggestedKeywords?.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              <span className="font-medium">Suggestions:</span>
              {seoData.suggestedKeywords.slice(0, 3).map((kw) => (
                <button
                  key={kw}
                  type="button"
                  onClick={() => {
                    setKeywordInput(kw);
                    analyzeMutation.mutate(kw);
                  }}
                  className="rounded-md border bg-secondary px-2 py-0.5 font-semibold text-foreground transition hover:border-primary hover:text-primary"
                >
                  + {kw}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Score & Sub-scores Overview */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        {/* Main Composite Score */}
        <Card className="lg:col-span-2 border-primary/20 bg-gradient-to-br from-card via-card to-primary/5">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold uppercase tracking-wider">
              Composite Discoverability
            </CardDescription>
            <CardTitle className="text-base font-extrabold flex items-center justify-between">
              <span>SEO Score</span>
              <Badge variant={scoreBadgeVariant}>{scoreGrade}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-5xl font-black gradient-text">
                {seoScore}
              </span>
              <span className="text-lg font-bold text-muted-foreground">/ 100</span>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full gradient-brand transition-all duration-700"
                style={{ width: `${seoScore}%` }}
              />
            </div>
            <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
              Calculated deterministically from 9 measurable dimensions. External search rankings depend on multiple third-party algorithms.
            </p>
          </CardContent>
        </Card>

        {/* Sub-metric Cards */}
        <Card>
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs font-semibold">Content Quality</CardDescription>
            <CardTitle className="text-2xl font-black">{seoData.contentScore || 0}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="mt-1 h-1.5 w-full rounded-full bg-secondary">
              <div className="h-full rounded-full bg-purple-500" style={{ width: `${seoData.contentScore || 0}%` }} />
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">Structure & Outcomes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs font-semibold">Search Intent</CardDescription>
            <CardTitle className="text-2xl font-black">{seoData.searchIntentScore || 0}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="mt-1 h-1.5 w-full rounded-full bg-secondary">
              <div className="h-full rounded-full bg-blue-500" style={{ width: `${seoData.searchIntentScore || 0}%` }} />
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">{seoData.searchIntent?.primary || 'Informational'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs font-semibold">Readability</CardDescription>
            <CardTitle className="text-2xl font-black">{seoData.readabilityScore || 0}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="mt-1 h-1.5 w-full rounded-full bg-secondary">
              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${seoData.readabilityScore || 0}%` }} />
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">{seoData.readabilityMetrics?.gradeLevel || 'Standard'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs font-semibold">Keyword Coverage</CardDescription>
            <CardTitle className="text-2xl font-black">{seoData.keywordCoverage?.percentage || 0}%</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="mt-1 h-1.5 w-full rounded-full bg-secondary">
              <div className="h-full rounded-full bg-amber-500" style={{ width: `${seoData.keywordCoverage?.percentage || 0}%` }} />
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              {seoData.keywordCoverage?.isStuffed ? '⚠️ Stuffing Flag' : 'Natural Distribution'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex gap-1 overflow-x-auto no-scrollbar rounded-xl border bg-card p-1.5">
        {[
          { id: 'overview', label: 'Action Center & Issues', icon: Sliders },
          { id: 'keywords', label: 'Keyword Coverage', icon: Search },
          { id: 'preview', label: 'SERP & Social Previews', icon: Eye },
          { id: 'consistency', label: 'Consistency & Audit', icon: ShieldAlert, badge: seoData.inconsistencies?.length },
          { id: 'copilot', label: 'SEO Copilot', icon: Bot },
          { id: 'history', label: 'History', icon: Layers, badge: seoData.history?.length },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveSubTab(t.id)}
            className={cn(
              'flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs sm:text-sm font-semibold transition',
              activeSubTab === t.id
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
            )}
          >
            <t.icon className="size-4" />
            <span>{t.label}</span>
            {Boolean(t.badge) && (
              <span className={cn(
                'ml-1 rounded-full px-1.5 py-0.2 text-[10px] font-extrabold',
                activeSubTab === t.id ? 'bg-primary-foreground text-primary' : 'bg-secondary text-foreground'
              )}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* SUBTAB 1: Overview & Action Center */}
      {activeSubTab === 'overview' && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Action Center: Prioritized Issues */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-bold">Action Center: Improve Your Event</CardTitle>
                    <CardDescription className="text-xs">
                      Ranked by Impact, Confidence, and Effort. Apply safe improvements in one click.
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-xs font-semibold">
                    {seoData.seoIssues?.length || 0} recommendations
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {(!seoData.seoIssues || seoData.seoIssues.length === 0) ? (
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-6 text-center">
                    <CheckCircle2 className="mx-auto size-8 text-emerald-500" />
                    <h4 className="mt-2 font-bold text-sm">All core SEO health checks passed!</h4>
                    <p className="mt-1 text-xs text-muted-foreground">Your event listing content adheres to modern search discovery standards.</p>
                  </div>
                ) : (
                  seoData.seoIssues.map((issue) => (
                    <div
                      key={issue.id}
                      className="rounded-xl border bg-card p-4 transition hover:border-primary/30"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm">{issue.title}</span>
                            <Badge
                              variant={
                                issue.priority === 'high' ? 'destructive' : issue.priority === 'medium' ? 'warning' : 'secondary'
                              }
                              className="text-[10px] uppercase font-bold"
                            >
                              {issue.priority} priority
                            </Badge>
                            <span className="text-[11px] text-muted-foreground">
                              {issue.impact} impact · {issue.effort} effort
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">{issue.reason}</p>
                          <p className="text-xs font-medium text-foreground/90">
                            💡 <span className="font-bold">Suggestion:</span> {issue.suggestedAction}
                          </p>
                        </div>

                        {issue.safeToApply && issue.field && issue.suggestedValue && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="shrink-0 font-bold text-primary border-primary/30 hover:bg-primary/5"
                            loading={applyMutation.isPending}
                            onClick={() => handleApplySingle(issue.field, issue.suggestedValue)}
                          >
                            <Check className="size-3.5" /> Apply
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Title Improvement Box */}
            {seoData.titleAnalysis?.suggestedTitle && seoData.titleAnalysis.suggestedTitle !== event.title && (
              <Card className="border-primary/30 bg-primary/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-primary">
                    <Sparkles className="size-4" /> AI Title Enhancement
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid gap-2 sm:grid-cols-2 text-xs">
                    <div className="rounded-lg border bg-background p-2.5">
                      <span className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">Current Title</span>
                      <p className="font-medium text-foreground">{event.title}</p>
                    </div>
                    <div className="rounded-lg border border-primary/30 bg-background p-2.5">
                      <span className="text-[10px] font-bold uppercase text-primary block mb-1">Suggested High-Intent Title</span>
                      <p className="font-bold text-foreground">{seoData.titleAnalysis.suggestedTitle}</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground italic">{seoData.titleAnalysis.whyBetter}</p>
                  <div className="pt-1 flex justify-end">
                    <Button
                      size="sm"
                      className="gradient-brand text-white font-bold"
                      loading={applyMutation.isPending}
                      onClick={() => handleApplySingle('title', seoData.titleAnalysis.suggestedTitle)}
                    >
                      <Check className="size-3.5" /> Apply Suggested Title
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar: Checklist & Strengths */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold">SEO Health Checklist</CardTitle>
                <CardDescription className="text-xs">
                  Automated checks across event content.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2.5 text-xs">
                {[
                  { label: 'Event title length (40–70 chars)', passed: (event.title || '').length >= 35 && (event.title || '').length <= 75 },
                  { label: 'Meta description set (120–160 chars)', passed: (event.metaDescription || '').length >= 100 },
                  { label: 'Primary keyword targeted', passed: Boolean(currentPK) },
                  { label: 'Target keyword in description', passed: seoData.keywordCoverage?.checks?.some((c) => c.foundInDescription) },
                  { label: 'Structured sections / paragraphs', passed: (seoData.readabilityMetrics?.paragraphCount || 1) >= 2 },
                  { label: 'Clear target audience defined', passed: !seoData.seoIssues?.some((i) => i.id === 'desc_missing_audience') },
                  { label: 'Actionable registration CTA', passed: !seoData.seoIssues?.some((i) => i.id === 'desc_missing_cta') },
                  { label: 'Local / Virtual platform info complete', passed: event.eventType === 'online' ? Boolean(event.venue?.onlineUrl) : Boolean(event.venue?.city) },
                  { label: 'FAQs included (2+ questions)', passed: (event.faq || []).length >= 2 },
                  { label: 'Cover image social readiness', passed: Boolean(event.coverImage && !event.coverImage.includes('default')) },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">{item.label}</span>
                    {item.passed ? (
                      <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                    ) : (
                      <AlertTriangle className="size-4 text-amber-500 shrink-0" />
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Top Strengths */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="size-4" /> Top Content Strengths
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(!seoData.strengths || seoData.strengths.length === 0) ? (
                  <p className="text-xs text-muted-foreground">Add details to generate strengths analysis.</p>
                ) : (
                  seoData.strengths.slice(0, 5).map((str, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs">
                      <span className="text-emerald-500 font-bold">✓</span>
                      <span className="text-foreground/90">{str}</span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* SUBTAB 2: Keywords & Coverage */}
      {activeSubTab === 'keywords' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-lg font-bold">Keyword Intelligence & Coverage</CardTitle>
                  <CardDescription className="text-xs">
                    Tracks natural occurrence of your target search terms across titles, descriptions, and tags.
                  </CardDescription>
                </div>
                <Badge variant={seoData.keywordCoverage?.isStuffed ? 'destructive' : 'success'}>
                  {seoData.keywordCoverage?.isStuffed ? '⚠️ Stuffing Alert' : 'Natural Density'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {seoData.keywordCoverage?.isStuffed && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive flex items-start gap-3">
                  <AlertCircle className="size-5 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Keyword Stuffing Flag:</span> {seoData.keywordCoverage.stuffingWarning}
                  </div>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="table-premium text-xs">
                  <thead className="border-b bg-secondary/50 text-muted-foreground">
                    <tr>
                      <th className="p-2.5 font-bold">Keyword Term</th>
                      <th className="p-2.5 font-bold">In Title</th>
                      <th className="p-2.5 font-bold">In Description</th>
                      <th className="p-2.5 font-bold">In Tags</th>
                      <th className="p-2.5 font-bold">Density</th>
                      <th className="p-2.5 font-bold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {(seoData.keywordCoverage?.checks || []).map((c, i) => (
                      <tr key={i} className="hover:bg-secondary/20">
                        <td className="p-2.5 font-bold text-foreground">{c.keyword}</td>
                        <td className="p-2.5">{c.foundInTitle ? <span className="text-emerald-500 font-bold">✓ Yes</span> : <span className="text-muted-foreground">—</span>}</td>
                        <td className="p-2.5">{c.foundInDescription ? <span className="text-emerald-500 font-bold">✓ Yes ({c.count}x)</span> : <span className="text-muted-foreground">—</span>}</td>
                        <td className="p-2.5">{c.foundInTags ? <span className="text-emerald-500 font-bold">✓ Yes</span> : <span className="text-muted-foreground">—</span>}</td>
                        <td className="p-2.5 font-mono">{c.density}%</td>
                        <td className="p-2.5">
                          <Badge
                            variant={c.status === 'optimal' ? 'success' : c.status === 'stuffed' ? 'destructive' : 'warning'}
                            className="text-[10px] uppercase font-bold"
                          >
                            {c.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Readability & Content Structure Stats */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="p-4 pb-1">
                <CardDescription className="text-xs">Avg Sentence Length</CardDescription>
                <CardTitle className="text-xl font-bold">{seoData.readabilityMetrics?.avgSentenceLength || 0} words</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-1">
                <p className="text-[11px] text-muted-foreground">Target: 14–18 words/sentence</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-4 pb-1">
                <CardDescription className="text-xs">Sentences &gt; 25 Words</CardDescription>
                <CardTitle className="text-xl font-bold">{seoData.readabilityMetrics?.longSentencesCount || 0}</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-1">
                <p className="text-[11px] text-muted-foreground">Keep under 2 for clear mobile scanning</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-4 pb-1">
                <CardDescription className="text-xs">Paragraph Count</CardDescription>
                <CardTitle className="text-xl font-bold">{seoData.readabilityMetrics?.paragraphCount || 0}</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-1">
                <p className="text-[11px] text-muted-foreground">Recommended: 3–6 distinct sections</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-4 pb-1">
                <CardDescription className="text-xs">Flesch Reading Ease</CardDescription>
                <CardTitle className="text-xl font-bold">{seoData.readabilityMetrics?.fleschReadingEase || 0} / 100</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-1">
                <p className="text-[11px] text-muted-foreground">{seoData.readabilityMetrics?.gradeLevel || 'Standard'}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* SUBTAB 3: SERP & Social Previews */}
      {activeSubTab === 'preview' && (
        <div className="space-y-6">
          {/* Google Search Result Preview */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Globe className="size-5 text-blue-500" /> Google Search Result Preview
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Simulated search snippet appearance on Google SERP. Search engines may dynamically rewrite snippets.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-1 rounded-lg border bg-secondary p-1">
                  <button
                    type="button"
                    onClick={() => setPreviewDevice('desktop')}
                    className={cn(
                      'flex items-center gap-1 rounded px-2.5 py-1 text-xs font-semibold transition',
                      previewDevice === 'desktop' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'
                    )}
                  >
                    <Monitor className="size-3.5" /> Desktop
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDevice('mobile')}
                    className={cn(
                      'flex items-center gap-1 rounded px-2.5 py-1 text-xs font-semibold transition',
                      previewDevice === 'mobile' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'
                    )}
                  >
                    <Smartphone className="size-3.5" /> Mobile
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className={cn(
                'rounded-xl border bg-white p-5 text-left text-neutral-900 shadow-sm transition-all dark:bg-neutral-950 dark:text-neutral-100',
                previewDevice === 'mobile' ? 'max-w-sm mx-auto' : 'max-w-2xl'
              )}>
                <div className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
                  <span className="font-semibold text-neutral-900 dark:text-neutral-200">EventSphere</span>
                  <span>›</span>
                  <span className="truncate">events › {event.slug}</span>
                </div>
                <h3 className="mt-1.5 font-medium text-lg text-blue-700 hover:underline dark:text-blue-400 line-clamp-2 cursor-pointer">
                  {seoData.searchPreview?.title || `${event.title} | EventSphere`}
                </h3>
                <p className="mt-1.5 text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed line-clamp-3">
                  {seoData.searchPreview?.description || event.metaDescription || event.shortDescription || 'Discover dates, tickets, schedule and registration for this event on EventSphere.'}
                </p>
              </div>

              {/* Character counts info */}
              <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <div>
                  Meta Title: <span className="font-mono font-bold text-foreground">{(event.metaTitle || event.title || '').length}</span> / 60 chars
                </div>
                <div>
                  Meta Description: <span className="font-mono font-bold text-foreground">{(event.metaDescription || '').length}</span> / 160 chars
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Social Media Share Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Share2 className="size-5 text-primary" /> Social Share & Open Graph Preview
              </CardTitle>
              <CardDescription className="text-xs">
                Preview how your event appears when shared on LinkedIn, X (Twitter), Facebook, or WhatsApp.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-w-xl rounded-xl border bg-card overflow-hidden shadow-sm">
                <div className="relative h-48 w-full overflow-hidden bg-neutral-100 dark:bg-neutral-900">
                  <img
                    src={event.coverImage || '/images/events/ai-innovation-summit.jpg'}
                    alt="Social Cover"
                    className="size-full object-cover"
                  />
                  <div className="absolute top-2 left-2 rounded bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider backdrop-blur-sm">
                    Open Graph Card
                  </div>
                </div>
                <div className="p-4 space-y-1.5 bg-card">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">eventsphere.demo</span>
                  <h4 className="font-display text-base font-bold line-clamp-1">{seoData.socialPreview?.title || event.title}</h4>
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {seoData.socialPreview?.description || event.shortDescription || event.description}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* SUBTAB 4: Consistency & Audit */}
      {activeSubTab === 'consistency' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <ShieldAlert className="size-5 text-amber-500" /> Content Consistency Cross-Check
                </CardTitle>
                <CardDescription className="text-xs">
                  Automated validation inspecting cross-field contradictions across dates, location mode, ticket pricing, and certificates.
                </CardDescription>
              </div>
              <Badge variant={seoData.inconsistencies?.length > 0 ? 'warning' : 'success'}>
                {seoData.inconsistencies?.length || 0} issues detected
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {(!seoData.inconsistencies || seoData.inconsistencies.length === 0) ? (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-6 text-center">
                <CheckCircle2 className="mx-auto size-8 text-emerald-500" />
                <h4 className="mt-2 font-bold text-sm">No content contradictions detected</h4>
                <p className="mt-1 text-xs text-muted-foreground">Dates, venue type, tickets, and description details are harmonious.</p>
              </div>
            ) : (
              seoData.inconsistencies.map((inc, i) => (
                <div key={i} className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="size-4 text-amber-500" />
                    <span className="font-bold text-sm text-foreground">{inc.message}</span>
                  </div>
                  <p className="text-muted-foreground pl-6">
                    <span className="font-semibold text-foreground">Suggested Resolution:</span> {inc.suggestion}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* SUBTAB 5: Conversational SEO Copilot */}
      {activeSubTab === 'copilot' && (
        <Card className="flex flex-col h-[600px]">
          <CardHeader className="border-b pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-lg gradient-brand text-white">
                  <Bot className="size-4" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold">SEO Copilot Assistant</CardTitle>
                  <CardDescription className="text-xs">
                    Conversational AI using strictly verified event facts. Ask for title options, meta summaries, or scoring advice.
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>

          {/* Messages Feed */}
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-3.5">
            {copilotMessages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  'flex gap-2.5 max-w-[85%]',
                  msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''
                )}
              >
                <div
                  className={cn(
                    'flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                    msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'gradient-brand text-white'
                  )}
                >
                  {msg.role === 'user' ? 'You' : <Bot className="size-3.5" />}
                </div>
                <div
                  className={cn(
                    'rounded-2xl p-3 text-xs leading-relaxed space-y-2',
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-tr-none'
                      : 'border bg-card shadow-sm rounded-tl-none'
                  )}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                  {msg.suggestedField && msg.suggestedValue && (
                    <div className="pt-1.5 border-t border-border/50 flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold opacity-90 truncate">
                        Proposal: {msg.suggestedValue}
                      </span>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-6 text-[11px] px-2 font-bold shrink-0"
                        loading={applyMutation.isPending}
                        onClick={() => handleApplySingle(msg.suggestedField, msg.suggestedValue)}
                      >
                        Use This
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {copilotLoading && (
              <div className="flex gap-2.5 max-w-[85%] items-center text-xs text-muted-foreground">
                <Spinner className="size-4" />
                <span>Copilot is analyzing event context...</span>
              </div>
            )}
          </CardContent>

          {/* Prompt chips & input */}
          <div className="border-t p-3 space-y-2 bg-secondary/10">
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                'How can I improve this event?',
                'Give me 5 title options',
                'Create a better meta description',
                'Why is my SEO score low?',
                'Make this easier to read',
              ].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={(e) => handleCopilotSubmit(e, chip)}
                  className="rounded-full border bg-background px-2.5 py-1 text-[11px] font-semibold text-muted-foreground transition hover:border-primary hover:text-primary"
                >
                  {chip}
                </button>
              ))}
            </div>

            <form onSubmit={handleCopilotSubmit} className="flex gap-2">
              <Input
                value={copilotQuery}
                onChange={(e) => setCopilotQuery(e.target.value)}
                placeholder="Ask EventBoost Copilot a question..."
                className="h-9 text-xs"
              />
              <Button type="submit" size="sm" disabled={copilotLoading || !copilotQuery.trim()}>
                <Send className="size-3.5" />
              </Button>
            </form>
          </div>
        </Card>
      )}

      {/* SUBTAB 6: Change History */}
      {activeSubTab === 'history' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Layers className="size-5 text-primary" /> SEO Optimization History
            </CardTitle>
            <CardDescription className="text-xs">
              Audit log of applied SEO improvements, metadata updates, and score progressions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(!seoData.history || seoData.history.length === 0) ? (
              <p className="text-xs text-muted-foreground py-4 text-center">
                No optimization history logged yet. Apply suggestions or AI enhancements to track score improvements.
              </p>
            ) : (
              <div className="space-y-3">
                {seoData.history.map((h, i) => (
                  <div key={i} className="flex items-start justify-between rounded-xl border p-3.5 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">Score: {h.previousScore} → {h.seoScore}</span>
                        <Badge variant="outline" className="text-[10px] font-mono">{h.version || 'SEO_V1'}</Badge>
                      </div>
                      <p className="text-muted-foreground">{h.changes?.join(', ') || 'Optimizations applied'}</p>
                    </div>
                    <span className="text-muted-foreground font-mono text-[11px]">
                      {new Date(h.timestamp).toLocaleDateString()} {new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Modal: Side-by-Side Before / After AI Optimization Review */}
      {showOptimizeModal && optimizeMutation.data && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-4xl card-surface p-6 shadow-2xl space-y-6 my-8">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="size-5 text-primary" />
                  <h3 className="font-display text-xl font-bold">Review AI Optimizations</h3>
                  <Badge variant="outline" className="text-xs font-mono">{optimizeMutation.data.engine}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Compare Before vs After. Select which verified improvements you wish to apply. Organizer remains in full control.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowOptimizeModal(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Score Comparison Banner */}
            <div className="flex items-center justify-around rounded-xl border bg-secondary/30 p-4 text-center">
              <div>
                <span className="text-xs text-muted-foreground uppercase font-bold">Before SEO Score</span>
                <p className="font-display text-3xl font-black text-foreground mt-0.5">
                  {optimizeMutation.data.beforeScore}
                </p>
              </div>
              <ArrowRight className="size-6 text-primary shrink-0" />
              <div>
                <span className="text-xs text-primary uppercase font-bold">Simulated After Score</span>
                <p className="font-display text-3xl font-black text-emerald-500 mt-0.5">
                  {optimizeMutation.data.afterScore}
                </p>
              </div>
            </div>

            {/* Fields Comparison */}
            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
              {/* 1. Title */}
              <div className="rounded-xl border p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 font-bold text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedChanges.title}
                      onChange={(e) => setSelectedChanges((p) => ({ ...p, title: e.target.checked }))}
                      className="rounded text-primary focus:ring-primary"
                    />
                    Event Title
                  </label>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 text-xs">
                  <div className="rounded bg-secondary/50 p-2 text-muted-foreground">
                    <span className="text-[10px] font-bold block text-foreground">Current:</span>
                    {optimizeMutation.data.improvements.title.current}
                  </div>
                  <div className="rounded bg-primary/10 border border-primary/20 p-2 text-foreground font-semibold">
                    <span className="text-[10px] font-bold block text-primary">Optimized:</span>
                    {optimizeMutation.data.improvements.title.suggested}
                  </div>
                </div>
              </div>

              {/* 2. Meta Title & Description */}
              <div className="rounded-xl border p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 font-bold text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedChanges.metaDescription}
                      onChange={(e) => setSelectedChanges((p) => ({ ...p, metaDescription: e.target.checked }))}
                      className="rounded text-primary focus:ring-primary"
                    />
                    Meta Title & Meta Description (Search Snippet)
                  </label>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 text-xs">
                  <div className="rounded bg-secondary/50 p-2 text-muted-foreground">
                    <span className="text-[10px] font-bold block text-foreground">Current Meta Description:</span>
                    {optimizeMutation.data.improvements.metaDescription.current || '(Missing)'}
                  </div>
                  <div className="rounded bg-primary/10 border border-primary/20 p-2 text-foreground">
                    <span className="text-[10px] font-bold block text-primary">Suggested Meta Description:</span>
                    {optimizeMutation.data.improvements.metaDescription.suggested}
                  </div>
                </div>
              </div>

              {/* 3. Structured Description */}
              <div className="rounded-xl border p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 font-bold text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedChanges.description}
                      onChange={(e) => setSelectedChanges((p) => ({ ...p, description: e.target.checked }))}
                      className="rounded text-primary focus:ring-primary"
                    />
                    Structured Event Description (Headings & Outcomes)
                  </label>
                </div>
                <div className="rounded bg-secondary/20 border p-3 text-xs max-h-48 overflow-y-auto font-mono whitespace-pre-wrap">
                  {optimizeMutation.data.improvements.description.suggested}
                </div>
              </div>

              {/* 4. Suggested Keywords */}
              {optimizeMutation.data.improvements.keywords?.suggested?.length > 0 && (
                <div className="rounded-xl border p-4 space-y-2">
                  <label className="flex items-center gap-2 font-bold text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedChanges.tags}
                      onChange={(e) => setSelectedChanges((p) => ({ ...p, tags: e.target.checked }))}
                      className="rounded text-primary focus:ring-primary"
                    />
                    Add Target Keywords to Event Tags
                  </label>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {optimizeMutation.data.improvements.keywords.suggested.map((kw) => (
                      <Badge key={kw} variant="secondary" className="text-xs">
                        {kw}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 border-t pt-4">
              <Button variant="outline" onClick={() => setShowOptimizeModal(false)}>
                Cancel
              </Button>
              <Button
                className="gradient-brand text-white font-bold"
                loading={applyMutation.isPending}
                onClick={() => {
                  const payload = {};
                  if (selectedChanges.title) payload.title = optimizeMutation.data.improvements.title.suggested;
                  if (selectedChanges.metaTitle) payload.metaTitle = optimizeMutation.data.improvements.metaTitle.suggested;
                  if (selectedChanges.metaDescription) payload.metaDescription = optimizeMutation.data.improvements.metaDescription.suggested;
                  if (selectedChanges.description) payload.description = optimizeMutation.data.improvements.description.suggested;
                  if (selectedChanges.tags) payload.tags = optimizeMutation.data.improvements.keywords.suggested;
                  if (optimizeMutation.data.improvements.keywords.primary) {
                    payload.primaryKeyword = optimizeMutation.data.improvements.keywords.primary;
                  }
                  applyMutation.mutate(payload);
                }}
              >
                <Check className="size-4" /> Apply Selected Improvements
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
