#!/usr/bin/env node
/**
 * CLI tool to generate new Workers services from templates
 * Usage: pnpm create-service --name agents --type domain
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, cpSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = join(__dirname, '..')

interface ServiceConfig {
  name: string // kebab-case service name (e.g., 'agents')
  type: 'domain' | 'integration' | 'ai'
  description?: string
  namespace?: string // Used for MCP tools and queue topics
  className?: string // PascalCase class name
  binding?: string // UPPER_CASE binding name
}

/**
 * Main CLI function
 */
async function main() {
  console.log('🚀 Workers Service Generator\n')

  // Parse command line arguments
  const args = parseArgs()

  if (!args.name) {
    console.error('❌ Error: --name is required')
    console.log('\nUsage: pnpm create-service --name <service-name> --type <template-type>\n')
    console.log('Examples:')
    console.log('  pnpm create-service --name agents --type domain')
    console.log('  pnpm create-service --name stripe --type integration')
    console.log('  pnpm create-service --name embeddings --type ai')
    process.exit(1)
  }

  if (!args.type) {
    args.type = 'domain' // Default to domain
  }

  // Validate type
  if (!['domain', 'integration', 'ai'].includes(args.type)) {
    console.error(`❌ Error: Invalid type "${args.type}". Must be: domain, integration, or ai`)
    process.exit(1)
  }

  // Build config
  const config: ServiceConfig = {
    name: args.name.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
    type: args.type as any,
    description: args.description || `${capitalize(args.name)} service`,
    namespace: args.name.toLowerCase().replace(/-/g, '_'),
    className: toPascalCase(args.name),
    binding: args.name.toUpperCase().replace(/-/g, '_') + '_SERVICE',
  }

  console.log('📋 Configuration:')
  console.log(`   Name: ${config.name}`)
  console.log(`   Type: ${config.type}`)
  console.log(`   Class: ${config.className}`)
  console.log(`   Namespace: ${config.namespace}`)
  console.log(`   Binding: ${config.binding}`)
  console.log(`   Description: ${config.description}\n`)

  // Check if service already exists
  const servicePath = join(ROOT_DIR, config.name)
  try {
    statSync(servicePath)
    console.error(`❌ Error: Service "${config.name}" already exists at ${servicePath}`)
    process.exit(1)
  } catch {
    // Good, doesn't exist
  }

  // Copy template
  const templatePath = join(ROOT_DIR, 'templates', `template-${config.type}`)
  console.log(`📦 Copying template from ${templatePath}...`)

  try {
    cpSync(templatePath, servicePath, { recursive: true })
  } catch (error) {
    console.error(`❌ Error copying template: ${error}`)
    process.exit(1)
  }

  // Process template files
  console.log('🔧 Processing template files...')
  processDirectory(servicePath, config)

  // Update root configuration
  console.log('⚙️  Updating workspace configuration...')
  updateWorkspaceConfig(config)

  console.log('\n✅ Service created successfully!\n')
  console.log('Next steps:')
  console.log(`  cd ${config.name}`)
  console.log('  pnpm install')
  console.log('  pnpm dev\n')
  console.log('📚 Documentation:')
  console.log(`  README: ${config.name}/README.md`)
  console.log('  Guide: docs/creating-services.md\n')
}

/**
 * Parse command line arguments
 */
function parseArgs(): { name?: string; type?: string; description?: string } {
  const args: any = {}

  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i]
    if (arg.startsWith('--')) {
      const key = arg.slice(2)
      const value = process.argv[i + 1]
      if (value && !value.startsWith('--')) {
        args[key] = value
        i++
      }
    }
  }

  return args
}

/**
 * Recursively process all files in a directory
 */
function processDirectory(dir: string, config: ServiceConfig): void {
  const entries = readdirSync(dir)

  for (const entry of entries) {
    const fullPath = join(dir, entry)
    const stat = statSync(fullPath)

    if (stat.isDirectory()) {
      processDirectory(fullPath, config)
    } else if (stat.isFile()) {
      processFile(fullPath, config)
    }
  }
}

/**
 * Process a single file (replace template variables)
 */
function processFile(filePath: string, config: ServiceConfig): void {
  let content = readFileSync(filePath, 'utf-8')

  // Replace template variables
  content = content
    .replace(/\{\{SERVICE_NAME\}\}/g, config.name)
    .replace(/\{\{SERVICE_CLASS\}\}/g, config.className!)
    .replace(/\{\{SERVICE_DESCRIPTION\}\}/g, config.description!)
    .replace(/\{\{NAMESPACE\}\}/g, config.namespace!)
    .replace(/\{\{SERVICE_BINDING\}\}/g, config.binding!)

  writeFileSync(filePath, content, 'utf-8')
}

/**
 * Update workspace configuration to include new service
 */
function updateWorkspaceConfig(config: ServiceConfig): void {
  // Update pnpm-workspace.yaml
  const workspacePath = join(ROOT_DIR, 'pnpm-workspace.yaml')
  let workspace = readFileSync(workspacePath, 'utf-8')

  // Add service to packages list if not already there
  if (!workspace.includes(`  - '${config.name}'`)) {
    // Find the packages section and add the new service
    const lines = workspace.split('\n')
    const packagesIndex = lines.findIndex((line) => line.trim() === 'packages:')

    if (packagesIndex !== -1) {
      // Insert after packages: line
      lines.splice(packagesIndex + 1, 0, `  - '${config.name}'`)
      workspace = lines.join('\n')
      writeFileSync(workspacePath, workspace, 'utf-8')
      console.log(`   ✓ Added to pnpm-workspace.yaml`)
    }
  }

  // Note: In a real implementation, you might also want to:
  // - Update root package.json if it has workspace configuration
  // - Update any central documentation that lists services
  // - Create initial git commit
}

/**
 * Utility: Convert to PascalCase
 */
function toPascalCase(str: string): string {
  return str
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('')
}

/**
 * Utility: Capitalize first letter
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

// Run CLI
main().catch((error) => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})
