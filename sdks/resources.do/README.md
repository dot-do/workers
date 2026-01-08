# resources.do

**Resources that allocate themselves.**

```bash
npm install resources.do
```

## Quick Start

```typescript
// Workers - import env adapter first
import 'rpc.do/env'
import { resources } from 'resources.do'

// Or use the factory for custom config
import { Resources } from 'resources.do'
const resources = Resources({ baseURL: 'https://custom.example.com' })
```

---

## Resource Management Is Eating Your Time

You have resources to manage. Meeting rooms. Server capacity. Equipment. Team schedules. Vehicle fleets.

But coordinating allocation means:
- Double bookings that derail entire days
- Overallocation that burns out teams and infrastructure
- Manual scheduling that takes hours every week
- No visibility into actual capacity until it's too late
- Conflicts discovered when it's already a crisis

**Your resources should work for you, not against you.**

## What If Resources Managed Themselves?

```typescript
import { resources } from 'resources.do'

// Describe what you need in plain English
const pool = await resources.do`
  Meeting rooms with video conferencing,
  max 10 people, available 9am-6pm weekdays
`

// Or create with full control
const room = await resources.create({
  name: 'Conference Room A',
  type: 'meeting-room',
  capacity: { seats: 10, displays: 2 },
  availability: {
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    hours: '09:00-18:00',
    timezone: 'America/New_York'
  }
})

// Allocate intelligently
const booking = await resources.allocate({
  resourceId: room.id,
  start: new Date('2024-03-15T10:00:00'),
  end: new Date('2024-03-15T11:00:00'),
  requestedBy: 'alice@company.com',
  purpose: 'Quarterly planning'
})

// Let AI optimize everything
await resources.optimize({
  resourceType: 'meeting-room',
  goals: ['maximize_utilization', 'minimize_conflicts']
})
```

**resources.do** gives you:
- Intelligent allocation that prevents conflicts automatically
- Real-time capacity visibility across all resources
- AI-powered optimization that maximizes utilization
- Constraint-based scheduling that respects your rules
- Conflict detection before they become problems

## Manage Resources in 3 Steps

### 1. Define Your Resources

```typescript
import { resources } from 'resources.do'

// Natural language for quick setup
const servers = await resources.do`
  GPU cluster, 8 NVIDIA A100s,
  available 24/7, preemptible for batch jobs
`

// Full control for complex resources
const fleet = await resources.create({
  name: 'Delivery Van #1',
  type: 'vehicle',
  capacity: { weight_kg: 1000, volume_m3: 8 },
  location: 'warehouse-east',
  attributes: {
    refrigerated: true,
    maxRange: 300
  },
  cost: { amount: 50, currency: 'USD', per: 'hour' }
})
```

### 2. Set Your Constraints

```typescript
// Find what's available
const slots = await resources.availability('meeting-room', {
  date: '2024-03-15',
  duration: '1h',
  capacity: { seats: 6 }
})

// Allocate with constraints
const allocation = await resources.allocate({
  resourceId: 'room_123',
  start: new Date('2024-03-15T14:00:00'),
  end: new Date('2024-03-15T15:00:00'),
  requestedBy: 'bob@company.com',
  priority: 1, // High priority
  preemptible: false // Cannot be bumped
})

// Check capacity
const capacity = await resources.capacity('room_123')
console.log(`${capacity.utilization}% utilized`)
```

### 3. Let AI Optimize

```typescript
// Detect conflicts before they happen
const conflicts = await resources.conflicts({
  start: new Date('2024-03-15'),
  end: new Date('2024-03-22')
})

for (const conflict of conflicts) {
  console.log(`${conflict.type}: ${conflict.resolutions?.[0]?.description}`)
}

// Auto-optimize allocations
const result = await resources.optimize({
  resourceType: 'meeting-room',
  goals: ['maximize_utilization', 'minimize_conflicts'],
  constraints: {
    preservePriority: true,
    preserveConfirmed: true
  }
})

console.log(`Utilization: ${result.metrics.utilizationBefore}% -> ${result.metrics.utilizationAfter}%`)
console.log(`Conflicts resolved: ${result.metrics.conflictsResolved}`)
```

## The Difference

**Without resources.do:**
- Spreadsheets and calendars that nobody updates
- Double bookings discovered in the moment
- Hours spent manually juggling schedules
- Underutilized resources sitting idle
- No idea what capacity is actually available
- Conflicts escalate into emergencies

**With resources.do:**
- Single source of truth for all resources
- Conflicts prevented automatically
- AI handles scheduling optimization
- Utilization maximized across the board
- Real-time visibility into capacity
- Problems solved before they start

## Everything You Need

```typescript
// Create resources
const resource = await resources.create({
  name: 'Server Rack A',
  type: 'compute',
  capacity: { cores: 128, ram_gb: 512, storage_tb: 10 }
})

// List and filter
const rooms = await resources.list({
  type: 'meeting-room',
  status: 'available',
  location: 'hq-floor-3'
})

// Manage allocations
const allocations = await resources.allocations({
  resourceId: 'room_123',
  status: 'confirmed',
  start: new Date('2024-03-15'),
  end: new Date('2024-03-22')
})

// Recurring allocations
await resources.allocate({
  resourceId: 'room_123',
  start: new Date('2024-03-15T09:00:00'),
  end: new Date('2024-03-15T10:00:00'),
  requestedBy: 'team-standup',
  recurrence: {
    frequency: 'weekly',
    byDay: ['Mon', 'Wed', 'Fri'],
    until: new Date('2024-12-31')
  }
})

// Release when done
await resources.release(allocation.id)

// Update resources
await resources.update('room_123', {
  status: 'maintenance',
  availability: {
    blackouts: [{
      start: new Date('2024-03-20'),
      end: new Date('2024-03-21'),
      reason: 'AV equipment upgrade'
    }]
  }
})
```

## Resource Statuses

| Status | Description |
|--------|-------------|
| `available` | Resource is ready for allocation |
| `partially_available` | Some capacity available |
| `unavailable` | Fully allocated or offline |
| `maintenance` | Under maintenance, not bookable |

## Allocation Statuses

| Status | Description |
|--------|-------------|
| `pending` | Allocation requested, awaiting confirmation |
| `confirmed` | Allocation confirmed and scheduled |
| `active` | Allocation currently in use |
| `completed` | Allocation finished |
| `cancelled` | Allocation cancelled |

## Configuration

```typescript
// Workers - import env adapter for automatic env resolution
import 'rpc.do/env'
import { resources } from 'resources.do'

// Or use factory with custom config
import { Resources } from 'resources.do'
const customResources = Resources({
  baseURL: 'https://custom.example.com'
})
// API key resolved automatically from RESOURCES_API_KEY or DO_API_KEY
```

Set `RESOURCES_API_KEY` or `DO_API_KEY` in your environment.

## Stop Fighting Your Resources

Resources should be an asset, not a constant source of conflict. Define them once, let AI optimize forever, and focus on what actually matters.

**Your resources should work harder than you do.**

```bash
npm install resources.do
```

[Start optimizing at resources.do](https://resources.do)

---

MIT License
