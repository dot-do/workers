# Claude Code Cloud Setup for Submodules

This document explains how to set up Claude Code plugins (including beads and dev-loop) for the workers.do submodules, both locally and in Claude Code Cloud.

## Overview

Each submodule has been configured with `.claude/settings.json` to enable:
- **beads** - Issue tracking and TDD workflow
- **ralph-loop** - Autonomous implementation loops
- **superpowers** - Enhanced capabilities
- **dev-loop** - Full development lifecycle (brainstorm → plan → implement → review)

## Local Setup

### 1. Register the workers-do-marketplace

The dev-loop plugin is hosted in the workers-do-marketplace. Register it:

```bash
# Option A: Use Claude Code CLI
/plugin marketplace add dot-do/workers

# Option B: Manual registration (already done if you ran setup script)
# The marketplace is at: github.com/dot-do/workers
```

### 2. Install Plugins (if not auto-installed)

```bash
/plugin install beads@beads-marketplace
/plugin install ralph-loop@claude-plugins-official
/plugin install superpowers@superpowers-marketplace
/plugin install dev-loop@workers-do-marketplace
```

### 3. Verify Setup

In any submodule directory:
```bash
# Check beads is working
bd ready

# Check dev-loop is available
/dev-loop --help
```

## Claude Code Cloud Setup

For Claude Code Cloud environments, the plugins are enabled via the `.claude/settings.json` file in each repository.

### Required Marketplaces

Claude Code Cloud needs access to these marketplaces:

| Marketplace | GitHub Repo | Plugins |
|-------------|-------------|---------|
| beads-marketplace | steveyegge/beads | beads |
| claude-plugins-official | anthropics/claude-plugins-official | ralph-loop |
| superpowers-marketplace | obra/superpowers-marketplace | superpowers |
| workers-do-marketplace | dot-do/workers | dev-loop |

### Configuration File

Each submodule contains `.claude/settings.json`:

```json
{
  "enabledPlugins": {
    "beads@beads-marketplace": true,
    "ralph-loop@claude-plugins-official": true,
    "superpowers@superpowers-marketplace": true,
    "dev-loop@workers-do-marketplace": true
  }
}
```

### Cloud-Specific Notes

1. **Marketplace Registration**: Cloud environments may need marketplaces pre-registered in your Claude Code Cloud organization settings.

2. **Beads Data**: The `.beads/` directory is git-tracked and syncs automatically. No cloud-specific storage needed.

3. **Dev-Loop State**: Dev-loop stores state in `.claude/dev-loop.local.md` which is gitignored by default.

## Submodule List

All configured submodules:

| Submodule | Prefix | Status |
|-----------|--------|--------|
| primitives | primitives- | Ready |
| rewrites/gitx | gitx- | Ready |
| rewrites/mongo | mongo- | Ready |
| rewrites/redis | redis- | Ready |
| rewrites/neo4j | neo4j- | Ready |
| rewrites/excel | excel- | Ready |
| rewrites/firebase | firebase- | Ready |
| rewrites/convex | convex- | Ready |
| rewrites/kafka | kafka- | Ready |
| rewrites/nats | nats- | Ready |
| rewrites/turso | turso- | Ready |
| rewrites/fsx | fsx- | Ready |
| packages/esm | esm- | Ready |
| packages/claude | claude- | Ready |
| mdxui | mdxui- | Ready |

## Workflow in Submodules

### Starting Work

```bash
cd rewrites/kafka

# Check available work
bd ready

# Claim a task
bd update kafka-xxx --status=in_progress

# Or start a new dev loop
/dev-loop "Implement consumer group management"
```

### Completing Work

```bash
# Close completed issues
bd close kafka-xxx kafka-yyy

# Sync beads data
bd sync

# Commit changes
git add .
git commit -m "feat: implement consumer groups"
git push
```

## Troubleshooting

### Plugin Not Found

If a plugin isn't found:
1. Check marketplace is registered: `/plugin marketplace list`
2. Re-add marketplace: `/plugin marketplace add <github-repo>`
3. Reinstall plugin: `/plugin install <plugin>@<marketplace>`

### Beads Not Working

```bash
# Re-initialize if needed
bd init --prefix=<submodule-name>

# Run health check
bd doctor --fix
```

### Dev-Loop State Issues

```bash
# Reset dev-loop state
rm .claude/dev-loop.local.md

# Start fresh
/dev-loop "your task"
```
