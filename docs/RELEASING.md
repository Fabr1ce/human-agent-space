# Releasing

The temporary npm package name is `human-agent-space`. No npm release is
available yet. Before the first release, confirm that the name is available
and that project maintainers control the npm account that will publish it.

## One-time setup

1. Configure npm trusted publishing for the `Fabr1ce/human-agent-space`
   repository, `.github/workflows/release.yml`, and the `npm-publish`
   environment. Allow direct `npm publish` for this publisher; allowing only
   staged publishing will not work with this workflow. The workflow uses
   GitHub Actions OIDC and does not need a long-lived npm token.
2. Set the repository Actions variable `NPM_PUBLISH_ENABLED` to `true` only
   when the package, trusted publisher, and release contents are ready. If the
   variable is unset or not `true`, the publish job is skipped.
3. Keep the `npm-publish` environment available for the release job.

New npm trusted-publisher configurations must complete a successful first
publish within npm's validation window (currently two days). Configure the
publisher immediately before the approved first release.

## Publishing a release

1. Update `package.json`'s version and commit the release changes to `main`.
2. Verify the package contents with `npm pack --dry-run` and run the build,
   tests, and coverage gate.
3. Create and push a matching version tag, for example `v0.1.0`.
4. The release workflow repeats the checks, publishes with provenance, and
   creates a GitHub release with generated notes.

Do not set `NPM_PUBLISH_ENABLED` to `true` or push a release tag until npm
trusted publishing and package ownership have been verified.

## Future package name

TODO: Consider migrating to `@fabrice/has` after confirming that the npm scope
is controlled by the project maintainers. Update the manifest, lockfile,
installation guidance, and trusted-publisher configuration together. Verify
the intended spelling and scope ownership before making this change.
