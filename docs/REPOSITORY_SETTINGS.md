# Repository settings

These are GitHub-hosted settings; committing this file does not apply them
automatically. The active `Main Protection` ruleset should match the policy
below.

## `main` branch ruleset

- Require pull requests and passing the GitHub Actions `test` check. Require
  the branch to be up to date before merging.
- Require review conversations to be resolved and dismiss stale approvals
  after new pushes.
- Keep required approvals at zero while the repository has only one
  independent maintainer. Revisit this after another maintainer can review;
  then require one approval. Do not let a contributor approve their own
  changes.
- Keep deletion and force-push prevention and the existing coverage rule
  (at least 85% line coverage, with no more than a 5-point coverage drop).
- Treat commit signing as optional; do not require signatures for contributions.
- Keep the bypass actor list empty for routine changes. Add a bypass only for a
  documented recovery need.

## Repository security

- Keep the default `GITHUB_TOKEN` permission read-only and disallow workflows
  from approving pull requests.
- Keep secret scanning and push protection enabled.
- Keep Dependabot alerts and security updates enabled, in addition to the
  weekly update configuration in `.github/dependabot.yml`.
- Keep private vulnerability reporting enabled and direct reports to
  [SECURITY.md](../SECURITY.md).
- Keep CodeQL analysis enabled for pull requests, default-branch pushes, and
  the weekly scheduled scan.

## Metadata and maintenance

- Set the repository homepage to the project website and use relevant topics
  such as `coding-agents`, `developer-tools`, `typescript`, and `cli`.
- Keep repository description and links consistent with the README.
- Review maintainer access and this policy when ownership changes.
