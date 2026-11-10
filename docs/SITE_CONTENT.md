# Public Site Content

The site build publishes only the following Markdown sources. Other repository
documents, including internal planning material, are not copied to the site.

| Site content | Source of truth | Freshness check |
|---|---|---|
| Landing page | `site/index.html` | `npm run site:build` replaces the adapter-list placeholder. |
| Supported adapter list | `listAdapters()` in `src/adapters/registry.ts` and projector labels | Generated from the compiled registry; the build fails if `docs/ADAPTERS.md` has missing or extra adapters, stale output roots, capabilities, or verification status. |
| Project overview | `README.md` | Rendered as `README.html` by the site build. |
| Adapter details | `docs/ADAPTERS.md` | Rendered as `docs/ADAPTERS.html`; section names are checked against the adapter registry. |
| Site styles | `site/docs.css` | Copied into the Pages artifact by the site build. |

Pull-request CI runs the same site build, so a new or removed adapter cannot
pass CI with a stale adapter guide. After relevant changes merge to `main`,
the Pages workflow rebuilds and deploys the current sources. The workflow
triggers on `src/**`, `bin/**`, `README.md`, `docs/**`, community guidance,
site sources, and the build configuration.
