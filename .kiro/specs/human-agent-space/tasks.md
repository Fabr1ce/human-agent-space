# Tasks: Human-Agent Space

Each task maps to a discrete, verifiable unit of work. The MVP consists of Phase 1
except tasks explicitly marked post-MVP, and Phase 2 through TASK-2.5. All other
tasks are roadmap backlog, not authorization to build them. Tasks within an
approved phase may be worked in parallel where dependencies allow. No phase begins
until the human approves its plan, and no phase is complete until its acceptance
criteria pass.

---

## Phase 1 — Workspace Foundation

### TASK-1.1 Repository scaffold
- Initialize npm package with TypeScript, Vitest, and Commander
- Configure `tsconfig.json` (strict mode, ESM output)
- Configure `vitest.config.ts`
- Add `.gitignore` (node_modules, dist, `.local/`, `*.local.yaml`)
- Add `bin/has.ts` entry point with version and help output
- **Acceptance:** `npm run build` succeeds; `has --version` prints version; `has --help` lists top-level commands

### TASK-1.2 JSON Schemas
- Write JSON Schema (draft-07) for MVP formats: `config`, `rule`, `skill`
- Include `schema_version` field in every schema
- Wire `ajv` validation into a shared `validate(schema, data)` utility
- **Acceptance:** Unit tests validate correct documents and reject invalid ones for each MVP schema

### TASK-1.3 Workspace root resolution
- Implement `resolveWorkspace()` — walks up from cwd to find `.has/`
- Resolve global root from `~/.has/`
- Resolve local root as `<project>/.has/.local/` (or `~/.has/.local/` in global-only mode)
- Expose `Workspace` object with `globalRoot`, `projectRoot`, `localRoot`, `config`
- **Acceptance:** Unit tests cover: found at cwd, found in parent, not found (global-only mode), explicit `--workspace` flag override

### TASK-1.4 Configuration loading and validation
- Implement `loadConfig()` — reads `config.yaml` from global then project, merges with documented precedence
- Validate merged config against `config.schema.json`
- Expose `effectiveConfig` showing each value's source scope
- **Acceptance:** Tests cover: global-only, project-only, merged precedence, invalid config returns actionable error

### TASK-1.5 Atomic file operations and frontmatter
- Implement `readFrontmatter(path)` — returns `{ data, content }` using `gray-matter`
- Implement `writeFrontmatter(path, data, content)` — atomic write (temp file + rename)
- Implement `listFiles(dir, glob)` — returns matching paths
- **Acceptance:** Tests cover: round-trip read/write preserves frontmatter; interrupted write does not corrupt original; glob matching works

### TASK-1.6 Stable ID generation (post-MVP)
- Implement `generateId(prefix)` — returns `<prefix>-<ulid>` (e.g. `mem-01J4K...`)
- IDs must be lexicographically sortable and unique across cold starts
- **Acceptance:** Unit tests confirm format, uniqueness across 10k generated IDs, and sort order

### TASK-1.7 Structured logger (post-MVP)
- Implement `createLogger(component, opts)` returning a `Logger` instance
- Support levels: `error`, `warn`, `info`, `debug` (default: `warn`)
- Write JSON lines to `.local/logs/has-YYYY-MM-DD.log` with daily rotation (keep last 7)
- Support `logger.child(context)` to inherit and extend correlation context
- Redact fields named `secret`, `token`, `password`, `key`, `credential` before writing
- **Acceptance:** Tests confirm: JSON output format; redaction of sensitive field names; child logger inherits correlation_id; files rotate on date change

### TASK-1.8 `has init` command
- Create global workspace layout at `~/.has/` when `--global` flag is passed
- Create project workspace layout at `<cwd>/.has/`
- Add `.local/` paths to `.gitignore` (append only, never overwrite existing entries)
- Write starter `config.yaml` and `AGENTS.md` only if they do not exist
- Must be idempotent — running twice changes nothing
- Support `--dry-run` — prints what would be created without writing
- **Acceptance:** Idempotency test (run twice, diff is empty); dry-run writes nothing; existing files never overwritten; `.gitignore` entries correct

### TASK-1.9 `has status` command
- Show: workspace roots resolved, config source, schema versions, presence of key directories
- Support `--json` output
- **Acceptance:** Output correct for global-only and project workspaces; `--json` is valid JSON

### TASK-1.10 `has doctor` command
- Check: workspace roots exist, config validates, schemas are current, `.gitignore` entries present, supported adapter setup is diagnosable
- Report each check as PASS / WARN / FAIL with a fix suggestion
- Support `--json` output
- **Acceptance:** Each check reports correctly for broken and healthy states; fix suggestions are actionable

