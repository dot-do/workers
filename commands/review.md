---
description: "Comprehensive parallel code review with 5 specialized agents (general, architectural, TypeScript, product/vision, TDD/beads)"
allowed-tools: ["Bash(gh pr diff:*)", "Bash(gh pr view:*)", "Bash(git diff:*)", "Bash(git log:*)", "Task", "mcp__plugin_beads_beads__list", "mcp__plugin_beads_beads__show"]
---

# Parallel Code Review

Invoke the workers-do:code-review skill and follow it exactly.

Launch 5 parallel Sonnet agents to review the changes:
1. **General**: Bugs, logic errors, security, test coverage
2. **Architectural**: Patterns, dependencies, abstraction, scaling
3. **TypeScript**: Type safety, generics, async correctness
4. **Product/Vision**: Alignment with project goals, naming, roadmap
5. **TDD/Beads**: Test discipline, RED-GREEN-REFACTOR, beads issue tracking

After gathering results, synthesize into a unified review with prioritized findings.
