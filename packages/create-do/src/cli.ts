#!/usr/bin/env node
/**
 * create-do - Create a new .do service
 *
 * Usage:
 *   npx create-do <name>
 *   npm create do <name>
 *   pnpm create do <name>
 *
 * Examples:
 *   npx create-do my-service
 *   npx create-do supabase --template database
 *   npx create-do analytics --template analytics
 */

import { createDO } from './index.js'

const args = process.argv.slice(2)
const name = args[0]

if (!name || name === '--help' || name === '-h') {
  console.log(`
create-do - Create a new .do service

Usage:
  npx create-do <name> [options]

Options:
  --template <type>   Template type (default: basic)
                      Types: basic, database, messaging, filesystem, analytics
  --dir <path>        Output directory (default: ./<name>)
  --no-beads          Skip beads initialization
  --no-git            Skip git initialization

Examples:
  npx create-do my-service
  npx create-do supabase --template database
  npx create-do kafka --template messaging
  npx create-do fsx --template filesystem

Templates:
  basic       - Minimal DO with Hono routing
  database    - Supabase-style with query builder, real-time, auth
  messaging   - Kafka/NATS-style with topics, consumers, streams
  filesystem  - fsx-style with POSIX operations, tiered storage
  analytics   - Segment/PostHog-style with events, tracking, exports
`)
  process.exit(0)
}

// Parse options
const options: Record<string, string | boolean> = {}
for (let i = 1; i < args.length; i++) {
  if (args[i].startsWith('--')) {
    const key = args[i].slice(2)
    if (args[i + 1] && !args[i + 1].startsWith('--')) {
      options[key] = args[i + 1]
      i++
    } else {
      options[key] = true
    }
  }
}

createDO(name, {
  template: (options.template as string) || 'basic',
  dir: (options.dir as string) || `./${name}`,
  beads: options['no-beads'] !== true,
  git: options['no-git'] !== true,
}).catch((err) => {
  console.error('Error:', err.message)
  process.exit(1)
})
