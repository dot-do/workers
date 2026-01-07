# @dotdo/types

## 0.1.0

### Minor Changes

- 7274580: SDK TDD refactoring - shared tagged helper, @dotdo/types package, consistent patterns

  - Added shared `tagged` helper to rpc.do (eliminates duplication across 30+ SDKs)
  - Created @dotdo/types package with sql, rpc, and fn type definitions
  - Fixed duplicate export bugs in workflows.do and llm.do
  - Fixed database.do interface (replaced index signature with entity() method)
  - Standardized endpoint format across all SDKs (full URL)
  - Standardized API key resolution (rpc.do env system)
  - Improved package.json files for npm publish readiness

- SDK TDD refactoring - shared tagged helper, @dotdo/types package, consistent patterns

  - Added shared `tagged` helper to rpc.do (eliminates duplication across 30+ SDKs)
  - Created @dotdo/types package with sql, rpc, and fn type definitions
  - Fixed duplicate export bugs in workflows.do and llm.do
  - Fixed database.do interface (replaced index signature with entity() method)
  - Standardized endpoint format across all SDKs (full URL)
  - Standardized API key resolution (rpc.do env system)
  - Improved package.json files for npm publish readiness

### Patch Changes

- ai-database@2.0.3
- ai-functions@2.0.3
- ai-workflows@2.0.3
- autonomous-agents@2.0.3
- digital-workers@2.0.3
- human-in-the-loop@2.0.3
