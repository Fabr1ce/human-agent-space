# Requirements: Human-Agent Space

## Overview

Human-Agent Space (HAS) is an open, local-first, agent-independent knowledge and
collaboration environment that connects developers, their projects, and the AI coding
agents they use. It gives people and AI agents a shared, persistent, inspectable
workspace for project knowledge, memory, context, rules, skills, decisions, tasks,
and working history.

The workspace owns the knowledge. Agents are clients that consume and contribute
to it through documented interfaces.

---

## Functional Requirements

### 1. Workspace Management

- **REQ-1.1** The system MUST support a global workspace at `~/.has/` for developer-level knowledge and preferences shared across all projects.
- **REQ-1.2** The system MUST support a project workspace at `<repo>/.has/` for knowledge committed with a repository.
- **REQ-1.3** The system MUST support a local/session scope under `.local/` for temporary, machine-specific, or sensitive data that is gitignored.
- **REQ-1.4** The system MUST provide an idempotent `init` command for both global and project scopes that never overwrites existing files.
- **REQ-1.5** The system MUST add local runtime paths to `.gitignore` automatically on `init`.
- **REQ-1.6** The system MUST resolve scope precedence: project-specific rules override global rules; explicit human-authored instructions take precedence over agent-proposed material.
- **REQ-1.7** The system MUST provide a `doctor` command that diagnoses workspace health, configuration validity, and agent trust status.
- **REQ-1.8** The system MUST provide a `status` command showing the current workspace state.

### 2. Configuration

- **REQ-2.1** All configuration MUST be schema-validated YAML with documented fields and safe defaults.
- **REQ-2.2** The system MUST report the effective configuration including which scope each value came from.
- **REQ-2.3** A cloned repository MUST NOT be able to grant itself new machine-level permissions through its configuration.
- **REQ-2.4** Configuration MUST support explicit global/project precedence.

### 3. Rules

- **REQ-3.1** Rules MUST be Markdown files with YAML frontmatter containing: `schema_version`, `id`, `description`, `scope`, `priority`, `globs`, and `author`.
- **REQ-3.2** Rules MUST be scoped (global or project) and support glob-based applicability.
- **REQ-3.3** Agent-generated rule changes MUST be proposals, never direct writes to canonical rules.
- **REQ-3.4** The CLI MUST support `rules list`, `rules show`, and `rules validate`.

### 4. Skills

- **REQ-4.1** Skills MUST use a portable `SKILL.md` convention with YAML frontmatter containing: `name`, `description`, `version`, `compatibility`, `tags`, and `author`.
- **REQ-4.2** A skill directory MAY contain `scripts/` and `resources/` subdirectories.
- **REQ-4.3** The system MUST NEVER execute skill scripts during discovery, indexing, or loading.
- **REQ-4.4** Skills MUST be searchable and recommendable for context assembly.
- **REQ-4.5** The CLI MUST support `skills list`, `skills show`, and `skills validate`.
- **REQ-4.6** Human-authored canonical skills MUST be protected from direct agent overwrite.

### 5. Memory Engine

- **REQ-5.1** Memory entries MUST use Markdown with YAML frontmatter containing: `schema_version`, `id`, `category`, `memory_type`, `scope`, `author`, `status`, `provenance`, `confidence`, `created_at`, `updated_at`, `last_verified_at`, `expires_at`, `source`, `evidence`, `tags`, `supersedes`, and `related`.
- **REQ-5.2** Knowledge categories MUST be: `fact`, `decision`, `lesson`, `preference`, `constraint`.
- **REQ-5.3** Memory types MUST be: `episodic`, `semantic`, `procedural`, `working`, `long-term`.
- **REQ-5.4** New agent-originated durable entries MUST default to `proposed` status.
- **REQ-5.5** External-content entries MUST NEVER be auto-accepted.
- **REQ-5.6** Only `accepted` entries MUST enter the normal memory index; `proposed` entries remain in a review channel.
- **REQ-5.7** An agent MUST NOT be able to accept its own memory proposals.
- **REQ-5.8** The system MUST support the full memory lifecycle: capture → classify → validate → deduplicate → conflict detection → review → index → retrieve → verify → consolidate → reflect → forget.
- **REQ-5.9** The CLI MUST support `memory propose`, `memory list`, `memory show`, `memory search`, `memory review`, `memory accept`, `memory reject`, `memory deprecate`.
- **REQ-5.10** Memory entries MUST NEVER contain secrets, credentials, access tokens, or private keys.
- **REQ-5.11** The memory index MUST be rebuildable from canonical files via `memory index --rebuild`.

