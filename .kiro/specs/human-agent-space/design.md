# Design: Human-Agent Space

## Technology Stack

| Decision | Choice | Rationale |
|---|---|---|
| Language | TypeScript | Type safety for complex data models; official MCP SDK is TypeScript; strong ecosystem |
| Runtime | Node.js 22 LTS | Current LTS baseline |
| Package manager | npm | Standard; no extra tooling required |
| CLI framework | Commander.js | Mature, well-typed, minimal |
| YAML parser | `js-yaml` | De facto standard; well-maintained |
| Schema validation | `ajv` (JSON Schema draft-07) | Fast, standard-compliant |
| Testing | Vitest | Fast, TypeScript-native, ESM-first |
| MCP SDK | `@modelcontextprotocol/sdk` | Official TypeScript SDK |
| Frontmatter | `gray-matter` | Parses YAML frontmatter from Markdown |
| SQLite (optional) | `better-sqlite3` | Derived index only; not required for core ops |
| ID generation | `ulid` | Lexicographically sortable, URL-safe, time-ordered |

All runtime dependencies must be justified. SQLite is optional and derived only — no core feature may require it.

---

## Repository Layout

This is the eventual product layout, not an MVP scaffold checklist. Implement only
modules required by an approved MVP task; add roadmap modules when their phase is
approved.

```
has/
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── .gitignore
├── README.md
├── bin/
│   └── has.ts                      # CLI entry point
├── src/
│   ├── core/                       # Workspace Core
│   │   ├── workspace.ts            # Root resolution, scope, config loading
│   │   ├── config.ts               # Config schema, validation, effective config
│   │   ├── files.ts                # Atomic file ops, frontmatter read/write
│   │   ├── ids.ts                  # Stable ULID generation
│   │   ├── logger.ts               # Structured logger (levels, correlation IDs, redaction)
│   │   ├── schemas/
│   │   │   ├── memory.schema.json
│   │   │   ├── rule.schema.json
│   │   │   ├── skill.schema.json
│   │   │   ├── task.schema.json
│   │   │   ├── config.schema.json
│   │   │   └── event.schema.json
│   │   └── migrations/             # Versioned schema migrations
│   ├── memory/                     # Memory Engine
│   │   ├── engine.ts
│   │   ├── propose.ts
│   │   ├── review.ts
│   │   ├── search.ts
│   │   ├── index.ts
│   │   ├── provenance.ts
│   │   └── security.ts             # Secret scan, injection detection
│   ├── context/                    # Context Engine
│   │   ├── engine.ts               # Assembly pipeline
│   │   ├── retrieve.ts             # Candidate retrieval
│   │   ├── filter.ts               # Trust/status/freshness/scope filters
│   │   ├── rank.ts                 # Relevance ranking
│   │   ├── budget.ts               # Token budget enforcement
│   │   ├── estimator.ts            # Pluggable token estimator interface + default
│   │   ├── manifest.ts             # Inclusion/exclusion manifest + budget breakdown
│   │   └── output.ts               # JSON and Markdown formatters
│   ├── skills/                     # Skills Engine
│   │   ├── registry.ts
│   │   ├── search.ts
│   │   └── export.ts
│   ├── adapters/                   # Agent Integration
│   │   ├── interface.ts            # Adapter interface + capability types
│   │   ├── registry.ts             # Built-in adapter registry
│   │   ├── copilot.ts
│   │   ├── claude-code.ts
│   │   ├── kiro.ts                 # Roadmap adapter
│   │   ├── cursor.ts
│   │   ├── agy.ts                  # Agy (formerly Gemini CLI)
│   │   ├── aider.ts
│   │   ├── copilot.ts              # GitHub Copilot
│   │   └── codex.ts                # OpenAI Codex
│   ├── collaboration/              # Collaboration Engine
│   │   ├── tasks.ts                # Task CRUD and lifecycle
│   │   ├── handoff.ts              # Handoff snapshots
│   │   └── state.ts                # Shared project state
│   ├── security/                   # Security and Governance
│   │   ├── governance.ts           # Policy enforcement
│   │   ├── scanner.ts              # Secret and injection scanning
│   │   └── audit.ts                # Security audit log
│   ├── observability/              # Operational observability
│   │   ├── events.ts               # Event envelope emission with timing
│   │   └── usage.ts                # Context budget usage recording and retrieval
│   ├── mcp/                        # MCP Server
│   │   ├── server.ts
│   │   └── tools/                  # One file per MCP tool
│   └── cli/                        # CLI command implementations
│       ├── init.ts
│       ├── doctor.ts
│       ├── status.ts
│       ├── rules.ts
│       ├── skills.ts
│       ├── sync.ts
│       ├── memory.ts
│       ├── context.ts
│       ├── task.ts
│       ├── import.ts
│       ├── export.ts
│       └── audit.ts
├── docs/
│   ├── SPEC.md
│   ├── ARCHITECTURE.md
│   ├── SECURITY.md
│   ├── ADAPTERS.md
│   ├── MCP.md
│   ├── MEMORY.md
│   ├── CONTEXT.md
│   ├── SKILLS.md
│   ├── TASKS-AND-HANDOFFS.md
│   ├── IMPORT-EXPORT.md
│   ├── EVALUATION.md
│   ├── MIGRATIONS.md
│   ├── research/
│   └── decisions/
└── tests/
    ├── unit/
    ├── integration/
    └── fixtures/
```

