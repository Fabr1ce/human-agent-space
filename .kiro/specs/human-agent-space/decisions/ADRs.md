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

## ADR-005 — Adapter priorities: Kiro, Claude Code, Cursor, Agy, Aider, Copilot, Codex

**Status:** Accepted  
**Date:** 2026-11-03  
**Decided by:** Human

**Decision:** Adapters are implemented in this priority order across Phase 2:
1. Kiro
2. Claude Code
3. Cursor
4. Agy (formerly Gemini CLI)
5. Aider
6. GitHub Copilot
7. OpenAI Codex

**Rationale:** Kiro and Claude Code are highest priority as the most likely early users. Cursor has broad adoption. Agy, Aider, Copilot, and Codex follow based on community usage and MCP support maturity.

**Consequences:** All 7 adapters are in scope for Phase 2. Each requires research before implementation. Any adapter where official documentation cannot be verified must be marked `UNVERIFIED` in `docs/ADAPTERS.md` and in code.

---

## ADR-006 — `rulesync` / `ruler` evaluation required before sync engine build

**Status:** Accepted  
**Date:** 2026-11-03  
**Decided by:** Human (default accepted)

**Decision:** Before building a custom sync engine in Phase 2 (TASK-2.3), evaluate `rulesync` and `ruler` as potential dependencies or references. Present findings and wait for approval before proceeding.

**Rationale:** Avoids reinventing existing tooling. If either project covers the needed surface with acceptable license, maintenance, and safety characteristics, wrapping or depending on it is preferable to a full custom build.

**Consequences:** TASK-2.2 is a hard prerequisite for TASK-2.3. The evaluation result is recorded in `docs/decisions/` before any sync engine code is written.

---

## ADR-007 — Read-only local web view: deferred

**Status:** Accepted  
**Date:** 2026-11-03  
**Decided by:** Human (default accepted)

**Decision:** A read-only local web view is not in scope for the foundational release. It is listed as a deferred task (TASK-F.4) and requires explicit human approval before starting.

**Rationale:** The CLI and MCP interfaces are sufficient for the foundational release. A web UI adds scope and complexity without a validated user need at this stage.

**Consequences:** No web server, no frontend build tooling, and no browser-facing code in Phases 1–8. The extension point exists in the architecture but is not wired up.
