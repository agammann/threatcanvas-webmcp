# Outpost demo script

Target runtime: 2 minutes 30 seconds to 2 minutes 50 seconds. Keep the narration natural and ensure the final YouTube video remains under three minutes with an audible audio stream.

## 0:00–0:20 — Problem and promise

“Security teams do not need another opaque risk score or an agent that silently changes their backlog. Outpost is a human-in-the-loop triage workspace where analysts keep judgment and agents accelerate the repetitive work.”

Show the dashboard, exposure, progress, finding board, activity rail, and WebMCP-ready badge.

## 0:20–0:47 — Manual workflow

“The workspace ships with eighteen fictional defensive findings across authorization, identity, browser security, dependencies, APIs, secrets, uploads, and logging. Every card shows practical priority, exploitability, engineering effort, status, and evidence.”

Open F-101.

“A finding includes evidence, reasoning, remediation guidance, editable severity and status, analyst notes, and a transparent score breakdown. The formula is intentionally visible and is not presented as CVSS.”

## 0:47–1:18 — Why WebMCP

Open About WebMCP.

“Without WebMCP, an agent must infer controls and simulate clicks. Outpost registers fourteen browser-native tools on `document.modelContext`. The tools use JSON Schema, current safety annotations, and the exact same validated workspace functions as the UI.”

Show the shared-state diagram and tool catalog.

## 1:18–1:52 — Shared agent action

Use this prompt:

> Compare F-101, F-104, and F-111. Explain why their priorities differ using evidence and score terms.

“The structured comparison appears in the visible workspace, and the activity trail records that the action came from the agent.”

Then try:

> Downgrade F-104 to low because it requires physical interaction.

“F-104 is human locked, so the domain layer rejects the automatic downgrade. This is a real invariant, not a disabled button.”

## 1:52–2:28 — Capacity-aware sprint

Use this prompt:

> Build the highest-risk remediation sprint that fits within five engineering days.

Open Remediation Sprint.

“Outpost selects a risk-to-effort mix that fits exactly inside the engineering capacity. It schedules work but never claims a finding is resolved. The analyst can remove scope, change capacity, and rebalance. Manual exclusions and locked choices are preserved.”

## 2:28–2:45 — Close

Open Activity.

“Every decision remains attributable to a human, agent, or system. Outpost shows what WebMCP is best at: giving agents structured application capabilities while keeping consequential judgment visible, reversible, and human-controlled.”

End on the dashboard with repository and live URL titles visible in the video description, not as temporary on-screen placeholders.
