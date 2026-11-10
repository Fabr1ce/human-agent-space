# Contributing

Thanks for helping improve Human-Agent Space (HAS). Bug reports, documentation
updates, and focused code changes are welcome.

## Before you start

- Search existing issues and pull requests before opening a new one.
- For larger changes, open an issue first so the approach can be discussed.
- Report security vulnerabilities privately; see [SECURITY.md](SECURITY.md).

## Development setup

Use Node.js 22 or newer and npm:

```sh
npm ci
npm run build
npm test
npm run test:coverage
```

The coverage command enforces at least 85% line coverage. Run the relevant
checks before opening a pull request.

## Pull requests

- Keep changes focused and explain the user impact.
- Add or update tests for behavior changes and update documentation when needed.
- Describe the checks you ran and call out any follow-up work.
- Do not include credentials, private user data, or generated build artifacts.

Pull requests run the same build, unit-test, and coverage checks in GitHub
Actions.