---

## Canonical Workspace Layout

### Global: `~/.has/`

```
config.yaml
rules/
skills/
memory/
  index.md
  facts/
  decisions/
  lessons/
  preferences/
  constraints/
  inbox/
projects/
  registry.yaml
.local/              ← gitignored
  cache/
  index.db
  logs/
  sessions/
  usage/             ← context budget history
```

### Project: `<repo>/.has/`

```
config.yaml
AGENTS.md
rules/
skills/
memory/
  index.md
  facts/
  decisions/
  lessons/
  preferences/
  constraints/
  inbox/
context/
  project-state.md
  current.md
  sessions/
tasks/
  active/
  completed/
  inbox/
events/
  README.md
.local/              ← gitignored
  cache/
  index.db
  logs/
  usage/             ← context budget history
```

---

## Data Models

### Memory Entry (YAML frontmatter)

```yaml
schema_version: 1
id: mem-01J4K...              # mem-<ulid>
category: lesson              # fact | decision | lesson | preference | constraint
memory_type: episodic         # episodic | semantic | procedural | working | long-term
scope: project                # global | project | local
author: agent:kiro
status: proposed              # proposed | accepted | rejected | deprecated | superseded
provenance: agent-inferred    # user-stated | human-authored | verified-observation | agent-inferred | external-content | imported
confidence: medium            # low | medium | high
created_at: 2026-11-01T12:00:00Z
updated_at: 2026-11-01T12:00:00Z
last_verified_at: null
expires_at: null
source:
  kind: task
  id: task-01J4K...
evidence:
  - description: "Test output confirmed the migration failure"
    location: ".local/logs/test-run-123.log"
tags: [database, migration]
supersedes: []
related: []
```

### Rule (YAML frontmatter)

```yaml
schema_version: 1
id: rule-01J4K...
description: "When this rule applies"
scope: project                # global | project
priority: 100
globs:
  - "src/auth/**"
author: human
```

### Skill (YAML frontmatter in SKILL.md)

```yaml
name: database-migrations
description: "Use when planning or implementing database schema migrations."
version: 1.0.0
compatibility: ["kiro", "claude-code", "cursor", "agy", "copilot", "codex"]
tags: [database, migrations]
author: human
```

### Task (YAML frontmatter)

```yaml
schema_version: 1
id: task-01J4K...
title: "Implement memory review workflow"
status: planned               # planned | active | blocked | review | completed | cancelled
priority: normal              # low | normal | high | critical
created_at: 2026-11-01T12:00:00Z
updated_at: 2026-11-01T12:00:00Z
assigned_to: null
participants: []
depends_on: []
source: human
```

### Event Envelope

```yaml
id: evt-01J4K...
type: memory.proposed         # <subsystem>.<operation>
timestamp: 2026-11-01T12:00:00Z
duration_ms: 42               # wall-clock duration for tracing
actor: agent:kiro
scope: project
entity_type: memory
entity_id: mem-01J4K...
operation: create
provenance: agent-inferred
correlation_id: task-01J4K...
metadata: {}                  # safe, non-sensitive fields only
```

### Context Budget Manifest

```json
{
  "task_id": "task-01J4K...",
  "session_id": "sess-01J4K...",
  "timestamp": "2026-11-01T12:00:00Z",
  "estimator": "character-approx-v1",
  "budget_total": 32000,
  "budget_used": 18450,
  "breakdown": {
    "rules": 2100,
    "memory": 8200,
    "skills": 3400,
    "project_state": 1800,
    "handoff": 1200,
    "user_provided": 1750
  },
  "items_included": 24,
  "items_excluded": 11,
  "warnings": [],
  "truncated": false
}
```

