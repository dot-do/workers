# Human Functions Web Interface - Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser (Client)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │    Inbox     │  │ Task Detail  │  │   History    │         │
│  │     Page     │  │     Page     │  │     Page     │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         │                  │                  │                  │
│         └──────────────────┼──────────────────┘                  │
│                            │                                     │
│         ┌──────────────────┴──────────────────┐                 │
│         │         React Components             │                 │
│         ├──────────────────────────────────────┤                 │
│         │  TaskCard │ DynamicForm │ UI Comps  │                 │
│         └──────────────────┬──────────────────┘                 │
│                            │                                     │
│         ┌──────────────────┴──────────────────┐                 │
│         │           Custom Hooks               │                 │
│         ├──────────────────────────────────────┤                 │
│         │ useWebSocket │ useTask │ useNotify  │                 │
│         └──────────────────┬──────────────────┘                 │
│                            │                                     │
└────────────────────────────┼─────────────────────────────────────┘
                             │
                  ┌──────────┴──────────┐
                  │   HTTP + WebSocket  │
                  └──────────┬──────────┘
                             │
┌────────────────────────────┼─────────────────────────────────────┐
│                   Next.js App Router                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌───────────────────┐         ┌────────────────────┐          │
│  │   API Routes      │         │  WebSocket Proxy   │          │
│  │  /api/task/[id]   │         │  (if needed)       │          │
│  └────────┬──────────┘         └─────────┬──────────┘          │
│           │                               │                      │
│           └───────────────┬───────────────┘                      │
│                           │                                      │
└───────────────────────────┼──────────────────────────────────────┘
                            │
                            │ HTTP + WS
                            │
┌───────────────────────────┼──────────────────────────────────────┐
│              Cloudflare Workers (Backend)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Gateway Worker                         │  │
│  │  - Routes requests                                        │  │
│  │  - Authentication                                         │  │
│  │  - Rate limiting                                          │  │
│  └───────────────────────┬──────────────────────────────────┘  │
│                          │                                      │
│         ┌────────────────┼────────────────┐                    │
│         │                │                │                    │
│  ┌──────▼──────┐  ┌─────▼─────┐  ┌──────▼──────┐            │
│  │   Human     │  │    Auth   │  │     DB      │            │
│  │   Worker    │  │   Worker  │  │   Worker    │            │
│  └──────┬──────┘  └───────────┘  └─────────────┘            │
│         │                                                      │
│         │ Manages                                             │
│         │                                                      │
│  ┌──────▼──────────────────────────────────────────────────┐  │
│  │         Human Function Durable Objects                   │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐             │  │
│  │  │ Task-123 │  │ Task-456 │  │ Task-789 │    ...      │  │
│  │  │          │  │          │  │          │             │  │
│  │  │ State:   │  │ State:   │  │ State:   │             │  │
│  │  │ - Task   │  │ - Task   │  │ - Task   │             │  │
│  │  │ - WebSoc │  │ - WebSoc │  │ - WebSoc │             │  │
│  │  │ - Timers │  │ - Timers │  │ - Timers │             │  │
│  │  └──────────┘  └──────────┘  └──────────┘             │  │
│  └──────────────────────────────────────────────────────────┘  │
│                          │                                      │
└──────────────────────────┼──────────────────────────────────────┘
                           │
                           │ Persist
                           │
┌──────────────────────────┼──────────────────────────────────────┐
│                    PostgreSQL (Neon)                             │
├─────────────────────────────────────────────────────────────────┤
│  Tasks │ Responses │ Users │ Metrics                            │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Task Creation Flow
```
AI Agent              Human Worker           Durable Object        Database
   │                       │                       │                   │
   │ createHumanFunction() │                       │                   │
   ├──────────────────────>│                       │                   │
   │                       │ new task              │                   │
   │                       ├──────────────────────>│                   │
   │                       │                       │ save task         │
   │                       │                       ├──────────────────>│
   │                       │                       │                   │
   │                       │                  [WebSocket Broadcast]    │
   │                       │                       │                   │
   │                       │                       ▼                   │
   │                       │          All connected clients            │
   │                       │        receive "task.created" event       │
   │                       │                                           │
   │ awaiting...           │                                           │
```

### 2. User Response Flow
```
Web UI                Task Page             Durable Object        Database
   │                       │                       │                   │
   │ [User fills form]     │                       │                   │
   │ Submit                │                       │                   │
   ├──────────────────────>│                       │                   │
   │                       │ respond(data)         │                   │
   │                       ├──────────────────────>│                   │
   │                       │                       │ update task       │
   │                       │                       ├──────────────────>│
   │                       │                       │                   │
   │                       │                  [Resolve Promise]        │
   │                       │                       │                   │
   │                       │                       ▼                   │
   │                       │          AI Agent receives response       │
   │                       │                                           │
   │ task.completed        │                                           │
   │<──────────────────────┤                                           │
   │ [Update UI]           │                                           │
```

