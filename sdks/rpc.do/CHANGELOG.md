# rpc.do

## 0.2.0

### Minor Changes

- SDK TDD refactoring - shared tagged helper, @dotdo/types package, consistent patterns

  - Added shared `tagged` helper to rpc.do (eliminates duplication across 30+ SDKs)
  - Created @dotdo/types package with sql, rpc, and fn type definitions
  - Fixed duplicate export bugs in workflows.do and llm.do
  - Fixed database.do interface (replaced index signature with entity() method)
  - Standardized endpoint format across all SDKs (full URL)
  - Standardized API key resolution (rpc.do env system)
  - Improved package.json files for npm publish readiness

### Patch Changes

- Updated dependencies [7274580]
- Updated dependencies
  - @dotdo/types@0.1.0
  - org.ai@0.1.1
