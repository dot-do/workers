---
description: "Show current dev-loop phase and progress"
allowed-tools: ["Read(.claude/dev-loop.local.md)", "Bash(test -f .claude/dev-loop.local.md:*)"]
---

# Dev Loop Status

Check the current state of the development loop:

1. Check if `.claude/dev-loop.local.md` exists
2. If not: "No active dev loop. Start one with /dev-loop"
3. If yes: Read the file and display:

```
═══════════════════════════════════════════════════════════
DEV LOOP STATUS
═══════════════════════════════════════════════════════════

Phase: [CURRENT_PHASE] ([N]/7)
Iteration: [N] of [MAX]
Started: [TIMESTAMP]

Task: [ORIGINAL_TASK]

Progress:
  [✓] BRAINSTORM - Design: [design_doc or "pending"]
  [✓] PLAN - Issues: [count] created
  [ ] IMPLEMENT - Issues: [closed]/[total]
  [ ] REVIEW - Findings: [count]
  [ ] FEEDBACK_PLAN
  [ ] FIX
  [ ] FINAL_REVIEW

Next action: [what to do next based on phase]
═══════════════════════════════════════════════════════════
```
