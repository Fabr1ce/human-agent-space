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

The initial release is scoped to workspace setup and content inspection. The
adapter sync phase is a separate step, gated on an evaluation of existing sync
tools.
