'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity, ArrowRight, Bot, Boxes, Braces, Check, CheckCircle2, ChevronRight,
  CircleDot, Clock3, FileWarning, Filter, Gauge, GitCompareArrows, History,
  KanbanSquare, LayoutDashboard, LockKeyhole, Menu, MessageSquareText, Minus,
  Radio, RotateCcw, Search, ShieldCheck, Sparkles, Target, Undo2, UnlockKeyhole,
  UserRound, X, Zap,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  SEVERITIES, STATUSES, formatLabel, priorityFormula, priorityScore, riskSummary,
  safeId, type Finding, type FindingStatus, type Severity, type WorkspaceState,
} from '@/lib/domain';
import { createSeedWorkspace } from '@/lib/seed-data';
import {
  applyComparison, applyCreateSprint, applyLock, applyNote, applyOptimizeSprint, applyRebalanceSprint,
  applyRemoveFromSprint, applyReprioritize, applySeverity, applyStatus,
  filterFindings, requireFinding, type RebalanceMode, type WorkspaceApi,
} from '@/lib/workspace';
import { WEBMCP_TOOL_NAMES, useWebMcpRegistration } from '@/lib/webmcp/register-tools';

type View = 'dashboard' | 'findings' | 'sprint' | 'activity' | 'webmcp';
const STORAGE_KEY = 'outpost-workspace-v1';

function totalEffort(findings: Finding[], ids: string[]) {
  return ids.reduce((sum, id) => sum + (findings.find((finding) => finding.id === id)?.effortDays ?? 0), 0);
}

function riskReduction(findings: Finding[], ids: string[]) {
  const active = findings.filter((finding) => finding.status !== 'resolved');
  const total = active.reduce((sum, finding) => sum + priorityScore(finding), 0);
  const selected = active.filter((finding) => ids.includes(finding.id)).reduce((sum, finding) => sum + priorityScore(finding), 0);
  return total ? Math.round((selected / total) * 100) : 0;
}

function FindingCard({ finding, highlighted, onOpen }: { finding: Finding; highlighted: boolean; onOpen: () => void }) {
  return (
    <button className={`tc-finding-card ${finding.severity} ${highlighted ? 'agent-updated' : ''}`} type="button" onClick={onOpen} aria-label={`Open ${finding.id}: ${finding.title}`}>
      <div className="tc-finding-card-top"><Badge variant="outline">{finding.id}</Badge><span className="tc-priority-score"><small>Priority</small>{priorityScore(finding)}</span></div>
      <h3>{finding.title}</h3><p>{finding.component}</p>
      <div className="tc-finding-meta"><span><Target />{formatLabel(finding.exploitability)} exploitability</span><span><Clock3 />{finding.effortDays}d effort</span></div>
      <div className="tc-finding-footer"><span className={`tc-status-badge ${finding.status}`}>{formatLabel(finding.status)}</span><span>{finding.evidence.length} evidence</span></div>
      {finding.humanLocked && <span className="tc-lock"><LockKeyhole />Human locked</span>}
      {highlighted && <span className="tc-agent-updated"><Sparkles />Updated by agent</span>}
    </button>
  );
}

