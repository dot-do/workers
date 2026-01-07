---
description: "Cancel the active dev-loop"
allowed-tools: ["Bash(rm .claude/dev-loop.local.md)", "Bash(test -f .claude/dev-loop.local.md:*)", "Read(.claude/dev-loop.local.md)"]
---

# Cancel Dev Loop

Cancel the current development loop:

1. Check if `.claude/dev-loop.local.md` exists
2. If not: "No active dev loop to cancel."
3. If yes:
   - Read the file to get current phase and iteration
   - Remove the state file: `rm .claude/dev-loop.local.md`
   - Report: "Dev loop cancelled (was in [PHASE] phase, iteration [N])"

Note: This does NOT delete:
- Design documents in docs/plans/
- Beads issues that were created
- Any code that was implemented

Those remain for you to use or clean up manually.
