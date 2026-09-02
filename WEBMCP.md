# WebMCP tool guide

Outpost exposes fourteen browser-native tools from the rendered page. The app checks `document.modelContext` first and registers each tool with `registerTool`. Every handler calls the same `WorkspaceApi` as the manual UI, so the agent and analyst always see one shared workspace.

## Tool catalog

| Tool | Kind | Visible effect |
|---|---|---|
| `list_findings` | Read | Returns filtered findings ordered by workspace priority |
| `inspect_finding` | Read | Returns evidence, notes, reasoning, remediation, and score terms |
| `set_finding_severity` | Write | Changes severity and adds a provenance event; rejects human locks |
| `set_finding_status` | Write | Changes workflow status and adds a provenance event; rejects human locks |
| `add_finding_note` | Write | Adds visibly attributed review context |
| `compare_findings` | Write | Opens a visible comparison in the shared workspace |
| `reprioritize_findings` | Write | Changes relative rank for an exact selected set; preserves locks |
| `calculate_risk_summary` | Read | Calculates exposure, progress, distribution, and top findings |
| `create_remediation_sprint` | Write | Creates a capacity-validated sprint from explicit findings or automatically selects eligible work by risk, effort, or ratio |
| `remove_from_remediation_sprint` | Write | Removes one item; human removals become preserved exclusions |
| `rebalance_remediation_sprint` | Write | Fills capacity by risk, effort, or ratio while preserving human choices |
| `mark_finding_human_locked` | Write | Locks or unlocks a finding with an auditable reason |
| `get_activity_history` | Read | Returns recent human, agent, and system actions |
| `reset_demo_workspace` | Write | Resets local demo state only when `confirmation` is exactly `RESET` |

All tool inputs set `additionalProperties: false`. Finding identifiers must match `F-###`; text and array sizes are bounded; numeric values have explicit ranges; enum fields reject unknown values.

`list_findings`, `inspect_finding`, `calculate_risk_summary`, and `get_activity_history` declare `readOnlyHint: true`. Tools that return finding text or notes declare `untrustedContentHint: true` because the browser workspace may contain user-authored content.

## Suggested evaluator prompts

Start from a reset workspace and run these in order:

1. **Read:** “List the critical and high findings, then inspect the authorization and touch-input findings. Explain the priority difference using evidence and score terms.”
2. **Shared mutation:** “Add a note to F-101 that server-side authorization is the release blocker, then set it to investigating.”
3. **Human boundary:** “Try to downgrade F-104 to low because exploitation needs physical interaction.” The tool must refuse because F-104 is human locked.
4. **Planning:** “Build the highest-risk remediation sprint that fits within five engineering days.” A single `create_remediation_sprint` call with `capacityDays: 5` and `prioritizeBy: "risk"` should persist F-101, F-114, F-109, and F-105 in the Remediation Sprint view, use exactly 5/5 days, and exclude accepted, resolved, and human-locked findings.
5. **Preserved judgment:** Manually remove one sprint item in the UI, then ask: “Rebalance this sprint by risk-to-effort within five days.” The removed item must stay excluded.
6. **Provenance:** “Summarize the latest activity and separate human decisions from agent actions.”

## Browser support

The manual application works without WebMCP. The agent tool surface requires a WebMCP-capable browser, including ChatGPT's in-app browser or a compatible Chrome build with WebMCP enabled. The About WebMCP view reports whether registration succeeded and displays the registered tool count.

## Source map

- Registration and schemas: `lib/webmcp/register-tools.ts`
- Validation and state transitions: `lib/workspace.ts`
- Score and types: `lib/domain.ts`
- Human UI and persistence adapter: `components/threatcanvas-app.tsx`
- WebMCP ambient types: `types/webmcp.d.ts`