### 3. Real-time Updates Flow
```
Durable Object        WebSocket             Web UI
      │                    │                    │
      │ state change       │                    │
      │ (task update)      │                    │
      ├───────────────────>│                    │
      │                    │ broadcast          │
      │                    ├───────────────────>│
      │                    │                    │ [Update React state]
      │                    │                    │ [Re-render UI]
```

## Component Architecture

### Page Components
```
app/
├── layout.tsx                    # Root layout with nav, theme
├── page.tsx                      # Redirect to /inbox
├── inbox/page.tsx                # Task list view
│   ├── Search/filter controls
│   ├── Task grid
│   └── Real-time updates (WebSocket)
├── task/[id]/page.tsx            # Task detail view
│   ├── Task metadata
│   ├── Progress bar
│   ├── Presence indicators
│   ├── Dynamic form
│   └── Action buttons
└── history/page.tsx              # Completed tasks
    ├── Metrics dashboard
    ├── Date filtering
    └── Task timeline
```

### Reusable Components
```
components/
├── ui/                           # shadcn/ui primitives
│   ├── button.tsx               # Button variants
│   ├── card.tsx                 # Card container
│   ├── form.tsx                 # Form components
│   ├── input.tsx                # Text input
│   ├── textarea.tsx             # Multi-line input
│   ├── select.tsx               # Dropdown
│   ├── switch.tsx               # Toggle
│   └── label.tsx                # Form label
├── TaskCard.tsx                 # Task preview card
│   ├── Priority indicator
│   ├── Status badge
│   ├── Progress bar
│   └── Metadata
└── DynamicForm.tsx              # Schema-based form
    ├── JSON Schema parser
    ├── Field type mapper
    ├── Zod validator
    └── Form renderer
```

### Custom Hooks
```
hooks/
├── useWebSocket.ts              # WebSocket management
│   ├── Connection
│   ├── Reconnection
│   ├── Message routing
│   └── Error handling
├── useTask.ts                   # Task operations
│   ├── Fetch task
│   ├── Real-time updates
│   ├── Respond/reject
│   └── Delegate
└── useNotifications.ts          # Browser notifications
    ├── Permission request
    ├── Send notification
    └── Click handler
```

## State Management

### Local State (React)
- Component-level state with `useState`
- Form state with React Hook Form
- No global state library needed

### Server State (React Query)
- Optional for caching
- Currently using direct fetch
- Can add for offline support

### Real-time State (WebSocket)
- Task updates via WebSocket
- Optimistic UI updates
- Automatic reconciliation

## Authentication Flow

```
User                  Web UI               WorkOS              Worker
 │                      │                     │                   │
 │ Enter email          │                     │                   │
 ├─────────────────────>│                     │                   │
 │                      │ initiate SSO        │                   │
 │                      ├────────────────────>│                   │
 │                      │                     │                   │
 │                      │<────────────────────┤                   │
 │                      │ redirect to IdP     │                   │
 │                      │                     │                   │
 │<─────────────────────┤                     │                   │
 │ [Login at IdP]       │                     │                   │
 │                      │                     │                   │
 │ callback             │                     │                   │
 ├─────────────────────>│                     │                   │
 │                      │ exchange code       │                   │
 │                      ├────────────────────>│                   │
 │                      │                     │                   │
 │                      │<────────────────────┤                   │
 │                      │ user + token        │                   │
 │                      │                     │                   │
 │                      │ validate token      │                   │
 │                      ├────────────────────────────────────────>│
 │                      │                     │                   │
 │                      │<────────────────────────────────────────┤
 │                      │ user profile        │                   │
 │<─────────────────────┤                     │                   │
 │ [Show dashboard]     │                     │                   │
```

## WebSocket Protocol

### Connection
```typescript
// Client initiates
ws = new WebSocket('ws://api.do/ws/tasks')

// Server accepts
// Durable Object handles connection
// Adds to broadcast list
```

### Message Types

**Client → Server:**
```typescript
{
  type: 'presence.typing',
  taskId: string,
  isTyping: boolean
}

{
  type: 'subscribe',
  taskId: string
}

{
  type: 'unsubscribe',
  taskId: string
}
```

**Server → Client:**
```typescript
{
  type: 'task.created',
  task: Task
}

{
  type: 'task.updated',
  task: Task
}

{
  type: 'task.completed',
  taskId: string,
  response: any
}

{
  type: 'task.timeout',
  taskId: string
}

{
  type: 'presence.joined',
  presence: Presence
}

{
  type: 'presence.left',
  userId: string,
  taskId: string
}

{
  type: 'presence.typing',
  userId: string,
  taskId: string,
  isTyping: boolean
}
```

## Dynamic Form Architecture

### JSON Schema → Zod → Form

