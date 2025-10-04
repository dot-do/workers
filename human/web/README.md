# Human Functions Web Interface

A real-time web application for managing human function interactions with WebSocket support, dynamic form rendering, and comprehensive task management.

## Features

### Core Functionality
- **Real-time Updates** - WebSocket integration with Durable Objects for live task updates
- **Dynamic Forms** - Automatic form generation from JSON schemas
- **Task Management** - Inbox, detail views, and history tracking
- **Mobile Responsive** - Works seamlessly on all devices
- **Dark Mode** - Theme switching support

### Real-time Features
- Live task creation notifications
- Presence indicators (who's viewing)
- Typing indicators
- Browser push notifications
- Automatic reconnection

### UI Components
- Task cards with priority and status
- Progress bars showing time remaining
- Search and filtering
- Batch actions
- Task delegation

## Architecture

### Tech Stack
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - High-quality UI components
- **Radix UI** - Accessible primitives
- **Zod** - Schema validation
- **React Hook Form** - Form management
- **Vitest** - Unit testing
- **Playwright** - E2E testing

### Project Structure
```
web/
├── app/                          # Next.js app directory
│   ├── inbox/                    # Task inbox page
│   ├── task/[id]/               # Task detail page
│   ├── history/                  # Completed tasks
│   └── api/                      # API routes
├── components/                   # React components
│   ├── ui/                       # shadcn/ui components
│   ├── TaskCard.tsx             # Task card component
│   └── DynamicForm.tsx          # Dynamic form renderer
├── hooks/                        # Custom React hooks
│   ├── useWebSocket.ts          # WebSocket connection
│   ├── useTask.ts               # Task management
│   └── useNotifications.ts      # Browser notifications
├── lib/                          # Utility functions
│   ├── utils.ts                 # General utilities
│   └── auth.ts                  # Authentication helpers
├── types/                        # TypeScript types
│   └── task.ts                  # Task-related types
└── tests/                        # Test files
    ├── unit/                     # Unit tests
    └── e2e/                      # E2E tests
```

## Development

### Prerequisites
- Node.js 18+
- pnpm 8+

### Installation
```bash
cd workers/human/web
pnpm install
```

### Environment Variables
Create a `.env.local` file:
```env
NEXT_PUBLIC_API_URL=http://localhost:8787
NEXT_PUBLIC_WS_URL=ws://localhost:8787
WORKOS_API_KEY=your_workos_api_key
WORKOS_CLIENT_ID=your_workos_client_id
```

### Running Development Server
```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Building for Production
```bash
pnpm build
pnpm start
```

## Testing

### Unit Tests
```bash
# Run all unit tests
pnpm test

# Run with coverage
pnpm test -- --coverage

# Watch mode
pnpm test -- --watch
```

### E2E Tests
```bash
# Run all E2E tests
pnpm test:e2e

# Run in headed mode
pnpm test:e2e --headed

# Run specific browser
pnpm test:e2e --project=chromium
```

## WebSocket Integration

### Connection
The app connects to the human functions worker via WebSocket:
```typescript
const { isConnected, send } = useWebSocket({
  url: 'ws://localhost:8787/ws/tasks',
  onTaskCreated: (task) => {
    // Handle new task
  },
  onTaskUpdated: (task) => {
    // Handle task update
  },
})
```

### Message Types
- `task.created` - New task notification
- `task.updated` - Task status/data change
- `task.completed` - Task completed
- `task.timeout` - Task timed out
- `presence.joined` - User joined task view
- `presence.left` - User left task view
- `presence.typing` - User is typing

## Dynamic Form Renderer

The `DynamicForm` component automatically generates forms from JSON schemas:

```typescript
const schema = {
  type: 'object',
  properties: {
    name: { type: 'string', description: 'Your name' },
    age: { type: 'number', minimum: 0, maximum: 120 },
    role: { type: 'string', enum: ['admin', 'user', 'guest'] },
    active: { type: 'boolean' },
  },
  required: ['name', 'role'],
}

<DynamicForm
  schema={schema}
  onSubmit={handleSubmit}
  onCancel={handleCancel}
/>
```

### Supported Field Types
- **String** - Text input or textarea
- **Number** - Number input with min/max
- **Boolean** - Toggle switch
- **Enum** - Select dropdown
- **Array** - (Coming soon)
- **Object** - (Coming soon)

## Authentication

Uses WorkOS for authentication:

```typescript
import { useAuth } from '@/lib/auth'

function MyComponent() {
  const { user, isAuthenticated, login, logout } = useAuth()

  if (!isAuthenticated) {
    return <LoginForm onLogin={login} />
  }

  return <div>Welcome, {user.email}!</div>
}
```

## Notifications

Browser push notifications for new tasks:

```typescript
import { useNotifications } from '@/hooks/useNotifications'

function MyComponent() {
  const { permission, requestPermission, sendNotification } = useNotifications()

  const handleEnable = async () => {
    const granted = await requestPermission()
    if (granted) {
      sendNotification('Notifications enabled!', {
        body: 'You will receive task notifications',
      })
    }
  }

  return (
    <button onClick={handleEnable}>
      Enable Notifications
    </button>
  )
}
```

## API Routes

### GET /api/task/[id]
Fetch task details
```bash
curl http://localhost:3000/api/task/123
```

### POST /api/task/[id]
Perform action on task
```bash
# Respond to task
curl -X POST http://localhost:3000/api/task/123 \
  -H "Content-Type: application/json" \
  -d '{"action": "respond", "response": {"name": "John"}}'

# Reject task
curl -X POST http://localhost:3000/api/task/123 \
  -H "Content-Type: application/json" \
  -d '{"action": "reject", "reason": "Invalid request"}'

# Delegate task
curl -X POST http://localhost:3000/api/task/123 \
  -H "Content-Type: application/json" \
  -d '{"action": "delegate", "assignee": "jane@example.com"}'
```

## Deployment

### Cloudflare Pages
```bash
# Build
pnpm build

# Deploy
npx wrangler pages deploy out
```

### Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

## Performance

- **Initial Load** - < 1s with code splitting
- **WebSocket** - < 50ms message latency
- **Form Validation** - Real-time with Zod
- **Mobile** - Optimized for 3G networks

## Accessibility

- **WCAG 2.1 AA** compliant
- **Keyboard Navigation** - Full keyboard support
- **Screen Readers** - ARIA labels and roles
- **Focus Management** - Proper focus indicators

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile Chrome/Safari

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new features
4. Ensure all tests pass
5. Submit a pull request

## License

MIT

## Support

For issues or questions:
- GitHub Issues: [github.com/dot-do/workers/issues](https://github.com/dot-do/workers/issues)
- Documentation: [docs.do](https://docs.do)
