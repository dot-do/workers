#!/bin/bash

# Dev Loop Phase Advancement Script
# Validates prerequisites and advances to next phase

set -euo pipefail

STATE_FILE=".claude/dev-loop.local.md"

if [[ ! -f "$STATE_FILE" ]]; then
  echo "❌ No active dev loop found" >&2
  echo "   Start one with: /dev-loop <task>" >&2
  exit 1
fi

# Parse current phase from frontmatter
FRONTMATTER=$(sed -n '/^---$/,/^---$/{ /^---$/d; p; }' "$STATE_FILE")
CURRENT_PHASE=$(echo "$FRONTMATTER" | grep '^phase:' | sed 's/phase: *//')
ITERATION=$(echo "$FRONTMATTER" | grep '^iteration:' | sed 's/iteration: *//')
MAX_ITERATIONS=$(echo "$FRONTMATTER" | grep '^max_iterations:' | sed 's/max_iterations: *//')

# Define phase order
declare -A PHASE_ORDER=(
  ["BRAINSTORM"]=1
  ["PLAN"]=2
  ["IMPLEMENT"]=3
  ["REVIEW"]=4
  ["FEEDBACK_PLAN"]=5
  ["FIX"]=6
  ["FINAL_REVIEW"]=7
  ["APPROVED"]=8
)

declare -A NEXT_PHASE=(
  ["BRAINSTORM"]="PLAN"
  ["PLAN"]="IMPLEMENT"
  ["IMPLEMENT"]="REVIEW"
  ["REVIEW"]="FEEDBACK_PLAN"  # or APPROVED based on findings
  ["FEEDBACK_PLAN"]="FIX"
  ["FIX"]="FINAL_REVIEW"
  ["FINAL_REVIEW"]="FEEDBACK_PLAN"  # or APPROVED based on findings
)

# Get target phase (default to next in sequence)
TARGET_PHASE="${1:-${NEXT_PHASE[$CURRENT_PHASE]:-APPROVED}}"

# Special handling for REVIEW phases - can go to APPROVED or FEEDBACK_PLAN
if [[ "$CURRENT_PHASE" == "REVIEW" || "$CURRENT_PHASE" == "FINAL_REVIEW" ]]; then
  if [[ "$TARGET_PHASE" == "APPROVED" ]]; then
    echo "✅ Review approved! Advancing to APPROVED."
  else
    TARGET_PHASE="FEEDBACK_PLAN"
    NEXT_ITERATION=$((ITERATION + 1))

    if [[ $NEXT_ITERATION -gt $MAX_ITERATIONS ]]; then
      echo "⚠️  Max iterations ($MAX_ITERATIONS) reached!" >&2
      echo "   Forcing decision point - approve or extend max_iterations" >&2
      exit 1
    fi

    # Update iteration
    TEMP_FILE="${STATE_FILE}.tmp.$$"
    sed "s/^iteration: .*/iteration: $NEXT_ITERATION/" "$STATE_FILE" > "$TEMP_FILE"
    mv "$TEMP_FILE" "$STATE_FILE"
    ITERATION=$NEXT_ITERATION
  fi
fi

# Update phase in state file
TEMP_FILE="${STATE_FILE}.tmp.$$"
sed "s/^phase: .*/phase: $TARGET_PHASE/" "$STATE_FILE" > "$TEMP_FILE"
mv "$TEMP_FILE" "$STATE_FILE"

# Output phase transition message
PHASE_NUM="${PHASE_ORDER[$TARGET_PHASE]:-8}"

cat <<EOF

═══════════════════════════════════════════════════════════
PHASE $PHASE_NUM: $TARGET_PHASE
═══════════════════════════════════════════════════════════
EOF

case "$TARGET_PHASE" in
  "PLAN")
    cat <<EOF
Use extended thinking to create TDD beads issues.

For each module/feature identified in the design:
1. Create RED issue (failing tests)
2. Create GREEN issue (implementation, blocked by RED)
3. Create REFACTOR issue (cleanup, blocked by GREEN)

Use: bd create --title="..." --type=task --labels="tdd-red,..."
Then: bd dep add <child> <parent>

When all issues are created, say "plan approved" to advance.
EOF
    ;;
  "IMPLEMENT")
    cat <<EOF
Starting Ralph loop for implementation.

The loop will work through beads issues in dependency order,
following TDD (RED → GREEN → REFACTOR) for each.

To start: /ralph-loop "Work through beads issues..." --completion-promise "IMPLEMENTATION COMPLETE"
EOF
    ;;
  "REVIEW")
    cat <<EOF
Launch 5 parallel review agents:
1. General code review
2. Architectural review
3. TypeScript review
4. Product/vision review
5. TDD/beads compliance review

After review completes:
- If approved: /dev-loop-advance APPROVED
- If needs work: /dev-loop-advance FEEDBACK_PLAN
EOF
    ;;
  "FEEDBACK_PLAN")
    cat <<EOF
Iteration: $ITERATION / $MAX_ITERATIONS

Use extended thinking to convert review findings into fix issues.

For each finding:
1. Create a FIX issue with appropriate priority
2. Add dependencies if fixes depend on each other

When fix issues are ready, say "fixes planned" to advance.
EOF
    ;;
  "FIX")
    cat <<EOF
Starting Ralph loop for fixes.

The loop will work through fix issues from the review.

To start: /ralph-loop "Work through fix issues..." --completion-promise "FIXES COMPLETE"
EOF
    ;;
  "FINAL_REVIEW")
    cat <<EOF
Final review - iteration $ITERATION / $MAX_ITERATIONS

Launch 5 parallel review agents focused on:
- Were review findings addressed?
- Any new issues introduced?
- Overall quality assessment

After review:
- If approved: /dev-loop-advance APPROVED
- If more work: /dev-loop-advance FEEDBACK_PLAN
EOF
    ;;
  "APPROVED")
    cat <<EOF
🎉 Development loop complete!

The implementation has been reviewed and approved.

Next steps:
- Commit and push changes
- Create PR if on feature branch
- Clean up with /dev-loop-cancel

State file: $STATE_FILE
EOF
    # Mark as approved in state
    TEMP_FILE="${STATE_FILE}.tmp.$$"
    sed "s/^approved: .*/approved: true/" "$STATE_FILE" > "$TEMP_FILE"
    mv "$TEMP_FILE" "$STATE_FILE"
    ;;
esac

echo "═══════════════════════════════════════════════════════════"
