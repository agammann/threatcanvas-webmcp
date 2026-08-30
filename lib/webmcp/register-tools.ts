'use client';

import { useEffect, useMemo, useState } from 'react';
import { SEVERITIES, STATUSES, priorityFormula, priorityScore, type Finding } from '@/lib/domain';
import { assertEnum, assertNumber, assertStringArray, assertText, type RebalanceMode, type WorkspaceApi } from '@/lib/workspace';

export const WEBMCP_TOOL_NAMES = [
  'list_findings',
  'inspect_finding',
  'set_finding_severity',
  'set_finding_status',
  'add_finding_note',
  'compare_findings',
  'reprioritize_findings',
  'calculate_risk_summary',
  'create_remediation_sprint',
  'remove_from_remediation_sprint',
  'rebalance_remediation_sprint',
  'mark_finding_human_locked',
  'get_activity_history',
  'reset_demo_workspace',
] as const;

export type WebMcpStatus = 'checking' | 'ready' | 'unavailable' | 'error';

const objectSchema = (properties: Record<string, unknown>, required: string[] = []) => ({
  type: 'object',
  properties,
  ...(required.length ? { required } : {}),
  additionalProperties: false,
});

const findingId = { type: 'string', pattern: '^F-[0-9]{3}$', description: 'ThreatCanvas finding identifier, for example F-104.' };
const reason = { type: 'string', minLength: 4, maxLength: 500, description: 'Auditable reason for the requested decision.' };

function slimFinding(finding: Finding) {
  return {
    id: finding.id,
    title: finding.title,
    component: finding.component,
    severity: finding.severity,
    exploitability: finding.exploitability,
    impact: finding.impact,
    confidence: finding.confidence,
    status: finding.status,
    effortDays: finding.effortDays,
    priorityScore: priorityScore(finding),
    humanLocked: finding.humanLocked,
    tags: finding.tags,
  };
}

function result(value: unknown) {
  return JSON.stringify(value);
}

function wrap(execute: WebMcpTool['execute']): WebMcpTool['execute'] {
  return async (input, options) => {
    options?.signal?.throwIfAborted();
    try {
      return await execute(input, options);
    } catch (error) {
      return result({ ok: false, error: error instanceof Error ? error.message : 'ThreatCanvas could not complete the tool call.' });
    }
  };
}

