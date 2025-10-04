# Universal React Renderer Architecture

## Overview

The Universal React Renderer system enables rendering React components to multiple channels from a single codebase:

- **Slack BlockKit** - Interactive Slack messages
- **Web (HTML/Next.js)** - Browser-based UIs
- **Voice (VAPI)** - Voice-based interactions
- **CLI (react-ink)** - Terminal UIs

## Architecture

### Core Components

```
src/
├── renderers/           # Channel-specific renderers
│   ├── base.tsx        # Base types and interfaces
│   ├── blockkit.ts     # Slack BlockKit converter
│   ├── web.tsx         # HTML/CSS generator
│   ├── voice.ts        # VAPI voice script generator
│   └── cli.tsx         # Terminal output formatter
├── components/          # Universal UI components
│   └── index.tsx       # Prompt, Form, TextInput, Select, etc.
└── examples/
    └── expense-approval.tsx  # Complete example workflow
```

### Renderer Interface

All renderers implement the same interface:

```typescript
interface Renderer {
  channel: Channel
  renderPrompt(component: ReactElement, context: RenderContext): Promise<ChannelPayload>
  renderForm(component: ReactElement, context: RenderContext): Promise<ChannelPayload>
  renderReview(component: ReactElement, context: RenderContext): Promise<ChannelPayload>
  parseResponse(payload: any): Promise<FormData>
  supports(component: ReactElement): boolean
}
```

## Universal Components

### Prompt

Display-only text with optional type indicator:

```tsx
<Prompt type="info">
  Please review the following information.
</Prompt>
```

**Renders to:**
- **BlockKit**: Section block with mrkdwn
- **Web**: Styled div with CSS
- **Voice**: Text-to-speech prompt
- **CLI**: Colored terminal output

### Form

Container for input fields with submission:

```tsx
<Form action="/submit" method="post">
  <Prompt>Enter your details</Prompt>
  <TextInput name="name" label="Name" required />
  <Button type="submit">Submit</Button>
</Form>
```

**Renders to:**
- **BlockKit**: Multiple input blocks + actions block
- **Web**: HTML form with validation
- **Voice**: Series of prompts with response collection
- **CLI**: Interactive terminal form

### TextInput

Single-line text input with validation:

```tsx
<TextInput
  name="email"
  label="Email Address"
  type="email"
  placeholder="you@example.com"
  required
  validation={[
    validators.required(),
    validators.email()
  ]}
/>
```

### Select

Dropdown selection:

```tsx
<Select
  name="category"
  label="Category"
  options={[
    { value: 'tech', label: 'Technology' },
    { value: 'business', label: 'Business' }
  ]}
  required
/>
```

**Renders to:**
- **BlockKit**: static_select element
- **Web**: HTML select dropdown
- **Voice**: Numbered options with DTMF input
- **CLI**: Numbered list with text input

### MultiSelect

Multiple choice selection:

```tsx
<MultiSelect
  name="interests"
  label="Select interests"
  options={[
    { value: 'coding', label: 'Coding' },
    { value: 'design', label: 'Design' }
  ]}
  minSelected={1}
  maxSelected={3}
/>
```

**Graceful Degradation:**
- **BlockKit**: multi_static_select (native support)
- **Web**: Checkboxes (native support)
- **Voice**: Speech input with "done" keyword (simplified)
- **CLI**: Comma-separated input (simplified)

### Button

Action button:

```tsx
<Button type="submit" variant="primary">
  Submit
</Button>
```

### Review

Display previous input/output with formatting:

```tsx
<Review
  title="Review Your Submission"
  items={[
    { label: 'Name', value: 'John Doe' },
    { label: 'Amount', value: 1000, format: 'currency' },
    { label: 'Date', value: '2025-10-03', format: 'date' },
    { label: 'Approved', value: true, format: 'boolean' }
  ]}
/>
```

## Usage Examples

### Expense Approval Workflow

Complete multi-step workflow that works across all channels:

