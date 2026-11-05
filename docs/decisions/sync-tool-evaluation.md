# Sync Tool Evaluation

**Status:** Incomplete — no dependency selected  
**Date:** 2026-11-05  
**Scope:** Compare `rulesync` and `ruler` as references or dependencies for the
Copilot and Claude Code MVP sync workflow.

## Verified evidence

| Candidate | Verified | Not yet verified |
|---|---|---|
| `rulesync` | npm registry metadata reports version `43.6.2`, MIT license, repository `dyoshikawa/rulesync`, and describes it as a CLI that generates configuration files for AI development tools. Registry metadata reported a modification time of 2026-11-05T08:43:14Z. `git ls-remote` returned repository HEAD `596bbc85032a7e0bd8a5c4c013b02c9fc4ae554d`. | Official target coverage for the exact required Copilot/Claude Code outputs; generated-file ownership and drift/adopt behavior; dry-run guarantees; dependency/transitive dependency review; extension API; maintenance history beyond registry metadata; whether it is safe to invoke or integrate as a library. |
| `ruler` (`intellectronica/ruler`) | `git ls-remote` returned repository HEAD `5e551e60952fb1c81c6c5ad6f5fe8b7a412bda87`. | License, package/release metadata, supported targets, sync and drift semantics, dry-run behavior, extension API, maintenance, and security/dependency review. |

## Access limitation

Repository search and source/documentation retrieval were unavailable in this
environment during this evaluation. The available repository HEAD references and
the `rulesync` registry metadata are not sufficient to make a source-verified
comparison. No candidate's code was executed.

## Recommendation

Do not add either candidate as a dependency yet, and do not begin the custom sync
engine. `rulesync` is a promising candidate for further evaluation based on its
stated purpose, MIT metadata, and current release metadata, but those facts do not
establish that it meets this project's safety and behavior requirements. `ruler`
remains unassessed beyond repository existence.

Complete the source and documentation review for both candidates, then present a
comparison of license, maintenance, Copilot/Claude coverage, dry-run and drift
safety, hand-authored-file preservation, extension surface, and dependency risk.
The human must approve or reject either dependency before TASK-2.4 begins.