### Task Token Estimate (interface stub — implementation deferred)

```typescript
export interface TaskTokenEstimate {
  task_id: string;
  estimated_input_tokens: number;
  estimated_output_tokens: number;
  confidence: 'low' | 'medium' | 'high';
  estimation_method: string;        // e.g. "historical-average-v1"
  breakdown: Record<string, number>; // by context source category
  based_on_sessions: number;        // how many past sessions informed this
  generated_at: string;             // ISO timestamp
}
```

---

## Core Interfaces

### Workspace Core (`src/core/workspace.ts`)

```typescript
export type Scope = 'global' | 'project' | 'local';

export interface Workspace {
  globalRoot: string;
  projectRoot: string | null;
  localRoot: string;
  config: EffectiveConfig;

  readFile(scope: Scope, path: string): Promise<string | null>;
  writeFile(scope: Scope, path: string, content: string): Promise<void>;
  listFiles(scope: Scope, glob: string): Promise<string[]>;
  exists(scope: Scope, path: string): Promise<boolean>;
  resolve(scope: Scope, path: string): string;
}
```

### Token Estimator (`src/context/estimator.ts`)

```typescript
export interface TokenEstimator {
  readonly id: string;          // e.g. "character-approx-v1"
  estimate(text: string): number;
  estimateTokens(items: ContextItem[]): BreakdownEstimate;
  // Extension point for future pre-assembly estimation:
  estimateTask?(task: TaskContext, workspace: Workspace): Promise<TaskTokenEstimate>;
}

// Default implementation — no external deps, no API calls
export class CharacterApproxEstimator implements TokenEstimator {
  readonly id = 'character-approx-v1';
  estimate(text: string): number {
    return Math.ceil(text.length / 4); // ~4 chars per token heuristic
  }
  // ...
}
```

### Memory Engine (`src/memory/engine.ts`)

```typescript
export interface MemoryEngine {
  propose(entry: MemoryProposal, actor: Actor): Promise<MemoryEntry>;
  list(filters: MemoryFilters): Promise<MemoryEntry[]>;
  get(id: string): Promise<MemoryEntry | null>;
  search(query: string, filters?: MemoryFilters): Promise<MemoryEntry[]>;
  accept(id: string, reviewer: HumanActor): Promise<MemoryEntry>;
  reject(id: string, reviewer: HumanActor, reason: string): Promise<MemoryEntry>;
  deprecate(id: string, reviewer: HumanActor, reason: string): Promise<MemoryEntry>;
  supersede(id: string, newId: string, reviewer: HumanActor): Promise<MemoryEntry>;
  rebuildIndex(): Promise<IndexResult>;
}
```

### Context Engine (`src/context/engine.ts`)

```typescript
export interface ContextEngine {
  build(task: TaskContext, opts: ContextOptions): Promise<ContextPackage>;
}

export interface ContextPackage {
  task: TaskContext;
  rules: RuleEntry[];
  skills: SkillEntry[];
  memory: MemoryEntry[];
  projectState: ProjectState | null;
  handoff: HandoffSnapshot | null;
  manifest: ContextBudgetManifest;
  warnings: string[];
  correlationId: string;
}
```

### Agent Adapter (`src/adapters/interface.ts`)

```typescript
export interface AgentAdapter {
  readonly id: string;
  readonly name: string;

  detect(workspace: Workspace): Promise<DetectResult>;
  capabilities(): AgentCapabilities;
  plan(workspace: Workspace, opts: SyncOptions): Promise<SyncPlan>;
  apply(plan: SyncPlan, opts: ApplyOptions): Promise<ApplyResult>;
  check(workspace: Workspace): Promise<DriftReport>;
  adopt(file: string, workspace: Workspace): Promise<AdoptResult>;
}

export interface AgentCapabilities {
  instructionLoading: boolean;
  skillDiscovery: boolean;
  mcpClientSupport: boolean;
  projectLevelConfig: boolean;
  importIncludeSupport: boolean;
  trustGating: boolean;
  contextFileLimits: number | null;
  verified: 'verified' | 'partial' | 'unverified';
}
```

### Logger (`src/core/logger.ts`)

