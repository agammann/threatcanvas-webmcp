# Contributing

1. Install Node.js 22.13+ and pnpm.
2. Run `pnpm install` and `pnpm dev`.
3. Keep all example findings fictional and defensive.
4. Add or update tests for changes to `lib/domain.ts`, `lib/workspace.ts`, or WebMCP tool behavior.
5. Run `pnpm typecheck`, `pnpm test`, `pnpm lint`, and `pnpm build` before proposing a change.

New WebMCP tools should be narrow, composable, schema-validated, and backed by an existing domain operation. Mark read-only tools accurately. Use `untrustedContentHint` whenever a result may contain notes or other user-controlled text. Do not create a separate agent-only state path.
