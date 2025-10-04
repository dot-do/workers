# Amazon SES Provider Setup

The email service now supports **Amazon SES** for cost-effective bulk email sending at **$0.10 per 1,000 emails** (vs Resend's $0.40/1K).

## Prerequisites

1. **AWS Account** with SES access
2. **Verified Domain** in SES (required to send from custom domains)
3. **Production Access** (optional - sandbox allows 200 emails/day to verified addresses)

## Step 1: Verify Your Domain in SES

### Via AWS Console:

1. Go to [SES Console](https://console.aws.amazon.com/ses/)
2. Navigate to **Configuration → Verified identities**
3. Click **Create identity**
4. Select **Domain** and enter your domain (e.g., `services.do`)
5. Choose **Easy DKIM** for email authentication
6. Add the provided DNS records to your domain:
   - 3 CNAME records for DKIM
   - 1 TXT record for SPF (optional but recommended)
   - 1 TXT record for DMARC (optional but recommended)

### Via AWS CLI:

```bash
# Verify domain
aws ses verify-domain-identity --domain services.do

# Get DKIM tokens
aws ses verify-domain-dkim --domain services.do
```

## Step 2: Request Production Access (Optional)

By default, SES accounts start in **Sandbox Mode** with these limits:
- 200 emails per day
- Can only send to verified email addresses
- Rate limit: 1 email per second

To remove these limits:

1. Go to [SES Console](https://console.aws.amazon.com/ses/)
2. Navigate to **Account dashboard**
3. Click **Request production access**
4. Fill out the form:
   - **Mail Type**: Transactional
   - **Website URL**: https://services.do
   - **Use Case Description**: "Transactional emails for SaaS platform (account notifications, password resets, invoices)"
   - **Bounce/Complaint Handling**: "We have automated bounce and complaint handling"
   - **Process to Remove Recipients**: "Automated unsubscribe links, CAN-SPAM compliant"

AWS typically approves within 24 hours.

## Step 3: Create IAM User for API Access

### Via AWS Console:

1. Go to [IAM Console](https://console.aws.amazon.com/iam/)
2. Navigate to **Users → Create user**
3. User name: `ses-email-service`
4. Select **Attach policies directly**
5. Add policy: `AmazonSESFullAccess` (or create custom policy below)
6. Click **Create user**
7. Go to **Security credentials → Create access key**
8. Select **Application running outside AWS**
9. **Save the Access Key ID and Secret Access Key** (shown only once!)

### Custom IAM Policy (Least Privilege):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail",
        "ses:SendTemplatedEmail"
      ],
      "Resource": "*"
    }
  ]
}
```

### Via AWS CLI:

```bash
# Create IAM user
aws iam create-user --user-name ses-email-service

# Attach SES policy
aws iam attach-user-policy \
  --user-name ses-email-service \
  --policy-arn arn:aws:iam::aws:policy/AmazonSESFullAccess

# Create access key
aws iam create-access-key --user-name ses-email-service
```

## Step 4: Configure Cloudflare Workers

Add secrets to your email service:

```bash
cd workers/email

# Add AWS credentials
wrangler secret put AWS_ACCESS_KEY_ID
# Paste your Access Key ID when prompted

wrangler secret put AWS_SECRET_ACCESS_KEY
# Paste your Secret Access Key when prompted

# Optional: Set AWS region (defaults to us-east-1)
wrangler secret put AWS_REGION
# Enter: us-east-1 (or your preferred region)
```

## Step 5: Test SES Integration

### Via HTTP API:

```bash
# Send test email using SES
curl -X POST https://email.services.do/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "from": "noreply@services.do",
    "subject": "Test Email via SES",
    "text": "This email was sent via Amazon SES!",
    "provider": "ses"
  }'
```

### Via RPC (from another service):

```typescript
// In another worker
const result = await env.EMAIL.send({
  to: 'test@example.com',
  from: 'noreply@services.do',
  subject: 'Test Email via SES',
  text: 'This email was sent via Amazon SES!',
}, { provider: 'ses' })

