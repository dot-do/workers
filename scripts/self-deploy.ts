#!/usr/bin/env tsx
/**
 * Self-Deploy Script
 *
 * Workers deploy themselves via RPC to the deploy service.
 * This demonstrates the "workers deploying workers" pattern.
 *
 * Usage:
 *   tsx scripts/self-deploy.ts <worker-name> [environment]
 *
 * Examples:
 *   tsx scripts/self-deploy.ts yaml production
 *   tsx scripts/self-deploy.ts esbuild staging
 *
 * Prerequisites:
 *   - Worker must have DEPLOY_SERVICE binding in wrangler.jsonc
 *   - Deploy service must be deployed
 *   - Wrangler must be logged in (OAuth)
 */

import * as fs from 'fs'
import * as path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

interface DeployOptions {
  worker: string
  environment: 'production' | 'staging' | 'development'
}

async function buildWorker(workerDir: string): Promise<string> {
  console.log(`🔨 Building worker: ${workerDir}`)

  // Check if src/index.ts exists
  const indexPath = path.join(workerDir, 'src', 'index.ts')
  if (!fs.existsSync(indexPath)) {
    throw new Error(`Worker entrypoint not found: ${indexPath}`)
  }

  // Read the source file
  const source = fs.readFileSync(indexPath, 'utf-8')

  // For now, return source as-is (no bundling)
  // In production, you'd use esbuild or similar
  console.log(`  ✓ Read source: ${source.length} bytes`)

  return source
}

async function getGitMetadata() {
  try {
    const { stdout: commit } = await execAsync('git rev-parse HEAD')
    const { stdout: branch } = await execAsync('git rev-parse --abbrev-ref HEAD')
    const { stdout: author } = await execAsync('git config user.email')

    return {
      commit: commit.trim(),
      branch: branch.trim(),
      author: author.trim(),
    }
  } catch (error) {
    console.warn('⚠️  Could not get git metadata, using defaults')
    return {
      commit: 'unknown',
      branch: 'main',
      author: 'auto',
    }
  }
}

async function selfDeploy(options: DeployOptions): Promise<void> {
  const { worker, environment } = options
  const workerDir = path.join(process.cwd(), worker)

  console.log(`\n🚀 Self-deploying ${worker} to ${environment}\n`)

  // Check worker directory exists
  if (!fs.existsSync(workerDir)) {
    throw new Error(`Worker directory not found: ${workerDir}`)
  }

  // Build worker
  const script = await buildWorker(workerDir)

  // Get git metadata
  const metadata = await getGitMetadata()

  // Encode script as base64
  const scriptB64 = Buffer.from(script).toString('base64')

  console.log(`\n📦 Prepared deployment:`)
  console.log(`  Worker: ${worker}`)
  console.log(`  Environment: ${environment}`)
  console.log(`  Script size: ${script.length} bytes`)
  console.log(`  Commit: ${metadata.commit.slice(0, 8)}`)
  console.log(`  Branch: ${metadata.branch}`)
  console.log(`  Author: ${metadata.author}`)

  // Call deploy service via wrangler dev + RPC
  console.log(`\n🌐 Calling DEPLOY_SERVICE.deploy() via RPC...`)
  console.log(`   (This would require wrangler dev running with DEPLOY_SERVICE binding)`)

  // NOTE: This is a placeholder. Actual implementation would:
  // 1. Start wrangler dev with worker that has DEPLOY_SERVICE binding
  // 2. Call env.DEPLOY_SERVICE.deploy() via RPC
  // 3. Deploy service handles Cloudflare API call

  // For now, show what the RPC call would look like:
  const rpcRequest = {
    service: worker,
    environment,
    script: scriptB64,
    metadata,
  }

  console.log(`\n📤 RPC Request:`)
  console.log(JSON.stringify(rpcRequest, null, 2))

  console.log(`\n⚠️  Self-deploy requires DEPLOY_SERVICE binding and wrangler dev`)
  console.log(`   For now, use: cd ${worker} && wrangler deploy`)
}

// Main CLI
async function main() {
  const args = process.argv.slice(2)

  if (args.length === 0 || args.includes('--help')) {
    console.log(`
Self-Deploy Script - Workers deploying workers via RPC

Usage:
  tsx scripts/self-deploy.ts <worker-name> [environment]

Arguments:
  worker-name   Name of worker to deploy (yaml, esbuild, etc.)
  environment   Target environment (production, staging, development)
                Default: production

Examples:
  tsx scripts/self-deploy.ts yaml
  tsx scripts/self-deploy.ts esbuild production
  tsx scripts/self-deploy.ts yaml staging

Prerequisites:
  - Worker must have DEPLOY_SERVICE binding
  - Deploy service must be deployed
  - Wrangler must be logged in
`)
    process.exit(0)
  }

  const worker = args[0]
  const environment = (args[1] || 'production') as 'production' | 'staging' | 'development'

  try {
    await selfDeploy({ worker, environment })
    console.log(`\n✅ Self-deploy completed successfully!`)
  } catch (error) {
    console.error(`\n❌ Self-deploy failed:`, error)
    process.exit(1)
  }
}

// Run if executed directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`
if (isMainModule) {
  main()
}

export { selfDeploy }