### TASK-1.11 Canonical rules and skills
- Implement rule and skill discovery, frontmatter validation, and `rules list|show|validate` / `skills list|show|validate`
- Route agent-generated rule changes to proposals; never write proposals directly into canonical rules
- Never execute skill scripts during discovery or loading; protect canonical files from agent overwrite
- **Acceptance:** Fixture tests cover discovery, validation, and proposal separation; sync plans never target canonical files; invalid metadata is actionable; discovery causes no script execution

---

## Phase 2 (MVP) — GitHub Copilot, Claude Code, and Kiro Sync

### TASK-2.2 GitHub Copilot adapter
- Research and document Copilot instruction file paths, custom instructions, and skill projections
- Implement the concrete adapter behavior and fixture-based tests for plan, apply, check, and adopt
- Record findings in `docs/ADAPTERS.md` with verified/unverified status
- **Acceptance:** Rules and skills project to the documented Copilot formats; behavior is verified against documented support; fixture tests pass; ADAPTERS.md entry is complete

### TASK-2.3 Claude Code adapter
- Research and document Claude Code instruction file paths and native skill discovery
- Implement the concrete adapter behavior and fixture-based tests for plan, apply, check, and adopt
- Record findings in `docs/ADAPTERS.md`
- **Acceptance:** Rules and skills project to the documented Claude Code formats; behavior is verified against documented support; fixture tests pass; ADAPTERS.md entry is complete

### TASK-2.4 Shared sync engine and built-in adapter registry
- After TASK-2.2 and TASK-2.3, extract only the common adapter contract and registry required by the verified implementations
- Implement `SyncPlanner` — produces a `SyncPlan` describing every intended file operation
- Implement `SyncApplier` — executes a plan; reports what changed
- Implement `DriftChecker` — compares generated files to canonical source; returns `DriftReport`
- `sync --dry-run` must not write; `sync --check` must return non-zero on drift
- Generated files get a header comment pointing to canonical source
- Do not implement dynamic third-party plugin discovery or loading
- **Acceptance:** Contract/registry tests use both initial adapters; idempotency, dry-run no-write, drift detection, and hand-authored file preservation tests pass

### TASK-2.5 `has sync` and `has adopt` CLI commands (MVP)
- `has sync [--agent <id>] [--dry-run]`
- `has sync --check`
- `has adopt <generated-file>`
- Support `--json` output
- **Acceptance:** CLI integration tests for each mode; exit code is non-zero on drift

### TASK-2.6 Kiro adapter (approved addition)
- Implement the Kiro `AgentAdapter` using documented workspace steering and native skill formats
- Map empty rule globs to `inclusion: always`; map non-empty globs to `inclusion: fileMatch` and `fileMatchPattern`
- Document that workspace MCP servers use `.kiro/settings/mcp.json` and are not managed by the rules/skills sync adapter
- Implement fixture tests for plan, apply, check, adopt, rule inclusion modes, skill assets, and CLI targeting
- Record official references and verification status in `docs/ADAPTERS.md`
- **Acceptance:** `has sync --agent kiro` safely syncs rules and skills to `.kiro/steering/` and `.kiro/skills/`; dry-run, drift, conflict preservation, and adoption tests pass; MCP boundary and Kiro formats are documented

The following adapter tasks remain post-MVP backlog and require a later scope decision:

### TASK-2.7 Cursor adapter
- Research and document Cursor instruction file paths and MCP config method
- Implement `CursorAdapter` implementing `AgentAdapter`
- Record findings in `docs/ADAPTERS.md`
- **Acceptance:** Fixture-based tests; ADAPTERS.md entry complete

### TASK-2.8 Agy adapter
- Research and document Agy (formerly Gemini CLI) instruction file paths and MCP config method
- Implement `AgyAdapter` implementing `AgentAdapter`
- Record findings in `docs/ADAPTERS.md` — note the rename from Gemini CLI
- **Acceptance:** Fixture-based tests; ADAPTERS.md entry complete with rename noted

### TASK-2.9 Aider adapter
- Research and document Aider instruction file paths and config method
- Implement `AiderAdapter` implementing `AgentAdapter`
- Record findings in `docs/ADAPTERS.md`
- **Acceptance:** Fixture-based tests; ADAPTERS.md entry complete

### TASK-2.10 OpenAI Codex adapter
- Research and document Codex instruction file paths and MCP config method
- Implement `CodexAdapter` implementing `AgentAdapter`
- Record findings in `docs/ADAPTERS.md`
- **Acceptance:** Fixture-based tests; ADAPTERS.md entry complete

