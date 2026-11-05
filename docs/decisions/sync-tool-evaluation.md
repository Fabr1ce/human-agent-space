# Sync Tool Evaluation

**Status:** Evaluation complete; implementation direction awaits human approval

**Date:** 2026-11-05

**Scope:** Compare `rulesync` and `ruler` as references or dependencies for the
Copilot and Claude Code MVP sync workflow.

## Summary

Neither candidate satisfies the MVP's required safety contract by itself.
Both can generate Copilot and Claude Code configuration, and both are MIT
licensed. `rulesync` offers the closer match for canonical rules and skills,
preview, and drift checking. However, its normal generation path writes changed
target files without a separate adopt/ownership gate. `ruler` has useful
backups, generated-file provenance, and revert support, but its apply workflow
also writes over existing target files and it does not provide a drift-check or
adopt command.

**Recommendation:** Do not add either as a runtime dependency. Build only the
minimal built-in Copilot and Claude Code adapters and sync engine already
required by TASK-2.2–2.5, using `rulesync` as a reference for target formats.
Keep HAS responsible for plan-before-write, explicit adoption, drift reporting,
and preserving hand-authored files. This is a recommendation, not authorization
to start implementation; ADR-006 requires human approval first.

## Comparison

| Area | `rulesync` | `ruler` |
|---|---|---|
| License / version | MIT; `43.6.2` | MIT; `0.3.46` |
| Copilot / Claude coverage | Both have rules and native skills in the supported-tools matrix. It also supports other features and many additional tools. | Both are supported; Copilot writes `AGENTS.md`, Claude Code writes `CLAUDE.md`. Native skills support is marked experimental in the README. |
| Preview / drift | `generate --dry-run` previews; `generate --check` exits non-zero when generated files differ. The generator compares output and reports a diff. | `apply --dry-run` and `revert --dry-run` are documented. No `check` or `adopt` command was found in the documented CLI. |
| Existing-file safety | Changed output files are written by `writeAiFiles`; unchanged output is skipped. `--delete` provides orphan cleanup. There is no separate ownership/adoption barrier before replacing a changed target file. | Existing files can be backed up and generated provenance is tracked; `revert` restores verified backups and preserves files without provenance. `apply` still writes its generated content to the target, so backups are rollback rather than a no-overwrite gate. |
| Fit with HAS | Uses `.rulesync/` inputs and supports library exports, but has broad functionality beyond HAS's two-adapter MVP. | Uses `.ruler/` configuration and has an executable CLI/library package; its rules-first workflow and default MCP / `.gitignore` handling need narrowing for HAS. |
| Dependency / runtime | Broad direct dependency set and Node `>=22.22.0`; its package supports Node 22+ while the project's declared minimum is Node `>=22`. Adding it would materially expand the dependency and runtime surface. | Smaller direct dependency set (`@iarna/toml`, `js-yaml`, `yargs`, `zod`); Node `^20.19.0 || ^22.12.0 || >=23`. README labels the project a **Beta Research Preview**, which raises stability risk. |
| Maintenance evidence | Package metadata was modified on 2026-11-05; repository HEAD inspected at the SHA below. This confirms recent package activity, but not a long-term maintenance commitment. | Repository HEAD and current package metadata were inspected at the SHA below. A maintenance cadence could not be established from the available evidence. |

Neither tool's documented workflow implements HAS's complete `plan/apply/check/adopt`
contract or guarantees that hand edits to generated output will not be overwritten
on a subsequent apply. Their preview, formatting, backup, provenance, and
target-specific behavior remain useful references.

## Verified sources

Source snapshots were inspected from these repository HEADs:

- `rulesync`: [`596bbc85032a7e0bd8a5c4c013b02c9fc4ae554d`](https://github.com/dyoshikawa/rulesync/tree/596bbc85032a7e0bd8a5c4c013b02c9fc4ae554d)
  - [`package.json`](https://github.com/dyoshikawa/rulesync/blob/596bbc85032a7e0bd8a5c4c013b02c9fc4ae554d/package.json): version, MIT license, Node engine, package exports and direct dependencies.
  - [`docs/reference/supported-tools.md`](https://github.com/dyoshikawa/rulesync/blob/596bbc85032a7e0bd8a5c4c013b02c9fc4ae554d/docs/reference/supported-tools.md): Copilot and Claude Code rules/skills support.
  - [`src/cli/commands/generate.ts`](https://github.com/dyoshikawa/rulesync/blob/596bbc85032a7e0bd8a5c4c013b02c9fc4ae554d/src/cli/commands/generate.ts): `--dry-run`, `--check`, diff result and non-zero check failure.
  - [`src/types/feature-processor.ts`](https://github.com/dyoshikawa/rulesync/blob/596bbc85032a7e0bd8a5c4c013b02c9fc4ae554d/src/types/feature-processor.ts): changed files are written in apply mode; dry-run reports writes; orphan removal is separate.
- `ruler`: [`5e551e60952fb1c81c6c5ad6f5fe8b7a412bda87`](https://github.com/intellectronica/ruler/tree/5e551e60952fb1c81c6c5ad6f5fe8b7a412bda87)
  - [`package.json`](https://github.com/intellectronica/ruler/blob/5e551e60952fb1c81c6c5ad6f5fe8b7a412bda87/package.json): version, MIT license, Node engine and direct dependencies.
  - [`README.md`](https://github.com/intellectronica/ruler/blob/5e551e60952fb1c81c6c5ad6f5fe8b7a412bda87/README.md): Beta Research Preview status, target support, dry-run, backup and revert options.
  - [`src/agents/AgentsMdAgent.ts`](https://github.com/intellectronica/ruler/blob/5e551e60952fb1c81c6c5ad6f5fe8b7a412bda87/src/agents/AgentsMdAgent.ts), [`src/agents/AbstractAgent.ts`](https://github.com/intellectronica/ruler/blob/5e551e60952fb1c81c6c5ad6f5fe8b7a412bda87/src/agents/AbstractAgent.ts), and [`src/core/revert-engine.ts`](https://github.com/intellectronica/ruler/blob/5e551e60952fb1c81c6c5ad6f5fe8b7a412bda87/src/core/revert-engine.ts): generated marker, backup/write behavior and provenance-aware revert.

An attempted GitHub API metadata check was blocked by the environment's
permission gate. It was not a user-initiated denial. Repository source retrieval
and package metadata inspection succeeded, so the comparison above is based on
the inspected source and package files; no candidate was executed.

## Decision required

Choose whether to proceed with the recommendation (minimal built-in sync engine,
using `rulesync` as a reference only), approve either candidate as a runtime
dependency despite the safety gaps, or pause Phase 2. No sync engine code has
been started.
