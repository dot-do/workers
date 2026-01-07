---
description: "Manually advance to the next dev-loop phase"
allowed-tools: ["Read(.claude/dev-loop.local.md)", "Write(.claude/dev-loop.local.md)", "Bash(test -f .claude/dev-loop.local.md:*)", "Task", "mcp__plugin_beads_beads__*"]
---

# Advance Dev Loop Phase

Manually advance to the next phase of the development loop.

1. Read `.claude/dev-loop.local.md` to get current phase
2. Validate prerequisites for advancement:
   - BRAINSTORM → PLAN: Design document must exist
   - PLAN → IMPLEMENT: Beads issues must be created
   - IMPLEMENT → REVIEW: All issues should be closed
   - REVIEW → APPROVED or FEEDBACK_PLAN: Based on findings
   - FEEDBACK_PLAN → FIX: Fix issues must be created
   - FIX → FINAL_REVIEW: All fixes closed
   - FINAL_REVIEW → APPROVED or back to FEEDBACK_PLAN

3. Update the phase in the state file
4. Announce the new phase and what to do next

Phase-specific actions:
- **Entering PLAN**: Use extended thinking to create TDD beads issues
- **Entering IMPLEMENT**: Start Ralph loop with implementation prompt
- **Entering REVIEW**: Launch 5 parallel review agents
- **Entering FEEDBACK_PLAN**: Use extended thinking on review findings
- **Entering FIX**: Start Ralph loop with fix prompt
- **Entering FINAL_REVIEW**: Launch 5 parallel review agents
- **Entering APPROVED**: Celebrate! Clean up state file.
