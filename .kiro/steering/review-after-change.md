---
inclusion: always
---

# Review After Every Change

After completing any change to code, spec, configuration, or documentation in this project:

1. **Commit the work** — stage and commit all changed files with a descriptive message before calling the review agent.

2. **Call the review agent** — invoke the `code-reviewer` agent (or the default agent if no reviewer is configured) to review the change with this prompt:

   > Review the changes in the last commit. Check for:
   > - Correctness and consistency with the spec in `.kiro/specs/human-agent-space/`
   > - Security issues
   > - Missing tests or acceptance criteria coverage
   > - Deviations from the ADRs in `.kiro/specs/human-agent-space/decisions/ADRs.md`
   > - **Unnecessary code** — any code that is not required by a current task's acceptance criteria
   > - **Duplicate code** — logic that already exists elsewhere in the codebase; extract or reuse instead
   > - **Premature abstraction** — interfaces, generics, or layers added speculatively without a verified need
   > - **Dead code** — imports, functions, types, or variables that are defined but never used
   >
   > Report findings as PASS, WARN, or FAIL with a brief explanation for each. Simplicity failures (unnecessary, duplicate, or dead code) are FAIL, not WARN.

   The reviewer MUST use a different underlying model from the model that authored the change. Prefer an explicitly configured reviewer model from a different model family. Do not assume that using a separate agent or setting both models to `auto` guarantees independence. Verify the reviewer model from available runtime metadata. If it cannot be selected or verified as different, mark the review **BLOCKED**, then request a review from the `rubber-duck` agent as the fallback review path. The fallback MUST disclose that model independence could not be verified and MUST NOT claim to satisfy the different-model requirement.

3. **Report and act on findings** — report each review as PASS, WARN, FAIL, or BLOCKED, with a brief explanation. Address any FAIL findings before moving to the next task. WARN findings must be acknowledged and either resolved or recorded as a known limitation with a reason. A BLOCKED review remains incomplete until a verified different-model review is obtained, or a human explicitly accepts the disclosed fallback review. Record that acceptance with the human's identity, date, and commit/review reference in the PR or review record; retain the fallback's findings as WARNs or FAILs to be handled normally.

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
