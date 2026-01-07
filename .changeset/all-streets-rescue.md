---
"@dotdo/types": minor
---

SDK TDD refactoring - shared tagged helper, @dotdo/types package, consistent patterns

- Added shared `tagged` helper to rpc.do (eliminates duplication across 30+ SDKs)
- Created @dotdo/types package with sql, rpc, and fn type definitions
- Fixed duplicate export bugs in workflows.do and llm.do
- Fixed database.do interface (replaced index signature with entity() method)
- Standardized endpoint format across all SDKs (full URL)
- Standardized API key resolution (rpc.do env system)
- Improved package.json files for npm publish readiness