All phases below are post-MVP roadmap tasks and are not approved for implementation
until the MVP is evaluated and a new phase plan is approved.

---

## Phase 3 — Memory Engine

### TASK-3.1 Memory schemas and categories
- Finalize and publish JSON Schema for memory entries
- Implement TypeScript types matching the schema
- Write schema migration foundation (`migrations/memory/`)
- **Acceptance:** Schema validation unit tests; migration round-trip test

### TASK-3.2 Memory proposal and inbox
- Implement `propose(entry, actor)` — validates, scans for secrets/injection, assigns `proposed` status, writes to `memory/inbox/`
- Agent proposals default to `agent-inferred` provenance
- External-content entries are blocked from auto-accept at proposal time
- **Acceptance:** Valid proposal lands in inbox; secret scan blocks write; external-content cannot be auto-accepted; agent cannot set status to `accepted`

### TASK-3.3 Provenance and evidence model
- Implement provenance validation — enforce allowed values; reject undeclared provenance
- Implement evidence attachment — evidence entries validated and linked to location
- **Acceptance:** Tests for each provenance value; invalid provenance rejected; evidence location validated

### TASK-3.4 Review workflow (accept / reject / deprecate / supersede)
- Implement `accept(id, reviewer)` — moves from inbox to category dir; updates index
- Implement `reject(id, reviewer, reason)` — marks rejected; stays in inbox with reason
- Implement `deprecate(id, reviewer, reason)` — marks deprecated; excluded from active retrieval
- Implement `supersede(id, newId, reviewer)` — links old and new entries
- Enforce: agent cannot accept its own proposal (compare actor to reviewer)
- **Acceptance:** Full lifecycle test; agent-self-accept blocked; bulk review cannot bypass restrictions

### TASK-3.5 Memory search and filtering
- Implement lexical search over `title`, `summary`, `tags`, `category`
- Support filters: `scope`, `status`, `category`, `memory_type`, `author`, `tags`, `date range`
- Proposed and deprecated entries always clearly labeled in results
- **Acceptance:** Search tests with known fixtures; filter combination tests; status labels present

### TASK-3.6 Memory index build and rebuild
- Implement `buildIndex()` — scans accepted memory files, writes `memory/index.md`
- Implement `rebuildIndex()` — full rebuild from canonical files
- SQLite FTS index is optional — system works without it
- **Acceptance:** Index matches filesystem state; rebuild is idempotent; works without SQLite

### TASK-3.7 `has memory` CLI commands
- `memory propose`, `memory list`, `memory show`, `memory search`
- `memory review`, `memory accept`, `memory reject`, `memory deprecate`
- `memory index --rebuild`
- All support `--json`
- **Acceptance:** Integration tests for each command; review commands require human actor; `--json` is valid JSON

---

## Phase 4 — Context Engine

### TASK-4.1 Pluggable token estimator
- Define `TokenEstimator` interface in `src/context/estimator.ts`
- Implement `CharacterApproxEstimator` (default, no deps): ~4 chars per token
- Implement `TaskTokenEstimate` interface stub (data structure only, no estimation logic)
- Register estimator in workspace config with `character-approx-v1` as default
- **Acceptance:** Estimator interface test; character estimator produces consistent results; `TaskTokenEstimate` type compiles; `task show` renders "estimation not yet available" placeholder

### TASK-4.2 Candidate retrieval
- Implement retrieval for: applicable rules (by glob + scope), relevant skills (by tags), accepted memory (by lexical search + filters), project state, current handoff
- All retrieval is deterministic and lexical — no embeddings
- **Acceptance:** Retrieval tests with fixture workspaces; only `accepted` memory returned in normal retrieval; proposed/deprecated labeled separately

### TASK-4.3 Filter, rank, and budget enforcement
- Apply filters: trust status, scope, expiry, access policy
- Rank by: relevance score, recency, confidence, evidence quality
- Enforce token budget: truncate lowest-ranked items first; never truncate a rule mid-sentence
- Trust/approval status gates cannot be overridden by ranking score
- **Acceptance:** Budget enforcement test (items dropped when over limit); trust gate test (rejected/deprecated never appear as trusted); ranking is deterministic for same inputs

### TASK-4.4 Context manifest and budget breakdown
- Emit `ContextBudgetManifest` for every assembled package
- Record manifest to `.local/usage/<session-id>.json`
- Include: items included/excluded, reason for each exclusion, budget breakdown by category, warnings
- **Acceptance:** Manifest emitted for every build; breakdown totals match budget used; exclusion reasons present; file written to `.local/usage/`

