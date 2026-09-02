# Devpost submission copy

## Project name

Outpost

## Elevator pitch

Human judgment, agent speed: explainable security triage and remediation planning through browser-native WebMCP tools.

## Inspiration

Security review produces a familiar bottleneck: plenty of findings, limited engineering time, and decisions that depend on context no scanner can fully own. Agents can help with comparison and planning, but a black-box assistant that silently changes severity or closes work creates a new trust problem. We built Outpost around a stronger division of responsibility: agents accelerate structured analysis; analysts retain consequential judgment.

## What it does

Outpost is a polished security triage workspace with 18 fictional defensive findings across authorization, identity, session handling, dependencies, browser controls, APIs, configuration, secrets, uploads, rate limiting, and logging.

Analysts can review evidence and remediation guidance, edit severity and status, add notes, lock decisions, compare findings, shape a remediation sprint, remove scope, undo changes, and inspect a provenance-rich activity trail.

Through WebMCP, agents can list and inspect findings, compare and reprioritize a set, calculate the workspace risk summary, add notes, propose workflow changes, build a capacity-aware sprint, rebalance it by risk or effort, and summarize activity. The agent and the human always modify the exact same visible state.

## How we built it

Outpost is a React 19 application built with Vinext, TypeScript, Tailwind CSS, and accessible shadcn primitives, deployed through OpenAI Sites on Cloudflare infrastructure.

The page feature-detects `document.modelContext` and registers 14 imperative WebMCP tools with JSON Schema inputs. We use current `readOnlyHint` and `untrustedContentHint` annotations, bound input sizes, enum values, strict finding identifiers, capacity ranges, and an AbortController registration lifecycle.

The key architectural choice is a shared `WorkspaceApi`. Both React controls and WebMCP handlers call the same immutable domain operations. A mutation updates browser-persisted state, rerenders the interface, and appends a human/agent/system provenance event. This avoids the common failure mode where a demo tool returns a success string but changes a separate or invisible state.

Our transparent project-specific priority score combines severity, exploitability, impact, and confidence. The full arithmetic is shown to the analyst and is explicitly not CVSS.

## How WebMCP improves the experience

Without WebMCP, an agent has to inspect the DOM, infer which controls matter, simulate clicks, and guess whether every step succeeded. Outpost gives it explicit operations with typed arguments and meaningful results. The user can ask one intent-level question—such as “build the highest-risk sprint that fits in five days”—and receive a validated plan that is immediately visible and editable.

WebMCP also makes the safety boundary clearer. Read operations are distinguishable from mutations; user-authored content is marked untrusted; and tool descriptions state exactly when a capability is appropriate.

## Human and agent responsibilities

Agents are well suited to search, comparison, calculation, evidence synthesis, and capacity optimization. Humans own business context, rating acceptance, risk acceptance, and sprint scope.

Outpost enforces that split. A human lock blocks automatic severity, status, and priority changes in the shared domain layer. A manual sprint removal becomes a persistent exclusion during later agent rebalancing. Creating a sprint schedules work; it never silently resolves a finding. Every action remains visible and attributable.

## Challenges we ran into

The hardest part was not registering tools—it was making browser-native actions honest. We needed one durable state path for humans and agents, deterministic validation, visible effects, provenance, undo, and safeguards that survive every entry point. Capacity planning added another constraint: the optimizer must fit within a hard engineering budget while preserving human inclusions and exclusions.

We also designed the app to degrade gracefully. In a browser without WebMCP, Outpost remains a complete manual workspace and clearly explains how to enable the agent tool surface.

## Accomplishments that we're proud of

- 14 real, schema-validated page-side WebMCP tools
- One shared visible state for human controls and agent actions
- Domain-enforced human locks and preserved sprint exclusions
- Transparent score arithmetic and evidence rather than an opaque confidence badge
- Capacity-aware remediation planning that never overstates completion
- 18 varied, fictional, defensive findings with no private target data
- Automated tests for scoring, immutability, provenance, locking, capacity, filters, and rebalancing
- Complete public documentation, license, judge path, and demo prompts

## What we learned

WebMCP is most compelling when it exposes real product capabilities instead of mirroring buttons. Good tools are narrow and composable, but the product still needs a strong domain model underneath them. We also learned that human control is more credible when encoded as a testable invariant rather than a sentence in the interface.

## What's next for Outpost

The next version would add opt-in encrypted team workspaces, adapters for common defensive scanners, policy profiles for organization-specific scoring, pull-request remediation evidence, and signed audit exports. Those integrations would remain subordinate to the same model: structured agent assistance, visible state, and human authority for consequential decisions.

## Built with

WebMCP, React 19, TypeScript, Vinext, Vite, Tailwind CSS, shadcn, OpenAI Sites, Cloudflare Workers, Node.js test runner

## Tags

webmcp, security, human-in-the-loop, ai-agents, developer-tools
