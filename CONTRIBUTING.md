# Contributing

## Versioning with Changesets

This monorepo uses [changesets](https://github.com/changesets/changesets) for versioning and changelog generation.

### Creating a Changeset

When you make changes that should result in a new version, create a changeset:

```bash
pnpm changeset
```

This will prompt you to:
1. Select which packages have changed
2. Choose the type of version bump (major, minor, patch)
3. Write a summary of the changes

A markdown file will be created in the `.changeset` directory describing your changes.

### Version Bumping

- **patch** (0.0.x): Bug fixes, documentation changes, minor improvements
- **minor** (0.x.0): New features that are backwards compatible
- **major** (x.0.0): Breaking changes

### Release Process

1. Changes accumulate in `.changeset/` as PRs are merged
2. When ready to release, run:
   ```bash
   pnpm version    # Updates package versions and changelogs
   pnpm release    # Builds and publishes to npm
   ```

### Best Practices

- Create one changeset per logical change
- Write clear, user-focused summaries
- If a change doesn't need a release, use `pnpm changeset --empty`
- Changesets are committed with the code they describe

### Configuration

The changeset configuration is in `.changeset/config.json`:
- `access: "public"` - Packages are published as public npm packages
- `baseBranch: "main"` - Version changes are tracked against main
- `updateInternalDependencies: "patch"` - Internal deps get patch bumps automatically
