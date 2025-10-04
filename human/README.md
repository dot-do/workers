# Human Functions - Voice Channel Integration

Voice-based human function interactions using VAPI for phone calls with speech-to-text, text-to-speech, DTMF support, and full audit trails.

## Overview

The **VoiceChannel** enables phone-based interactions with human functions. It converts structured function payloads into natural voice conversations, collects input via speech or button press (DTMF), and maintains complete audit trails with call recordings stored in R2.

## Features

- ✅ **VAPI Integration** - Full client integration with authentication and webhook handling
- ✅ **Speech-to-Text** - Collect open-ended speech input with confidence scoring
- ✅ **Text-to-Speech** - Natural voice prompts with configurable voices and models
- ✅ **DTMF Support** - Button press input for menus and simple choices
- ✅ **Call Recording** - Automatic recording to R2 with structured storage
- ✅ **Audit Trail** - Full transcript storage and call metadata tracking
- ✅ **Voice Scripts** - Automatic conversion of payloads to VAPI-compatible scripts
- ✅ **VoiceUX Patterns** - Reusable patterns for menus, forms, confirmations
- ✅ **Example Implementation** - Expense approval use case

## Architecture

```
User Phone Call → VAPI API
                    ↓
            VoiceChannel.initiateCall()
                    ↓
        Generate Voice Script from Payload
                    ↓
            Store Call State in DB
                    ↓
        VAPI Delivers Voice Prompt
                    ↓
    User Responds (Speech or DTMF)
                    ↓
            VAPI Webhook Event
                    ↓
        VoiceChannel.handleWebhook()
                    ↓
        Process Response & Update DB
                    ↓
        Record Audio to R2 Storage
```

## Installation

```bash
pnpm install
```

## Usage

### Basic Example: Expense Approval

```typescript
import { VoiceChannel } from './src/channels/voice'

// Initialize channel
const voiceChannel = new VoiceChannel({
  vapiApiKey: env.VAPI_API_KEY,
  r2Bucket: env.AUDIO,
  db: env.DB,
})

// Create function payload
const payload = {
  id: 'expense-123',
  functionType: 'approval',
  prompt: 'Approve $5000 marketing expense?',
}

// Initiate call
const { callSid } = await voiceChannel.initiateCall(
  '+1234567890',
  payload,
  {
    recordingEnabled: true,
    maxDuration: 300,
  }
)

// Check status (webhook-driven in production)
const status = await voiceChannel.getCallStatus(callSid)
console.log('Approved:', status.response?.approved)
```

### Approval Pattern

```typescript
{
  id: 'func-123',
  functionType: 'approval',
  prompt: 'Approve this expense of $5000?',
}

// Generated voice script:
{
  initial: {
    say: "Approve this expense of $5000? Press 1 to approve, 2 to reject.",
    gather: { input: ['speech', 'dtmf'], numDigits: 1, timeout: 5 }
  },
  menu: [
    { digits: '1', say: 'Approved', action: 'approve' },
    { digits: '2', say: 'Rejected', action: 'reject' }
  ]
}
```

### Form Pattern

```typescript
{
  id: 'func-456',
  functionType: 'form',
  prompt: 'Please provide your information.',
  fields: [
    {
      id: 'name',
      type: 'text',
      label: 'Name',
      prompt: 'Please say your full name',
      required: true,
    },
    {
      id: 'email',
      type: 'email',
      label: 'Email',
      required: true,
    },
  ],
}

// Generated voice script collects each field sequentially
// with confirmation prompts
```

### VoiceUX Patterns

```typescript
import { VoiceUX } from './src/channels/voice'

// Create DTMF menu
const menu = VoiceUX.createMenu([
  { digits: '1', say: 'Approve', action: 'approve' },
  { digits: '2', say: 'Reject', action: 'reject' },
  { digits: '3', say: 'More info', action: 'info' },
])

// Create form field
const field = VoiceUX.createFormField('your name', 'text')

// Create confirmation
const confirmation = VoiceUX.createConfirmation('John Doe')

// Error handling
const error = VoiceUX.createErrorPrompt()
const timeout = VoiceUX.createTimeoutHandler()
```

## Voice Script Structure

### VoiceScript Interface