```typescript
// 1. Input: JSON Schema
const schema = {
  type: 'object',
  properties: {
    name: { type: 'string', description: 'Your name' },
    age: { type: 'number', minimum: 0, maximum: 120 },
    active: { type: 'boolean' }
  },
  required: ['name']
}

// 2. Transform: JSON Schema → Zod Schema
const zodSchema = z.object({
  name: z.string(),
  age: z.number().min(0).max(120).optional(),
  active: z.boolean().optional()
})

// 3. Integrate: Zod → React Hook Form
const form = useForm({
  resolver: zodResolver(zodSchema)
})

// 4. Render: Field Type → Component
name → <Input type="text" />
age → <Input type="number" min={0} max={120} />
active → <Switch />
```

### Field Type Mapping

| JSON Schema Type | UI Component | Props |
|-----------------|-------------|-------|
| string | Input | type="text" |
| string (long) | Textarea | rows=4 |
| string (enum) | Select | options=enum |
| number | Input | type="number", min, max |
| boolean | Switch | - |
| array | (Coming) | - |
| object | (Coming) | - |

## Performance Optimizations

### Code Splitting
```typescript
// Automatic by Next.js App Router
app/inbox/page.tsx → inbox.js
app/task/[id]/page.tsx → task-[id].js
```

### React Optimizations
- `React.memo()` for expensive components
- `useMemo()` for computed values
- `useCallback()` for event handlers
- Virtualization for long lists (future)

### Network Optimizations
- WebSocket for real-time (vs polling)
- Debounced search input (300ms)
- Optimistic UI updates
- Request deduplication

### Bundle Size
- Tree shaking (automatic)
- Dynamic imports for large deps
- Minimal dependencies
- Current bundle: ~200KB gzipped

## Security Considerations

### Authentication
- WorkOS SSO integration
- JWT token validation
- Secure token storage (httpOnly cookies)
- Session management

### Authorization
- Role-based access control
- Task assignment validation
- Rate limiting via gateway
- API key validation

### Input Validation
- Zod schema validation
- XSS prevention (React escaping)
- CSRF protection (tokens)
- SQL injection prevention (ORM)

### WebSocket Security
- Token-based auth
- Origin validation
- Message validation
- Rate limiting

## Monitoring & Observability

### Metrics to Track
- Task completion rate
- Average response time
- Timeout rate
- WebSocket connection stability
- Form submission errors
- Page load times
- Error rates
- User engagement

### Logging
- Client-side errors → Sentry
- Server-side logs → Cloudflare logs
- WebSocket events
- Performance metrics

### Alerts
- High timeout rate (> 20%)
- WebSocket disconnections
- API errors (> 5%)
- Slow response times (> 2s)

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Cloudflare Edge Network                │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────────┐         ┌──────────────────┐     │
│  │ Cloudflare Pages │         │ Cloudflare Workers│     │
│  │  (Static Assets) │         │  (API + WebSocket)│     │
│  └────────┬─────────┘         └────────┬─────────┘     │
│           │                             │                │
│           └─────────────┬───────────────┘                │
│                         │                                │
└─────────────────────────┼────────────────────────────────┘
                          │
                          │ Durable Objects
                          │
┌─────────────────────────┼────────────────────────────────┐
│                  Cloudflare Durable Objects              │
│                    (Human Function State)                │
└─────────────────────────┼────────────────────────────────┘
                          │
                          │ Persist
                          │
┌─────────────────────────┼────────────────────────────────┐
│                    PostgreSQL (Neon)                     │
│                   (Long-term Storage)                    │
└──────────────────────────────────────────────────────────┘
```

## Testing Strategy

### Unit Tests (Vitest)
- Component rendering
- Hook behavior
- Utility functions
- Form validation
- Coverage: 80%+

### Integration Tests
- API route handlers
- WebSocket connections
- Authentication flow
- Form submission

### E2E Tests (Playwright)
- User workflows
- Multi-browser support
- Mobile responsiveness
- Real user scenarios

### Manual Testing
- Accessibility (screen readers)
- Performance (Lighthouse)
- Cross-browser compatibility
- Mobile devices

## Future Enhancements

### Phase 1 (Next 2 weeks)
- [ ] Complete WorkOS integration
- [ ] Deploy to Cloudflare Pages
- [ ] Connect to human worker
- [ ] Production testing

### Phase 2 (Month 2)
- [ ] Batch operations
- [ ] Advanced filtering
- [ ] Task templates
- [ ] Analytics dashboard

### Phase 3 (Month 3+)
- [ ] Collaborative editing
- [ ] Comments/discussion
- [ ] SLA monitoring
- [ ] Mobile apps
- [ ] Offline support
- [ ] Multi-language

## Troubleshooting

### WebSocket Issues
- Check connection URL
- Verify CORS headers
- Check firewall/proxy
- Enable reconnection logic

### Form Validation Errors
- Check JSON schema validity
- Verify Zod transformation
- Check required fields
- Review validation rules

### Authentication Problems
- Verify WorkOS credentials
- Check token expiration
- Review CORS settings
- Check API key format

### Performance Issues
- Enable React DevTools profiler
- Check bundle size
- Review network waterfall
- Optimize images/assets