### 6. Context Engine

- **REQ-6.1** The context engine MUST assemble task-specific context packages from project state, rules, skills, memory, decisions, and relevant history.
- **REQ-6.2** Context assembly MUST apply scope, trust, status, freshness, and relevance filters.
- **REQ-6.3** Context assembly MUST respect configurable token/character budgets.
- **REQ-6.4** The engine MUST emit a manifest explaining why each item was included or excluded.
- **REQ-6.5** Unverified and proposed material MUST remain clearly labeled and MUST NOT be silently mixed with accepted knowledge.
- **REQ-6.6** Retrieval MUST start with deterministic lexical/metadata search before any optional semantic search.
- **REQ-6.7** Context output MUST be available as both structured JSON and human-readable Markdown.
- **REQ-6.8** The CLI MUST support `context build`, `context show`, `context get`, `context update`, and `context snapshot`.

### 7. Agent Adapters and Synchronization

- **REQ-7.1** The system MUST implement an adapter interface with: `detect()`, `capabilities()`, `plan()`, `apply()`, `check()`, and `adopt()` methods.
- **REQ-7.2** Every adapter MUST report exactly what it intends to create, modify, link, or remove before applying changes.
- **REQ-7.3** `sync --check` MUST detect drift and return a non-zero exit code when drift exists.
- **REQ-7.4** `sync --dry-run` MUST NOT write any files.
- **REQ-7.5** `sync` MUST be idempotent.
- **REQ-7.6** Generated agent configuration files MUST have a clear header identifying them as generated and pointing to the canonical source.
- **REQ-7.7** The system MUST NEVER silently overwrite hand-authored agent configuration.
- **REQ-7.8** Direct edits to generated files MUST be detected and surfaced to the user.
- **REQ-7.9** Initial adapter candidates (in priority order): Kiro, Claude Code, Cursor, Agy (formerly Gemini CLI), Aider, GitHub Copilot, OpenAI Codex.
- **REQ-7.10** Adapter capabilities MUST be recorded in `docs/ADAPTERS.md` with verified/partially-verified/unverified status.

### 8. Collaboration and Task Management

- **REQ-8.1** Task records MUST use Markdown with YAML frontmatter containing: `schema_version`, `id`, `title`, `status`, `priority`, `created_at`, `updated_at`, `assigned_to`, `participants`, `depends_on`, and `source`.
- **REQ-8.2** Task lifecycle MUST support states: `planned → active → blocked → review → completed → cancelled`.
- **REQ-8.3** Task transitions MUST be validated and recorded with history.
- **REQ-8.4** The system MUST support handoff snapshots that distinguish verified completed work, attempted but unverified work, current assumptions, open questions, and next safe actions.
- **REQ-8.5** The CLI MUST support `task create`, `task list`, `task show`, `task update`, and `task transition`.
- **REQ-8.6** Tasks MUST NOT be marked completed without verification evidence or explicit human override.

### 9. Security and Governance

- **REQ-9.1** Memory and inbox content MUST be treated as data, never as instructions.
- **REQ-9.2** Imported content MUST enter a review/quarantine path before being usable.
- **REQ-9.3** All write paths (CLI and MCP) MUST use the same validation and provenance checks.
- **REQ-9.4** The system MUST scan entries for likely secrets and suspicious instruction-like content, producing findings with explanations.
- **REQ-9.5** Raw transcripts and temporary data MUST remain in gitignored local storage.
- **REQ-9.6** The system MUST log security-relevant actions without recording secret values.
- **REQ-9.7** Agents MUST NOT write directly to canonical `AGENTS.md`, rules, or skills.
- **REQ-9.8** The system MUST provide `audit` and `audit --ci` commands for workspace trust diagnostics.