```typescript
interface VoiceScript {
  initial: VoicePrompt
  menu?: MenuOption[]
  prompts?: Record<string, VoicePrompt>
  confirmations?: Record<string, string>
}

interface VoicePrompt {
  say: string
  gather?: {
    input: Array<'speech' | 'dtmf'>
    numDigits?: number
    timeout?: number
    speechTimeout?: number
    finishOnKey?: string
    action?: string
  }
}
```

## Webhook Events

Handle VAPI webhook events:

```typescript
// In your worker:
app.post('/vapi/webhook', async (c) => {
  const event = await c.req.json()
  const result = await voiceChannel.handleWebhook(event)
  return c.json(result)
})
```

**Supported Events:**
- `call-started` - Call initiated
- `call-ended` - Call completed, process recording
- `transcript` - Store conversation segment
- `function-call` - Execute approve/reject/submit
- `dtmf` - Handle button press

## Database Schema

```sql
CREATE TABLE human_function_calls (
  id TEXT PRIMARY KEY,
  function_id TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  call_sid TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL,
  script TEXT NOT NULL,
  response TEXT,
  recording_url TEXT,
  recording_r2_key TEXT,
  duration INTEGER,
  created_at TEXT NOT NULL,
  ended_at TEXT
);

CREATE TABLE call_transcripts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  call_sid TEXT NOT NULL,
  speaker TEXT NOT NULL,
  text TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  FOREIGN KEY (call_sid) REFERENCES human_function_calls(call_sid)
);
```

## Configuration

### Environment Variables

```bash
VAPI_API_KEY=<your_vapi_api_key>
VAPI_WEBHOOK_SECRET=<webhook_secret>
```

### R2 Bucket

Bind R2 bucket in `wrangler.jsonc`:

```jsonc
{
  "r2_buckets": [
    {
      "binding": "AUDIO",
      "bucket_name": "human-functions-audio"
    }
  ]
}
```

### Database Binding

```jsonc
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "human-functions",
      "database_id": "..."
    }
  ]
}
```

## Testing

```bash
# Run tests
pnpm test

# Watch mode
pnpm test -- --watch

# Coverage
pnpm test -- --coverage
```

**Test Coverage:**
- 24 tests covering all core functionality
- Mocked VAPI API responses
- Mocked R2 storage
- Mocked database queries

## Voice UX Best Practices

### Natural Language
- Use conversational phrasing
- Avoid technical jargon
- Speak numbers clearly

### Timeouts
- 5 seconds for DTMF
- 3 seconds for speech
- Repeat prompt once
- Escalate after 2-3 timeouts

### Confirmation
- Always confirm critical actions
- Read back amounts, names, dates
- Allow cancellation

### Error Recovery
- Friendly error messages
- Offer to repeat
- Provide help option

## API Methods

### VoiceChannel

- `initiateCall(phoneNumber, payload, config?)` - Start outbound call
- `handleInbound(callSid)` - Handle inbound call
- `collectInput(callSid, prompt, inputType)` - Get voice/DTMF input
- `confirm(callSid, input)` - Confirm user input
- `recordResponse(callSid, audioUrl)` - Save recording to R2
- `handleWebhook(event)` - Process VAPI webhook event
- `getCallStatus(callSid)` - Get call details
- `listCalls(functionId, status?)` - List calls for function

### VoiceUX

- `VoiceUX.createMenu(options)` - Create DTMF menu
- `VoiceUX.createFormField(label, type)` - Create form field
- `VoiceUX.createConfirmation(value)` - Create confirmation
- `VoiceUX.createErrorPrompt(maxRetries?)` - Error handling
- `VoiceUX.createTimeoutHandler()` - Timeout escalation

## Examples

See `src/examples/expense-approval.ts` for a complete implementation.

## Documentation

- **Implementation Report:** `/notes/2025-10-03-vapi-voice-channel-integration.md`
- **VAPI Integration Planning:** `/notes/2025-10-01-vapi-integration.md`
- **Workers Architecture:** `../CLAUDE.md`

## Related Projects

- **Voice Worker** - TTS generation (`workers/voice`)
- **VAPI Integration** - Existing VAPI routes (`api.services/api/routes/vapi.ts`)
- **Workers MCP** - MCP tools for AI agents (`workers/mcp`)

## License

MIT

---

**Status:** ✅ Production Ready
**Last Updated:** 2025-10-03
**Implementation:** ~800 LOC + 400 LOC tests
**Test Coverage:** 24 tests, all passing
