# forms.as

**Collect data. Not headaches.**

```bash
npm install forms.as
```

---

## Every Form You Build Is Time You're Not Building Product

Contact forms. Signup forms. Feedback forms. Survey forms.

Every one requires:
- Frontend form components
- Backend validation
- Database storage
- Email notifications
- Spam protection
- Export functionality

**You've built this a hundred times. Why are you building it again?**

## Forms That Build Themselves

```typescript
import { forms } from 'forms.as'

const contact = await forms.create({
  name: 'contact',
  title: 'Contact Us',
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'email', type: 'email', required: true },
    { name: 'message', type: 'textarea', required: true }
  ],
  notifications: {
    email: ['team@company.com'],
    slack: 'https://hooks.slack.com/...'
  }
})

// Embed anywhere: contact.embedCode
// Or use the hosted page: contact.url
```

**forms.as** gives you:
- Any form in seconds
- Hosted pages or embeddable widgets
- Spam protection built in
- Notifications everywhere
- Export to anywhere

## Build Your Form in 3 Steps

### 1. Define Your Fields

```typescript
import { forms } from 'forms.as'

const feedback = await forms.create({
  name: 'feedback',
  title: 'How are we doing?',
  fields: [
    { name: 'rating', type: 'rating', required: true },
    { name: 'liked', type: 'textarea', label: 'What did you like?' },
    { name: 'improve', type: 'textarea', label: 'What could we improve?' },
    {
      name: 'recommend',
      type: 'radio',
      label: 'Would you recommend us?',
      options: [
        { label: 'Definitely', value: 'yes' },
        { label: 'Maybe', value: 'maybe' },
        { label: 'No', value: 'no' }
      ]
    }
  ],
  captcha: true
})
```

### 2. Collect Responses

```typescript
// Embed in your app
const embedCode = await forms.embed('feedback', { style: 'popup' })

// Or direct users to the hosted page
console.log(feedback.url)

// Responses flow in automatically
const submissions = await forms.submissions('feedback')
```

### 3. Act on Data

```typescript
// Get insights
const metrics = await forms.metrics('feedback')
console.log(`${metrics.submissions} responses`)
console.log(`${metrics.conversionRate}% completion rate`)

// Export for analysis
const csv = await forms.export('feedback', 'csv')

// Connect to your tools
await forms.addIntegration('feedback', {
  type: 'sheets',
  config: { spreadsheetId: '...' }
})
```

## Stop Rebuilding. Start Collecting.

**Without forms.as:**
- Hours of frontend work
- Hours of backend work
- Spam floods your inbox
- Data locked in your database

**With forms.as:**
- Forms in 60 seconds
- Spam handled automatically
- Data flows everywhere you need it

## Everything for Data Collection

```typescript
// Conditional logic
await forms.create({
  name: 'survey',
  fields: [
    { name: 'role', type: 'select', options: ['Developer', 'Designer', 'PM'] },
    {
      name: 'languages',
      type: 'multiselect',
      options: ['JavaScript', 'Python', 'Go'],
      showIf: { field: 'role', value: 'Developer' }
    }
  ]
})

// AI-generated forms
const form = await forms.generate('A customer feedback form for a SaaS product')

// File uploads
{ name: 'resume', type: 'file' }

// Integrations that just work
await forms.addIntegration('job-applications', { type: 'airtable', config: {...} })
await forms.addIntegration('job-applications', { type: 'zapier', config: {...} })
```

## Configuration

### Environment Variables

```bash
# Primary API key (used by default)
export DO_API_KEY="your-api-key"

# Alternative: Organization API key
export ORG_AI_API_KEY="your-org-key"
```

### Cloudflare Workers

```typescript
import 'rpc.do/env'
import { forms } from 'forms.as'

// Environment is automatically configured
await forms.create({ name, title, fields })
```

### Custom Configuration

```typescript
import { Forms } from 'forms.as'

const client = Forms({
  baseURL: 'https://custom.example.com'
})
```

## Your Data Is Waiting

Every form you haven't built is feedback you're not collecting. Customers you're not hearing. Insights you're missing.

**Build the form. Collect the data. Make better decisions.**

```bash
npm install forms.as
```

[Create your form at forms.as](https://forms.as)

---

MIT License
