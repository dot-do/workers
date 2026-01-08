/**
 * @dotdo/odata-filter - OData $filter expression parser
 *
 * Parse OData filter expressions into AST and convert to SQL WHERE clauses.
 *
 * @example
 * ```typescript
 * import { parseFilter, filterToSQL } from '@dotdo/odata-filter'
 *
 * // Parse filter expression
 * const result = parseFilter("status eq 'active' and age gt 18")
 *
 * if (result.errors.length > 0) {
 *   console.error('Parse errors:', result.errors)
 * }
 *
 * // Convert to SQL
 * const { sql, params } = filterToSQL(result.ast)
 * console.log(sql)     // "(status = ? AND age > ?)"
 * console.log(params)  // ["active", 18]
 * ```
 */

export * from './types'
export * from './tokenizer'
export * from './parser'
export * from './sql-converter'

import { parseFilter } from './parser'
import { filterToSQL } from './sql-converter'

/**
 * All-in-one: Parse OData filter and convert to SQL
 */
export function odataToSQL(expression: string) {
  const parseResult = parseFilter(expression)

  if (parseResult.errors.length > 0) {
    throw new Error(
      `Failed to parse filter expression: ${parseResult.errors.map((e) => e.message).join(', ')}`
    )
  }

  return filterToSQL(parseResult.ast)
}
