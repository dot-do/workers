/**
 * Integration tests using mcp.do adapter
 */

import { McpAdapter } from '../__shared__/adapters/mcp-adapter'
import { runAllTests, createTestSuite } from '../__shared__/runner'
import { gatewayTestCases } from '../__shared__/test-cases/gateway.test-cases'
import { dbTestCases } from '../__shared__/test-cases/db.test-cases'
import { authTestCases } from '../__shared__/test-cases/auth.test-cases'
import { getTestEnv } from '../__shared__/utils/setup'

const env = getTestEnv()

const mcpAdapter = new McpAdapter({
  serverUrl: env.MCP_SERVER_URL,
  accessToken: env.ACCESS_TOKEN,
})

const suites = [
  createTestSuite('Gateway Service', gatewayTestCases),
  createTestSuite('DB Service', dbTestCases),
  createTestSuite('Auth Service', authTestCases),
]

// Run all tests with mcp.do adapter
runAllTests([mcpAdapter], suites)
