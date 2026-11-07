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