```typescript
export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export interface Logger {
  error(msg: string, meta?: Record<string, unknown>): void;
  warn(msg: string, meta?: Record<string, unknown>): void;
  info(msg: string, meta?: Record<string, unknown>): void;
  debug(msg: string, meta?: Record<string, unknown>): void;
  child(context: Record<string, unknown>): Logger; // inherit correlation ID
}
```

---

## Observability Design

### Structured Log Format

```json
{
  "ts": "2026-11-01T12:00:00.123Z",
  "level": "info",
  "component": "memory.engine",
  "correlation_id": "task-01J4K...",
  "msg": "Memory entry proposed",
  "entry_id": "mem-01J4K...",
  "actor": "agent:kiro",
  "duration_ms": 12
}
```

- Written to `.local/logs/has-YYYY-MM-DD.log` (daily rotation, keep last 7 by default).
- Sensitive fields (`content`, `evidence.location` values, config secrets) are redacted before writing.
- `doctor` reads the last 50 log entries and surfaces `error` and `warn` lines.

### Event → Observability Flow

```
Operation starts
  └─ Logger.child({ correlation_id }) created
  └─ Operation executes
  └─ Event envelope emitted (includes duration_ms)
  └─ Usage record written to .local/usage/ if context was assembled
  └─ Logger writes structured entry
```

---

## Security Model

### Trust Boundaries

```
Human CLI ────────────────────────────► Policy Layer ──► Canonical Files
MCP Server (agent call) ─────────────►             (same validation path)
Imported content ──► Quarantine/Inbox ──► Review required before use
```

- All writes go through the same policy layer regardless of source (CLI or MCP).
- Agents PROPOSE; only an explicit human CLI review can ACCEPT durable knowledge.
  Acceptance is not exposed through MCP. Actor labels are provenance, not
  authentication: the local CLI assumes the operating-system user is trusted and
  does not claim to prevent a same-user process from invoking human-only actions.
  Interactive confirmation is a workflow safeguard, not a security boundary.
- Memory content returned in a context package is labeled data, not instructions.
- Workspace config from a cloned repo cannot elevate its own trust level.

### Secret Scanner Patterns

Checked on every memory write and import:
- AWS/cloud credential patterns (AKIA..., secret keys, tokens)
- Private key PEM headers
- Generic password/token assignment patterns
- Prompt injection language ("ignore previous instructions", "you are now", "disregard")
- Hidden Unicode (zero-width chars, RTL override)
- Outbound URLs inside command strings

Findings block the write and return structured errors. The scanner does not claim to be exhaustive.

---

## Implementation Phases

| Phase | Scope | Key Deliverables |
|---|---|---|
| **1 (MVP)** | Workspace foundation, rules, and skills | `.has/` layout, config + schemas, init/status/doctor, canonical rules and skills with list/show/validate, atomic file operations, CLI skeleton, test harness |
| **2 (MVP)** | Three built-in adapters | Evaluate `rulesync`/`ruler`; safe plan/apply/check for GitHub Copilot, Claude Code, and Kiro; drift detection and adapter documentation |
| **Later, separately approved** | Product roadmap | Memory, context, collaboration/tasks, MCP, other built-in adapters, import/export, auditing, and production hardening; each requires a scoped plan and human approval after MVP evaluation |

No phase beyond the MVP is authorized by this plan. Each approved phase requires
sign-off on its acceptance criteria before the next phase starts. External
third-party adapter plugin loading is a roadmap investigation only; the MVP uses
isolated built-in adapter modules and does not discover or execute installed
plugins.

---

## Deferred Design Decisions — All Resolved

All decisions recorded in `decisions/ADRs.md`.

| # | Question | Decision |
|---|---|---|
| D-1 | CLI binary name: `has` or something else? | `has` ✓ |
| D-2 | Canonical project dir: `.human-agent-space/` or shorter (`.has/`)? | `.has/` ✓ |
| D-3 | License: MIT, Apache 2.0, or other? | MIT ✓ |
| D-4 | Compatibility path for existing `.agents/` directories? | `has import --from agents` only; auto-migration deferred to TASK-F.5 ✓ |
| D-5 | Which adapters are in the MVP? | GitHub Copilot, Claude Code, and Kiro; Cursor, Agy, Aider, and Codex are roadmap candidates ✓ |
| D-6 | Evaluate `rulesync`/`ruler` before building custom sync engine? | Yes — TASK-2.1 is a hard gate before TASK-2.4 ✓ |
| D-7 | Read-only local web view in Phase 7 scope? | No, deferred to TASK-F.4 ✓ |
