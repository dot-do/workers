/**
 * Example: Creating Synthetic Monitoring Checks
 */

const APM_ENDPOINT = 'https://apm.example.com'

// ============================================================================
// Example 1: HTTP Health Check
// ============================================================================

async function createHttpCheck() {
  const check = {
    id: crypto.randomUUID(),
    name: 'API Health Check',
    type: 'http',
    url: 'https://api.example.com/health',
    method: 'GET',
    headers: {
      'Authorization': 'Bearer token123',
      'X-API-Version': '1.0',
    },
    expectedStatus: 200,
    expectedBody: 'healthy',
    interval: 60, // Every 1 minute
    timeout: 5000, // 5 seconds
    locations: ['SJC', 'EWR', 'LHR', 'SIN'], // San Jose, Newark, London, Singapore
    enabled: true,
    alertOnFailure: true,
    alertThreshold: 3, // 3 consecutive failures
    alertChannels: ['#incidents', 'ops@example.com'],
  }

  const response = await fetch(`${APM_ENDPOINT}/api/synthetic/checks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(check),
  })

  const result = await response.json()
  console.log('HTTP check created:', result)
}

// ============================================================================
// Example 2: DNS Resolution Check
// ============================================================================

async function createDnsCheck() {
  const check = {
    id: crypto.randomUUID(),
    name: 'DNS Resolution Check',
    type: 'dns',
    url: 'api.example.com',
    interval: 300, // Every 5 minutes
    timeout: 3000,
    locations: ['SJC', 'EWR'],
    enabled: true,
    alertOnFailure: true,
    alertThreshold: 2,
    alertChannels: ['#infrastructure'],
  }

  const response = await fetch(`${APM_ENDPOINT}/api/synthetic/checks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(check),
  })

  const result = await response.json()
  console.log('DNS check created:', result)
}

// ============================================================================
// Example 3: SSL Certificate Check
// ============================================================================

async function createSslCheck() {
  const check = {
    id: crypto.randomUUID(),
    name: 'SSL Certificate Check',
    type: 'ssl',
    url: 'https://api.example.com',
    interval: 3600, // Every 1 hour
    timeout: 5000,
    locations: ['SJC'],
    enabled: true,
    alertOnFailure: true,
    alertThreshold: 1,
    alertChannels: ['#security'],
  }

  const response = await fetch(`${APM_ENDPOINT}/api/synthetic/checks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(check),
  })

  const result = await response.json()
  console.log('SSL check created:', result)
}

// ============================================================================
// Example 4: Playwright User Journey
// ============================================================================

async function createPlaywrightCheck() {
  const check = {
    id: crypto.randomUUID(),
    name: 'Login Flow Test',
    type: 'playwright',
    script: `
      // Navigate to login page
      await page.goto('https://app.example.com/login');

      // Fill in credentials
      await page.fill('#username', 'test@example.com');
      await page.fill('#password', 'test123456');

      // Click login button
      await page.click('#login-button');

      // Wait for dashboard to load
      await page.waitForSelector('#dashboard', { timeout: 5000 });

      // Verify we're logged in
      const username = await page.textContent('#user-display');
      if (username !== 'test@example.com') {
        throw new Error('Login failed: unexpected username');
      }

      // Click on a feature
      await page.click('#analytics-link');
      await page.waitForSelector('#analytics-dashboard');

      // Verify analytics loaded
      const chartCount = await page.locator('.chart').count();
      if (chartCount < 3) {
        throw new Error(\`Expected at least 3 charts, got \${chartCount}\`);
      }

      // Logout
      await page.click('#logout-button');
      await page.waitForURL('**/login');
    `,
    interval: 900, // Every 15 minutes
    timeout: 30000, // 30 seconds
    locations: ['SJC', 'EWR'],
    enabled: true,
    alertOnFailure: true,
    alertThreshold: 2,
    alertChannels: ['#e2e-tests', 'qa@example.com'],
  }

  const response = await fetch(`${APM_ENDPOINT}/api/synthetic/checks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(check),
  })

  const result = await response.json()
  console.log('Playwright check created:', result)
}

// ============================================================================
// Example 5: API Endpoint Test with POST
// ============================================================================

async function createApiEndpointCheck() {
  const check = {
    id: crypto.randomUUID(),
    name: 'Create User API Test',
    type: 'http',
    url: 'https://api.example.com/v1/users',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-token',
    },
    body: JSON.stringify({
      name: 'Test User',
      email: 'test@example.com',
    }),
    expectedStatus: 201,
    interval: 300, // Every 5 minutes
    timeout: 5000,
    locations: ['SJC', 'EWR', 'LHR'],
    enabled: true,
    alertOnFailure: true,
    alertThreshold: 3,
    alertChannels: ['#api-monitoring'],
  }

  const response = await fetch(`${APM_ENDPOINT}/api/synthetic/checks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(check),
  })

  const result = await response.json()
  console.log('API endpoint check created:', result)
}

// ============================================================================
// Query Check Results
// ============================================================================

async function getCheckResults(checkId: string) {
  const from = Date.now() - 24 * 60 * 60 * 1000 // Last 24 hours
  const to = Date.now()

  const response = await fetch(`${APM_ENDPOINT}/api/synthetic/results/${checkId}?from=${from}&to=${to}`)

  const { results } = await response.json()

  console.log(`Results for check ${checkId}:`)
  console.log(`Total runs: ${results.length}`)
  console.log(`Successful: ${results.filter((r: any) => r.success).length}`)
  console.log(`Failed: ${results.filter((r: any) => !r.success).length}`)

  // Calculate average response time
  const avgDuration = results.reduce((sum: number, r: any) => sum + r.duration, 0) / results.length
  console.log(`Average response time: ${avgDuration.toFixed(2)}ms`)

  // Show failures
  const failures = results.filter((r: any) => !r.success)
  if (failures.length > 0) {
    console.log('\nRecent failures:')
    failures.slice(0, 5).forEach((f: any) => {
      console.log(`  - ${new Date(f.timestamp).toISOString()}: ${f.errorMessage}`)
    })
  }

  return results
}

// ============================================================================
// List All Checks
// ============================================================================

async function listAllChecks() {
  const response = await fetch(`${APM_ENDPOINT}/api/synthetic/checks`)
  const { checks } = await response.json()

  console.log(`Total checks: ${checks.length}`)
  console.log(`Enabled: ${checks.filter((c: any) => c.enabled).length}`)
  console.log(`Disabled: ${checks.filter((c: any) => !c.enabled).length}`)

  console.log('\nChecks by type:')
  const byType = checks.reduce((acc: any, check: any) => {
    acc[check.type] = (acc[check.type] || 0) + 1
    return acc
  }, {})
  Object.entries(byType).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`)
  })

  return checks
}

// ============================================================================
// Run Examples
// ============================================================================

async function runExamples() {
  console.log('Creating synthetic checks...\n')

  await createHttpCheck()
  await createDnsCheck()
  await createSslCheck()
  await createPlaywrightCheck()
  await createApiEndpointCheck()

  console.log('\nAll checks created!')

  // List all checks
  console.log('\n' + '='.repeat(80) + '\n')
  const checks = await listAllChecks()

  // Get results for first check
  if (checks.length > 0) {
    console.log('\n' + '='.repeat(80) + '\n')
    await getCheckResults(checks[0].id)
  }
}

// Uncomment to run:
// runExamples().catch(console.error)
