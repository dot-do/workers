# Changelog

All notable changes to soc2.do will be documented in this file.

## [0.0.1] - 2026-01-08

### Added

- Initial release of soc2.do SDK
- Vendor risk assessment functionality:
  - Risk scoring algorithm based on data access, compliance, and assessment recency
  - SOC 2 report verification and expiration tracking
  - Security questionnaire creation and management
  - Review scheduling (quarterly, biannual, annual)
  - Risk mitigation planning and tracking
  - Risk history and trend analysis
  - Risk alert thresholds and notifications
- Comprehensive test suite with 22 tests covering all vendor risk features
- Full TypeScript type definitions
- Mock server implementation for testing
- Complete API documentation in README

### Technical Details

- Built on rpc.do for multi-transport RPC support
- Strongly-typed client interfaces
- Automated API key resolution via rpc.do/env
- TDD approach: RED tests first, then GREEN implementation
