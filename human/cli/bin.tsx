#!/usr/bin/env node
import React from 'react'
import { render } from 'ink'
import meow from 'meow'
import App from './app.js'

const cli = meow(
  `
  Usage
    $ human <command> [options]

  Commands
    inbox           List pending tasks
    task <id>       View task details
    respond <id>    Respond to a task
    history         View completed tasks
    watch           Watch for real-time task updates
    stats           View task statistics

  Options
    --status, -s    Filter by status (pending, processing, completed, cancelled, timeout)
    --priority, -p  Filter by priority (low, normal, high, critical)
    --assigned, -a  Filter by assigned user
    --limit, -l     Limit number of results (default: 20)
    --api-url       API URL (default: http://localhost:8787)

  Examples
    $ human inbox
    $ human inbox --status pending --priority high
    $ human task abc-123
    $ human respond abc-123
    $ human watch
    $ human stats
`,
  {
    importMeta: import.meta,
    flags: {
      status: {
        type: 'string',
        shortFlag: 's',
      },
      priority: {
        type: 'string',
        shortFlag: 'p',
      },
      assigned: {
        type: 'string',
        shortFlag: 'a',
      },
      limit: {
        type: 'number',
        shortFlag: 'l',
        default: 20,
      },
      apiUrl: {
        type: 'string',
        default: process.env.HUMAN_API_URL || 'http://localhost:8787',
      },
    },
  }
)

const command = cli.input[0] || 'inbox'
const args = cli.input.slice(1)

render(<App command={command} args={args} flags={cli.flags} />)
