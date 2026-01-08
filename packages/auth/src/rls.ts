// Row Level Security (RLS) - Types and Implementation
// @dotdo/auth - Row-Level Security for SQLite/D1

/**
 * Supported policy operations
 */
export type PolicyOperation = 'select' | 'insert' | 'update' | 'delete' | 'all'

/**
 * RLS Policy definition
 */
export interface RLSPolicy {
  /** Unique policy identifier */
  id: string
  /** Table this policy applies to */
  table: string
  /** Operation(s) this policy applies to */
  operation: PolicyOperation
  /** USING expression - filter for which rows are visible/modifiable */
  using?: string
  /** WITH CHECK expression - check for new rows (INSERT/UPDATE) */
  withCheck?: string
  /** Policy description */
  description?: string
}

/**
 * RLS Context - contains user information for policy evaluation
 */
export interface RLSContext {
  /** User ID from authentication */
  userId?: string
  /** User role (service_role bypasses RLS) */
  role?: string
  /** Additional metadata for policy evaluation */
  metadata?: Record<string, unknown>
}

/**
 * SQL filter result
 */
export interface SQLFilter {
  /** SQL WHERE clause (without the WHERE keyword) */
  sql: string
  /** Parameters for parameterized query */
  params: unknown[]
}

/**
 * RLS instance interface
 */
export interface RLS {
  /** Add a policy */
  addPolicy(policy: RLSPolicy): void
  /** Remove a policy */
  removePolicy(policyId: string): void
  /** Get all policies for a table */
  getPolicies(table: string, operation?: PolicyOperation): RLSPolicy[]
  /** Generate WHERE clause for SELECT queries */
  generateWhereClause(table: string, operation: PolicyOperation, context: RLSContext): SQLFilter
  /** Secure a SQL query by injecting RLS filters */
  secureQuery(sql: string, params: unknown[], context: RLSContext): { sql: string; params: unknown[] }
  /** Check if INSERT is allowed */
  checkInsert(table: string, newRow: Record<string, unknown>, context: RLSContext): boolean
  /** Check if UPDATE is allowed */
  checkUpdate(table: string, oldRow: Record<string, unknown>, newRow: Record<string, unknown>, context: RLSContext): boolean
  /** Check if DELETE is allowed */
  checkDelete(table: string, row: Record<string, unknown>, context: RLSContext): boolean
}

/**
 * Parse policy expression and replace auth.uid() with parameter placeholders
 */
function parsePolicyExpression(expression: string, context: RLSContext): SQLFilter {
  if (!expression) {
    return { sql: '', params: [] }
  }

  const params: unknown[] = []
  let sql = expression

  // Replace all occurrences of auth.uid() with parameter placeholders
  const authUidRegex = /auth\.uid\(\)/g
  const matches = expression.match(authUidRegex)

  if (matches) {
    // Check if userId is available in context
    if (!context.userId && context.role !== 'service_role') {
      throw new Error('auth.uid() requires userId in context')
    }

    // Replace each auth.uid() with ? and add userId to params
    sql = expression.replace(authUidRegex, () => {
      params.push(context.userId)
      return '?'
    })
  }

  return { sql, params }
}

/**
 * Evaluate a policy expression against a row
 */
function evaluateExpression(expression: string, row: Record<string, unknown>, context: RLSContext): boolean {
  // Simple expression evaluator for common patterns
  // This is a simplified implementation - a real implementation would use a proper SQL parser

  // Replace auth.uid() with actual user ID
  let expr = expression.replace(/auth\.uid\(\)/g, () => {
    return context.userId ? `'${context.userId}'` : 'null'
  })

  // Simple parser for common patterns
  // Pattern: column = value
  const simpleEqualPattern = /^(\w+)\s*=\s*'([^']+)'$/
  const match = expr.match(simpleEqualPattern)
  if (match) {
    const [, column, value] = match
    return row[column!] === value
  }

  // Pattern: column = true/false
  const boolPattern = /^(\w+)\s*=\s*(true|false)$/
  const boolMatch = expr.match(boolPattern)
  if (boolMatch) {
    const [, column, value] = boolMatch
    return row[column!] === (value === 'true')
  }

  // Pattern: expression OR expression
  if (expr.includes(' OR ')) {
    const parts = expr.split(' OR ')
    return parts.some(part => evaluateExpression(part.trim(), row, context))
  }

  // Pattern: expression AND expression
  if (expr.includes(' AND ')) {
    const parts = expr.split(' AND ')
    return parts.every(part => evaluateExpression(part.trim(), row, context))
  }

  // Default: assume true for expressions we can't parse
  // In a real implementation, this would use a proper SQL expression evaluator
  return true
}

/**
 * Check if role should bypass RLS
 */
function shouldBypassRLS(context: RLSContext): boolean {
  return context.role === 'service_role'
}

/**
 * Internal RLS implementation
 */
class RLSImpl implements RLS {
  private policies: Map<string, RLSPolicy> = new Map()

  addPolicy(policy: RLSPolicy): void {
    this.policies.set(policy.id, policy)
  }

  removePolicy(policyId: string): void {
    this.policies.delete(policyId)
  }

  getPolicies(table: string, operation?: PolicyOperation): RLSPolicy[] {
    const allPolicies = Array.from(this.policies.values())
    return allPolicies.filter(policy => {
      if (policy.table !== table) return false
      if (!operation) return true
      return policy.operation === operation || policy.operation === 'all'
    })
  }

