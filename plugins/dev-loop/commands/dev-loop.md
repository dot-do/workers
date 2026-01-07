---
description: "Start development lifecycle: brainstorm → TDD planning → ralph → review → feedback loop"
argument-hint: "TASK [--max-iterations N]"
allowed-tools: ["Bash(${CLAUDE_PLUGIN_ROOT}/scripts/setup-dev-loop.sh:*)", "Bash(${CLAUDE_PLUGIN_ROOT}/scripts/advance-phase.sh:*)", "Task", "mcp__plugin_beads_beads__*"]
---

# Dev Loop Command

Execute the setup script to initialize the development loop:

```!
"${CLAUDE_PLUGIN_ROOT}/scripts/setup-dev-loop.sh" $ARGUMENTS
```

Now invoke the workers-do:brainstorming skill to begin the design exploration.

After brainstorming completes and the user approves the design:
1. Write the design to `docs/plans/YYYY-MM-DD-<topic>-design.md`
2. Update `.claude/dev-loop.local.md` phase to PLAN
3. Use extended thinking to create TDD beads issues
4. Continue through the phases as described in workers-do:development-loop skill

PHASE TRANSITIONS:
- BRAINSTORM → PLAN: User says "design approved" or approves design
- PLAN → IMPLEMENT: Issues created, user approves plan
- IMPLEMENT → REVIEW: All issues closed, tests passing
- REVIEW → APPROVED: No critical findings
- REVIEW → FEEDBACK_PLAN: Critical findings need addressing
- FEEDBACK_PLAN → FIX: Fix issues created
- FIX → FINAL_REVIEW: All fixes complete
- FINAL_REVIEW → APPROVED: Quality verified
- FINAL_REVIEW → FEEDBACK_PLAN: More work needed

For IMPLEMENT and FIX phases, use Ralph loop with appropriate prompts.
For REVIEW phases, launch 5 parallel review agents.
For PLAN and FEEDBACK_PLAN phases, use extended thinking for issue creation.
