/**
 * Shared types for test suite adapters
 */

/**
 * Test adapter interface - all adapters must implement this
 */
export interface TestAdapter {
  /** Adapter name for reporting */
  name: string

  /** Setup adapter (called once before all tests) */
  setup(): Promise<void>

  /** Teardown adapter (called once after all tests) */
  teardown(): Promise<void>

  /** Call a service method */
  call(service: string, method: string, input: any): Promise<any>

  /** Check if adapter is available (optional) */
  isAvailable?(): Promise<boolean>
}

/**
 * Test case definition
 */
export interface TestCase {
  /** Service name (e.g., 'gateway', 'db', 'auth') */
  service: string

  /** Method name (e.g., 'health', 'query', 'validateToken') */
  method: string

  /** Human-readable test description */
  description: string

  /** Input parameters for the method */
  input: any

  /** Expected output (partial match) */
  expected?: any

  /** Custom assertion functions */
  assertions?: Array<(result: any) => boolean>

  /** Skip this test */
  skip?: boolean

  /** Only run this test */
  only?: boolean

  /** Tags for filtering tests */
  tags?: string[]

  /** Timeout in milliseconds */
  timeout?: number
}

/**
 * Test suite containing multiple test cases
 */
export interface TestSuite {
  /** Suite name */
  name: string

  /** Test cases in this suite */
  cases: TestCase[]

  /** Setup function (runs before all cases) */
  beforeAll?: (adapter: TestAdapter) => Promise<void>

  /** Teardown function (runs after all cases) */
  afterAll?: (adapter: TestAdapter) => Promise<void>

  /** Setup function (runs before each case) */
  beforeEach?: (adapter: TestAdapter) => Promise<void>

  /** Teardown function (runs after each case) */
  afterEach?: (adapter: TestAdapter) => Promise<void>
}

/**
 * Test result
 */
export interface TestResult {
  passed: boolean
  adapter: string
  service: string
  method: string
  duration: number
  error?: Error
}

/**
 * Test configuration
 */
export interface TestConfig {
  /** Adapters to test with */
  adapters: TestAdapter[]

  /** Test suites to run */
  suites: TestSuite[]

  /** Filter by tags */
  tags?: string[]

  /** Run in parallel */
  parallel?: boolean

  /** Timeout for each test */
  timeout?: number

  /** Retry failed tests */
  retries?: number
}
