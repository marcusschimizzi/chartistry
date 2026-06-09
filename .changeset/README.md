# Changesets

This folder is managed by [Changesets](https://github.com/changesets/changesets). It
tracks intended releases so versions and changelogs are derived from the changes
themselves rather than bumped by hand.

When you make a change worth releasing, add a changeset:

```bash
pnpm changeset
```

Pick the packages and the bump (patch / minor / major) and write a short, user-facing
summary. Commit the generated file under `.changeset/` with your PR.

The four published packages (`@chartistry/core`, `@chartistry/renderer-svg`,
`@chartistry/renderer-canvas`, `@chartistry/react`) are a **fixed** group: they always
version and release together, so a consumer never has to reason about cross-package
version skew. The playground is private and never published.

On merge to `main`, the release workflow opens (or updates) a "Version Packages" PR that
applies the accumulated changesets; merging that PR publishes the new versions to npm.

See the [docs](https://github.com/changesets/changesets/blob/main/docs/intro-to-using-changesets.md)
for more.
