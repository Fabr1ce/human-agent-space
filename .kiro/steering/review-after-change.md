---
inclusion: always
---

# Review After Every Change

After completing any change to code, spec, configuration, or documentation in this project:

1. **Commit the work** — stage and commit all changed files with a descriptive message before calling the review agent.

2. **Call the review agent** — invoke the `code-reviewer` agent (or the default agent if no reviewer is configured) to review the change with this prompt:

   > Review the changes in the last commit. Check for: correctness, consistency with the spec in `.kiro/specs/human-agent-space/`, security issues, missing tests or acceptance criteria coverage, and any deviations from the ADRs in `.kiro/specs/human-agent-space/decisions/ADRs.md`. Report findings as PASS, WARN, or FAIL with a brief explanation for each.

3. **Act on findings** — address any FAIL findings before moving to the next task. WARN findings must be acknowledged and either resolved or recorded as a known limitation with a reason.

4. **Do not skip** — this rule applies to all changes: spec edits, code, config, documentation, and schema updates. A change is not complete until it has been reviewed.

## Commit message format

```
<type>(<scope>): <short description>

Types: feat | fix | chore | docs | test | refactor | security
Scope: core | memory | context | skills | adapters | collaboration | security | mcp | cli | spec | eval
```

Examples:
- `feat(core): implement atomic file write with temp-rename`
- `docs(spec): add observability requirements REQ-13`
- `fix(memory): block agent self-accept on propose endpoint`
