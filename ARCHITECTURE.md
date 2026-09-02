# Architecture

Outpost is a browser-local, human-in-the-loop security triage system. Its central design constraint is that the user and the agent must act on one inspectable source of truth.

## Data flow

```text
┌──────────────────┐        ┌──────────────────────┐
│ Human React UI   │───────>│                      │
└──────────────────┘        │ Validated Workspace  │
                            │ API + domain rules   │────> localStorage
┌──────────────────┐        │                      │      (versioned state)
│ WebMCP tool set  │───────>│                      │────> React render
└──────────────────┘        └──────────────────────┘      + activity log
```

`components/threatcanvas-app.tsx` owns the active state and persistence adapter. `lib/workspace.ts` contains the immutable decision rules. `lib/webmcp/register-tools.ts` converts WebMCP tool calls into the same `WorkspaceApi` methods used by interface controls. `lib/domain.ts` contains shared types and transparent scoring. `lib/seed-data.ts` creates a deterministic fictional workspace.

## State integrity

Each mutation creates a new workspace state, records actor provenance, persists the update, and causes the visible interface to rerender. The UI retains a bounded in-memory undo stack for analyst operations. Refresh persistence is versioned under the `outpost-workspace-v1` browser key.

The seeded `F-104` record demonstrates a human lock. Agent-authored severity, status, and reprioritization operations are rejected in the domain layer rather than merely disabled in the UI. Locks therefore protect the same invariant regardless of the entry point.

Sprint creation enforces engineering-day capacity. Rebalancing first preserves locked inclusions, locked exclusions, and human removals; it then fills remaining capacity by risk, effort, or risk-to-effort. It does not mark work resolved.

## Priority model

Outpost uses an intentionally compact project-specific model, not CVSS:

```text
(severity × 5 + exploitability × 8 + impact × 8) × confidence
```

Severity maps to 10/8/5/2, exploitability and impact map to 3/2/1, and confidence maps to 1.0/0.9/0.7/0.5. The finding panel shows every term so the score is interpretable. The workspace exposure score is the average unresolved priority score, bounded to 0–100.

## Trust boundaries

- Seeded and user-authored finding content is untrusted input to an agent.
- Tool arguments are validated for type, enum membership, length, uniqueness, identifier shape, and numeric range.
- Browser persistence is demo state, not a system of record or access-control boundary.
- The app makes no external API calls and stores no authentication material.
- Reset is destructive only to the local demo workspace and requires the exact `RESET` token through WebMCP or a visible confirmation through the UI.

## WebMCP lifecycle

Tool registration runs client-side after hydration. It first checks `document.modelContext`; `navigator.modelContext` is retained only as a compatibility fallback. Each registration shares one `AbortSignal`, which cleans up the complete tool surface if the component unmounts. If WebMCP is unavailable, all manual application features remain functional and the UI explains how to open a supported browser.