export function createWebMcpTools(api: WorkspaceApi): WebMcpTool[] {
  return [
    {
      name: 'list_findings',
      title: 'List security findings',
      description: 'List findings in the active ThreatCanvas workspace, optionally filtered by severity, status, component, tag, or minimum priority. Use this to triage the board before inspecting or changing individual findings.',
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      inputSchema: objectSchema({
        severity: { type: 'string', enum: SEVERITIES },
        status: { type: 'string', enum: STATUSES },
        component: { type: 'string', maxLength: 120 },
        tag: { type: 'string', maxLength: 60 },
        minimumPriority: { type: 'number', minimum: 0, maximum: 100 },
        limit: { type: 'integer', minimum: 1, maximum: 50 },
      }),
      execute: wrap((input) => {
        const severity = input.severity === undefined ? undefined : assertEnum(input.severity, 'severity', SEVERITIES);
        const status = input.status === undefined ? undefined : assertEnum(input.status, 'status', STATUSES);
        const component = input.component === undefined ? undefined : assertText(input.component, 'component', 1, 120);
        const tag = input.tag === undefined ? undefined : assertText(input.tag, 'tag', 1, 60).toLowerCase();
        const minimumPriority = input.minimumPriority === undefined ? undefined : assertNumber(input.minimumPriority, 'minimumPriority', 0, 100);
        const limit = input.limit === undefined ? undefined : assertNumber(input.limit, 'limit', 1, 50);
        const findings = api.listFindings({ severity, status, component, tag, minimumPriority, limit });
        return result({ ok: true, count: findings.length, findings: findings.map(slimFinding) });
      }),
    },
    {
      name: 'inspect_finding',
      title: 'Inspect a security finding',
      description: 'Retrieve complete evidence, reasoning, remediation guidance, analyst notes, relationships, and scoring detail for one ThreatCanvas finding. Use this before recommending a decision or changing workspace state.',
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      inputSchema: objectSchema({ findingId }, ['findingId']),
      execute: wrap(({ findingId: value }) => {
        const id = assertText(value, 'findingId', 5, 10);
        const finding = api.inspectFinding(id);
        return result({ ok: true, finding: { ...finding, priority: priorityFormula(finding) } });
      }),
    },
    {
      name: 'set_finding_severity',
      title: 'Set finding severity',
      description: 'Change the severity assigned to a security finding in the active workspace. Use when the user explicitly accepts a severity decision. The action is auditable and will refuse to override a human-locked finding.',
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      inputSchema: objectSchema({ findingId, severity: { type: 'string', enum: SEVERITIES }, reason }, ['findingId', 'severity', 'reason']),
      execute: wrap((input) => {
        const id = assertText(input.findingId, 'findingId', 5, 10);
        const severity = assertEnum(input.severity, 'severity', SEVERITIES);
        const why = assertText(input.reason, 'reason', 4, 500);
        return result({ ok: true, finding: slimFinding(api.setSeverity(id, severity, why, 'agent')) });
      }),
    },
    {
      name: 'set_finding_status',
      title: 'Set finding status',
      description: 'Change the workflow status of a ThreatCanvas finding to open, investigating, accepted, scheduled, or resolved. Use after the user chooses a disposition; include a reason for the activity record.',
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      inputSchema: objectSchema({ findingId, status: { type: 'string', enum: STATUSES }, reason }, ['findingId', 'status', 'reason']),
      execute: wrap((input) => {
        const id = assertText(input.findingId, 'findingId', 5, 10);
        const status = assertEnum(input.status, 'status', STATUSES);
        const why = assertText(input.reason, 'reason', 4, 500);
        return result({ ok: true, finding: slimFinding(api.setStatus(id, status, why, 'agent')) });
      }),
    },
    {
      name: 'add_finding_note',
      title: 'Add a finding note',
      description: 'Attach analysis or context to a ThreatCanvas finding without changing its rating. Notes are visible to the analyst and returned as untrusted user-authored content in later inspections.',
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      inputSchema: objectSchema({ findingId, note: { type: 'string', minLength: 2, maxLength: 1200 }, authorType: { type: 'string', enum: ['agent', 'human'], default: 'agent' } }, ['findingId', 'note']),
      execute: wrap((input) => {
        const id = assertText(input.findingId, 'findingId', 5, 10);
        const note = assertText(input.note, 'note', 2, 1200);
        const authorType = input.authorType === undefined ? 'agent' : assertEnum(input.authorType, 'authorType', ['agent', 'human'] as const);
        const finding = api.addNote(id, note, authorType);
        return result({ ok: true, findingId: id, noteCount: finding.notes.length });
      }),
    },
    {
      name: 'compare_findings',
      title: 'Compare security findings',
      description: 'Compare two to six ThreatCanvas findings across severity, impact, exploitability, confidence, effort, and priority. The structured comparison also appears visibly in the shared workspace.',
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      inputSchema: objectSchema({ findingIds: { type: 'array', minItems: 2, maxItems: 6, uniqueItems: true, items: findingId } }, ['findingIds']),
      execute: wrap((input) => {
        const ids = assertStringArray(input.findingIds, 'findingIds', { min: 2, max: 6 });
        const findings = api.compareFindings(ids, 'agent');
        return result({ ok: true, comparison: findings.map((finding) => ({ ...slimFinding(finding), riskToEffort: Math.round((priorityScore(finding) / finding.effortDays) * 10) / 10 })) });
      }),
    },
    {
      name: 'reprioritize_findings',
      title: 'Reprioritize findings',
      description: 'Set the relative priority order for a selected group of ThreatCanvas findings. Use after comparing them and obtaining user agreement. Human-locked findings cannot be moved automatically.',
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      inputSchema: objectSchema({ findingIds: { type: 'array', minItems: 2, maxItems: 18, uniqueItems: true, items: findingId }, priorityOrder: { type: 'array', minItems: 2, maxItems: 18, uniqueItems: true, items: findingId }, reason }, ['findingIds', 'priorityOrder', 'reason']),
      execute: wrap((input) => {
        const ids = assertStringArray(input.findingIds, 'findingIds', { min: 2, max: 18 });
        const order = assertStringArray(input.priorityOrder, 'priorityOrder', { min: ids.length, max: ids.length });
        const why = assertText(input.reason, 'reason', 4, 500);
        return result({ ok: true, findings: api.reprioritize(ids, order, why, 'agent').map(slimFinding) });
      }),
    },
    {
      name: 'calculate_risk_summary',
      title: 'Calculate risk summary',
      description: 'Calculate the active workspace exposure score, severity distribution, remediation progress, and highest-priority findings using the transparent ThreatCanvas Priority Score.',
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      inputSchema: objectSchema({}),
      execute: wrap(() => {
        const summary = api.calculateRisk();
        return result({ ok: true, ...summary, highestPriority: summary.highestPriority.map(slimFinding) });
      }),
    },
    {
      name: 'create_remediation_sprint',
      title: 'Create remediation sprint',
      description: 'Create a visible remediation sprint from selected findings and an engineering-day capacity. This schedules work but never marks findings resolved; over-capacity selections are rejected.',
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      inputSchema: objectSchema({ findingIds: { type: 'array', minItems: 1, maxItems: 18, uniqueItems: true, items: findingId }, sprintName: { type: 'string', minLength: 2, maxLength: 80 }, capacityDays: { type: 'number', minimum: 0.5, maximum: 60 } }, ['findingIds', 'sprintName', 'capacityDays']),
      execute: wrap((input) => {
        const ids = assertStringArray(input.findingIds, 'findingIds', { min: 1, max: 18 });
        const name = assertText(input.sprintName, 'sprintName', 2, 80);
        const capacity = assertNumber(input.capacityDays, 'capacityDays', 0.5, 60);
        return result({ ok: true, sprint: api.createSprint(ids, name, capacity, 'agent') });
      }),
    },
    {
      name: 'remove_from_remediation_sprint',
      title: 'Remove finding from sprint',
      description: 'Remove one finding from the active remediation sprint with an auditable reason. Use to rebalance scope; the finding is not resolved or deleted.',
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      inputSchema: objectSchema({ findingId, reason }, ['findingId', 'reason']),
      execute: wrap((input) => result({ ok: true, sprint: api.removeFromSprint(assertText(input.findingId, 'findingId', 5, 10), assertText(input.reason, 'reason', 4, 500), 'agent') })),
    },
    {
      name: 'rebalance_remediation_sprint',
      title: 'Rebalance remediation sprint',
      description: 'Recalculate the active remediation sprint for a capacity using risk, effort, or risk-to-effort. The algorithm preserves every human-locked inclusion or exclusion and every manual human removal.',
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      inputSchema: objectSchema({ capacityDays: { type: 'number', minimum: 0.5, maximum: 60 }, prioritizeBy: { type: 'string', enum: ['risk', 'effort', 'risk_to_effort'] } }, ['capacityDays', 'prioritizeBy']),
      execute: wrap((input) => {
        const capacity = assertNumber(input.capacityDays, 'capacityDays', 0.5, 60);
        const mode = assertEnum(input.prioritizeBy, 'prioritizeBy', ['risk', 'effort', 'risk_to_effort'] as const) as RebalanceMode;
        return result({ ok: true, sprint: api.rebalanceSprint(capacity, mode, 'agent') });
      }),
    },
    {
      name: 'mark_finding_human_locked',
      title: 'Set human decision lock',
      description: 'Lock or unlock a ThreatCanvas finding decision on the user’s explicit instruction. Automatic severity, status, and prioritization changes must respect locked findings.',
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      inputSchema: objectSchema({ findingId, locked: { type: 'boolean' }, reason }, ['findingId', 'locked', 'reason']),
      execute: wrap((input) => {
        if (typeof input.locked !== 'boolean') throw new Error('locked must be a boolean.');
        return result({ ok: true, finding: slimFinding(api.setHumanLock(assertText(input.findingId, 'findingId', 5, 10), input.locked, assertText(input.reason, 'reason', 4, 500), 'agent')) });
      }),
    },
    {
      name: 'get_activity_history',
      title: 'Get activity history',
      description: 'Return recent human, agent, and system actions from the active ThreatCanvas review. Use to summarize what changed and distinguish analyst decisions from agent recommendations.',
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      inputSchema: objectSchema({ limit: { type: 'integer', minimum: 1, maximum: 100 } }),
      execute: wrap((input) => {
        const limit = input.limit === undefined ? 25 : assertNumber(input.limit, 'limit', 1, 100);
        return result({ ok: true, activity: api.getState().activity.slice(0, limit) });
      }),
    },
    {
      name: 'reset_demo_workspace',
      title: 'Reset demo workspace',
      description: 'Reset the entire ThreatCanvas demo to its original seeded state. This discards notes, sprint changes, ratings, locks, and activity; use only when the user explicitly requests a demo reset.',
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      inputSchema: objectSchema({ confirmation: { type: 'string', const: 'RESET', description: 'Exact confirmation token RESET.' } }, ['confirmation']),
      execute: wrap((input) => {
        if (input.confirmation !== 'RESET') throw new Error('confirmation must equal RESET.');
        const state = api.resetWorkspace('agent');
        return result({ ok: true, reset: true, findingCount: state.findings.length });
      }),
    },
  ];
}

export function useWebMcpRegistration(api: WorkspaceApi) {
  const [status, setStatus] = useState<WebMcpStatus>('checking');
  const [error, setError] = useState<string | null>(null);
  const tools = useMemo(() => createWebMcpTools(api), [api]);

  useEffect(() => {
    const context = document.modelContext ?? navigator.modelContext;
    if (!context) {
      setStatus('unavailable');
      return;
    }
    const controller = new AbortController();
    setStatus('checking');
    Promise.all(tools.map((tool) => context.registerTool(tool, { signal: controller.signal })))
      .then(() => {
        setError(null);
        setStatus('ready');
      })
      .catch((cause) => {
        if (controller.signal.aborted) return;
        setError(cause instanceof Error ? cause.message : 'Tool registration failed.');
        setStatus('error');
      });
    return () => controller.abort();
  }, [tools]);

  return { status, error, count: tools.length, tools };
}