### TASK-4.5 Context output formatters
- JSON output: full `ContextPackage` serialized with manifest
- Markdown output: human-readable, labeled sections per category, budget summary footer
- Proposed/unverified items rendered with explicit `[PROPOSED]` / `[UNVERIFIED]` labels
- **Acceptance:** Round-trip JSON test; Markdown output contains labels; budget summary present

### TASK-4.6 `has context` CLI commands
- `context build [--task <id>] [--budget <n>]`
- `context show [--session <id>]`
- `context get` / `context update`
- `context snapshot`
- All support `--json`
- **Acceptance:** Integration tests; budget flag respected; `--json` valid; proposed items labeled

---

## Phase 5 — Skills Roadmap Extensions

### TASK-5.1 Skill search and context integration
- Implement tag-based and text search over the MVP skill registry
- Integrate skill selection with context assembly (TASK-4.2)
- **Acceptance:** Search returns expected skills for known tags; integration with context assembly confirmed

### TASK-5.2 Additional adapter projections
- Add skill projections for adapters introduced after the MVP
- Canonical skill is never modified by projection
- **Acceptance:** Projection test per added adapter; canonical file unchanged after projection

### TASK-5.3 Skill import/export
- `has export --skills` / `has import --skills`
- **Acceptance:** CLI integration tests; export/import round-trip preserves metadata

---

## Phase 6 — Collaboration Engine

### TASK-6.1 Shared project state
- Implement read/write for `context/project-state.md` with frontmatter validation
- Expose `getProjectState()` and `updateProjectState()` with provenance tracking
- **Acceptance:** Read/write round-trip; provenance recorded on update; stale-check warns if not updated in configurable window

### TASK-6.2 Task CRUD and lifecycle
- Implement `createTask()`, `getTask()`, `listTasks()`, `updateTask()`
- Implement `transitionTask(id, newStatus, actor)` with validated state machine
- Enforce: tasks not marked completed without verification evidence or explicit override
- Record transition history in task body
- **Acceptance:** State machine tests (valid and invalid transitions); completed-without-evidence blocked; transition history appended

### TASK-6.3 Handoff snapshots
- Implement `createHandoff()` — snapshot of current task, verified work, unverified work, assumptions, open questions, next action
- Implement `getHandoff()` — returns latest snapshot with clear labeling
- **Acceptance:** Handoff distinguishes verified vs unverified sections; snapshot is immutable once written; resume displays correctly

### TASK-6.4 Event envelopes and usage recording
- Emit event envelopes (with `duration_ms`) for all significant operations
- Write events to `events/` directory
- Write context budget usage records to `.local/usage/`
- `has status` reads usage records and shows recent budget summary
- **Acceptance:** Events emitted for: memory lifecycle, task transitions, context builds; usage records written and readable by `status`

### TASK-6.5 `has task` CLI commands
- `task create`, `task list`, `task show`, `task update`, `task transition`
- All support `--json`
- `task show` renders `TaskTokenEstimate` placeholder section
- **Acceptance:** Integration tests for each command; `--json` valid; placeholder visible in `task show`

---

## Phase 7 — MCP and Human Interfaces

### TASK-7.1 MCP stdio server
- Implement `src/mcp/server.ts` using `@modelcontextprotocol/sdk`
- Server calls the same core services as the CLI — no duplicated business logic
- **Acceptance:** Server starts and responds to `initialize` request; tool list matches spec

### TASK-7.2 MCP tools — workspace and rules
- `workspace_status` — returns workspace health and config summary
- `rules_get` — returns applicable rules for a given context
- **Acceptance:** Integration tests; output includes provenance and scope labels

### TASK-7.3 MCP tools — skills
- `skills_list` — returns skill registry summary
- `skills_load` — returns full skill content by name
- **Acceptance:** Integration tests; no script execution triggered

### TASK-7.4 MCP tools — memory
- `memory_search` — lexical search over accepted memory; labels proposed items
- `memory_read` — returns single entry with full provenance
- `memory_propose` — creates proposal; enforces same validation as CLI
- No memory-accept tool exposed via MCP
- **Acceptance:** Search labels proposed items; propose enforces policy; accept is absent from tool list

### TASK-7.5 MCP tools — context, tasks, handoff
- `context_build`, `context_get`, `context_update`
- `task_list`, `task_read`, `task_propose`
- `handoff_get`
- All context responses include budget breakdown
- **Acceptance:** Integration tests; budget fields present; proposed material labeled

