/**
 * Example Policies
 *
 * Real-world policy examples using the DSL
 */

import { Policy } from '../src/policy/dsl'

// ===== Access Control Examples =====

/**
 * Example 1: Admin Full Access (RBAC)
 */
export const adminFullAccess = Policy.rbac('admin-full-access', 'Admin Full Access')
  .description('Administrators have full access to all resources')
  .role('admin')
  .resource('*')
  .action('*')
  .status('active')
  .priority('high')
  .tags('rbac', 'admin', 'access-control')
  .build()

/**
 * Example 2: User Read-Only Access (RBAC)
 */
export const userReadOnly = Policy.rbac('user-read-only', 'User Read-Only Access')
  .description('Regular users can only read resources')
  .role('user')
  .resource('*')
  .action('read')
  .status('active')
  .priority('medium')
  .tags('rbac', 'user', 'read-only')
  .build()

/**
 * Example 3: Department Access (ABAC)
 */
export const departmentAccess = Policy.abac('department-access', 'Department-Based Access')
  .description('Users can access resources in their department')
  .subject({ department: 'engineering' })
  .resourceAttrs({ department: 'engineering' })
  .condition('subject.department', 'eq', 'resource.department')
  .status('active')
  .priority('medium')
  .tags('abac', 'department')
  .build()

/**
 * Example 4: Business Hours Only (ABAC)
 */
export const businessHoursOnly = Policy.abac('business-hours-only', 'Business Hours Access')
  .description('Access only allowed during business hours (9am-5pm)')
  .subject({ role: 'employee' })
  .resourceAttrs({ restricted: true })
  .environment({ businessHours: true })
  .condition('environment.hour', 'gte', 9)
  .condition('environment.hour', 'lte', 17)
  .status('active')
  .priority('high')
  .tags('abac', 'time-based', 'business-hours')
  .build()

// ===== Rate Limiting Examples =====

/**
 * Example 5: API Rate Limit - 100 req/min per API key
 */
export const apiRateLimit = Policy.rateLimit('api-rate-limit', 'API Rate Limit')
  .description('100 requests per minute per API key')
  .limit(100)
  .window(60)
  .scope('api-key')
  .action('deny')
  .status('active')
  .priority('high')
  .tags('rate-limit', 'api')
  .build()

/**
 * Example 6: Login Rate Limit - 5 attempts per 15 min per IP
 */
export const loginRateLimit = Policy.rateLimit('login-rate-limit', 'Login Attempt Rate Limit')
  .description('Prevent brute force attacks - 5 login attempts per 15 minutes per IP')
  .limit(5)
  .window(900) // 15 minutes
  .scope('ip')
  .action('deny')
  .status('active')
  .priority('critical')
  .tags('rate-limit', 'security', 'brute-force-prevention')
  .build()

/**
 * Example 7: Global Throttle - 10,000 req/sec globally
 */
export const globalThrottle = Policy.rateLimit('global-throttle', 'Global Request Throttle')
  .description('Throttle to 10,000 requests per second globally')
  .limit(10000)
  .window(1)
  .scope('global')
  .action('throttle', 0.5) // Throttle to 50%
  .status('active')
  .priority('medium')
  .tags('rate-limit', 'throttle', 'global')
  .build()

// ===== Data Masking Examples =====

/**
 * Example 8: PII Masking for Non-Admin Users
 */
export const piiMasking = Policy.dataMasking('pii-masking', 'PII Data Masking')
  .description('Mask PII fields (SSN, credit card, email) for non-admin users')
  .fields('ssn', 'creditCard', 'email', 'phoneNumber')
  .maskingType('partial')
  .maskingPattern('XXX-XX-XXXX')
  .condition('subject.role', 'ne', 'admin')
  .status('active')
  .priority('high')
  .tags('data-masking', 'pii', 'gdpr')
  .build()

/**
 * Example 9: GDPR Right to be Forgotten
 */
export const gdprDataRedaction = Policy.dataMasking('gdpr-redaction', 'GDPR Data Redaction')
  .description('Redact all personal data for deleted users (GDPR Art. 17)')
  .fields('name', 'email', 'address', 'phoneNumber', 'dateOfBirth')
  .maskingType('redact')
  .condition('user.deleted', 'eq', true)
  .status('active')
  .priority('critical')
  .tags('data-masking', 'gdpr', 'compliance')
  .build()

// ===== Content Filtering Examples =====

/**
 * Example 10: Profanity Filter
 */
export const profanityFilter = Policy.contentFilter('profanity-filter', 'Profanity Content Filter')
  .description('Block or sanitize profanity in user-generated content')
  .action('sanitize')
  .addFilter('keyword', 'badword1', false)
  .addFilter('keyword', 'badword2', false)
  .addFilter('regex', '\\b(offensive|term)\\b', true)
  .status('active')
  .priority('medium')
  .tags('content-filter', 'moderation')
  .build()

/**
 * Example 11: PII Detection Filter
 */
export const piiDetectionFilter = Policy.contentFilter('pii-detection', 'PII Detection Filter')
  .description('Detect and flag PII in content (emails, phone numbers, SSNs)')
  .action('flag')
  .addFilter('email', '.*', false)
  .addFilter('phone', '.*', false)
  .addFilter('regex', '\\b\\d{3}-\\d{2}-\\d{4}\\b', false) // SSN pattern
  .status('active')
  .priority('high')
  .tags('content-filter', 'pii', 'detection')
  .build()

