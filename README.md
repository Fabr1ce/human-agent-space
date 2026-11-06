# Human-Agent Space

Human-Agent Space (`has`) is a local-first workspace for shared, human-owned
project guidance. The MVP provides global/project workspace setup, canonical
rules and skills, and a safe synchronization workflow for GitHub Copilot and
Claude Code.

Requires Node.js 22 or newer.

```sh
npm install
npm run build
npm test
node dist/bin/has.js init
node dist/bin/has.js status
```

Use `has init --global` to create `~/.has/`. Project knowledge lives in
`<repo>/.has/`; temporary runtime data lives in `<workspace>/.local/` and is
gitignored. `has rules list` and `has skills list` show effective content, with
project entries taking precedence over global entries with the same ID or name.
The CLI never executes skill scripts. Agent trust state must be verified in the
agent itself.

Project rules and skills can be synchronized to GitHub Copilot and Claude Code:

```sh
has sync --dry-run
has sync
has sync --check
has sync --agent copilot
has adopt .github/instructions/rule-style.instructions.md
```

Sync previews each operation and preserves existing hand-authored files. If a
target conflicts, `has adopt <path>` explicitly takes it over after saving a
local backup under `.has/.local/sync-backups/`. See
[`docs/ADAPTERS.md`](docs/ADAPTERS.md) for target formats, verification limits,
and why `rulesync` informed the adapter formats but is not a runtime dependency.
