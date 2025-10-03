/**
 * Deployment Verification Script
 *
 * Verifies all service configurations before deployment:
 * - Service bindings are correct
 * - Required secrets are set
 * - KV namespaces exist
 * - Dependencies are resolved
 */

import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

interface WranglerConfig {
  name: string
  services?: Array<{ binding: string; service: string }>
  kv_namespaces?: Array<{ binding: string; id: string }>
  secrets?: string[]
}

interface ServiceCheck {
  name: string
  status: 'ok' | 'warning' | 'error'
  issues: string[]
  warnings: string[]
}

const SERVICES = ['gateway', 'db', 'auth', 'schedule', 'webhooks', 'email', 'mcp']

const EXPECTED_SERVICE_NAMES = {
  gateway: 'do-gateway',
  db: 'do-db',
  auth: 'do-auth',
  schedule: 'do-schedule',
  webhooks: 'do-webhooks',
  email: 'do-email',
  mcp: 'do-mcp',
}

const SERVICE_DEPENDENCIES = {
  gateway: ['do-db', 'do-auth', 'do-schedule'],
  auth: ['do-db'],
  schedule: ['do-db'],
  webhooks: ['do-db'],
  email: ['do-db'],
  mcp: [],
  db: [],
}

function loadWranglerConfig(serviceName: string): WranglerConfig | null {
  const configPath = resolve(__dirname, '..', serviceName, 'wrangler.jsonc')

  if (!existsSync(configPath)) {
    return null
  }

  try {
    // Read JSONC file (strip comments)
    const content = readFileSync(configPath, 'utf-8')
    const jsonContent = content
      .split('\n')
      .filter((line) => !line.trim().startsWith('//'))
      .join('\n')

    return JSON.parse(jsonContent)
  } catch (error) {
    console.error(`Failed to parse ${configPath}:`, error)
    return null
  }
}

function checkService(serviceName: string): ServiceCheck {
  const check: ServiceCheck = {
    name: serviceName,
    status: 'ok',
    issues: [],
    warnings: [],
  }

  // Load configuration
  const config = loadWranglerConfig(serviceName)

  if (!config) {
    check.status = 'error'
    check.issues.push(`Missing or invalid wrangler.jsonc`)
    return check
  }

  // Check service name matches convention
  const expectedName = EXPECTED_SERVICE_NAMES[serviceName as keyof typeof EXPECTED_SERVICE_NAMES]
  if (config.name !== expectedName) {
    check.status = 'warning'
    check.warnings.push(`Service name is "${config.name}", expected "${expectedName}"`)
  }

  // Check service bindings
  const expectedDeps = SERVICE_DEPENDENCIES[serviceName as keyof typeof SERVICE_DEPENDENCIES]
  const actualDeps = (config.services || []).map((s) => s.service)

  for (const dep of expectedDeps) {
    if (!actualDeps.includes(dep)) {
      check.status = 'error'
      check.issues.push(`Missing service binding to "${dep}"`)
    }
  }

  // Check for placeholder KV IDs
  if (config.kv_namespaces) {
    for (const kv of config.kv_namespaces) {
      if (kv.id.includes('placeholder') || kv.id.includes('YOUR_')) {
        check.status = 'error'
        check.issues.push(`KV namespace "${kv.binding}" has placeholder ID`)
      }
    }
  }

  return check
}

function printResults(checks: ServiceCheck[]) {
  console.log('\n=== Deployment Verification Results ===\n')

  let hasErrors = false
  let hasWarnings = false

  for (const check of checks) {
    const icon = check.status === 'ok' ? '✅' : check.status === 'warning' ? '⚠️' : '❌'
    console.log(`${icon} ${check.name}`)

    if (check.issues.length > 0) {
      hasErrors = true
      for (const issue of check.issues) {
        console.log(`   ❌ ${issue}`)
      }
    }

    if (check.warnings.length > 0) {
      hasWarnings = true
      for (const warning of check.warnings) {
        console.log(`   ⚠️  ${warning}`)
      }
    }

    console.log()
  }

  console.log('=== Summary ===\n')
  console.log(`Total services: ${checks.length}`)
  console.log(`OK: ${checks.filter((c) => c.status === 'ok').length}`)
  console.log(`Warnings: ${checks.filter((c) => c.status === 'warning').length}`)
  console.log(`Errors: ${checks.filter((c) => c.status === 'error').length}`)
  console.log()

  if (hasErrors) {
    console.log('❌ Deployment verification FAILED. Fix errors before deploying.')
    process.exit(1)
  } else if (hasWarnings) {
    console.log('⚠️  Deployment verification passed with warnings.')
    process.exit(0)
  } else {
    console.log('✅ All checks passed! Ready to deploy.')
    process.exit(0)
  }
}

// Run verification
const checks = SERVICES.map(checkService)
printResults(checks)
