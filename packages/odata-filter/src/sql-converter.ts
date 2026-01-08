import { ASTNode, SQLResult } from './types'

/**
 * SQL Converter for OData Filter AST
 *
 * Converts an Abstract Syntax Tree (AST) into SQL WHERE clause
 * with parameterized queries for security.
 */
export class SQLConverter {
  private params: any[] = []
  private paramIndex: number = 0

  /**
   * Convert an AST to SQL WHERE clause
   */
  toSQL(ast: ASTNode): SQLResult {
    this.params = []
    this.paramIndex = 0

    const sql = this.visit(ast)

    return {
      sql,
      params: this.params,
    }
  }

  private visit(node: ASTNode): string {
    switch (node.type) {
      case 'BinaryExpression':
        return this.visitBinaryExpression(node)
      case 'UnaryExpression':
        return this.visitUnaryExpression(node)
      case 'LogicalExpression':
        return this.visitLogicalExpression(node)
      case 'FunctionCall':
        return this.visitFunctionCall(node)
      case 'Identifier':
        return this.visitIdentifier(node)
      case 'Literal':
        return this.visitLiteral(node)
      default:
        throw new Error(`Unknown node type: ${(node as any).type}`)
    }
  }

  private visitBinaryExpression(node: ASTNode & { type: 'BinaryExpression' }): string {
    const left = this.visit(node.left)
    const right = this.visit(node.right)

    const operatorMap: Record<string, string> = {
      eq: '=',
      ne: '!=',
      gt: '>',
      ge: '>=',
      lt: '<',
      le: '<=',
    }

    const sqlOp = operatorMap[node.operator]
    if (!sqlOp) {
      throw new Error(`Unknown operator: ${node.operator}`)
    }

    return `${left} ${sqlOp} ${right}`
  }

  private visitUnaryExpression(node: ASTNode & { type: 'UnaryExpression' }): string {
    const argument = this.visit(node.argument)

    if (node.operator === 'not') {
      return `NOT (${argument})`
    }

    throw new Error(`Unknown unary operator: ${node.operator}`)
  }

  private visitLogicalExpression(node: ASTNode & { type: 'LogicalExpression' }): string {
    const left = this.visit(node.left)
    const right = this.visit(node.right)

    const operatorMap: Record<string, string> = {
      and: 'AND',
      or: 'OR',
    }

    const sqlOp = operatorMap[node.operator]
    if (!sqlOp) {
      throw new Error(`Unknown logical operator: ${node.operator}`)
    }

    return `(${left} ${sqlOp} ${right})`
  }

  private visitFunctionCall(node: ASTNode & { type: 'FunctionCall' }): string {
    const { name, arguments: args } = node

    if (args.length < 2) {
      throw new Error(`Function '${name}' requires at least 2 arguments`)
    }

    const field = this.visit(args[0])
    const searchValue = this.visit(args[1])

    switch (name) {
      case 'contains':
        // For contains, we need to modify the search value to include wildcards
        // If searchValue is already a param placeholder, we need to modify the param
        if (searchValue.startsWith('?')) {
          const paramIdx = this.params.length - 1
          this.params[paramIdx] = `%${this.params[paramIdx]}%`
        }
        return `${field} LIKE ${searchValue}`

      case 'startswith':
        if (searchValue.startsWith('?')) {
          const paramIdx = this.params.length - 1
          this.params[paramIdx] = `${this.params[paramIdx]}%`
        }
        return `${field} LIKE ${searchValue}`

      case 'endswith':
        if (searchValue.startsWith('?')) {
          const paramIdx = this.params.length - 1
          this.params[paramIdx] = `%${this.params[paramIdx]}`
        }
        return `${field} LIKE ${searchValue}`

      default:
        throw new Error(`Unknown function: ${name}`)
    }
  }

  private visitIdentifier(node: ASTNode & { type: 'Identifier' }): string {
    // In SQL, identifiers should be properly quoted to avoid SQL injection
    // For simplicity, we'll just return the name, but in production you'd want
    // to validate against a whitelist or use proper escaping
    return node.name
  }

  private visitLiteral(node: ASTNode & { type: 'Literal' }): string {
    // Use parameterized queries for security
    this.params.push(node.value)
    this.paramIndex++

    // Return placeholder (SQLite-style)
    return '?'
  }
}

/**
 * Convenience function to convert a filter expression to SQL
 */
export function filterToSQL(ast: ASTNode): SQLResult {
  const converter = new SQLConverter()
  return converter.toSQL(ast)
}
