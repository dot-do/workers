/**
 * Integration tests with all available adapters
 */

import { HttpAdapter } from '../__shared__/adapters/http-adapter'
import { ApisAdapter } from '../__shared__/adapters/apis-adapter'
import { McpAdapter } from '../__shared__/adapters/mcp-adapter'
import { runTestsWithAvailableAdapters, createTestSuite } from '../__shared__/runner'
import { gatewayTestCases } from '../__shared__/test-cases/gateway.test-cases'
import { dbTestCases } from '../__shared__/test-cases/db.test-cases'
import { authTestCases } from '../__shared__/test-cases/auth.test-cases'
import { getTestEnv } from '../__shared__/utils/setup'

const env = getTestEnv()

// Create all adapters
const adapters = [
  new HttpAdapter({
    baseUrl: env.API_BASE_URL,
    apiKey: env.API_KEY,
    accessToken: env.ACCESS_TOKEN,
  }),
  new ApisAdapter({
    baseUrl: env.API_BASE_URL,
    apiKey: env.API_KEY,
    accessToken: env.ACCESS_TOKEN,
  }),
  new McpAdapter({
    serverUrl: env.MCP_SERVER_URL,
    accessToken: env.ACCESS_TOKEN,
  }),
]

const suites = [
  createTestSuite('Gateway Service', gatewayTestCases),
  createTestSuite('DB Service', dbTestCases),
  createTestSuite('Auth Service', authTestCases),
]

// Run all tests with all available adapters
runTestsWithAvailableAdapters(adapters, suites)
