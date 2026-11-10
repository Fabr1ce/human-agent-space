# Contributor Guidance

## Test-Driven Development

- Use test-driven development for behavior changes: write a failing test that
  captures the requirement, implement the smallest change that passes, then
  refactor while keeping tests green.
- Run the focused tests during development and the full test suite before
  completing a change.
- Maintain at least **85% line coverage**. Coverage is enforced by the Vitest
  configuration; do not lower or bypass the threshold to make a change pass.
  Statement, branch, and function coverage are reported as additional signals.
  Add meaningful tests for new and changed behavior.

## Logging and Observability

- Prefer structured, contextual logs over ad hoc console output for
  operational diagnostics. Include useful event names and relevant identifiers,
  but never log secrets, credentials, tokens, or sensitive user data.
- Prefer OpenTelemetry's Logs API and semantic conventions (or a structured
  logger bridged to OpenTelemetry) for application logs and telemetry. Keep
  instrumentation vendor-neutral and make exporters and collection
  optional/configurable; do not add a vendor-specific telemetry dependency
  without an approved need.
- Keep command output intended for users separate from diagnostic logs. Send
  errors and diagnostics to the appropriate output channel and preserve
  actionable error details.

## Project Checks

- Run `npm run build`, `npm test`, and `npm run test:coverage` for code changes.
- Keep TypeScript strict and follow existing project patterns.
- Maintain a GitHub Actions workflow that runs the same build, unit-test, and
  coverage-threshold checks on every pull request open, update/synchronize, or
  reopen, and on each commit pushed to a pull-request branch. Keep CI aligned
  with the local project checks above.

## GitHub Actions

- Pin remote Actions and reusable workflow references to full commit SHAs.
  Include the upstream release tag in an adjacent comment and use Dependabot
  for update pull requests; do not reference mutable version tags or branches.

## Pull request workflow

- After every push to a pull-request branch, check the PR's mergeability and
  conflict status in GitHub. Resolve any conflicts and check again; a successful
  push does not guarantee that the PR is mergeable.

## Documentation

- Keep documentation concise, clear, and friendly to readers who are new to
  HAS. Prefer practical steps and plain language; explain why a feature matters
  without unnecessary detail or jargon.
- Keep the public site accurate when changing user-visible behavior, supported
  adapters, commands, or installation. The homepage adapter list is generated
  from `listAdapters()` in `src/adapters/registry.ts`; the corresponding
  adapter sections in `docs/ADAPTERS.md` must match that registry. Update the
  relevant README, adapter guide, or site source when its content needs to
  change. Run `npm run site:build` to validate the adapter documentation and
  render the site. CI runs this on every pull request, and Pages rebuilds after
  relevant code and documentation changes merge to `main`.