### 10. MCP Server

- **REQ-10.1** The system MUST implement a stdio MCP server using the official MCP TypeScript SDK.
- **REQ-10.2** Initial MCP tools MUST include: `workspace_status`, `rules_get`, `skills_list`, `skills_load`, `memory_search`, `memory_read`, `memory_propose`, `context_build`, `context_get`, `context_update`, `task_list`, `task_read`, `task_propose`, `handoff_get`.
- **REQ-10.3** MCP tools MUST NOT expose a memory-accept or policy-bypass operation.
- **REQ-10.4** MCP tool descriptions MUST state that retrieved workspace content is untrusted data unless labeled.
- **REQ-10.5** Read results from MCP tools MUST label proposed/unverified material.
- **REQ-10.6** MCP registration MUST be documented for at least two verified agents.

### 11. Import, Export, and Migration

- **REQ-11.1** Import MUST support `--dry-run` showing every planned operation before execution.
- **REQ-11.2** Import MUST NEVER overwrite existing canonical files.
- **REQ-11.3** Imported memory MUST go to the inbox as `proposed`.
- **REQ-11.4** Export MUST exclude `.local/`, secrets, caches, and raw transcripts by default.
- **REQ-11.5** Export MUST include a manifest with schema versions.
- **REQ-11.6** Migrations MUST be versioned, testable, and backed up before execution.
- **REQ-11.7** Migration MUST NEVER silently discard unknown fields or files.

### 12. CLI Interface

- **REQ-12.1** The CLI binary name MUST be `has` (pending human approval of the name).
- **REQ-12.2** Every command that writes MUST support `--dry-run` where meaningful.
- **REQ-12.3** All commands MUST support `--json` output for machine-readable results.
- **REQ-12.4** CLI exit codes MUST be meaningful and consistent.
- **REQ-12.5** Errors MUST be actionable and explain what to do next.

---

## Non-Functional Requirements

### Performance
- **REQ-NF-1** Core workspace operations (init, status, rules list) MUST complete in under 500ms on a standard developer machine.
- **REQ-NF-2** Context assembly for a typical project MUST complete in under 2 seconds without semantic search.
- **REQ-NF-3** The SQLite index is derived and optional; all core functionality MUST work without it.

### Reliability
- **REQ-NF-4** File writes MUST be atomic where the platform supports it (write to temp, then rename).
- **REQ-NF-5** Interrupted writes MUST not corrupt the workspace; recovery MUST be documented and testable.
- **REQ-NF-6** All operations MUST be idempotent unless state change is the explicit intent.

### Portability
- **REQ-NF-7** The system MUST work on macOS, Linux, and Windows.
- **REQ-NF-8** The system MUST NOT assume symlinks are available (Windows compatibility).
- **REQ-NF-9** The core MUST work without a cloud account, API key, hosted model, or proprietary service.

### Security
- **REQ-NF-10** The system MUST treat all workspace content, imported material, agent output, and external content as untrusted data until explicitly validated.
- **REQ-NF-11** The system MUST NOT execute imported scripts, skill code, or commands automatically.
- **REQ-NF-12** Secrets MUST NEVER appear in logs, audit records, exports, or memory entries.

### Maintainability
- **REQ-NF-13** Every persistent structured format MUST have a JSON Schema and schema version.
- **REQ-NF-14** Derived data (indexes, caches) MUST be rebuildable from authoritative files at any time.
- **REQ-NF-15** Agent-specific logic MUST be entirely contained within adapter modules; the core MUST NOT contain agent-specific path or formatting logic.

