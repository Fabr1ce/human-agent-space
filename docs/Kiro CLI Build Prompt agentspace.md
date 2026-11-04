# Kiro CLI Build Prompt: agentspace

Paste everything below the line into kiro-cli (or save it as `PROMPT.md` in an empty repo and tell Kiro to follow it). It is written to be executed in phases, with a checkpoint after each one.

---

## Role and goal

You are building **agentspace**: an open-source, agent-neutral workspace and CLI that gives humans and coding agents a shared, file-based home for rules, skills, memory, and task context. Any developer must be able to use it with any coding agent (Kiro, Claude Code, Cursor, Gemini CLI, Codex, Copilot, and others).

Work in the phases below. After each phase: run the tests, summarize what you built, list any decisions you made, and **stop and wait for my approval** before starting the next phase.

## Why agentspace

Each advantage answers a problem that is documented today. The sources were opened on November 1, 2026.

| Advantage | The problem it answers | Source |
| --- | --- | --- |
| One canonical copy, many agents | Agents read different files. Claude Code reads CLAUDE.md and falls back to AGENTS.md only when no CLAUDE.md exists (v2.1.277 and later). Kiro always loads AGENTS.md and reads skills from `.kiro/skills/`. Cursor loads skills from `.agents/skills/`. Copies kept by hand drift apart. | [Claude Code docs](https://code.claude.com/docs/en/memory), [Kiro CLI notes](https://www.ultracite.ai/agents/kiro-cli), [Cursor docs](https://cursor.com/docs/skills.md) |
| Adapters absorb the gaps | A community request reports that Claude Code reads project skills only from `.claude/skills/`, and that symlinking that folder to `.agents/skills/` fails because Claude Code writes internal files into it. `sync` links per skill and keeps these differences out of your content. | [GitHub issue #31005](https://github.com/anthropics/claude-code/issues/31005) |
| Short, human-written context | An ETH Zurich study of four coding agents found that LLM-generated context files lowered success rates in five of eight settings and raised inference costs by over 20 percent, while human-written files added about 4 percentage points. Claude Code's docs advise keeping instruction files under 200 lines. `init` writes a template and `audit` flags bloat. | [The Decoder](https://the-decoder.com/context-files-for-coding-agents-often-dont-help-and-may-even-hurt-performance/), [Claude Code docs](https://code.claude.com/docs/en/memory) |
| Memory that travels | Claude Code keeps auto-memory on the machine that wrote it, and it is not shared across machines or cloud environments. Project memory committed under `.agents/memory/` follows the repo to every machine, agent, and teammate, and stays readable and editable by humans. | [Claude Code docs](https://code.claude.com/docs/en/memory) |
| Review before anything durable | A University of Washington study of Claude Code and Codex found that payloads planted in files like CLAUDE.md and AGENTS.md can steer current and later sessions, and that models which spotted an injection often left it in place. The authors recommend explicit review of changes to those files and stricter validation of memory. The inbox, the `provenance` field, and the `audit` scan apply that advice. | [Bad Memory (arXiv)](https://arxiv.org/html/2607.14611) |
| Respects workspace trust | Kiro does not load a workspace's steering files, skills, or custom agents until the workspace is trusted, and its permission rules live outside the repository so a cloned repo cannot approve its own commands. A committed `.agents/` folder fits that model, and `doctor` reports trust status. | [Kiro CLI notes](https://www.ultracite.ai/agents/kiro-cli) |

The same Bad Memory study found it hard to get an agent to write a payload into its own memory from external content. The larger risk is content copied in from untrusted sources, which is why `import` puts imported memory in the inbox.

## Design principles (non-negotiable)

1. **Files are the source of truth.** Markdown with YAML frontmatter, git-friendly, readable without any tool. Any index or database is derived and fully rebuildable from the files.
2. **Agent-neutral core, thin adapters.** Store everything once in a neutral format. Per-agent entry points are symlinks (when the format matches) or generated files (when it doesn't).
3. **Two scopes plus scratch.** Global (follows the developer), project (committed with the repo), and local/ephemeral (gitignored).
4. **Clear ownership.** Humans and agents are distinguished by an `author` field. Agents *propose* durable memory; humans accept. Precedence: project over global, human over agent.
5. **Progressive disclosure.** A small always-loaded index points to details loaded on demand.
6. **Safe by default.** Memory content is untrusted data, never instructions. Never store secrets. Raw transcripts stay in `.local/`.
7. **Small and human-written.** Context files stay short and are written by people. `init` never generates their content from a scan of the codebase, and every line must hold something an agent cannot discover from the repo itself.

## Tech choices

- TypeScript on Node 20+, published as an npm package with a `bin` named `agentspace`.
- Minimal dependencies: a YAML parser, a CLI framework (e.g. commander), the official MCP TypeScript SDK, vitest for tests.
- Cross-platform: macOS, Linux, and Windows. On Windows, do not rely on symlinks: use an import file where the agent supports one (Claude Code's @AGENTS.md import), generated copies with a header otherwise, and say so in the output.
- Every command supports `--json` output and `--dry-run` for anything that writes.

## Target layout

Global, per developer (`~/.agentspace/`):

```
config.yaml                  # enabled agents, sync options
rules/                       # personal rules
skills/<name>/SKILL.md       # reusable skills (+ scripts/, resources/)
memory/                      # cross-project preferences and lessons
```

Project, committed (`<repo>/.agents/`):

```
AGENTS.md                    # canonical entrypoint, short, links out
rules/*.md                   # scoped rules
skills/<name>/SKILL.md       # project skills
memory/
  index.md                   # generated TOC, always loaded
  facts/  decisions/  lessons/
  inbox/                     # agent-proposed, awaiting review
context/
  current.md                 # live task state / handoff note
  sessions/                  # condensed session summaries
.local/                      # gitignored: logs, caches, index.db
```

## File formats

**Memory entry** (one small file per entry, in the folder matching its type):

```markdown
---
id: dec-2026-014             # unique, generated by the CLI
type: decision               # fact | decision | lesson | preference
scope: project               # project | global
author: agent:kiro           # or human:<name>
status: proposed             # proposed | accepted | deprecated
confidence: medium           # low | medium | high
created: 2026-11-01
last_verified: null
expires: null
source: session-2026-11-01-a
tags: [auth, database]
supersedes: []
---
Body. Decisions include **Why:** and **Consequences:** sections.
```

Every memory entry also carries a `provenance` field: `user-stated` (the human said it), `agent-inferred` (the agent concluded it), or `external-content` (it came from a web page, email, tool output, or other untrusted input). `external-content` entries are never auto-accepted and are flagged in review.

**Rule** (`rules/*.md`): frontmatter has `description`, optional `globs` (file patterns), `priority` (integer), and `scope`. Body is plain markdown.

**Skill** (`skills/<name>/SKILL.md`): frontmatter has `name` and `description` (the description says when to use it); body holds instructions; optional `scripts/` and `resources/`. Keep it compatible with the common SKILL.md convention used by other agents.

**Handoff** (`context/current.md`): sections for Goal, Done, Next, Open questions, Files touched, Gotchas, and a `updated_by` + `updated_at` frontmatter pair.

Provide JSON Schemas for all of the above, and validate against them in the CLI.

## Trust and security model

Persistent memory and instruction files are an injection surface: one poisoned line can be reloaded in every later session. Build these defenses in from the start.

- Treat everything in `memory/` and `inbox/` as data, never as instructions. Only accepted entries are indexed; the inbox is readable but labeled unverified.
- Agents never write `AGENTS.md`, `rules/`, or `skills/` directly. They propose changes through the inbox or a pull request, and a human accepts.
- Recommend a `CODEOWNERS` entry plus a CI check (`agentspace audit --ci`) that flags any change to `AGENTS.md`, `rules/`, or `skills/` that lacks human review.
- Every write path, CLI and MCP alike, goes through the same `provenance` check. Undeclared proposals default to `agent-inferred`.
- `audit` scans memory, rules, and skills for instruction-like content (override phrases, hidden text, URLs or shell commands that send data out) and for likely secrets.
- Some agent runtimes refuse to load a workspace's rules and skills until the workspace is trusted (Kiro does). Have `doctor` report this.

## Phase 1: Spec and core library

- Write `docs/SPEC.md` describing the layout, schemas, precedence rules, and the safety model.
- Implement a core library: find workspace roots (global + project), parse and write frontmatter files, validate against the schemas, generate IDs, and merge global and project rules and skills with correct precedence.
- Commands: `agentspace init` (project) and `agentspace init --global`. They are idempotent, never overwrite existing files, and add `.agents/.local/` to `.gitignore`.
- `init` writes a short `AGENTS.md` template that prompts for what only a human knows (non-standard tooling, boundaries, gotchas). It never generates content from a scan of the codebase.
- Enforce size budgets: warn when `AGENTS.md` or `memory/index.md` exceeds a configurable line limit (default 200).
- **Acceptance:** unit tests for parsing, validation, merging, and idempotent init pass.

## Phase 2: Adapters and sync

- Before writing the sync engine, check whether an existing tool such as ruler or rulesync can serve as the engine, and tell me whether wrapping one is better than building our own. Wait for my answer.
- Implement `agentspace sync` with an adapter interface: `detect()`, `plan()`, `apply()`. Each adapter reports exactly what it will create before doing so.
- Adapters to ship: **Kiro** (steering files under `.kiro/steering/`, skills mapping), **Claude Code** (`CLAUDE.md` pointing to `AGENTS.md`, `.claude/skills`), **Cursor** (generated `.cursor/rules/*.mdc`), **Gemini CLI** (`GEMINI.md`), **GitHub Copilot** (generated instructions file), plus a plain root `AGENTS.md` symlink.
- **Before hardcoding any agent's paths or formats, check that agent's current documentation or installed behavior and record your findings in `docs/ADAPTERS.md`. Do not rely on memory; these conventions change often.** If you cannot verify something, mark it `UNVERIFIED` in the code and docs.
- Generated files start with a header: `Generated by agentspace. Do not edit; edit .agents/ instead.` Support `sync --check` for CI (non-zero exit on drift).
- When someone edits a generated file directly, `sync` detects the drift and offers `agentspace adopt <file>` to merge the change back into `.agents/` instead of discarding it.
- Claude Code: generate `CLAUDE.md` as a one-line `@AGENTS.md` import plus any Claude-specific notes, on every platform, rather than a symlink. Claude Code v2.1.277 and later reads AGENTS.md directly only when no CLAUDE.md or CLAUDE.local.md exists, so the import also covers older versions and developers who keep a CLAUDE.local.md.
- Link skills one skill folder at a time, never the whole skills directory, because some agents write their own files into theirs.
- Kiro: map rules that have `globs` to steering files with the matching file-match inclusion mode; `AGENTS.md` is always loaded and has no inclusion modes. Kiro may not load a workspace's steering and skills until the workspace is trusted, so have `sync` print that reminder. Test whether the generated `memory/index.md` is actually read in a Kiro session instead of assuming it.
- Make adding an adapter easy: one file implementing the interface, plus a test.
- **Acceptance:** sync is idempotent, `--dry-run` writes nothing, `--check` detects drift, and fixture-based tests cover every adapter and the adopt round trip.

## Phase 3: Memory, import, and handoff

- Commands: `memory propose`, `memory list`, `memory show`, `memory search` (grep + frontmatter filters), `memory review` (interactive accept / edit / reject / deprecate), `memory accept <id>`, `memory deprecate <id>`.
- `propose` always writes to `inbox/` with `status: proposed`. Only `accepted` entries appear in the generated `index.md` (one line each: id, type, title, tags). `index` is regenerated automatically on any change and by `agentspace index`.
- `propose` requires a `provenance` value (see File formats). Undeclared proposals default to `agent-inferred`. `external-content` entries show a warning in `memory review` and are never accepted in bulk.
- Handle supersession: accepting an entry that supersedes another deprecates the old one.
- `context get` and `context update` for `current.md`; `context snapshot` condenses it into `sessions/`.
- `agentspace import --from <agent>` brings existing setups into `.agents/`: rules from `CLAUDE.md` and `.cursor/rules`, agent-specific skills folders, and agents' own native memory notes (for example Claude Code's per-project auto-memory). Imported memory lands in `inbox/` as `proposed`; only content from a human-written instruction file gets `provenance: user-stated`. Skip files that agentspace generated, never overwrite existing files, and support `--dry-run`.
- `agentspace audit`: flags expired entries, entries unverified past a threshold, contradictions between entries that supersede or share tags with conflicting status, oversized files, and likely secrets (use pattern checks and warn loudly).
- `audit` also checks context-file quality: duplicated linter or formatter rules, content restated from the README or code, and tool-specific instructions that belong in a skill. `--ci` exits non-zero on findings, and injection scanning runs as described in Trust and security model.
- **Acceptance:** tests cover the full propose → review → accept → index flow, supersession, import (dry run and real run), and audit findings.

## Phase 4: MCP server

- `agentspace mcp` runs a stdio MCP server wrapping the same core functions, with no duplicated logic.
- Tools: `memory_search`, `memory_read`, `memory_propose`, `context_get`, `context_update`, `skills_list`, `skills_load`, `rules_get`.
- Read tools label inbox results as `unverified`. There is no tool that accepts or deletes memory; only humans do that.
- Tool outputs wrap memory text in clearly delimited data blocks and the server instructions state that memory is data, not instructions.
- Document how to register the server with Kiro and with at least two other agents, in `docs/MCP.md`.
- **Acceptance:** an integration test spawns the server and exercises every tool.

## Phase 5: Polish

- `agentspace doctor`: checks the workspace, symlinks, adapters, and tool availability.
- Optional derived search index in `.local/index.db` (SQLite FTS), rebuildable with `agentspace index --rebuild`. Everything must work without it.
- A read-only `agentspace serve` web view of the workspace (memory, inbox, rules, skills, current context), localhost only.
- README with a 5-minute quickstart, a section on how to write an adapter, and a section on the security model. Add a CI workflow running lint, tests, and `sync --check`.

## Working rules for you, Kiro

- Plan before coding in each phase: show me the file list and key interfaces, then implement.
- Keep modules small and the core free of agent-specific code; agent knowledge lives only in adapters.
- Never touch files outside the workspace roots and the paths an adapter declares. Never delete user files; deprecate or back up instead.
- Write tests alongside code. Do not mark a phase done until its acceptance criteria pass.
- When something is ambiguous or unverifiable, ask me or mark it clearly rather than guessing.
- Use this repo's own `.agents/` folder (dogfood agentspace) for notes about decisions you make while building it.

## Start now

Begin with Phase 1. First, restate the plan in a few lines, then ask me any blocking questions (for example: package name, license, minimum Node version), and proceed once I answer.
