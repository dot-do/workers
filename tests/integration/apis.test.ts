/**
 * Integration tests using apis.do adapter
 */

import { ApisAdapter } from '../__shared__/adapters/apis-adapter'
import { runAllTests, createTestSuite } from '../__shared__/runner'
import { gatewayTestCases } from '../__shared__/test-cases/gateway.test-cases'
import { dbTestCases } from '../__shared__/test-cases/db.test-cases'
import { authTestCases } from '../__shared__/test-cases/auth.test-cases'
import { getTestEnv } from '../__shared__/utils/setup'

const env = getTestEnv()

const apisAdapter = new ApisAdapter({
  baseUrl: env.API_BASE_URL,
  apiKey: env.API_KEY,
  accessToken: env.ACCESS_TOKEN,
})

const suites = [
  createTestSuite('Gateway Service', gatewayTestCases),
  createTestSuite('DB Service', dbTestCases),
  createTestSuite('Auth Service', authTestCases),
]

// Run all tests with apis.do adapter
runAllTests([apisAdapter], suites)