### Code Simplicity
- **REQ-NF-16** Every line of code MUST be required by a current task's acceptance criteria. Speculative, future-proofing, or "just in case" code is not permitted.
- **REQ-NF-17** Duplicate logic MUST NOT exist. If the same operation is needed in more than one place, it MUST be extracted into a shared utility before the second use is written.
- **REQ-NF-18** Dead code (unused imports, functions, types, variables) MUST NOT be committed.
- **REQ-NF-19** Abstractions (interfaces, generics, base classes, layers) MUST NOT be added until there are at least two verified, concrete implementations that require them.
- **REQ-NF-20** The review agent MUST treat simplicity violations (REQ-NF-16 through REQ-NF-19) as FAIL findings, not warnings. A phase is not complete if any simplicity FAIL is unresolved.

---

### 13. Observability

- **REQ-13.1** The system MUST emit structured logs with a consistent format (timestamp, level, component, correlation ID, message, metadata).
- **REQ-13.2** Every operation that spans multiple steps (context assembly, memory lifecycle, sync) MUST carry a correlation ID that links log entries across the chain.
- **REQ-13.3** The `doctor` command MUST surface recent errors and warnings from the operational log, not just configuration health.
- **REQ-13.4** Event envelopes (section 8 data model) MUST include wall-clock duration for the operation that produced them, enabling trace-level visibility.
- **REQ-13.5** Logs MUST be written to `.local/logs/` and gitignored. Log rotation MUST be supported to prevent unbounded growth.
- **REQ-13.6** Log output MUST NEVER contain secrets, credentials, or raw memory/context content. Sensitive fields MUST be redacted before writing.
- **REQ-13.7** The system MUST support configurable log levels: `error`, `warn`, `info`, `debug`. Default is `warn`.
- **REQ-13.8** Operational observability (logs, events, timing) is separate from the security audit log (REQ-9.6). They MUST NOT be conflated.

### 14. Cost and Token Tracking

- **REQ-14.1** Every context package produced by the context engine MUST include a budget breakdown in its manifest, showing tokens consumed per source category (rules, memory, skills, project state, handoff, user-provided).
- **REQ-14.2** `context show` MUST display the budget breakdown by category so the human can see what is consuming context space.
- **REQ-14.3** MCP tools that trigger a context build MUST return budget usage fields in the response alongside the assembled context.
- **REQ-14.4** The system MUST record context budget usage per session and per task in `.local/` for later review.
- **REQ-14.5** The `status` command MUST show a summary of recent context budget usage (last N sessions) when local data is available.
- **REQ-14.6** Token counting MUST use a pluggable estimator interface so different tokenization strategies (character-based approximation, tiktoken, model-specific) can be swapped without changing the context engine.
- **REQ-14.7** The default token estimator MUST be a character-based approximation that requires no external dependency or API call.

#### 14.8 Designed-for-Later: Task Token Estimation

The following capability is explicitly scoped for a future release. The foundational release MUST define the interface and data structures needed to support it, but MUST NOT implement the full estimation logic.

- **REQ-14.8** The system MUST define a `TaskTokenEstimate` interface with fields for: estimated input tokens, estimated output tokens, confidence level, estimation method, and breakdown by context source.
- **REQ-14.9** The `task show` command MUST reserve a display section for token estimates that renders "estimation not yet available" in the foundational release.
- **REQ-14.10** The context engine's pluggable estimator interface (REQ-14.6) MUST be designed to support pre-assembly estimation (before a full context build) as a future implementation path.
- **REQ-14.11** When task token estimation is implemented in a future phase, it MUST use historical context budget data (REQ-14.4) from similar past tasks as one input signal.

---

## Out of Scope (Foundational Release)

The following are explicitly deferred and MUST NOT be built in the foundational release:

- Autonomous multi-agent orchestration
- Cloud synchronization or hosted collaboration
- Remote execution or agent provisioning
- Vector/semantic search (optional extension point only)
- Automatic codebase-wide knowledge generation
- Complex workflow automation
- A full-featured web application (a read-only local view may be approved separately)
- Full task token estimation logic (interface and data structures are in scope; full estimation is deferred — see REQ-14.8 through REQ-14.11)
