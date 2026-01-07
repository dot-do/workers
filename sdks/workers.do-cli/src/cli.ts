#!/usr/bin/env node
/**
 * workers.do CLI
 *
 * Command-line interface for workers.do functionality.
 *
 * Usage:
 *   workers.do deploy-snippet <name> <file> [options]
 *   workers.do snippets list
 *   workers.do snippets get <name>
 *   workers.do snippets delete <name>
 *
 * Environment Variables:
 *   CLOUDFLARE_API_TOKEN - API token with Zone.Snippets permissions
 *   CLOUDFLARE_ZONE_ID   - Zone ID for snippet deployment
 */

import { Command } from 'commander'
import { readFileSync, existsSync } from 'node:fs'
import { resolve, basename, extname } from 'node:path'
import {
  deploySnippet,
  listSnippets,
  getSnippetContent,
  deleteSnippet,
  getSnippetRules,
} from './snippets.js'

const program = new Command()

program
  .name('workers.do')
  .description('CLI for workers.do - Deploy snippets and manage Cloudflare Workers')
  .version('0.0.1')

// Deploy snippet command
program
  .command('deploy-snippet')
  .description('Deploy a JavaScript snippet to Cloudflare')
  .argument('<name>', 'Snippet name')
  .argument('<file>', 'JavaScript file to deploy')
  .option('-z, --zone <zoneId>', 'Cloudflare Zone ID', process.env.CLOUDFLARE_ZONE_ID)
  .option('-t, --token <token>', 'Cloudflare API Token', process.env.CLOUDFLARE_API_TOKEN)
  .option('-e, --expression <expression>', 'Filter expression for when snippet runs (e.g., "http.host eq \\"example.com\\"")')
  .option('-d, --description <description>', 'Description for the snippet rule')
  .action(async (name: string, file: string, options) => {
    try {
      // Validate required options
      if (!options.zone) {
        console.error('Error: Zone ID is required. Use --zone or set CLOUDFLARE_ZONE_ID')
        process.exit(1)
      }
      if (!options.token) {
        console.error('Error: API Token is required. Use --token or set CLOUDFLARE_API_TOKEN')
        process.exit(1)
      }

      // Resolve and read file
      const filePath = resolve(process.cwd(), file)
      if (!existsSync(filePath)) {
        console.error(`Error: File not found: ${filePath}`)
        process.exit(1)
      }

      const code = readFileSync(filePath, 'utf-8')
      const fileSize = Buffer.byteLength(code, 'utf-8')

      // Warn if approaching 32KB limit
      if (fileSize > 30000) {
        console.warn(`Warning: Snippet is ${(fileSize / 1024).toFixed(1)}KB (limit: 32KB compressed)`)
      }

      console.log(`Deploying snippet "${name}" from ${basename(file)}...`)

      const result = await deploySnippet({
        zoneId: options.zone,
        name,
        code,
        apiToken: options.token,
        expression: options.expression,
        description: options.description,
      })

      console.log(`Success: ${result.message}`)
      console.log(`  Created: ${result.snippet.created_on}`)
      console.log(`  Modified: ${result.snippet.modified_on}`)

      if (options.expression) {
        console.log(`  Rule: ${options.expression}`)
      }
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

// Snippets subcommand group
const snippets = program
  .command('snippets')
  .description('Manage Cloudflare Snippets')

// List snippets
snippets
  .command('list')
  .description('List all snippets in a zone')
  .option('-z, --zone <zoneId>', 'Cloudflare Zone ID', process.env.CLOUDFLARE_ZONE_ID)
  .option('-t, --token <token>', 'Cloudflare API Token', process.env.CLOUDFLARE_API_TOKEN)
  .action(async (options) => {
    try {
      if (!options.zone || !options.token) {
        console.error('Error: Zone ID and API Token are required')
        process.exit(1)
      }

      const snippetsList = await listSnippets(options.zone, options.token)

      if (snippetsList.length === 0) {
        console.log('No snippets found in this zone.')
        return
      }

      console.log(`Found ${snippetsList.length} snippet(s):\n`)
      for (const snippet of snippetsList) {
        console.log(`  - ${snippet.snippet_name}`)
        console.log(`    Created: ${snippet.created_on}`)
        console.log(`    Modified: ${snippet.modified_on}`)
        console.log()
      }
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

// Get snippet content
snippets
  .command('get')
  .description('Get snippet code content')
  .argument('<name>', 'Snippet name')
  .option('-z, --zone <zoneId>', 'Cloudflare Zone ID', process.env.CLOUDFLARE_ZONE_ID)
  .option('-t, --token <token>', 'Cloudflare API Token', process.env.CLOUDFLARE_API_TOKEN)
  .option('-o, --output <file>', 'Output file (default: stdout)')
  .action(async (name: string, options) => {
    try {
      if (!options.zone || !options.token) {
        console.error('Error: Zone ID and API Token are required')
        process.exit(1)
      }

      const content = await getSnippetContent(options.zone, name, options.token)

      if (options.output) {
        const { writeFileSync } = await import('node:fs')
        writeFileSync(options.output, content)
        console.log(`Snippet content written to ${options.output}`)
      } else {
        console.log(content)
      }
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

// Delete snippet
snippets
  .command('delete')
  .description('Delete a snippet')
  .argument('<name>', 'Snippet name')
  .option('-z, --zone <zoneId>', 'Cloudflare Zone ID', process.env.CLOUDFLARE_ZONE_ID)
  .option('-t, --token <token>', 'Cloudflare API Token', process.env.CLOUDFLARE_API_TOKEN)
  .option('-f, --force', 'Skip confirmation')
  .action(async (name: string, options) => {
    try {
      if (!options.zone || !options.token) {
        console.error('Error: Zone ID and API Token are required')
        process.exit(1)
      }

      if (!options.force) {
        console.log(`This will delete snippet "${name}". Use --force to confirm.`)
        process.exit(0)
      }

      await deleteSnippet(options.zone, name, options.token)
      console.log(`Snippet "${name}" deleted successfully.`)
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

// Rules subcommand
snippets
  .command('rules')
  .description('List snippet rules')
  .option('-z, --zone <zoneId>', 'Cloudflare Zone ID', process.env.CLOUDFLARE_ZONE_ID)
  .option('-t, --token <token>', 'Cloudflare API Token', process.env.CLOUDFLARE_API_TOKEN)
  .action(async (options) => {
    try {
      if (!options.zone || !options.token) {
        console.error('Error: Zone ID and API Token are required')
        process.exit(1)
      }

      const rules = await getSnippetRules(options.zone, options.token)

      if (rules.length === 0) {
        console.log('No snippet rules found.')
        return
      }

      console.log(`Found ${rules.length} snippet rule(s):\n`)
      for (const rule of rules) {
        console.log(`  - ${rule.snippet_name}`)
        console.log(`    Expression: ${rule.expression}`)
        console.log(`    Enabled: ${rule.enabled ?? true}`)
        if (rule.description) {
          console.log(`    Description: ${rule.description}`)
        }
        console.log()
      }
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

// Deploy all snippets from a directory (convenience command)
program
  .command('snippets-deploy')
  .description('Deploy all snippets from the snippets directory')
  .option('-z, --zone <zoneId>', 'Cloudflare Zone ID', process.env.CLOUDFLARE_ZONE_ID)
  .option('-t, --token <token>', 'Cloudflare API Token', process.env.CLOUDFLARE_API_TOKEN)
  .option('-d, --dir <directory>', 'Snippets directory', './snippets')
  .action(async (options) => {
    try {
      if (!options.zone || !options.token) {
        console.error('Error: Zone ID and API Token are required')
        process.exit(1)
      }

      const { readdirSync, statSync } = await import('node:fs')
      const snippetsDir = resolve(process.cwd(), options.dir)

      if (!existsSync(snippetsDir)) {
        console.error(`Error: Directory not found: ${snippetsDir}`)
        process.exit(1)
      }

      const files = readdirSync(snippetsDir)
        .filter(f => f.endsWith('.js') && !f.startsWith('index'))
        .filter(f => statSync(resolve(snippetsDir, f)).isFile())

      if (files.length === 0) {
        console.log('No .js snippet files found (excluding index.js)')
        return
      }

      console.log(`Found ${files.length} snippet(s) to deploy:\n`)

      for (const file of files) {
        const snippetName = basename(file, extname(file))
        const filePath = resolve(snippetsDir, file)
        const code = readFileSync(filePath, 'utf-8')

        console.log(`Deploying ${snippetName}...`)

        try {
          const result = await deploySnippet({
            zoneId: options.zone,
            name: snippetName,
            code,
            apiToken: options.token,
          })
          console.log(`  Success: ${result.message}`)
        } catch (error) {
          console.error(`  Failed: ${error instanceof Error ? error.message : error}`)
        }
      }

      console.log('\nDeployment complete.')
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

program.parse()
