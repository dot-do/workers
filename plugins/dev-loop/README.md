# Dev Loop Plugin

The "outer loop" for Ralph - a complete development lifecycle that wraps autonomous implementation with planning, review, and feedback cycles.

## Workflow

```
BRAINSTORM → PLAN → IMPLEMENT (Ralph) → REVIEW → [APPROVED | FEEDBACK → FIX (Ralph) → REVIEW → ...]
```

## Phases

1. **BRAINSTORM** - Interactive design exploration
2. **PLAN** - Create TDD beads issues with extended thinking
3. **IMPLEMENT** - Ralph loop through all issues
4. **REVIEW** - 5-agent parallel code review
5. **FEEDBACK_PLAN** - Convert findings to fix issues (if needed)
6. **FIX** - Ralph loop through fixes
7. **FINAL_REVIEW** - Approve or iterate

## Commands

### /dev-loop "description"
Start a new development loop with the given task.

### /dev-loop-status
Show current phase, iteration count, and progress.

### /dev-loop-advance
Manually advance to the next phase (for human checkpoints).

### /dev-loop-cancel
Cancel the current loop.

## Human Checkpoints

The loop pauses for approval at:
- After brainstorming (approve design)
- After planning (review issues)
- After reviews (approve or request fixes)

## State File

Progress tracked in `.claude/dev-loop.local.md` with YAML frontmatter.

## Example

```bash
/dev-loop "Add real-time notifications with WebSocket support"
```

The loop will:
1. Ask about notification requirements
2. Create TDD issues for WebSocket module
3. Ralph-implement the feature
4. Review with 5 agents
5. Fix any issues found
6. Final approval
