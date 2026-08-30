# Security policy

ThreatCanvas is a defensive demonstration application. Its seed data is intentionally fictional and contains no credentials, private vulnerability records, real customer systems, exploit payloads, or instructions for compromising a target.

## Security properties

- WebMCP and human UI actions use the same validated domain layer.
- Human-locked findings reject automatic severity, status, and reprioritization changes.
- A remediation sprint schedules work; it never silently marks findings resolved.
- Human sprint removals are preserved during automatic rebalancing.
- Mutating tools require explicit identifiers and reasons where a decision needs provenance.
- Tool descriptions never authorize agents to exceed a user's request.
- User-authored notes and finding content are marked as untrusted when returned to an agent.
- All browser state can be reset locally; no credentials or external integrations are required.

## Reporting a vulnerability

Please do not include secrets, personal data, production target details, or weaponized payloads in a public issue. Provide a minimal defensive reproduction and the affected commit privately to the repository owner. This demonstration has no security bounty program.

## Scope

Security reports about the ThreatCanvas source, page-side WebMCP schemas, input validation, state-integrity rules, or deployment configuration are in scope. Vulnerabilities in fictional seed records and requests for offensive target analysis are out of scope.
