/**
 * Performance benchmarks for Code Mode execution
 *
 * Run with: pnpm vitest bench
 */

import { describe, bench, beforeEach } from 'vitest'
import { executeCode } from '../src/executor'
import { authorizeCodeExecution, getCodePermissions } from '../src/authorization'
import type { Env, ExecuteCodeRequest, ServiceContext } from '../src/types'

// Mock Worker Loader - Same as in executor.test.ts
const createMockWorkerLoader = () => {
  const get = (id: string, codeCallback: any) => {
    const worker = {
      fetch: async (request: Request) => {
        const workerCode = await codeCallback()
        const logs: string[] = []

        try {
          const originalConsoleLog = console.log
          if (workerCode.modules && Object.values(workerCode.modules)[0]?.includes('__logs')) {
            console.log = (...args: any[]) => {
              logs.push(args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '))
            }
          }

          const wrappedCode = Object.values(workerCode.modules || {})[0] || ''
          const codeMatch = wrappedCode.match(/__output = await \(async \(\) => \{([\s\S]*?)\}\)\(\);/)
          const userCode = codeMatch ? codeMatch[1].trim() : ''

          if (!userCode) {
            throw new Error(`Could not extract user code from wrapped module`)
          }

          const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor
          const fn = new AsyncFunction(userCode)
          const result = await fn()

          console.log = originalConsoleLog

          return new Response(
            JSON.stringify({
              output: result,
              logs,
            }),
            { headers: { 'Content-Type': 'application/json' } }
          )
        } catch (error: any) {
          return new Response(
            JSON.stringify({
              error: error.message,
              stack: error.stack,
              logs,
            }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          )
        }
      },
    }

    return worker
  }

  return { get }
}

// Mock environment
const createMockEnv = (): Env => ({
  LOADER: createMockWorkerLoader() as any,
  DB: {
    query: async () => ({ results: [], meta: { duration: 10 } }),
  } as any,
  AUTH: {} as any,
  GATEWAY: {} as any,
  SCHEDULE: {} as any,
  WEBHOOKS: {} as any,
  EMAIL: {} as any,
  MCP: {} as any,
  QUEUE: {} as any,
  CODE_CACHE: {
    get: async () => null,
    put: async () => undefined,
  } as any,
  MAX_EXECUTION_TIME: '30000',
  DEFAULT_COMPATIBILITY_DATE: '2025-01-01',
})

// Mock contexts for different tiers
const createContext = (tier: 'internal' | 'tenant' | 'public'): ServiceContext => ({
  auth: {
    authenticated: true,
    user: {
      id: `usr_${tier}`,
      email: `${tier}@example.com`,
      name: `${tier} user`,
      role: tier === 'internal' ? 'admin' : tier === 'tenant' ? 'tenant' : 'user',
      permissions: [],
      metadata: tier === 'tenant' ? { tenantId: 'test-tenant' } : undefined,
    },
  },
  requestId: `req_bench_${Date.now()}`,
  timestamp: Date.now(),
  metadata: {},
})

describe('Code Execution - Latency Benchmarks', () => {
  let env: Env
  let context: ServiceContext

  beforeEach(() => {
    env = createMockEnv()
    context = createContext('internal')
  })

  bench('execute simple arithmetic (2 + 2)', async () => {
    const request: ExecuteCodeRequest = {
      code: 'return 2 + 2',
      bindings: [],
    }
    await executeCode(request, env, context)
  })

  bench('execute string concatenation', async () => {
    const request: ExecuteCodeRequest = {
      code: 'return "Hello, " + "World!"',
      bindings: [],
    }
    await executeCode(request, env, context)
  })

  bench('execute object creation', async () => {
    const request: ExecuteCodeRequest = {
      code: 'return { name: "Alice", age: 30, active: true }',
      bindings: [],
    }
    await executeCode(request, env, context)
  })

  bench('execute array operations', async () => {
    const request: ExecuteCodeRequest = {
      code: 'const arr = [1, 2, 3, 4, 5]; return arr.map(x => x * 2).filter(x => x > 5)',
      bindings: [],
    }
    await executeCode(request, env, context)
  })

  bench('execute async operation', async () => {
    const request: ExecuteCodeRequest = {
      code: 'return await Promise.resolve(42)',
      bindings: [],
    }
    await executeCode(request, env, context)
  })

  bench('execute multiple async operations', async () => {
    const request: ExecuteCodeRequest = {
      code: `
        const results = await Promise.all([
          Promise.resolve(1),
          Promise.resolve(2),
          Promise.resolve(3)
        ]);
        return results.reduce((sum, n) => sum + n, 0)
      `,
      bindings: [],
    }
    await executeCode(request, env, context)
  })

  bench('execute JSON parsing', async () => {
    const request: ExecuteCodeRequest = {
      code: 'return JSON.parse(\'{"name":"Alice","age":30}\')',
      bindings: [],
    }
    await executeCode(request, env, context)
  })

  bench('execute complex calculation', async () => {
    const request: ExecuteCodeRequest = {
      code: `
        let sum = 0;
        for (let i = 0; i < 1000; i++) {
          sum += Math.sqrt(i);
        }
        return sum
      `,
      bindings: [],
    }
    await executeCode(request, env, context)
  })
})

describe('Authorization - Overhead Benchmarks', () => {
  let env: Env

  beforeEach(() => {
    env = createMockEnv()
  })

  bench('authorize internal tier (no checks)', async () => {
    const context = createContext('internal')
    const request: ExecuteCodeRequest = {
      code: 'return 42',
      bindings: ['db', 'email', 'queue'],
      timeout: 30000,
    }
    authorizeCodeExecution(request, context, env)
  })

  bench('authorize tenant tier (binding checks)', async () => {
    const context = createContext('tenant')
    const request: ExecuteCodeRequest = {
      code: 'return 42',
      bindings: ['db', 'email'],
      timeout: 25000,
    }
    authorizeCodeExecution(request, context, env)
  })

  bench('authorize public tier (full checks)', async () => {
    const context = createContext('public')
    const request: ExecuteCodeRequest = {
      code: 'return 42',
      bindings: ['db'],
      timeout: 5000,
    }
    authorizeCodeExecution(request, context, env)
  })

  bench('get permissions internal tier', async () => {
    const context = createContext('internal')
    getCodePermissions(context)
  })

  bench('get permissions tenant tier', async () => {
    const context = createContext('tenant')
    getCodePermissions(context)
  })

  bench('get permissions public tier', async () => {
    const context = createContext('public')
    getCodePermissions(context)
  })

  bench('full execution with internal auth', async () => {
    const context = createContext('internal')
    const request: ExecuteCodeRequest = {
      code: 'return 42',
      bindings: ['db'],
    }
    await executeCode(request, env, context)
  })

  bench('full execution with tenant auth', async () => {
    const context = createContext('tenant')
    const request: ExecuteCodeRequest = {
      code: 'return 42',
      bindings: ['db'],
    }
    await executeCode(request, env, context)
  })

  bench('full execution with public auth', async () => {
    const context = createContext('public')
    const request: ExecuteCodeRequest = {
      code: 'return 42',
      bindings: [],
    }
    await executeCode(request, env, context)
  })
})

describe('Worker Loader - Initialization Benchmarks', () => {
  let env: Env
  let context: ServiceContext

  beforeEach(() => {
    env = createMockEnv()
    context = createContext('internal')
  })

  bench('initialize for simple code', async () => {
    const request: ExecuteCodeRequest = {
      code: 'return 42',
      bindings: [],
    }
    await executeCode(request, env, context)
  })

  bench('initialize for medium code (~50 lines)', async () => {
    const request: ExecuteCodeRequest = {
      code: `
        const fibonacci = (n) => {
          if (n <= 1) return n;
          return fibonacci(n - 1) + fibonacci(n - 2);
        };

        const numbers = [];
        for (let i = 0; i < 10; i++) {
          numbers.push(fibonacci(i));
        }

        const sum = numbers.reduce((a, b) => a + b, 0);
        const avg = sum / numbers.length;

        return {
          numbers,
          sum,
          avg,
          count: numbers.length
        }
      `,
      bindings: [],
    }
    await executeCode(request, env, context)
  })

  bench('initialize for large code (~100 lines)', async () => {
    const request: ExecuteCodeRequest = {
      code: `
        class Calculator {
          constructor() {
            this.history = [];
          }

          add(a, b) {
            const result = a + b;
            this.history.push({ op: 'add', a, b, result });
            return result;
          }

          subtract(a, b) {
            const result = a - b;
            this.history.push({ op: 'subtract', a, b, result });
            return result;
          }

          multiply(a, b) {
            const result = a * b;
            this.history.push({ op: 'multiply', a, b, result });
            return result;
          }

          divide(a, b) {
            if (b === 0) throw new Error('Division by zero');
            const result = a / b;
            this.history.push({ op: 'divide', a, b, result });
            return result;
          }

          getHistory() {
            return this.history;
          }

          clearHistory() {
            this.history = [];
          }
        }

        const calc = new Calculator();
        calc.add(10, 5);
        calc.subtract(20, 8);
        calc.multiply(3, 7);
        calc.divide(100, 4);

        return {
          history: calc.getHistory(),
          lastResult: calc.history[calc.history.length - 1].result
        }
      `,
      bindings: [],
    }
    await executeCode(request, env, context)
  })
})

describe('Concurrent Execution - Throughput Benchmarks', () => {
  let env: Env
  let context: ServiceContext

  beforeEach(() => {
    env = createMockEnv()
    context = createContext('internal')
  })

  bench('execute 5 concurrent requests', async () => {
    const requests = Array(5)
      .fill(null)
      .map(() => ({
        code: 'return Math.random()',
        bindings: [],
      }))

    await Promise.all(requests.map((request) => executeCode(request, env, context)))
  })

  bench('execute 10 concurrent requests', async () => {
    const requests = Array(10)
      .fill(null)
      .map(() => ({
        code: 'return Math.random()',
        bindings: [],
      }))

    await Promise.all(requests.map((request) => executeCode(request, env, context)))
  })

  bench('execute 25 concurrent requests', async () => {
    const requests = Array(25)
      .fill(null)
      .map(() => ({
        code: 'return Math.random()',
        bindings: [],
      }))

    await Promise.all(requests.map((request) => executeCode(request, env, context)))
  })

  bench('execute 50 concurrent requests', async () => {
    const requests = Array(50)
      .fill(null)
      .map(() => ({
        code: 'return Math.random()',
        bindings: [],
      }))

    await Promise.all(requests.map((request) => executeCode(request, env, context)))
  })
})

describe('Console Logging - Overhead Benchmarks', () => {
  let env: Env
  let context: ServiceContext

  beforeEach(() => {
    env = createMockEnv()
    context = createContext('internal')
  })

  bench('execute without console capture', async () => {
    const request: ExecuteCodeRequest = {
      code: 'return 42',
      bindings: [],
      captureConsole: false,
    }
    await executeCode(request, env, context)
  })

  bench('execute with console capture (no logs)', async () => {
    const request: ExecuteCodeRequest = {
      code: 'return 42',
      bindings: [],
      captureConsole: true,
    }
    await executeCode(request, env, context)
  })

  bench('execute with 1 console.log', async () => {
    const request: ExecuteCodeRequest = {
      code: 'console.log("test"); return 42',
      bindings: [],
      captureConsole: true,
    }
    await executeCode(request, env, context)
  })

  bench('execute with 5 console.log', async () => {
    const request: ExecuteCodeRequest = {
      code: `
        console.log("line 1");
        console.log("line 2");
        console.log("line 3");
        console.log("line 4");
        console.log("line 5");
        return 42
      `,
      bindings: [],
      captureConsole: true,
    }
    await executeCode(request, env, context)
  })

  bench('execute with 10 console.log', async () => {
    const request: ExecuteCodeRequest = {
      code: `
        for (let i = 0; i < 10; i++) {
          console.log(\`iteration \${i}\`);
        }
        return 42
      `,
      bindings: [],
      captureConsole: true,
    }
    await executeCode(request, env, context)
  })
})

describe('Memory Usage - Payload Size Benchmarks', () => {
  let env: Env
  let context: ServiceContext

  beforeEach(() => {
    env = createMockEnv()
    context = createContext('internal')
  })

  bench('return small object (~100 bytes)', async () => {
    const request: ExecuteCodeRequest = {
      code: 'return { id: "123", name: "Alice", age: 30 }',
      bindings: [],
    }
    await executeCode(request, env, context)
  })

  bench('return medium object (~1KB)', async () => {
    const request: ExecuteCodeRequest = {
      code: `
        return {
          id: "123",
          name: "Alice",
          email: "alice@example.com",
          address: {
            street: "123 Main St",
            city: "San Francisco",
            state: "CA",
            zip: "94102"
          },
          preferences: {
            theme: "dark",
            notifications: true,
            language: "en"
          },
          metadata: {
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            version: 1
          }
        }
      `,
      bindings: [],
    }
    await executeCode(request, env, context)
  })

  bench('return large object (~10KB)', async () => {
    const request: ExecuteCodeRequest = {
      code: `
        const items = [];
        for (let i = 0; i < 100; i++) {
          items.push({
            id: \`item-\${i}\`,
            name: \`Item \${i}\`,
            description: "A test item with some description text",
            price: Math.random() * 100,
            inStock: Math.random() > 0.5
          });
        }
        return { items, total: items.length }
      `,
      bindings: [],
    }
    await executeCode(request, env, context)
  })

  bench('return array (100 items)', async () => {
    const request: ExecuteCodeRequest = {
      code: 'return Array.from({ length: 100 }, (_, i) => i)',
      bindings: [],
    }
    await executeCode(request, env, context)
  })

  bench('return array (1000 items)', async () => {
    const request: ExecuteCodeRequest = {
      code: 'return Array.from({ length: 1000 }, (_, i) => i)',
      bindings: [],
    }
    await executeCode(request, env, context)
  })
})
