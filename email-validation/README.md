# Email Validation Service

Comprehensive email validation service with syntax, MX, disposable, role, and catch-all checks.

## Features

- **Syntax Validation**: RFC 5322 compliant email syntax checking
- **MX Record Validation**: Verify domain has mail servers
- **Disposable Detection**: Identify temporary/throwaway email providers
- **Role-Based Detection**: Flag admin, support, info addresses
- **Catch-All Detection**: Identify domains that accept any email
- **Provider Detection**: Recognize Gmail, Outlook, Yahoo, etc.
- **Bulk Validation**: Process up to 10,000 emails at once
- **Scoring System**: 0-100 score based on validation checks
- **Caching**: 24-hour KV cache for faster repeat validations

## API Endpoints

### Validate Single Email

```bash
POST /validate
Content-Type: application/json

{
  "email": "user@example.com",
  "options": {
    "checkMX": true,
    "checkDisposable": true,
    "checkRole": true,
    "checkCatchAll": false
  }
}
```

### Bulk Validation

```bash
POST /validate/bulk
Content-Type: application/json

{
  "emails": ["user1@example.com", "user2@example.com"],
  "options": {
    "checkMX": true,
    "checkDisposable": true,
    "checkRole": true
  }
}
```

## RPC Interface

```typescript
// From another service
const validationService = env.EMAIL_VALIDATION
const result = await validationService.validateEmail('user@example.com', { checkMX: true })
```

## MCP Tools

### validate_email
Validate a single email address with comprehensive checks.

### validate_emails_bulk
Validate multiple email addresses at once (up to 10,000).

## Validation Result

```typescript
{
  email: "user@example.com",
  valid: true,
  score: 95,
  issues: [],
  details: {
    syntax: { valid: true, local: "user", domain: "example.com", issues: [] },
    mx: { valid: true, records: ["mx1.example.com"], priority: 10, hasBackup: true },
    disposable: { isDisposable: false },
    role: { isRole: false },
    catchall: { isCatchAll: false, confidence: 0 },
    provider: "Gmail"
  }
}
```

## Scoring System

- **100**: Perfect email (valid syntax, MX records, not disposable/role/catch-all)
- **90-99**: Valid but minor issues (no backup MX)
- **70-89**: Valid but risky (role-based or catch-all)
- **40-69**: Potentially problematic (disposable domain)
- **1-39**: Invalid (no MX records but valid syntax)
- **0**: Invalid syntax

## Configuration

### Environment Variables

- `MAILGUN_API_KEY`: Optional Mailgun validation API key
- `SENDGRID_API_KEY`: Optional SendGrid validation API key
- `ZEROBOUNCE_API_KEY`: Optional ZeroBounce validation API key

### Service Bindings

- `DB`: Database service for logging validations
- `KV`: KV namespace for caching results (24hr TTL)
- `QUEUE`: Queue for async bulk validation jobs

## Deployment

```bash
# Development
pnpm dev

# Deploy to production
pnpm deploy

# Run tests
pnpm test
```

## Performance

- **Single validation**: ~100-500ms (with MX check)
- **Bulk validation**: ~100-200 emails/second
- **Cache hit**: <5ms
- **MX check timeout**: 5 seconds (configurable)

## Best Practices

1. **Enable caching**: Use KV cache for repeat validations
2. **Batch requests**: Use bulk validation for large lists
3. **Skip catch-all**: Expensive check, only use when necessary
4. **Monitor score**: Use score >= 70 as threshold for cold outreach
5. **Handle disposable**: Filter out disposable emails for cold campaigns

## Integration Example

```typescript
import { EmailValidationService } from '@do/email-validation'

// Validate before sending cold email
const validationService = env.EMAIL_VALIDATION
const result = await validationService.validateEmail(email)

if (result.score >= 70 && !result.details.disposable.isDisposable) {
  // Safe to send
  await sendEmail(email, campaign)
} else {
  // Skip or flag for review
  await flagContact(email, result.issues)
}
```

## Future Enhancements

- [ ] SMTP verification (RCPT TO check)
- [ ] Reputation scoring (bounce history)
- [ ] Typo correction (did you mean gmail.com?)
- [ ] Real-time disposable domain updates
- [ ] Machine learning for advanced validation

---

**Status**: Production Ready
**Version**: 1.0.0
**Last Updated**: 2025-10-03