### TASK-7.6 MCP registration documentation
- Document MCP registration for Kiro and Claude Code in `docs/MCP.md`
- Include: config file path, JSON snippet, verification steps, known limitations
- Document registration notes for Cursor, Agy, Copilot, Codex where verified
- **Acceptance:** Kiro and Claude Code entries marked verified; others marked partial or unverified as appropriate

### TASK-7.7 CLI polish and human review workflow
- Add `--json` to any remaining commands that lack it
- Implement interactive `memory review` flow (list proposed → accept/reject/skip)
- Ensure all exit codes are consistent and documented
- **Acceptance:** All commands have `--json`; interactive review tested; exit code table in docs

---

## Phase 8 — Production Readiness

### TASK-8.1 `has audit` command
- `has audit` — workspace trust diagnostics: provenance coverage, proposed entries pending review, unverified adapters, security findings
- `has audit --ci` — machine-readable, non-zero exit on any FAIL finding
- **Acceptance:** CI mode returns non-zero for known failure fixtures; `--json` output is valid

### TASK-8.2 Import and export hardening
- `has import --from <agent> [--dry-run]` — supports Kiro and Claude Code formats initially
- `has export [--include-local]` — canonical knowledge only by default; manifest included
- Import never overwrites existing files; imported memory goes to inbox
- Export integrity check (hash manifest)
- **Acceptance:** Import dry-run writes nothing; import/export round-trip test; integrity check catches corruption

### TASK-8.3 Migration hardening
- Version all schemas; implement and test migrations for version bumps
- Backup before migration; report conflicts; require human resolution for unsafe migrations
- **Acceptance:** Migration tests for each version transition; backup confirmed before destructive migration

### TASK-8.4 Performance baselines
- Measure and record: init, status, rules list, context build (cold and warm)
- Document baselines; alert if regression exceeds 2x baseline in CI
- **Acceptance:** Baseline file committed; CI check exists

### TASK-8.5 Context and memory evaluation report
- Run evaluation fixtures (retrieval precision/recall, budget efficiency, duplicate detection, proposed-vs-accepted labeling)
- Document results in `docs/EVALUATION.md`
- **Acceptance:** Evaluation report committed; no unresolved FAIL findings

### TASK-8.6 Security review
- Update threat model with findings from implementation
- Verify: all write paths use policy layer; MCP cannot bypass validation; secret scanner covers known patterns; audit log contains no secrets
- **Acceptance:** Threat model updated; security tests pass; no critical open findings

### TASK-8.7 CI pipeline
- Lint, typecheck, test, schema validation, sync drift check on every PR
- Cross-platform matrix: Linux, macOS (Windows documented as in-progress if not complete)
- **Acceptance:** CI passes on main; matrix documented

### TASK-8.8 Documentation
- Complete: README quickstart, ARCHITECTURE.md, SECURITY.md, ADAPTERS.md, MCP.md, MEMORY.md, CONTEXT.md, SKILLS.md, TASKS-AND-HANDOFFS.md, IMPORT-EXPORT.md, EVALUATION.md, MIGRATIONS.md
- Every doc reflects actual implemented behavior
- Known gaps listed as TODOs with issues filed
- **Acceptance:** Docs reviewed against implementation; no undocumented behaviors in shipped code

---

## Deferred Tasks (future phases, not scheduled)

### TASK-F.1 Full task token estimation
- Implement estimation logic using historical `.local/usage/` data
- Wire into `task show` to replace the placeholder
- Depends on: sufficient usage data collected from Phase 4+, `TaskTokenEstimate` interface (TASK-4.1)

### TASK-F.2 SQLite FTS index
- Implement optional SQLite FTS5 full-text search over memory and skills
- Must remain derived — rebuildable from canonical files at any time
- Depends on: validated use case showing lexical search is insufficient

### TASK-F.3 Semantic / vector search
- Provider-independent embedding interface
- Benchmark against lexical baseline before enabling
- Depends on: evidence that it improves retrieval on representative tasks

### TASK-F.4 Read-only local web view
- Optional browser UI for browsing workspace, memory, tasks, and context manifests
- Requires explicit human approval before starting
- Must not be required for any core functionality

### TASK-F.5 Full `.agents/` migration
- Add explicit detect, backup, migrate, and verify tooling for existing `.agents/` directories
- Preserve unknown files and require human resolution for conflicts
- Depends on: post-MVP import support (TASK-8.2) and migration design review

### TASK-F.6 External adapter plugin investigation
- Evaluate a documented extension API and safe loading model after the three built-in MVP adapters are verified
- Do not load plugins or execute third-party adapter code without a separate approved design
- **Acceptance:** Recommendation covers trust boundary, compatibility/versioning, installation, and failure isolation; no implementation is implied
