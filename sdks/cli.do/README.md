# cli.do

**Build CLIs that users actually love.**

```bash
npm install cli.do
```

---

## Your CLI Is an Afterthought

You built something great. Now you need a CLI. But building CLIs means:

- Argument parsing boilerplate everywhere
- No consistent UX across commands
- Ugly output that screams "developer tool"
- Progress indicators? Spinners? Tables? More dependencies.
- Testing CLI interactions is painful

**Your users deserve better than `console.log`.**

## What If CLIs Built Themselves?

```typescript
import { cli, render, Box, Text, Spinner } from 'cli.do'

// Commander for commands
cli('deploy')
  .description('Deploy your service')
  .option('-e, --env <env>', 'Environment', 'production')
  .action(async (options) => {
    render(<DeployProgress env={options.env} />)
  })
  .parse()

// Ink for beautiful UI
function DeployProgress({ env }) {
  const [status, setStatus] = useState('Starting...')

  return (
    <Box flexDirection="column">
      <Box>
        <Spinner type="dots" />
        <Text> Deploying to {env}...</Text>
      </Box>
      <Text color="gray">{status}</Text>
    </Box>
  )
}
```

**cli.do** gives you:
- Commander for powerful argument parsing
- Ink for React-based terminal UIs
- Pre-built components (spinners, tables, inputs)
- Consistent patterns across all .do SDKs
- One dependency instead of many

## Build CLIs in 3 Steps

### 1. Define Commands

```typescript
import { cli, command } from 'cli.do'

const program = cli('myapp', '1.0.0')
  .description('My awesome CLI')

program
  .command('init')
  .description('Initialize a new project')
  .argument('[name]', 'Project name')
  .option('-t, --template <template>', 'Template to use')
  .action(async (name, options) => {
    // Your logic here
  })

program
  .command('deploy')
  .description('Deploy to production')
  .option('-e, --env <env>', 'Environment', 'production')
  .action(async (options) => {
    // Your logic here
  })

program.parse()
```

### 2. Add Beautiful UI

```typescript
import { render, Box, Text, Spinner, SelectInput } from 'cli.do'
import { useState, useEffect } from 'cli.do'

function EnvironmentSelector({ onSelect }) {
  const items = [
    { label: 'Production', value: 'production' },
    { label: 'Staging', value: 'staging' },
    { label: 'Development', value: 'development' },
  ]

  return (
    <Box flexDirection="column">
      <Text bold>Select environment:</Text>
      <SelectInput items={items} onSelect={onSelect} />
    </Box>
  )
}

function DeployStatus({ env }) {
  const [step, setStep] = useState(0)
  const steps = ['Building', 'Uploading', 'Activating', 'Done']

  useEffect(() => {
    const timer = setInterval(() => {
      setStep(s => Math.min(s + 1, steps.length - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <Box flexDirection="column">
      {steps.map((s, i) => (
        <Box key={s}>
          {i < step ? (
            <Text color="green">✓</Text>
          ) : i === step ? (
            <Spinner type="dots" />
          ) : (
            <Text color="gray">○</Text>
          )}
          <Text color={i <= step ? 'white' : 'gray'}> {s}</Text>
        </Box>
      ))}
    </Box>
  )
}
```

### 3. Ship It

```typescript
// Your users get a polished experience
$ myapp deploy --env production

Select environment:
❯ Production
  Staging
  Development

✓ Building
✓ Uploading
⠋ Activating
○ Done
```

## The Difference

| Without cli.do | With cli.do |
|---------------|-------------|
| 5+ dependencies for basic CLI | One import |
| `console.log` everywhere | Rich terminal components |
| Custom argument parsing | Commander's battle-tested parser |
| Text-only output | Interactive React components |
| No spinners or progress | Built-in Spinner, Progress |
| Inconsistent UX | Patterns across all .do CLIs |

## Everything You Need

```typescript
// Commands
import { cli, command, Command, Option, Argument } from 'cli.do'

// UI Components
import {
  render,
  Box,
  Text,
  Spinner,
  TextInput,
  SelectInput
} from 'cli.do'

// React hooks
import { useState, useEffect, useCallback, useMemo } from 'cli.do'

// Ink hooks
import { useInput, useApp, useStdin, useFocus } from 'cli.do'
```

## Pre-built Patterns

```typescript
// Loading state
<Box>
  <Spinner type="dots" />
  <Text> Loading...</Text>
</Box>

// Success/error
<Text color="green">✓ Success</Text>
<Text color="red">✗ Error: {message}</Text>

// Tables (coming soon)
<Table data={rows} />

// Progress bar (coming soon)
<ProgressBar percent={75} />
```

## Configuration-Based CLIs

```typescript
import { createCLI } from 'cli.do'

const program = createCLI({
  name: 'myapp',
  version: '1.0.0',
  description: 'My awesome CLI',
  commands: [
    {
      name: 'deploy',
      description: 'Deploy to production',
      options: [
        { flags: '-e, --env <env>', description: 'Environment', default: 'production' }
      ],
      action: async (options) => {
        // ...
      }
    }
  ]
})

program.parse()
```

## Stop Wrestling with Terminal Output

Your CLI is part of your product. Make it feel like it.

```bash
npm install cli.do
```

[Start building at cli.do](https://cli.do)

---

MIT License
