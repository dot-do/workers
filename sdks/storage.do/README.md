# storage.do

Storage migration system for Durable Object storage.

## Features

- **Version Tracking**: Track schema versions in storage metadata
- **Sequential Execution**: Migrations run in order by version
- **Rollback Support**: Revert migrations when needed
- **Partial Recovery**: Resume from last successful migration after failures
- **Dry Run**: Test migrations without applying changes

## Installation

```bash
npm install storage.do
```

## Usage

### Basic Example

```typescript
import { StorageMigrationManager } from 'storage.do'

// In your Durable Object
export class MyDurableObject {
  constructor(state: DurableObjectState, env: Env) {
    this.state = state

    // Initialize migration manager
    const migrations = new StorageMigrationManager(state.storage)

    // Register migrations
    migrations.register({
      version: '2024.01.001',
      name: 'initial_schema',
      up: async (storage) => {
        await storage.put('users:count', 0)
        await storage.put('schema:initialized', true)
      },
      down: async (storage) => {
        await storage.delete('users:count')
        await storage.delete('schema:initialized')
      },
    })

    migrations.register({
      version: '2024.01.002',
      name: 'add_settings',
      up: async (storage) => {
        await storage.put('settings:theme', 'light')
      },
      down: async (storage) => {
        await storage.delete('settings:theme')
      },
    })

    // Run pending migrations
    state.blockConcurrencyWhile(async () => {
      await migrations.migrate()
    })
  }
}
```

### Check Migration Status

```typescript
const status = await migrations.getStatus()

for (const migration of status) {
  console.log(
    `${migration.version} (${migration.name}): ${migration.applied ? 'Applied' : 'Pending'}`
  )
}
```

### Rollback Migrations

```typescript
// Rollback last migration
await migrations.rollback()

// Rollback last 2 migrations
await migrations.rollback(2)

// Rollback to specific version
await migrations.rollbackTo('2024.01.001')
```

### Dry Run Mode

```typescript
const migrations = new StorageMigrationManager(storage, { dryRun: true })

// This will list what would be migrated without applying changes
const results = await migrations.migrate()

console.log('Would apply migrations:', results.map(r => r.version))
```

## Migration Version Format

Migrations must use the version format: `YYYY.MM.NNN`

- `YYYY`: 4-digit year
- `MM`: 2-digit month
- `NNN`: 3-digit sequence number

Examples:
- `2024.01.001` - First migration in January 2024
- `2024.01.002` - Second migration in January 2024
- `2024.03.042` - 42nd migration in March 2024

## API Reference

### StorageMigrationManager

Main class for managing storage migrations.

#### Constructor

```typescript
new StorageMigrationManager(storage: DurableObjectStorage, config?: MigrationConfig)
```

**Parameters:**
- `storage`: Durable Object storage interface
- `config`: Optional configuration
  - `dryRun`: Run migrations without applying changes (default: `false`)
  - `metadataPrefix`: Prefix for metadata keys (default: `__storage_migration_`)

#### Methods

##### `register(migration: StorageMigration): void`

Register a new migration.

##### `migrate(): Promise<MigrationResult[]>`

Run all pending migrations.

##### `rollback(steps?: number): Promise<MigrationResult[]>`

Rollback the last N migrations (default: 1).

##### `rollbackTo(version: string): Promise<MigrationResult[]>`

Rollback to a specific version (exclusive).

##### `getCurrentVersion(): Promise<string | null>`

Get the current migration version.

##### `getStatus(): Promise<MigrationStatus[]>`

Get status of all migrations.

### Types

#### StorageMigration

```typescript
interface StorageMigration {
  version: string  // Format: YYYY.MM.NNN
  name: string
  up: (storage: DurableObjectStorage) => Promise<void>
  down: (storage: DurableObjectStorage) => Promise<void>
}
```

#### MigrationResult

```typescript
interface MigrationResult {
  version: string
  name: string
  success: boolean
  durationMs: number
  error?: Error
}
```

#### MigrationStatus

```typescript
interface MigrationStatus {
  version: string
  name: string
  applied: boolean
  appliedAt?: Date
}
```

## Best Practices

1. **Version Naming**: Use descriptive names and proper versioning
2. **Idempotency**: Make migrations idempotent when possible
3. **Reversibility**: Always implement `down` migrations
4. **Testing**: Test migrations in dry-run mode first
5. **Blocking**: Run migrations in `blockConcurrencyWhile` during initialization

## License

MIT
