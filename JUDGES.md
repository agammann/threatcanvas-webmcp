# Two-minute judge path

## 0:00–0:25 — Understand the product

Open the dashboard. Confirm that ThreatCanvas is a complete security triage workspace with 18 fictional findings, practical priority scores, evidence, visible progress, and a WebMCP-ready status.

## 0:25–0:55 — Inspect human judgment

Open F-101 to see evidence, reasoning, remediation, scoring terms, manual severity/status controls, notes, and a lock. Open F-104 and observe its seeded human lock. The score is explained as project-specific and not CVSS.

## 0:55–1:30 — Exercise WebMCP

Ask the browser agent:

> Compare F-101, F-104, and F-111. Explain why their practical priorities differ, using evidence and the score terms.

The comparison becomes visible in the same interface. Then ask it to downgrade F-104. The domain layer should refuse because the analyst locked the decision.

## 1:30–2:00 — Build the plan

Ask:

> Build the highest-risk remediation sprint that fits within five engineering days.

Open Remediation Sprint. Confirm the selected findings, exact capacity use, estimated risk reduction, and activity provenance. Remove one item manually and ask the agent to rebalance; the human exclusion stays preserved.

For a deeper review, see [WEBMCP.md](./WEBMCP.md), [ARCHITECTURE.md](./ARCHITECTURE.md), and the automated tests in `tests/workspace.test.ts`.
