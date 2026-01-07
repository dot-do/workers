#!/bin/bash

# Dev Loop Setup Script
# Creates state file for the development lifecycle loop

set -euo pipefail

# Parse arguments
TASK_PARTS=()
MAX_ITERATIONS=3  # Max review cycles before forcing approval decision

while [[ $# -gt 0 ]]; do
  case $1 in
    -h|--help)
      cat << 'HELP_EOF'
Dev Loop - Complete development lifecycle

USAGE:
  /dev-loop [TASK...] [OPTIONS]

ARGUMENTS:
  TASK...    Description of what to build

OPTIONS:
  --max-iterations <n>  Max review cycles (default: 3)
  -h, --help           Show this help

PHASES:
  1. BRAINSTORM     - Interactive design exploration
  2. PLAN           - Create TDD beads issues (superthink)
  3. IMPLEMENT      - Ralph loop through issues
  4. REVIEW         - 5-agent code review
  5. FEEDBACK_PLAN  - Convert findings to issues (if needed)
  6. FIX            - Ralph loop fixes
  7. FINAL_REVIEW   - Approve or iterate

EXAMPLE:
  /dev-loop Add user authentication with JWT and SSO
  /dev-loop Refactor the payment module --max-iterations 5
HELP_EOF
      exit 0
      ;;
    --max-iterations)
      MAX_ITERATIONS="$2"
      shift 2
      ;;
    *)
      TASK_PARTS+=("$1")
      shift
      ;;
  esac
done

TASK="${TASK_PARTS[*]}"

if [[ -z "$TASK" ]]; then
  echo "❌ Error: No task description provided" >&2
  echo "" >&2
  echo "   Usage: /dev-loop <task description>" >&2
  echo "   Example: /dev-loop Add user authentication with JWT" >&2
  exit 1
fi

# Check if loop already active
if [[ -f ".claude/dev-loop.local.md" ]]; then
  echo "⚠️  Dev loop already active!" >&2
  echo "" >&2
  echo "   Current state file: .claude/dev-loop.local.md" >&2
  echo "   Use /dev-loop-status to check progress" >&2
  echo "   Use /dev-loop-cancel to start fresh" >&2
  exit 1
fi

mkdir -p .claude

# Create state file
cat > .claude/dev-loop.local.md <<EOF
---
phase: BRAINSTORM
iteration: 0
max_iterations: $MAX_ITERATIONS
started_at: "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
design_doc: null
initial_issues: []
fix_issues: []
review_findings: []
approved: false
---

$TASK
EOF

cat <<EOF
🔄 Dev Loop initialized!

Task: $TASK

Phase: BRAINSTORM (1/7)
Max review iterations: $MAX_ITERATIONS

The development loop will guide you through:
  1. BRAINSTORM     - Design exploration (current)
  2. PLAN           - Create TDD beads issues
  3. IMPLEMENT      - Ralph loop implementation
  4. REVIEW         - 5-agent code review
  5. FEEDBACK_PLAN  - Create fix issues (if needed)
  6. FIX            - Ralph loop fixes
  7. FINAL_REVIEW   - Approve or iterate

Starting with brainstorming...

═══════════════════════════════════════════════════════════
PHASE 1: BRAINSTORM
═══════════════════════════════════════════════════════════

Let's explore what you want to build. I'll ask questions
one at a time to understand the requirements.

When the design is complete, say "design approved" to
advance to the planning phase.
═══════════════════════════════════════════════════════════

$TASK
EOF
