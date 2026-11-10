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

## ADR-005 — Initial MVP adapters: GitHub Copilot and Claude Code

**Status:** Superseded by ADR-009
**Date:** 2026-11-03  
**Decided by:** Human (updated 2026-11-05)

**Decision:** The initial MVP adapter scope was GitHub Copilot and Claude Code.
Kiro, Cursor, Agy (formerly Gemini CLI), Aider, and OpenAI Codex were initially
roadmap candidates.

**Rationale:** Validate the canonical workspace and safe sync workflow with two
concrete adapters before expanding coverage.

**Consequences:** Superseded by ADR-009, which adds Kiro to the built-in adapter
scope. Any adapter whose behavior cannot be verified from official documentation
must be marked with its verification status in `docs/ADAPTERS.md` and in code.

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
skills, and safe synchronization to GitHub Copilot, Claude Code, and Kiro. The
MVP uses built-in adapter modules only. External adapter plugin loading is a
roadmap investigation after all three built-in adapters are verified; it is not
part of the MVP.

**Rationale:** A narrow end-to-end release tests the product's core value before
committing to the cost and trust surface of a broad feature set or third-party code
loading.

**Consequences:** Memory, context assembly, tasks, MCP, import/export, other
adapters, and plugin loading are not authorized by the MVP plan. Any roadmap phase
requires a separate human-approved scope and acceptance criteria. The plugin
investigation must address trust, compatibility, installation, and failure
isolation before implementation is proposed.

---

## ADR-009 — Add Kiro to built-in sync adapters

**Status:** Accepted
**Date:** 2026-11-08
**Decided by:** Human

**Decision:** Add Kiro workspace steering and skills as a built-in sync target
alongside Copilot and Claude Code. Emit rules under `.kiro/steering/` and skills
under `.kiro/skills/`; continue to write only into the project repository.

**Rationale:** Kiro provides documented workspace steering and portable skills,
allowing HAS to project canonical rules and skills into another agent format
using the existing safe sync engine.

**Consequences:** Rules without globs use Kiro's `always` inclusion; rules with
globs use `fileMatch` and `fileMatchPattern`. HAS does not configure Kiro MCP
servers or write global `~/.kiro/` files. Kiro's workspace MCP configuration is
`.kiro/settings/mcp.json` and is outside this adapter. The original ADR-005 is
superseded.