console.log('Email sent:', result.id)
```

## Usage Examples

### Basic Email:

```typescript
await env.EMAIL.send({
  to: 'user@example.com',
  from: 'noreply@services.do',
  subject: 'Welcome!',
  html: '<h1>Welcome to our service!</h1>',
  text: 'Welcome to our service!',
}, { provider: 'ses' })
```

### With CC/BCC:

```typescript
await env.EMAIL.send({
  to: 'user@example.com',
  cc: ['manager@example.com'],
  bcc: ['archive@services.do'],
  from: 'notifications@services.do',
  subject: 'Invoice #12345',
  html: '<p>Your invoice is ready</p>',
}, { provider: 'ses' })
```

### Bulk Sending:

```typescript
// Send to 10,000 recipients
const recipients = await getEmailList()

for (const recipient of recipients) {
  await env.EMAIL.send({
    to: recipient.email,
    from: 'newsletter@services.do',
    subject: 'Monthly Newsletter',
    html: renderTemplate('newsletter', recipient),
  }, { provider: 'ses' })

  // SES rate limit: 14 emails/sec (production)
  // Add delay if needed for higher volumes
}
```

## Cost Comparison

| Provider | Cost per 1K emails | Break-even point |
|----------|-------------------|------------------|
| **Resend** | $0.40 | 0 - 50K emails/mo |
| **Amazon SES** | $0.10 | 50K+ emails/mo |

**Recommendation:** Use Resend for transactional emails (<50K/mo), SES for bulk/marketing emails (>50K/mo).

## SES Limits & Quotas

### Sandbox Mode:
- 200 emails/day
- 1 email/second
- Verified recipients only

### Production Mode:
- 50,000 emails/day (starting quota, can increase)
- 14 emails/second (starting rate, can increase)
- No recipient restrictions
- Request quota increases via AWS Support

### Increasing Quotas:

1. Go to [SES Console → Account Dashboard](https://console.aws.amazon.com/ses/)
2. Click **Request an increase** under sending quota
3. Provide justification (e.g., "Need to send 500K emails/mo for growing SaaS platform")
4. AWS typically approves within 24-48 hours

## Monitoring & Metrics

### CloudWatch Metrics (Free):

- **Sends**: Total emails sent
- **Bounces**: Hard/soft bounces
- **Complaints**: Spam complaints
- **Rejects**: Rejected by SES

### Reputation Management:

SES tracks your **Bounce Rate** and **Complaint Rate**:
- Keep bounce rate < 5%
- Keep complaint rate < 0.1%
- Exceeding these triggers automatic sending pause

**Best Practices:**
- Remove bounced emails from your list
- Honor unsubscribe requests immediately
- Use double opt-in for mailing lists
- Maintain good email hygiene

## Troubleshooting

### Error: "Email address is not verified"

**Solution:** In sandbox mode, verify recipient email:

```bash
aws ses verify-email-identity --email-address test@example.com
```

Or request production access.

### Error: "Daily sending quota exceeded"

**Solution:** Request higher quota or wait 24 hours.

### Error: "Maximum sending rate exceeded"

**Solution:** Add delay between sends:

```typescript
for (const email of emails) {
  await sendEmail(email)
  await new Promise(resolve => setTimeout(resolve, 100)) // 10 emails/sec
}
```

### Error: "AWS signature does not match"

**Solution:** Check that AWS credentials are correct:

```bash
wrangler secret list
# Should show: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
```

## Security Best Practices

1. **Rotate Credentials** every 90 days
2. **Use IAM Roles** in production (if possible)
3. **Enable MFA** on AWS account
4. **Monitor CloudWatch Logs** for unusual activity
5. **Set up SNS notifications** for bounces/complaints

## Resources

- [SES Documentation](https://docs.aws.amazon.com/ses/)
- [SES API Reference](https://docs.aws.amazon.com/ses/latest/APIReference/)
- [SES Pricing](https://aws.amazon.com/ses/pricing/)
- [Best Practices](https://docs.aws.amazon.com/ses/latest/dg/best-practices.html)

---

**Last Updated**: 2025-10-03
**Priority**: P1.3 (High-value, this month)
**Effort**: 2-4 hours setup + domain verification
**Savings**: $15-30/month at scale (50K+ emails)
