/**
 * Test runner for executing test suites with adapters
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import type { TestAdapter, TestCase, TestSuite } from './adapters/types'

/**
 * Run a single test suite with a given adapter
 */
export function runTestSuite(adapter: TestAdapter, suite: TestSuite) {
  describe(`${suite.name} [${adapter.name}]`, () => {
    // Setup adapter once before all tests
    beforeAll(async () => {
      await adapter.setup()
      if (suite.beforeAll) {
        await suite.beforeAll(adapter)
      }
    })

    // Teardown adapter after all tests
    afterAll(async () => {
      if (suite.afterAll) {
        await suite.afterAll(adapter)
      }
      await adapter.teardown()
    })

    // Setup before each test
    if (suite.beforeEach) {
      beforeEach(async () => {
        await suite.beforeEach!(adapter)
      })
    }

    // Teardown after each test
    if (suite.afterEach) {
      afterEach(async () => {
        await suite.afterEach!(adapter)
      })
    }

    // Create a test for each test case
    for (const testCase of suite.cases) {
      const testFn = testCase.skip ? it.skip : testCase.only ? it.only : it

      testFn(
        testCase.description,
        async () => {
          // Call the service method via adapter
          const result = await adapter.call(testCase.service, testCase.method, testCase.input)

          // Run custom assertions
          if (testCase.assertions) {
            for (let i = 0; i < testCase.assertions.length; i++) {
              const assertion = testCase.assertions[i]
              expect(assertion(result)).toBe(true)
            }
          }

          // Match expected output (partial match)
          if (testCase.expected) {
            expect(result).toMatchObject(testCase.expected)
          }
        },
        testCase.timeout || 10000
      )
    }
  })
}

/**
 * Run all test suites with all adapters
 */
export function runAllTests(adapters: TestAdapter[], suites: TestSuite[]) {
  for (const adapter of adapters) {
    for (const suite of suites) {
      runTestSuite(adapter, suite)
    }
  }
}

/**
 * Run test suites with filtered adapters (only available ones)
 */
export async function runTestsWithAvailableAdapters(adapters: TestAdapter[], suites: TestSuite[]) {
  const available: TestAdapter[] = []

  for (const adapter of adapters) {
    if (adapter.isAvailable) {
      const isAvail = await adapter.isAvailable()
      if (isAvail) {
        available.push(adapter)
      }
    } else {
      available.push(adapter)
    }
  }

  if (available.length === 0) {
    console.warn('No adapters are available!')
    return
  }

  console.log(`Running tests with ${available.length} adapter(s): ${available.map((a) => a.name).join(', ')}`)
  runAllTests(available, suites)
}

/**
 * Filter test cases by tags
 */
export function filterTestCasesByTags(cases: TestCase[], tags: string[]): TestCase[] {
  return cases.filter((testCase) => {
    if (!testCase.tags) return false
    return tags.some((tag) => testCase.tags!.includes(tag))
  })
}

/**
 * Create a test suite from test cases
 */
export function createTestSuite(name: string, cases: TestCase[], options?: Partial<TestSuite>): TestSuite {
  return {
    name,
    cases,
    ...options,
  }
}
