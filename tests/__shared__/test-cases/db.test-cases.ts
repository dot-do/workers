/**
 * Test cases for DB Service
 */

import type { TestCase } from '../adapters/types'

export const dbTestCases: TestCase[] = [
  {
    service: 'db',
    method: 'health',
    description: 'should return db health status',
    input: {},
    expected: {
      status: 'ok',
      service: 'db',
    },
    tags: ['health', 'fast'],
  },

  {
    service: 'db',
    method: 'query',
    description: 'should execute simple SELECT query',
    input: {
      sql: 'SELECT 1 as num',
      params: [],
    },
    assertions: [
      (result) => Array.isArray(result.rows),
      (result) => result.rows.length === 1,
      (result) => result.rows[0].num === 1,
    ],
    tags: ['query', 'read'],
  },

  {
    service: 'db',
    method: 'query',
    description: 'should execute parameterized query',
    input: {
      sql: 'SELECT ? as value',
      params: ['test'],
    },
    assertions: [
      (result) => result.rows[0].value === 'test',
    ],
    tags: ['query', 'read'],
  },

  {
    service: 'db',
    method: 'execute',
    description: 'should execute INSERT statement',
    input: {
      sql: 'INSERT INTO test_table (name) VALUES (?)',
      params: ['test-name'],
    },
    assertions: [
      (result) => typeof result.lastInsertId !== 'undefined',
      (result) => result.changes === 1,
    ],
    tags: ['write', 'insert'],
  },

  {
    service: 'db',
    method: 'execute',
    description: 'should execute UPDATE statement',
    input: {
      sql: 'UPDATE test_table SET name = ? WHERE id = ?',
      params: ['updated-name', 1],
    },
    assertions: [
      (result) => typeof result.changes === 'number',
    ],
    tags: ['write', 'update'],
  },

  {
    service: 'db',
    method: 'execute',
    description: 'should execute DELETE statement',
    input: {
      sql: 'DELETE FROM test_table WHERE id = ?',
      params: [1],
    },
    assertions: [
      (result) => typeof result.changes === 'number',
    ],
    tags: ['write', 'delete'],
  },

  {
    service: 'db',
    method: 'batch',
    description: 'should execute multiple statements in batch',
    input: {
      statements: [
        { sql: 'INSERT INTO test_table (name) VALUES (?)', params: ['batch-1'] },
        { sql: 'INSERT INTO test_table (name) VALUES (?)', params: ['batch-2'] },
        { sql: 'INSERT INTO test_table (name) VALUES (?)', params: ['batch-3'] },
      ],
    },
    assertions: [
      (result) => Array.isArray(result.results),
      (result) => result.results.length === 3,
      (result) => result.results.every((r: any) => r.changes === 1),
    ],
    tags: ['write', 'batch'],
  },

  {
    service: 'db',
    method: 'transaction',
    description: 'should execute statements in transaction',
    input: {
      statements: [
        { sql: 'INSERT INTO test_table (name) VALUES (?)', params: ['tx-1'] },
        { sql: 'INSERT INTO test_table (name) VALUES (?)', params: ['tx-2'] },
      ],
    },
    assertions: [
      (result) => result.success === true,
      (result) => Array.isArray(result.results),
    ],
    tags: ['write', 'transaction'],
  },

  {
    service: 'db',
    method: 'first',
    description: 'should return first row from query',
    input: {
      sql: 'SELECT ? as value',
      params: ['first'],
    },
    assertions: [
      (result) => result !== null,
      (result) => result.value === 'first',
    ],
    tags: ['query', 'read'],
  },

  {
    service: 'db',
    method: 'count',
    description: 'should count rows in table',
    input: {
      table: 'test_table',
      where: {},
    },
    assertions: [
      (result) => typeof result.count === 'number',
      (result) => result.count >= 0,
    ],
    tags: ['query', 'aggregate'],
  },

  {
    service: 'db',
    method: 'exists',
    description: 'should check if row exists',
    input: {
      table: 'test_table',
      where: { id: 1 },
    },
    assertions: [
      (result) => typeof result.exists === 'boolean',
    ],
    tags: ['query', 'read', 'fast'],
  },
]
