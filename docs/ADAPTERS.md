# Built-in Agent Adapters

HAS projects canonical `.has/rules/` and `.has/skills/` content to the supported
coding agents. Project-specific entries override global entries with the same
rule ID or skill name. Sync never executes skill scripts or resources.

<!-- HAS:BEGIN-ADAPTERS -->

## GitHub Copilot

**Verification:** Partial. The current GitHub documentation describes repository
path-specific instruction files and agent skills. Which Copilot surfaces load
each customization depends on the client and feature; verify support in the
specific Copilot surface/version in use.

**Capabilities:** path-scoped rules: yes; native skills: yes.

| Canonical content | Project output | Projection |
|---|---|---|
| Rule | `.github/instructions/<rule-id>.instructions.md` | YAML `applyTo` is the canonical `globs` joined with commas; empty `globs` maps to `**`. The source description becomes a heading and a generated-source comment is included. |
| Skill | `.github/skills/<name>/SKILL.md` | Native Agent Skills `name` and `description` are emitted; HAS-specific metadata is retained under the `metadata` map. Other regular files in the skill directory are copied byte-for-byte. |

Official references:

- [Adding repository custom instructions](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/add-custom-instructions/add-repository-instructions)
- [Agent skills](https://docs.github.com/en/copilot/concepts/customizations/agent-skills)

## Kiro

**Verification:** Verified against Kiro's current steering and skills
documentation for workspace file formats and discovery. This does not verify a
specific installed Kiro surface or version.

**Capabilities:** path-scoped rules: yes; native skills: yes.

| Canonical content | Project output | Projection |
|---|---|---|
| Rule | `.kiro/steering/<rule-id>.md` | Rules without globs use `inclusion: always`. Rules with globs use `inclusion: fileMatch` and `fileMatchPattern` with the canonical patterns. |
| Skill | `.kiro/skills/<name>/SKILL.md` | Native Agent Skills `name` and `description` are emitted; HAS-specific metadata is retained under `metadata`. Other regular files in the skill directory are copied byte-for-byte. |

HAS syncs both global and project canonical guidance into the target
repository's `.kiro/` workspace. Kiro gives workspace skills precedence over
global skills; HAS resolves same-name project/global entries before emitting a
single workspace skill. HAS does not write to `~/.kiro/`, configure Kiro MCP
servers, or modify Kiro agent resources. Kiro's documented workspace MCP
configuration file is `.kiro/settings/mcp.json`; configuring it is outside
this rules-and-skills adapter.

Official references:

- [Kiro steering](https://kiro.dev/docs/steering/)
- [Kiro skills](https://kiro.dev/docs/skills/)
- [Kiro MCP configuration](https://kiro.dev/docs/mcp/configuration/)

## Claude Code

**Verification:** Verified against current Claude Code documentation for project
rules, path-scoped rules, and skills. This verifies documented file formats and
discovery, not the presence or version of Claude Code on the user's machine.

**Capabilities:** path-scoped rules: yes; native skills: yes.

| Canonical content | Project output | Projection |
|---|---|---|
| Rule | `.claude/rules/<rule-id>.md` | Canonical `globs` are emitted as `paths` frontmatter. Empty `globs` produces a rule without `paths`, so it is always loaded. |
| Skill | `.claude/skills/<name>/SKILL.md` | Native Agent Skills `name` and `description` are emitted; HAS-specific metadata is retained under the `metadata` map. Other regular files in the skill directory are copied byte-for-byte. |

Official references:

- [Claude Code memory and project rules](https://code.claude.com/docs/en/memory)
- [Claude Code skills](https://code.claude.com/docs/en/skills)

<!-- HAS:END-ADAPTERS -->

## Sync safety and user workflow

- `has sync --dry-run` previews creates, updates, deletions, and conflicts without writing.
- `has sync --check` reports drift and exits non-zero if any operation is needed.
- `has sync` prints the plan before applying it. It applies no changes if any target conflicts.
- HAS tracks generated output hashes in `.has/.local/sync-manifest.json`. A generated target changed by hand is treated as drift and is preserved.
- An unowned existing target is also preserved. `has adopt <path>` is an explicit opt-in to replace that one conflicting target. Before replacement, HAS saves the previous bytes under `.has/.local/sync-backups/`; these paths are local and gitignored. Adoption does not merge the file back into canonical rules or skills.
- Unchanged generated files that are no longer represented by canonical sources are listed for deletion. Modified stale files are reported as conflicts and kept.
- Every generated Markdown rule or `SKILL.md` includes a comment pointing to the canonical source. Skill assets are copied as data; they are never run.
- Sync currently targets the project repository only. Global canonical rules and skills can contribute to the project's generated outputs, but HAS does not write into a user's global agent configuration.

## Why `rulesync` is a reference, not a dependency

The `rulesync` project was evaluated at
[`596bbc85032a7e0bd8a5c4c013b02c9fc4ae554d`](https://github.com/dyoshikawa/rulesync/tree/596bbc85032a7e0bd8a5c4c013b02c9fc4ae554d).
Its documented Copilot/Claude target coverage, file layouts, dry-run, and drift
check helped verify target-format choices. It is not installed, invoked, or
bundled by HAS (`npm ls rulesync @intellectronica/ruler --depth=0` showed no
direct dependency). HAS uses its own small built-in adapters because `rulesync`
generation can write changed target files without HAS's explicit adoption and
hand-edit preservation safeguards. No `rulesync` implementation code is copied.
