# Architecture Decision Records

Decisions made during specification. Each entry records the choice, rationale,
alternatives considered, and consequences.

---

## ADR-001 — CLI binary name: `has`

**Status:** Accepted  
**Date:** 2026-11-03  
**Decided by:** Human

**Decision:** The CLI binary will be named `has`.

**Rationale:** Short, memorable, and reads naturally in commands (`has init`, `has sync`, `has memory propose`). Consistent with the product name "Human-Agent Space".

**Alternatives considered:**
- `haspace` — less readable
- `agent-space` — too long
- `workspace` — too generic, likely to conflict

**Consequences:** The npm package name and bin entry will be `has`. Check for conflicts on npm registry before publishing.

---

## ADR-002 — Canonical project directory: `.has/`

**Status:** Accepted  
**Date:** 2026-11-03  
**Decided by:** Human

**Decision:** The canonical project workspace directory is `.has/` (not `.human-agent-space/`).

**Rationale:** Shorter path reduces friction in daily use, shell commands, and `.gitignore` entries. The full name is still used in documentation and the product identity.

**Alternatives considered:**
- `.human-agent-space/` — too long for a directory typed frequently
- `.agentspace/` — less connected to the product name

**Consequences:**
- All path references in code, schemas, and documentation must use `.has/`
- Global workspace remains `~/.has/` for the same reason
- `.has/.local/` is the local/session data root and must be gitignored
- Any future compatibility tooling for `.human-agent-space/` or `.agents/` must treat `.has/` as the canonical target

---

## ADR-003 — License: MIT

**Status:** Accepted  
**Date:** 2026-11-03  
**Decided by:** Human

**Decision:** The project is licensed under the MIT License.

**Rationale:** Permissive, widely understood, compatible with all anticipated dependencies, and poses no friction for adoption in commercial or open-source projects.

**Alternatives considered:**
- Apache 2.0 — also permissive but adds patent grant language; not needed here
- GPL — copyleft; incompatible with goal of broad agent ecosystem adoption

**Consequences:** Add `LICENSE` file to repository root before first release. Verify all dependencies are MIT-compatible.

---

## ADR-004 — `.agents/` compatibility: import tool only; auto-migration deferred

**Status:** Accepted  
**Date:** 2026-11-03  
**Decided by:** Human

**Decision:** Compatibility with existing `.agents/` directories is handled by `has import --from agents [--dry-run]` only. No automatic migration runs on `init` or `sync`. Full auto-migration tooling is planned for a future phase.

**Rationale:** Automatic migration on init is a destructive operation. Requiring an explicit `has import` command keeps the human in control, prevents accidental data loss, and gives time to design a safe, tested migration path.

**Alternatives considered:**
- Auto-migrate on `has init` — rejected; too risky for existing projects without a well-tested migration path
- Ignore `.agents/` entirely — rejected; existing users would lose their setup without any path forward

**Consequences:**
- `has init` never touches `.agents/` directories
- `has import --from agents` is implemented in Phase 8 (import/export hardening)
- Full auto-migration tooling (detect, backup, migrate, verify) is added to the deferred task list as TASK-F.5
- Documentation must clearly explain the manual import path for users coming from `.agents/`

---

## ADR-005 — MVP adapters: GitHub Copilot and Claude Code

**Status:** Accepted  
**Date:** 2026-11-03  
**Decided by:** Human (updated 2026-11-05)

**Decision:** The MVP supports GitHub Copilot and Claude Code only. Kiro, Cursor,
Agy (formerly Gemini CLI), Aider, and OpenAI Codex are roadmap candidates, not MVP
commitments.

**Rationale:** Validate the canonical workspace and safe sync workflow with two
concrete adapters before expanding coverage.

**Consequences:** Only Copilot and Claude Code are in the MVP adapter phase. Any
future adapter whose behavior cannot be verified from official documentation must
be marked `UNVERIFIED` in `docs/ADAPTERS.md` and in code.

---

## ADR-006 — `rulesync` / `ruler` evaluation required before sync engine build

**Status:** Accepted  
**Date:** 2026-11-03  
**Decided by:** Human

**Decision:** Before building a custom sync engine in Phase 2 (TASK-2.4), evaluate `rulesync` and `ruler` as potential dependencies or references. Present findings and wait for approval before proceeding.

**Approval record (2026-11-05):** After reviewing the source-based comparison in
`docs/decisions/sync-tool-evaluation.md`, the human approved proceeding with a
minimal built-in Copilot and Claude Code implementation, using `rulesync` only
as a target-format reference. Neither candidate is approved as a runtime
dependency.

**Rationale:** Avoids reinventing existing tooling. If either project covers the needed surface with acceptable license, maintenance, and safety characteristics, wrapping or depending on it is preferable to a full custom build.

**Consequences:** TASK-2.1 is a hard prerequisite for TASK-2.4. The evaluation
is recorded in `docs/decisions/` before sync code is written. The approved
implementation has no `rulesync` or `ruler` runtime dependency and does not
copy their implementation code.

---

## ADR-007 — Read-only local web view: deferred

**Status:** Accepted  
**Date:** 2026-11-03  
**Decided by:** Human (default accepted)

**Decision:** A read-only local web view is not in scope for the MVP. It is listed as a deferred task (TASK-F.4) and requires explicit human approval before starting.

**Rationale:** The CLI is sufficient for the MVP. A web UI adds scope and complexity without a validated user need at this stage.

**Consequences:** No web server, frontend build tooling, or browser-facing code is included in the MVP. The extension point is not wired up.

---

## ADR-008 — MVP scope and adapter plugins

**Status:** Accepted
**Date:** 2026-11-05
**Decided by:** Human

**Decision:** The first release is limited to workspace setup, canonical rules and
skills, and safe synchronization to GitHub Copilot and Claude Code. The MVP uses
built-in adapter modules only. External adapter plugin loading is a roadmap
investigation after both built-in adapters are verified; it is not part of the MVP.

**Rationale:** A narrow end-to-end release tests the product's core value before
committing to the cost and trust surface of a broad feature set or third-party code
loading.

**Consequences:** Memory, context assembly, tasks, MCP, import/export, other
adapters, and plugin loading are not authorized by the MVP plan. Any roadmap phase
requires a separate human-approved scope and acceptance criteria. The plugin
investigation must address trust, compatibility, installation, and failure
isolation before implementation is proposed.