  generateWhereClause(table: string, operation: PolicyOperation, context: RLSContext): SQLFilter {
    // Service role bypasses RLS
    if (shouldBypassRLS(context)) {
      return { sql: '', params: [] }
    }

    const policies = this.getPolicies(table, operation)

    if (policies.length === 0) {
      return { sql: '', params: [] }
    }

    // Combine multiple policies with OR
    const filters: SQLFilter[] = []

    for (const policy of policies) {
      const expression = policy.using || ''
      if (expression) {
        filters.push(parsePolicyExpression(expression, context))
      }
    }

    if (filters.length === 0) {
      return { sql: '', params: [] }
    }

    if (filters.length === 1) {
      return filters[0]!
    }

    // Combine with OR
    const sql = filters.map(f => `(${f.sql})`).join(' OR ')
    const params = filters.flatMap(f => f.params)

    return { sql, params }
  }

  secureQuery(sql: string, params: unknown[], context: RLSContext): { sql: string; params: unknown[] } {
    // Service role bypasses RLS
    if (shouldBypassRLS(context)) {
      return { sql, params }
    }

    // Extract table name from query (simple parsing)
    // This is a simplified implementation - a real one would use a proper SQL parser
    const fromMatch = sql.match(/FROM\s+(\w+)/i)
    if (!fromMatch) {
      // Can't determine table, return unchanged
      return { sql, params }
    }

    const table = fromMatch[1]!

    // Determine operation
    let operation: PolicyOperation = 'select'
    if (sql.trim().toUpperCase().startsWith('SELECT')) {
      operation = 'select'
    } else if (sql.trim().toUpperCase().startsWith('INSERT')) {
      operation = 'insert'
    } else if (sql.trim().toUpperCase().startsWith('UPDATE')) {
      operation = 'update'
    } else if (sql.trim().toUpperCase().startsWith('DELETE')) {
      operation = 'delete'
    }

    const filter = this.generateWhereClause(table, operation, context)

    if (!filter.sql) {
      return { sql, params }
    }

    // Inject WHERE clause
    const whereMatch = sql.match(/WHERE/i)

    if (whereMatch) {
      // Query already has WHERE clause - inject with AND
      const whereIndex = whereMatch.index!
      const beforeWhere = sql.substring(0, whereIndex + 5) // Include 'WHERE'
      const afterWhere = sql.substring(whereIndex + 5)

      const newSql = `${beforeWhere} (${filter.sql}) AND (${afterWhere.trim()})`
      const newParams = [...filter.params, ...params]

      return { sql: newSql, params: newParams }
    } else {
      // No WHERE clause - add one
      const newSql = `${sql.trim()} WHERE (${filter.sql})`
      const newParams = [...filter.params, ...params]

      return { sql: newSql, params: newParams }
    }
  }

  checkInsert(table: string, newRow: Record<string, unknown>, context: RLSContext): boolean {
    // Service role bypasses RLS
    if (shouldBypassRLS(context)) {
      return true
    }

    const policies = this.getPolicies(table, 'insert')

    if (policies.length === 0) {
      return true // No policies = allow
    }

    // Check WITH CHECK expressions (combined with OR)
    for (const policy of policies) {
      const expression = policy.withCheck || ''
      if (expression) {
        if (evaluateExpression(expression, newRow, context)) {
          return true // At least one policy allows it
        }
      } else {
        return true // No WITH CHECK = allow
      }
    }

    return false // No policy allowed it
  }

  checkUpdate(table: string, oldRow: Record<string, unknown>, newRow: Record<string, unknown>, context: RLSContext): boolean {
    // Service role bypasses RLS
    if (shouldBypassRLS(context)) {
      return true
    }

    const policies = this.getPolicies(table, 'update')

    if (policies.length === 0) {
      return true // No policies = allow
    }

    // For UPDATE, need to check both USING (on old row) and WITH CHECK (on new row)
    for (const policy of policies) {
      let usingPasses = true
      let withCheckPasses = true

      if (policy.using) {
        usingPasses = evaluateExpression(policy.using, oldRow, context)
      }

      if (policy.withCheck) {
        withCheckPasses = evaluateExpression(policy.withCheck, newRow, context)
      }

      if (usingPasses && withCheckPasses) {
        return true // At least one policy allows it
      }
    }

    return false // No policy allowed it
  }

  checkDelete(table: string, row: Record<string, unknown>, context: RLSContext): boolean {
    // Service role bypasses RLS
    if (shouldBypassRLS(context)) {
      return true
    }

    const policies = this.getPolicies(table, 'delete')

    if (policies.length === 0) {
      return true // No policies = allow
    }

    // Check USING expressions (combined with OR)
    for (const policy of policies) {
      const expression = policy.using || ''
      if (expression) {
        if (evaluateExpression(expression, row, context)) {
          return true // At least one policy allows it
        }
      } else {
        return true // No USING = allow
      }
    }

    return false // No policy allowed it
  }
}

/**
 * Create a new RLS instance
 */
export function createRLS(): RLS {
  return new RLSImpl()
}

/**
 * RLS table schema for storing policies in database
 */
export const rlsPoliciesTableSchema = `
CREATE TABLE IF NOT EXISTS rls_policies (
  id TEXT PRIMARY KEY,
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL,
  using_expression TEXT,
  with_check_expression TEXT,
  description TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
)
`

/**
 * Helper to create RLS policy from database row
 */
export function policyFromRow(row: Record<string, unknown>): RLSPolicy {
  return {
    id: row.id as string,
    table: row.table_name as string,
    operation: row.operation as PolicyOperation,
    using: row.using_expression as string | undefined,
    withCheck: row.with_check_expression as string | undefined,
    description: row.description as string | undefined,
  }
}