function ActivityRow({ entry }: { entry: WorkspaceState['activity'][number] }) {
  const Icon = entry.actor === 'agent' ? Bot : entry.actor === 'human' ? UserRound : Radio;
  return (
    <article className={`tc-activity-row ${entry.actor}`}>
      <span className="tc-activity-avatar"><Icon /></span>
      <div><div className="tc-activity-meta"><strong>{entry.actor}</strong><time>{new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time></div><p>{entry.detail}</p>{entry.findingId && <span className="tc-inline-id">{entry.findingId}</span>}</div>
    </article>
  );
}

export function OutpostApp() {
  const [workspace, setWorkspace] = useState<WorkspaceState>(() => createSeedWorkspace());
  const [view, setView] = useState<View>('dashboard');
  const [mobileNav, setMobileNav] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<Severity | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<FindingStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [noteDraft, setNoteDraft] = useState('');
  const [sprintCapacity, setSprintCapacity] = useState(5);
  const [rebalanceMode, setRebalanceMode] = useState<RebalanceMode>('risk_to_effort');
  const [hydrated, setHydrated] = useState(false);
  const [undoCount, setUndoCount] = useState(0);
  const workspaceRef = useRef(workspace);
  const undoRef = useRef<WorkspaceState[]>([]);

  const syncState = useCallback((next: WorkspaceState) => { workspaceRef.current = next; setWorkspace(next); return next; }, []);
  const commit = useCallback((change: (state: WorkspaceState) => WorkspaceState) => {
    const current = workspaceRef.current;
    const next = change(current);
    undoRef.current = [...undoRef.current.slice(-19), current];
    setUndoCount(undoRef.current.length);
    return syncState(next);
  }, [syncState]);

  useEffect(() => {
    try { const saved = localStorage.getItem(STORAGE_KEY); if (saved) syncState(JSON.parse(saved) as WorkspaceState); }
    catch { localStorage.removeItem(STORAGE_KEY); }
    finally { setHydrated(true); }
  }, [syncState]);
  useEffect(() => { if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace)); }, [hydrated, workspace]);
  useEffect(() => {
    if (!workspace.highlightedFindingId) return;
    const timer = window.setTimeout(() => syncState({ ...workspaceRef.current, highlightedFindingId: null }), 2600);
    return () => window.clearTimeout(timer);
  }, [syncState, workspace.highlightedFindingId]);

  const api = useMemo<WorkspaceApi>(() => ({
    getState: () => workspaceRef.current,
    listFindings: (filters) => filterFindings(workspaceRef.current.findings, filters),
    inspectFinding: (findingId) => requireFinding(workspaceRef.current, findingId),
    setSeverity: (findingId, severity, reason, actor) => requireFinding(commit((state) => applySeverity(state, findingId, severity, reason, actor)), findingId),
    setStatus: (findingId, status, reason, actor) => requireFinding(commit((state) => applyStatus(state, findingId, status, reason, actor)), findingId),
    addNote: (findingId, note, authorType) => requireFinding(commit((state) => applyNote(state, findingId, note, authorType)), findingId),
    compareFindings: (findingIds, actor = 'agent') => { const next = commit((state) => applyComparison(state, findingIds, actor)); return findingIds.map((id) => requireFinding(next, id)); },
    reprioritize: (findingIds, priorityOrder, reason, actor) => { const next = commit((state) => applyReprioritize(state, findingIds, priorityOrder, reason, actor)); return priorityOrder.map((id) => requireFinding(next, id)); },
    calculateRisk: () => riskSummary(workspaceRef.current.findings),
    createSprint: (findingIds, sprintName, capacityDays, actor) => commit((state) => applyCreateSprint(state, findingIds, sprintName, capacityDays, actor)).sprint,
    optimizeSprint: (sprintName, capacityDays, prioritizeBy, actor) => commit((state) => applyOptimizeSprint(state, sprintName, capacityDays, prioritizeBy, actor)).sprint,
    removeFromSprint: (findingId, reason, actor) => commit((state) => applyRemoveFromSprint(state, findingId, reason, actor)).sprint,
    rebalanceSprint: (capacityDays, prioritizeBy, actor) => commit((state) => applyRebalanceSprint(state, capacityDays, prioritizeBy, actor)).sprint,
    setHumanLock: (findingId, locked, reason, actor) => requireFinding(commit((state) => applyLock(state, findingId, locked, reason, actor)), findingId),
    resetWorkspace: (actor) => { const reset = createSeedWorkspace(); reset.activity = [{ id: safeId('activity'), actor, action: 'reset workspace', detail: `${actor === 'agent' ? 'Agent' : 'Human'} reset the demo workspace.`, createdAt: new Date().toISOString() }, ...reset.activity]; reset.lastAgentAction = actor === 'agent' ? 'Agent reset the demo workspace.' : null; return commit(() => reset); },
    undo: () => { const previous = undoRef.current.pop(); if (!previous) return false; setUndoCount(undoRef.current.length); syncState(previous); return true; },
  }), [commit, syncState]);

  const webmcp = useWebMcpRegistration(api);
  const summary = useMemo(() => riskSummary(workspace.findings), [workspace.findings]);
  const selectedFinding = workspace.selectedFindingId ? workspace.findings.find((finding) => finding.id === workspace.selectedFindingId) ?? null : null;
  const sortedFindings = useMemo(() => [...workspace.findings].sort((a, b) => a.priorityRank - b.priorityRank || priorityScore(b) - priorityScore(a)), [workspace.findings]);
  const filteredFindings = sortedFindings.filter((finding) => {
    const query = search.toLowerCase().trim();
    return (severityFilter === 'all' || finding.severity === severityFilter) && (statusFilter === 'all' || finding.status === statusFilter) && (!query || `${finding.id} ${finding.title} ${finding.component} ${finding.tags.join(' ')}`.toLowerCase().includes(query));
  });
  const comparison = workspace.comparisonIds.map((id) => workspace.findings.find((finding) => finding.id === id)).filter(Boolean) as Finding[];
  const selectFinding = (id: string | null) => { syncState({ ...workspaceRef.current, selectedFindingId: id }); setNoteDraft(''); };

  const createSuggestedSprint = () => {
    api.optimizeSprint('Priority reduction sprint', sprintCapacity, 'risk_to_effort', 'human'); setView('sprint');
  };
  const resetHumanWorkspace = () => { if (window.confirm('Reset all Outpost demo changes, notes, locks, sprint state, and activity?')) api.resetWorkspace('human'); };
  const navItems: Array<{ id: View; label: string; icon: typeof LayoutDashboard }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }, { id: 'findings', label: 'Findings', icon: CircleDot }, { id: 'sprint', label: 'Remediation Sprint', icon: KanbanSquare }, { id: 'activity', label: 'Activity', icon: Activity }, { id: 'webmcp', label: 'About WebMCP', icon: Braces },
  ];

  const renderBoard = () => {
    const groups = [...SEVERITIES.map((severity) => ({ label: formatLabel(severity), tone: severity, findings: filteredFindings.filter((finding) => finding.severity === severity && finding.status !== 'resolved') })), { label: 'Resolved', tone: 'resolved', findings: filteredFindings.filter((finding) => finding.status === 'resolved') }];
    return <section className="tc-board-live" aria-label="Prioritized findings board">{groups.map((group) => <article className={`tc-board-column ${group.tone}`} key={group.label}><header><span>{group.label}</span><Badge variant="outline">{group.findings.length}</Badge></header><div className="tc-column-stack">{group.findings.map((finding) => <FindingCard key={finding.id} finding={finding} highlighted={workspace.highlightedFindingId === finding.id} onOpen={() => selectFinding(finding.id)} />)}{!group.findings.length && <div className="tc-empty-column"><Check />No findings</div>}</div></article>)}</section>;
  };

  const dashboardView = <>
    <section className="tc-overview"><div><span className="tc-eyebrow">Security posture</span><h2>Decide what matters. Build the fix plan.</h2><p>One live workspace for analyst judgment and agent speed.</p></div><div className="tc-progress-card"><div><span>Remediation progress</span><strong>{summary.progress}%</strong></div><Progress value={summary.progress} className="tc-progress" /><small>{summary.resolved} resolved · {workspace.findings.filter((finding) => finding.status === 'scheduled').length} scheduled</small></div></section>
    <section className="tc-stats" aria-label="Finding statistics"><article><span className="critical">{String(summary.counts.critical).padStart(2, '0')}</span><div><strong>Critical</strong><small>Immediate action</small></div></article><article><span className="high">{String(summary.counts.high).padStart(2, '0')}</span><div><strong>High</strong><small>Plan this sprint</small></div></article><article><span className="medium">{String(summary.counts.medium).padStart(2, '0')}</span><div><strong>Medium</strong><small>Review context</small></div></article><article><span className="resolved">{String(summary.resolved).padStart(2, '0')}</span><div><strong>Resolved</strong><small>{summary.progress}% progress</small></div></article></section>
    {comparison.length > 0 && <section className="tc-comparison-panel"><header><div><span className="tc-eyebrow">Shared comparison</span><h2><GitCompareArrows />Practical risk side by side</h2></div><Button variant="ghost" size="icon-sm" onClick={() => syncState({ ...workspaceRef.current, comparisonIds: [] })}><X /><span className="sr-only">Close comparison</span></Button></header><div className="tc-comparison-grid">{comparison.map((finding) => <article key={finding.id}><Badge variant="outline">{finding.id}</Badge><strong>{priorityScore(finding)}</strong><h3>{finding.title}</h3><dl><div><dt>Severity</dt><dd>{formatLabel(finding.severity)}</dd></div><div><dt>Exploitability</dt><dd>{formatLabel(finding.exploitability)}</dd></div><div><dt>Impact</dt><dd>{formatLabel(finding.impact)}</dd></div><div><dt>Effort</dt><dd>{finding.effortDays} days</dd></div></dl></article>)}</div></section>}
    <div className="tc-section-heading"><div><span className="tc-eyebrow">Live finding board</span><h2>Prioritized by practical risk</h2></div><div className="tc-heading-actions"><Button variant="outline" size="sm" onClick={() => api.compareFindings(['F-101', 'F-104', 'F-111'], 'human')}><GitCompareArrows />Compare demo set</Button><Badge variant="outline">{workspace.findings.length} findings</Badge></div></div>{renderBoard()}
  </>;

  const findingsView = <>
    <section className="tc-page-heading"><div><span className="tc-eyebrow">Finding inventory</span><h2>Review every decision in context</h2><p>Filter the live workspace, then open any finding to edit, lock, or annotate it.</p></div><FileWarning /></section>
    <section className="tc-filterbar"><label className="tc-search"><Search /><span className="sr-only">Search findings</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search findings, components, or tags" /></label><label><Filter /><span>Severity</span><select value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value as Severity | 'all')}><option value="all">All</option>{SEVERITIES.map((severity) => <option key={severity} value={severity}>{formatLabel(severity)}</option>)}</select></label><label><span>Status</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as FindingStatus | 'all')}><option value="all">All</option>{STATUSES.map((status) => <option key={status} value={status}>{formatLabel(status)}</option>)}</select></label><Badge variant="outline">{filteredFindings.length} shown</Badge></section>
    <section className="tc-findings-list">{filteredFindings.map((finding, index) => <button key={finding.id} onClick={() => selectFinding(finding.id)} className={workspace.highlightedFindingId === finding.id ? 'agent-updated' : ''}><span className="tc-list-rank">{String(index + 1).padStart(2, '0')}</span><Badge variant="outline">{finding.id}</Badge><div><strong>{finding.title}</strong><small>{finding.component} · {finding.tags.join(' · ')}</small></div><span className={`tc-severity-pill ${finding.severity}`}>{formatLabel(finding.severity)}</span><span className="tc-list-score">{priorityScore(finding)}</span>{finding.humanLocked ? <LockKeyhole /> : <ChevronRight />}</button>)}</section>
  </>;

  const sprint = workspace.sprint;
  const sprintFindings = sprint ? sprint.findingIds.map((id) => workspace.findings.find((finding) => finding.id === id)).filter(Boolean) as Finding[] : [];
  const sprintView = <>
    <section className="tc-page-heading"><div><span className="tc-eyebrow">Remediation planning</span><h2>{sprint?.name ?? 'Turn risk into a bounded fix plan'}</h2><p>Balance practical risk, engineering effort, and human decisions in one visible sprint.</p></div><KanbanSquare /></section>
    {!sprint ? <section className="tc-empty-sprint"><span><Zap /></span><h3>Build a capacity-aware sprint</h3><p>Outpost will select the strongest risk-to-effort mix without resolving anything.</p><label>Engineering capacity <div><input type="number" min="0.5" max="60" step="0.5" value={sprintCapacity} onChange={(event) => setSprintCapacity(Number(event.target.value))} /><span>days</span></div></label><Button size="lg" onClick={createSuggestedSprint}><Sparkles />Create suggested sprint</Button></section> : <>
      <section className="tc-sprint-stats"><article><Clock3 /><div><small>Capacity used</small><strong>{totalEffort(workspace.findings, sprint.findingIds)} / {sprint.capacityDays} days</strong></div></article><article><Gauge /><div><small>Potential risk reduction</small><strong>{riskReduction(workspace.findings, sprint.findingIds)}%</strong></div></article><article><LockKeyhole /><div><small>Human-locked decisions</small><strong>{workspace.findings.filter((finding) => finding.humanLocked).length}</strong></div></article><article><Bot /><div><small>Suggested items</small><strong>{sprint.findingIds.length}</strong></div></article></section>
      <section className="tc-sprint-control"><div><span className="tc-eyebrow">Rebalance sprint</span><p>Locked decisions and manual removals are preserved.</p></div><label>Capacity <input type="number" min="0.5" max="60" step="0.5" value={sprintCapacity} onChange={(event) => setSprintCapacity(Number(event.target.value))} /></label><label>Optimize for <select value={rebalanceMode} onChange={(event) => setRebalanceMode(event.target.value as RebalanceMode)}><option value="risk">Risk</option><option value="effort">Effort</option><option value="risk_to_effort">Risk to effort</option></select></label><Button onClick={() => api.rebalanceSprint(sprintCapacity, rebalanceMode, 'human')}><RotateCcw />Rebalance</Button></section>
      <section className="tc-sprint-list">{sprintFindings.map((finding, index) => <article key={finding.id} className={workspace.highlightedFindingId === finding.id ? 'agent-updated' : ''}><span className="tc-sprint-order">{index + 1}</span><span className={`tc-severity-mark ${finding.severity}`} /><div><div><Badge variant="outline">{finding.id}</Badge>{finding.humanLocked && <span className="tc-lock-inline"><LockKeyhole />Locked</span>}</div><h3>{finding.title}</h3><p>{finding.component} · Priority {priorityScore(finding)}</p></div><strong>{finding.effortDays}d</strong><Button variant="ghost" size="icon-sm" onClick={() => api.removeFromSprint(finding.id, 'Removed manually by the analyst while shaping sprint scope.', 'human')}><Minus /><span className="sr-only">Remove {finding.id}</span></Button></article>)}</section>
      {sprint.humanExcludedIds.length > 0 && <div className="tc-exclusions"><LockKeyhole /><span><strong>Human exclusions preserved</strong>{sprint.humanExcludedIds.join(', ')} will stay out during automatic rebalancing.</span></div>}
    </>}
  </>;

  const activityView = <><section className="tc-page-heading"><div><span className="tc-eyebrow">Audit trail</span><h2>Human judgment and agent actions, clearly separated</h2><p>Every rating, note, lock, comparison, and sprint change remains visible.</p></div><History /></section><section className="tc-activity-page">{workspace.activity.map((entry) => <ActivityRow key={entry.id} entry={entry} />)}</section></>;
  const webmcpView = <>
    <section className="tc-page-heading"><div><span className="tc-eyebrow">Browser-native collaboration</span><h2>WebMCP turns the page into an agent-ready workspace</h2><p>Structured tools call the exact same application functions used by the interface.</p></div><Braces /></section>
    <section className="tc-webmcp-status-card"><span className={`tc-webmcp-orb ${webmcp.status}`}><Radio /></span><div><span className="tc-eyebrow">Live capability status</span><h3>{webmcp.status === 'ready' ? 'WebMCP Ready' : webmcp.status === 'checking' ? 'Checking WebMCP support…' : 'WebMCP unavailable in this browser'}</h3><p>{webmcp.status === 'ready' ? `${webmcp.count} structured tools are registered on document.modelContext.` : 'The complete manual workspace remains available. Open this application in ChatGPT’s in-app browser or supported Chrome with WebMCP enabled.'}</p></div></section>
    <section className="tc-state-diagram" aria-label="WebMCP shared-state diagram"><div><UserRound /><strong>Human analyst</strong><small>Reviews, edits, locks</small></div><ArrowRight /><div><LayoutDashboard /><strong>Outpost UI</strong><small>Visible source of truth</small></div><ArrowRight /><div className="focus"><Boxes /><strong>Shared application state</strong><small>One workspace, local persistence</small></div><ArrowRight /><div><Braces /><strong>WebMCP tools</strong><small>Structured application actions</small></div><ArrowRight /><div><Bot /><strong>AI agent</strong><small>Inspects, compares, plans</small></div></section>
    <section className="tc-without-with"><article><span className="tc-eyebrow">Without WebMCP</span><h3>Infer the interface</h3><p>An agent must inspect the page, locate controls, simulate clicks, and infer whether each step worked.</p></article><article><span className="tc-eyebrow">With WebMCP</span><h3>Use explicit capabilities</h3><p>Outpost exposes auditable operations tied directly to validated domain logic and visible state.</p></article></section>
    <section className="tc-tools-list"><header><div><span className="tc-eyebrow">Registered tool surface</span><h3>{WEBMCP_TOOL_NAMES.length} composable security workflow tools</h3></div><Badge variant="outline">document.modelContext</Badge></header><div>{WEBMCP_TOOL_NAMES.map((name, index) => <article key={name}><span>{String(index + 1).padStart(2, '0')}</span><code>{name}</code>{[0, 1, 7, 12].includes(index) ? <Badge variant="outline">Read-only</Badge> : <Badge variant="secondary">Updates state</Badge>}</article>)}</div></section>
  </>;

  return <main className="min-h-screen bg-background text-foreground"><div className="tc-shell-live">
    <aside className={`tc-sidebar ${mobileNav ? 'mobile-open' : ''}`}><div className="tc-brand"><span className="tc-logo"><ShieldCheck /></span><div><strong>Outpost</strong><small>Security triage</small></div><Button className="tc-mobile-close" variant="ghost" size="icon-sm" onClick={() => setMobileNav(false)}><X /></Button></div><nav aria-label="Primary navigation">{navItems.map((item) => <button key={item.id} className={view === item.id ? 'active' : ''} onClick={() => { setView(item.id); setMobileNav(false); }}><item.icon />{item.label}{item.id === 'findings' && <span>{workspace.findings.length}</span>}</button>)}</nav><div className="tc-agent-card"><div className="tc-status-line"><span className={`tc-status-dot ${webmcp.status}`} />{webmcp.status === 'ready' ? 'WebMCP ready' : webmcp.status === 'checking' ? 'Checking WebMCP' : 'Manual mode'}</div><p>{webmcp.status === 'ready' ? `${webmcp.count} structured tools share the state you see here.` : 'The workspace still works fully without browser tool support.'}</p><button onClick={() => setView('webmcp')}>See how it works →</button></div></aside>
    <section className="tc-workspace-live"><header className="tc-topbar"><Button className="tc-mobile-menu" variant="ghost" size="icon" onClick={() => setMobileNav(true)}><Menu /></Button><div><span className="tc-eyebrow">Active workspace</span><h1>Atlas security review</h1></div><div className="tc-topbar-actions"><div className="tc-risk"><span>Exposure</span><strong>{summary.exposure}</strong><small>/100</small></div><Button variant="outline" size="sm" onClick={() => api.undo()} disabled={undoCount === 0}><Undo2 />Undo</Button><Button variant="outline" size="sm" onClick={resetHumanWorkspace}><RotateCcw />Reset demo</Button></div></header>{workspace.lastAgentAction && <div className="tc-agent-banner"><Sparkles /><span>{workspace.lastAgentAction}</span></div>}<div className="tc-content-live">{view === 'dashboard' && dashboardView}{view === 'findings' && findingsView}{view === 'sprint' && sprintView}{view === 'activity' && activityView}{view === 'webmcp' && webmcpView}</div></section>
    <aside className="tc-rail"><div className="tc-rail-heading"><div><span className="tc-eyebrow">Live review</span><h2>Activity</h2></div><Sparkles /></div><div className="tc-activity-mini">{workspace.activity.slice(0, 5).map((entry) => <ActivityRow key={entry.id} entry={entry} />)}</div><div className="tc-prompt-card"><Sparkles /><span>Try with your agent</span><p>“Build the highest-risk remediation sprint that fits within five engineering days.”</p></div><Button variant="ghost" className="tc-view-activity" onClick={() => setView('activity')}>View full activity <ChevronRight /></Button></aside>
  </div>
  {selectedFinding && <div className="tc-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) selectFinding(null); }}><dialog open className="tc-detail-dialog" aria-labelledby="finding-dialog-title"><button className="tc-modal-close" onClick={() => selectFinding(null)} aria-label="Close finding details"><X /></button><header className="tc-detail-header"><div className="tc-detail-kicker"><Badge variant="outline">{selectedFinding.id}</Badge><span className={`tc-severity-pill ${selectedFinding.severity}`}>{formatLabel(selectedFinding.severity)}</span>{selectedFinding.humanLocked && <span className="tc-lock-inline"><LockKeyhole />Human locked</span>}</div><h2 id="finding-dialog-title">{selectedFinding.title}</h2><p>{selectedFinding.component} · Priority score {priorityScore(selectedFinding)}</p></header><div className="tc-detail-scroll">
    <section className="tc-detail-summary"><p>{selectedFinding.description}</p><dl><div><dt>Exploitability</dt><dd>{formatLabel(selectedFinding.exploitability)}</dd></div><div><dt>Impact</dt><dd>{formatLabel(selectedFinding.impact)}</dd></div><div><dt>Confidence</dt><dd>{formatLabel(selectedFinding.confidence)}</dd></div><div><dt>Effort</dt><dd>{selectedFinding.effortDays} engineering days</dd></div></dl></section>
    <section className="tc-human-controls"><div><span className="tc-eyebrow">Human decision controls</span><h3>Review and override</h3></div><div className="tc-edit-grid"><label>Severity<select value={selectedFinding.severity} onChange={(event) => api.setSeverity(selectedFinding.id, event.target.value as Severity, 'Manually adjusted by the analyst in the finding panel.', 'human')}>{SEVERITIES.map((severity) => <option key={severity} value={severity}>{formatLabel(severity)}</option>)}</select></label><label>Status<select value={selectedFinding.status} onChange={(event) => api.setStatus(selectedFinding.id, event.target.value as FindingStatus, 'Manually adjusted by the analyst in the finding panel.', 'human')}>{STATUSES.map((status) => <option key={status} value={status}>{formatLabel(status)}</option>)}</select></label></div><Button variant={selectedFinding.humanLocked ? 'secondary' : 'outline'} onClick={() => api.setHumanLock(selectedFinding.id, !selectedFinding.humanLocked, selectedFinding.humanLocked ? 'Analyst released the decision for continued review.' : 'Analyst locked this decision so automatic prioritization must preserve it.', 'human')}>{selectedFinding.humanLocked ? <UnlockKeyhole /> : <LockKeyhole />}{selectedFinding.humanLocked ? 'Unlock decision' : 'Lock human decision'}</Button>{selectedFinding.lockReason && <p className="tc-lock-reason"><LockKeyhole />{selectedFinding.lockReason}</p>}</section>
    <section><span className="tc-eyebrow">Why it matters</span><h3>Reasoning</h3><p>{selectedFinding.reasoning}</p></section><section><span className="tc-eyebrow">Recommended remediation</span><h3>Engineering plan</h3><p>{selectedFinding.remediation}</p></section>
    <section><span className="tc-eyebrow">Evidence</span><h3>{selectedFinding.evidence.length} review artifacts</h3><ul className="tc-evidence-list">{selectedFinding.evidence.map((item) => <li key={item}><CheckCircle2 />{item}</li>)}</ul></section>
    <section><span className="tc-eyebrow">Transparent scoring</span><h3>Outpost Priority Score</h3><div className="tc-score-breakdown">{Object.entries(priorityFormula(selectedFinding)).map(([key, value]) => <div key={key}><span>{formatLabel(key)}</span><strong>{value}</strong></div>)}</div><p className="tc-formula">(Severity × 5 + Exploitability × 8 + Impact × 8) × Confidence. This is not CVSS.</p></section>
    <section><span className="tc-eyebrow">Human + agent notes</span><h3>Review context</h3>{selectedFinding.notes.length ? <div className="tc-notes">{selectedFinding.notes.map((note) => <article key={note.id}><span>{note.authorType === 'agent' ? <Bot /> : <UserRound />}</span><div><strong>{formatLabel(note.authorType)}</strong><p>{note.text}</p></div></article>)}</div> : <p className="tc-empty-copy">No notes yet.</p>}<div className="tc-add-note"><textarea value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} placeholder="Add analyst context…" /><Button onClick={() => { if (noteDraft.trim()) { api.addNote(selectedFinding.id, noteDraft, 'human'); setNoteDraft(''); } }}><MessageSquareText />Add note</Button></div></section>
  </div></dialog></div>}</main>;
}