```tsx
import { Prompt, Form, Select, TextInput, Button, Review } from './components'
import { render } from './renderers/base'

// 1. Define the form
function ExpenseApprovalForm({ expense }) {
  return (
    <Form action="/expense/approve" method="post">
      <Prompt type="info">
        Review this expense and make your decision.
      </Prompt>

      <Review
        title="Expense Details"
        items={[
          { label: 'Amount', value: expense.amount, format: 'currency' },
          { label: 'Category', value: expense.category },
          { label: 'Merchant', value: expense.merchant }
        ]}
      />

      <Select
        name="decision"
        label="Decision"
        options={[
          { value: 'approve', label: 'Approve' },
          { value: 'reject', label: 'Reject' }
        ]}
        required
      />

      <TextInput
        name="reason"
        label="Reason"
        required
      />

      <Button type="submit" variant="primary">
        Submit Decision
      </Button>
    </Form>
  )
}

// 2. Render to any channel
const expense = { amount: 1000, category: 'Software', merchant: 'Adobe' }

// Slack
const blockkit = await render(
  <ExpenseApprovalForm expense={expense} />,
  'blockkit'
)
await slack.chat.postMessage({ blocks: blockkit.blocks })

// Web
const web = await render(
  <ExpenseApprovalForm expense={expense} />,
  'web'
)
return new Response(web.html, {
  headers: { 'Content-Type': 'text/html' }
})

// Voice
const voice = await render(
  <ExpenseApprovalForm expense={expense} />,
  'voice'
)
await vapi.call({ script: voice.script, prompts: voice.prompts })

// CLI
const cli = await render(
  <ExpenseApprovalForm expense={expense} />,
  'cli'
)
console.log(cli.output)
```

## Channel-Specific Features

### BlockKit Renderer

**Capabilities:**
- ✅ All interactive components
- ✅ Rich formatting (mrkdwn)
- ✅ Actions and submissions
- ✅ Multi-select (native support)

**Limitations:**
- Max 100 action elements per message
- Max 3000 characters per text block
- Limited styling options

**Output Format:**
```typescript
{
  blocks: BlockKitBlock[],
  attachments?: any[],
  response_type: 'in_channel' | 'ephemeral'
}
```

### Web Renderer

**Capabilities:**
- ✅ All components with full styling
- ✅ Theme support (light/dark)
- ✅ Responsive design
- ✅ Accessibility (WCAG 2.1 AA)
- ✅ Custom CSS injection

**Features:**
- Semantic HTML5
- CSS Grid/Flexbox layouts
- Form validation (client + server)
- Mobile-responsive
- Print-friendly

**Output Format:**
```typescript
{
  html: string,
  css: string,
  metadata?: {
    title: string,
    description: string
  }
}
```

### Voice Renderer

**Capabilities:**
- ✅ Text prompts (TTS)
- ✅ Simple forms (speech/DTMF)
- ✅ Single-select (DTMF)
- ⚠️ Multi-select (degrades to single)
- ⚠️ Complex layouts (simplifies)

**Graceful Degradation:**
- Multi-select → Speech input with "done" keyword
- Complex forms → Step-by-step prompts
- Rich formatting → Plain text

**Output Format:**
```typescript
{
  script: string,
  prompts: VoicePrompt[],
  responses: VoiceResponse[]
}
```

**VAPI Integration:**
```typescript
interface VoicePrompt {
  text: string
  voice?: string
  speed?: number
  pause?: number
}

interface VoiceResponse {
  type: 'dtmf' | 'speech' | 'silence'
  expected?: string[]
  timeout?: number
}
```

### CLI Renderer

**Capabilities:**
- ✅ All components with ANSI colors
- ✅ Terminal UI (react-ink compatible)
- ✅ Interactive forms
- ✅ Progress indicators
- ✅ Tables and lists

**Features:**
- ANSI color support
- Terminal width detection
- Cursor control
- Screen clearing

**Output Format:**
```typescript
{
  output: string,
  cursor?: 'show' | 'hide',
  clearScreen?: boolean
}
```

## Validation

Components support comprehensive validation:

```tsx
import { validators } from './components'

<TextInput
  name="email"
  label="Email"
  validation={[
    validators.required('Email is required'),
    validators.email('Must be valid email'),
    validators.minLength(5, 'Too short')
  ]}
/>
```

**Available Validators:**
- `required(message?)` - Field is required
- `email(message?)` - Valid email format
- `url(message?)` - Valid URL format
- `pattern(regex, message)` - Custom regex pattern
- `minLength(min, message?)` - Minimum length
- `maxLength(max, message?)` - Maximum length
- `min(value, message?)` - Minimum numeric value
- `max(value, message?)` - Maximum numeric value

## Theme Support

Web renderer supports light and dark themes:

```typescript
import { WebRenderer } from './renderers/web'

const renderer = new WebRenderer()
renderer.setTheme('dark')

// Or custom theme
renderer.setTheme({
  mode: 'dark',
  colors: {
    primary: '#0066cc',
    secondary: '#6c757d',
    success: '#28a745',
    warning: '#ffc107',
    error: '#dc3545',
    info: '#17a2b8',
    text: '#f8f9fa',
    background: '#212529',
    border: '#495057'
  },
  fonts: {
    body: 'Inter, sans-serif',
    heading: 'Inter, sans-serif',
    mono: 'Monaco, monospace'
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px'
  }
})
```

## Response Parsing

Each renderer includes a response parser:

```typescript
import { parseResponse } from './renderers/base'

// Parse user response from any channel
const formData = await parseResponse(payload, channel)

// Unified format
interface FormData {
  fields: Record<string, any>
  action?: string
  timestamp: string
  channel: Channel
}
```

**Channel-Specific Parsing:**

**BlockKit:**
```typescript
// Input: Slack interaction payload
{
  state: {
    values: {
      input_name: { name: { value: 'John' } }
    }
  },
  actions: [{ action_id: 'submit' }]
}

// Output
{
  fields: { name: 'John' },
  action: 'submit',
  timestamp: '2025-10-03T...',
  channel: 'blockkit'
}
```

**Web:**
```typescript
// Input: HTTP POST body or FormData
{ name: 'John', email: 'john@example.com' }

// Output
{
  fields: { name: 'John', email: 'john@example.com' },
  timestamp: '2025-10-03T...',
  channel: 'web'
}
```

**Voice:**
```typescript
// Input: VAPI response
{
  transcript: 'John Doe',
  messages: [
    { transcript: 'John Doe' },
    { dtmf: '1' }
  ]
}

// Output
{
  fields: {
    text: 'John Doe',
    response_0: 'John Doe',
    response_1: '1'
  },
  timestamp: '2025-10-03T...',
  channel: 'voice'
}
```

## Testing

Comprehensive test suite covers all renderers:

```bash
# Run all tests
pnpm test

# Run specific renderer tests
pnpm test -- renderers.test.ts

# Watch mode
pnpm test -- --watch

# Coverage
pnpm test -- --coverage
```

**Test Coverage:**
- ✅ Prompt rendering (all channels)
- ✅ Form rendering (all channels)
- ✅ Review rendering (all channels)
- ✅ MultiSelect rendering (all channels)
- ✅ Response parsing (all channels)
- ✅ Renderer support detection
- ✅ Accessibility features
- ✅ Theme support

## Design Principles

### 1. Stateless Rendering

Components are stateless - no client state management:

```tsx
// Good: Stateless
<TextInput name="name" label="Name" defaultValue={user.name} />

// Bad: Stateful (not supported)
const [name, setName] = useState('')
```

### 2. Graceful Degradation

Complex UI degrades to simpler forms in limited channels:

```tsx
// Web: Rich checkboxes
// Voice: Speech input with "done" keyword
// CLI: Comma-separated input
<MultiSelect options={options} />
```

### 3. Accessibility First

All renderers prioritize accessibility:

- Semantic HTML (web)
- ARIA labels and roles (web)
- Clear voice prompts (voice)
- High-contrast colors (CLI)
- Keyboard navigation (web, CLI)

### 4. Mobile Responsive

Web renderer is mobile-first:

- Flexbox/Grid layouts
- Touch-friendly targets (44px minimum)
- Responsive text sizing
- Viewport meta tags

### 5. Channel-Appropriate UX

Each renderer follows channel best practices:

- **BlockKit**: Slack's Block Kit guidelines
- **Web**: WCAG 2.1 AA compliance
- **Voice**: Natural conversation flow
- **CLI**: Terminal conventions (ANSI, readline)

## Future Enhancements

### Planned Features

1. **Additional Channels**
   - SMS (Twilio)
   - WhatsApp Business API
   - Email (HTML + plain text)
   - Mobile push notifications

2. **Component Library Expansion**
   - Date/time pickers
   - File upload
   - Rich text editor
   - Data tables
   - Charts and graphs

3. **Advanced Features**
   - Conditional rendering
   - Form wizards (multi-step)
   - Dynamic field validation
   - Real-time updates (WebSockets)
   - Offline support (web)

4. **Developer Tools**
   - Visual component builder
   - Channel preview tool
   - Automated accessibility testing
   - Performance monitoring

### Integration Roadmap

- [ ] Next.js integration package
- [ ] React Native support
- [ ] Slack Bolt app template
- [ ] VAPI starter template
- [ ] Ink CLI template

## Contributing

To add a new renderer:

1. Implement the `Renderer` interface
2. Handle all component types
3. Add graceful degradation logic
4. Implement response parsing
5. Add comprehensive tests
6. Document channel-specific features

Example:

```typescript
export class MyRenderer implements Renderer {
  channel = 'mychannel' as const

  async renderPrompt(component, context) {
    // Implementation
  }

  async renderForm(component, context) {
    // Implementation
  }

  async renderReview(component, context) {
    // Implementation
  }

  async parseResponse(payload) {
    // Implementation
  }

  supports(component) {
    // Check component support
  }
}

// Register
renderers.register('mychannel', new MyRenderer())
```

## License

MIT

---

**Status:** ✅ Complete - Production Ready
**Last Updated:** 2025-10-03
**Maintainer:** Human Service Team
