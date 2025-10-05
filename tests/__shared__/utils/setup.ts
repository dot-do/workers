/**
 * Test setup and teardown utilities
 */

import type { TestAdapter } from '../adapters/types'

/**
 * Setup test database with test data
 */
export async function setupTestData(adapter: TestAdapter) {
  // Create test tables if they don't exist
  await adapter.call('db', 'execute', {
    sql: `
      CREATE TABLE IF NOT EXISTS test_table (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      )
    `,
    params: [],
  })

  // Insert test data
  await adapter.call('db', 'execute', {
    sql: 'INSERT INTO test_table (name) VALUES (?)',
    params: ['test-data-1'],
  })

  await adapter.call('db', 'execute', {
    sql: 'INSERT INTO test_table (name) VALUES (?)',
    params: ['test-data-2'],
  })
}

/**
 * Teardown test database
 */
export async function teardownTestData(adapter: TestAdapter) {
  // Clean up test data
  await adapter.call('db', 'execute', {
    sql: 'DELETE FROM test_table WHERE name LIKE ?',
    params: ['test-%'],
  })
}

/**
 * Create test user
 */
export async function createTestUser(adapter: TestAdapter, email: string = 'test@example.com') {
  return await adapter.call('db', 'execute', {
    sql: 'INSERT INTO users (email, name) VALUES (?, ?)',
    params: [email, 'Test User'],
  })
}

/**
 * Delete test user
 */
export async function deleteTestUser(adapter: TestAdapter, email: string = 'test@example.com') {
  return await adapter.call('db', 'execute', {
    sql: 'DELETE FROM users WHERE email = ?',
    params: [email],
  })
}

/**
 * Get test environment variables
 */
export function getTestEnv() {
  return {
    API_BASE_URL: process.env.TEST_API_BASE_URL || process.env.API_BASE_URL || 'http://localhost:8787',
    API_KEY: process.env.TEST_API_KEY || process.env.API_KEY,
    ACCESS_TOKEN: process.env.TEST_ACCESS_TOKEN || process.env.ACCESS_TOKEN,
    MCP_SERVER_URL: process.env.TEST_MCP_SERVER_URL || process.env.MCP_SERVER_URL || 'https://mcp.do',
  }
}