// ===== Fraud Prevention Examples =====

/**
 * Example 12: Payment Fraud Detection
 */
export const paymentFraudDetection = Policy.fraudPrevention('payment-fraud', 'Payment Fraud Detection')
  .description('Detect fraudulent payment transactions using multiple signals')
  .riskLevel('high')
  .action('challenge')
  .addSignal('velocity', 5, 0.3) // More than 5 transactions per hour
  .addSignal('geolocation', 100, 0.2) // Geolocation anomaly score
  .addSignal('device-fingerprint', 50, 0.3) // Device fingerprint match
  .addSignal('ml-score', 70, 0.2) // ML fraud model score
  .minScore(60) // Combined threshold
  .status('active')
  .priority('critical')
  .tags('fraud-prevention', 'payment', 'security')
  .build()

/**
 * Example 13: Account Takeover Prevention
 */
export const accountTakeoverPrevention = Policy.fraudPrevention('account-takeover', 'Account Takeover Prevention')
  .description('Detect account takeover attempts')
  .riskLevel('critical')
  .action('deny')
  .addSignal('velocity', 10, 0.25) // Login attempts
  .addSignal('geolocation', 80, 0.25) // Unusual location
  .addSignal('device-fingerprint', 60, 0.25) // Unknown device
  .addSignal('behavior-analysis', 70, 0.25) // Behavioral anomaly
  .minScore(70)
  .status('active')
  .priority('critical')
  .tags('fraud-prevention', 'account-security', 'takeover-prevention')
  .build()

// ===== Compliance Examples =====

/**
 * Example 14: GDPR Compliance - Lawful Basis for Processing
 */
export const gdprLawfulBasis = Policy.compliance('gdpr-lawful-basis', 'GDPR Lawful Basis')
  .description('Ensure lawful basis for data processing (GDPR Art. 6)')
  .framework('GDPR')
  .auditRequired(true)
  .addRequirement('gdpr-art-6', 'Lawful basis for processing personal data', ['consent', 'contract', 'legal-obligation', 'vital-interests', 'public-task', 'legitimate-interests'], [
    { attribute: 'consent.given', operator: 'eq', value: true },
  ])
  .status('active')
  .priority('critical')
  .tags('compliance', 'gdpr', 'data-protection')
  .build()

/**
 * Example 15: HIPAA Compliance - PHI Access Control
 */
export const hipaaAccessControl = Policy.compliance('hipaa-access-control', 'HIPAA PHI Access Control')
  .description('Control access to Protected Health Information (HIPAA)')
  .framework('HIPAA')
  .auditRequired(true)
  .addRequirement('hipaa-164.308', 'Access control to PHI', ['authentication', 'authorization', 'audit-logging'], [
    { attribute: 'user.authenticated', operator: 'eq', value: true },
    { attribute: 'user.authorized', operator: 'eq', value: true },
  ])
  .status('active')
  .priority('critical')
  .tags('compliance', 'hipaa', 'healthcare', 'phi')
  .build()

/**
 * Example 16: PCI-DSS Compliance - Cardholder Data Protection
 */
export const pciDssDataProtection = Policy.compliance('pci-dss-protection', 'PCI-DSS Cardholder Data Protection')
  .description('Protect cardholder data (PCI-DSS Requirement 3)')
  .framework('PCI-DSS')
  .auditRequired(true)
  .addRequirement('pci-req-3', 'Protect stored cardholder data', ['encryption', 'masking', 'truncation'], [
    { attribute: 'data.encrypted', operator: 'eq', value: true },
  ])
  .addRequirement('pci-req-4', 'Encrypt transmission of cardholder data', ['tls', 'encryption'], [
    { attribute: 'connection.encrypted', operator: 'eq', value: true },
  ])
  .status('active')
  .priority('critical')
  .tags('compliance', 'pci-dss', 'payment', 'security')
  .build()

/**
 * Example 17: SOC2 Compliance - Access Control
 */
export const soc2AccessControl = Policy.compliance('soc2-access-control', 'SOC2 Access Control')
  .description('Implement access controls (SOC2 CC6.1)')
  .framework('SOC2')
  .auditRequired(true)
  .addRequirement('cc6.1', 'Logical and physical access controls', ['authentication', 'authorization', 'least-privilege'], [
    { attribute: 'user.authenticated', operator: 'eq', value: true },
    { attribute: 'access.leastPrivilege', operator: 'eq', value: true },
  ])
  .status('active')
  .priority('high')
  .tags('compliance', 'soc2', 'access-control')
  .build()

// Export all examples
export const examplePolicies = {
  // Access Control
  adminFullAccess,
  userReadOnly,
  departmentAccess,
  businessHoursOnly,

  // Rate Limiting
  apiRateLimit,
  loginRateLimit,
  globalThrottle,

  // Data Masking
  piiMasking,
  gdprDataRedaction,

  // Content Filtering
  profanityFilter,
  piiDetectionFilter,

  // Fraud Prevention
  paymentFraudDetection,
  accountTakeoverPrevention,

  // Compliance
  gdprLawfulBasis,
  hipaaAccessControl,
  pciDssDataProtection,
  soc2AccessControl,
}
