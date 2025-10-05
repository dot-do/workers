/**
 * Test cases for DO Service (Dynamic Code Execution)
 */

import type { TestCase } from '../adapters/types'

export const doTestCases: TestCase[] = [
  {
    service: 'do',
    method: 'health',
    description: 'should return DO service health status',
    input: {},
    expected: {
      status: 'ok',
      service: 'do',
    },
    tags: ['health', 'fast'],
  },

  {
    service: 'do',
    method: 'eval',
    description: 'should evaluate simple arithmetic',
    input: {
      code: 'return 1 + 1',
    },
    expected: {
      success: true,
      result: 2,
    },
    tags: ['eval', 'sandboxed', 'arithmetic'],
  },

  {
    service: 'do',
    method: 'eval',
    description: 'should evaluate string operations',
    input: {
      code: 'return "hello" + " " + "world"',
    },
    expected: {
      success: true,
      result: 'hello world',
    },
    tags: ['eval', 'sandboxed', 'string'],
  },

  {
    service: 'do',
    method: 'eval',
    description: 'should evaluate array operations',
    input: {
      code: 'return [1, 2, 3].map(x => x * 2)',
    },
    expected: {
      success: true,
      result: [2, 4, 6],
    },
    tags: ['eval', 'sandboxed', 'array'],
  },

  {
    service: 'do',
    method: 'eval',
    description: 'should evaluate async code',
    input: {
      code: 'return await Promise.resolve(42)',
    },
    expected: {
      success: true,
      result: 42,
    },
    tags: ['eval', 'sandboxed', 'async'],
  },

  {
    service: 'do',
    method: 'eval',
    description: 'should capture console.log output',
    input: {
      code: 'console.log("test log"); return 42',
      captureConsole: true,
    },
    assertions: [
      (result) => result.success === true,
      (result) => result.result === 42,
      (result) => Array.isArray(result.logs),
      (result) => result.logs.includes('test log'),
    ],
    tags: ['eval', 'sandboxed', 'console'],
  },

  {
    service: 'do',
    method: 'eval',
    description: 'should NOT have access to $ runtime in sandboxed mode',
    input: {
      code: 'return typeof $ !== "undefined" ? "has access" : "no access"',
    },
    expected: {
      success: true,
      result: 'no access',
    },
    tags: ['eval', 'sandboxed', 'security'],
  },

  {
    service: 'do',
    method: 'eval',
    description: 'should NOT have access to env bindings in sandboxed mode',
    input: {
      code: 'return typeof env !== "undefined" ? "has access" : "no access"',
    },
    expected: {
      success: true,
      result: 'no access',
    },
    tags: ['eval', 'sandboxed', 'security'],
  },

  {
    service: 'do',
    method: 'eval',
    description: 'should handle syntax errors gracefully',
    input: {
      code: 'return 2 +',
    },
    assertions: [
      (result) => result.success === false,
      (result) => typeof result.error?.message === 'string',
    ],
    tags: ['eval', 'sandboxed', 'error'],
  },

  {
    service: 'do',
    method: 'eval',
    description: 'should handle runtime errors',
    input: {
      code: 'throw new Error("Test error")',
    },
    assertions: [
      (result) => result.success === false,
      (result) => result.error?.message.includes('Test error'),
    ],
    tags: ['eval', 'sandboxed', 'error'],
  },

  {
    service: 'do',
    method: 'eval',
    description: 'should respect custom timeout',
    input: {
      code: 'return 42',
      timeout: 5000,
    },
    assertions: [
      (result) => result.success === true,
      (result) => result.executionTime < 5000,
    ],
    tags: ['eval', 'sandboxed', 'timeout'],
  },

  {
    service: 'do',
    method: 'eval',
    description: 'should include execution time in response',
    input: {
      code: 'return 42',
    },
    assertions: [
      (result) => result.success === true,
      (result) => typeof result.executionTime === 'number',
      (result) => result.executionTime >= 0,
    ],
    tags: ['eval', 'sandboxed', 'metrics'],
  },

  {
    service: 'do',
    method: 'eval',
    description: 'should evaluate complex expressions',
    input: {
      code: `
        const factorial = (n) => n <= 1 ? 1 : n * factorial(n - 1)
        return factorial(5)
      `,
    },
    expected: {
      success: true,
      result: 120,
    },
    tags: ['eval', 'sandboxed', 'complex'],
  },

  {
    service: 'do',
    method: 'eval',
    description: 'should be able to use Date',
    input: {
      code: 'return new Date().getFullYear() >= 2025',
    },
    expected: {
      success: true,
      result: true,
    },
    tags: ['eval', 'sandboxed', 'stdlib'],
  },

  {
    service: 'do',
    method: 'eval',
    description: 'should be able to use Promise',
    input: {
      code: 'return await Promise.all([Promise.resolve(1), Promise.resolve(2)])',
    },
    expected: {
      success: true,
      result: [1, 2],
    },
    tags: ['eval', 'sandboxed', 'stdlib'],
  },

  {
    service: 'do',
    method: 'eval',
    description: 'should capture multiple console.log calls',
    input: {
      code: 'console.log("first"); console.log("second"); return 42',
      captureConsole: true,
    },
    assertions: [
      (result) => result.success === true,
      (result) => result.logs.length === 2,
      (result) => result.logs.includes('first'),
      (result) => result.logs.includes('second'),
    ],
    tags: ['eval', 'sandboxed', 'console'],
  },

  {
    service: 'do',
    method: 'eval',
    description: 'should provide stack traces for errors',
    input: {
      code: 'throw new Error("Stack trace test")',
    },
    assertions: [
      (result) => result.success === false,
      (result) => typeof result.error?.stack === 'string',
    ],
    tags: ['eval', 'sandboxed', 'error'],
  },
]
