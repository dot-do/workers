# @dotdo/odata-filter

OData `$filter` expression parser with AST generation and SQL conversion for Cloudflare Workers.

## Features

- **Tokenization** - Convert filter strings into tokens
- **AST Generation** - Parse tokens into Abstract Syntax Tree
- **SQL Conversion** - Convert AST to parameterized SQL WHERE clauses
- **OData v4 Compatible** - Supports standard OData filter operators and functions
- **Security** - Parameterized queries to prevent SQL injection
- **Error Handling** - Helpful error messages for debugging

## Installation

```bash
npm install @dotdo/odata-filter
```

## Usage

### Quick Start

```typescript
import { odataToSQL } from '@dotdo/odata-filter'

// Simple conversion
const { sql, params } = odataToSQL("status eq 'active' and age gt 18")
console.log(sql)    // "(status = ? AND age > ?)"
console.log(params) // ["active", 18]

// Use with Cloudflare D1
const results = await env.DB.prepare(`SELECT * FROM users WHERE ${sql}`)
  .bind(...params)
  .all()
```

### Step-by-Step

```typescript
import { parseFilter, filterToSQL } from '@dotdo/odata-filter'

// 1. Parse the filter expression
const result = parseFilter("contains(name, 'John') and verified eq true")

// 2. Check for errors
if (result.errors.length > 0) {
  console.error('Parse errors:', result.errors)
}

// 3. Convert AST to SQL
const { sql, params } = filterToSQL(result.ast)

// 4. Execute query
const users = await env.DB.prepare(`SELECT * FROM users WHERE ${sql}`)
  .bind(...params)
  .all()
```

## Supported Operators

### Comparison Operators

| OData | SQL | Example |
|-------|-----|---------|
| `eq` | `=` | `status eq 'active'` |
| `ne` | `!=` | `status ne 'deleted'` |
| `gt` | `>` | `age gt 18` |
| `ge` | `>=` | `price ge 100` |
| `lt` | `<` | `count lt 10` |
| `le` | `<=` | `score le 100` |

### Logical Operators

| OData | SQL | Example |
|-------|-----|---------|
| `and` | `AND` | `status eq 'active' and verified eq true` |
| `or` | `OR` | `role eq 'admin' or role eq 'moderator'` |
| `not` | `NOT` | `not deleted eq true` |

### String Functions

| Function | SQL | Example |
|----------|-----|---------|
| `contains(field, value)` | `field LIKE %value%` | `contains(name, 'John')` |
| `startswith(field, value)` | `field LIKE value%` | `startswith(email, 'admin')` |
| `endswith(field, value)` | `field LIKE %value` | `endswith(domain, '.com')` |

## Examples

### Basic Filtering

```typescript
// Single condition
odataToSQL("status eq 'active'")
// SQL: "status = ?"
// Params: ["active"]

// Multiple conditions with AND
odataToSQL("status eq 'active' and age gt 18")
// SQL: "(status = ? AND age > ?)"
// Params: ["active", 18]

// Multiple conditions with OR
odataToSQL("role eq 'admin' or role eq 'moderator'")
// SQL: "(role = ? OR role = ?)"
// Params: ["admin", "moderator"]
```

### String Functions

```typescript
// Search for substring
odataToSQL("contains(name, 'John')")
// SQL: "name LIKE ?"
// Params: ["%John%"]

// Starts with
odataToSQL("startswith(email, 'admin')")
// SQL: "email LIKE ?"
// Params: ["admin%"]

// Ends with
odataToSQL("endswith(filename, '.pdf')")
// SQL: "filename LIKE ?"
// Params: ["%.pdf"]
```

### Complex Filters

```typescript
// Grouped expressions
odataToSQL("(status eq 'active' or status eq 'pending') and verified eq true")
// SQL: "((status = ? OR status = ?) AND verified = ?)"
// Params: ["active", "pending", true]

// Negation
odataToSQL("not (deleted eq true or archived eq true)")
// SQL: "NOT ((deleted = ? OR archived = ?))"
// Params: [true, true]

// Date ranges
odataToSQL("createdAt ge '2024-01-01' and createdAt le '2024-12-31'")
// SQL: "(createdAt >= ? AND createdAt <= ?)"
// Params: ["2024-01-01", "2024-12-31"]
```

### Real-World Examples

```typescript
// Microsoft Dynamics 365
odataToSQL("revenue gt 1000000 and statecode eq 0 and contains(name, 'Corp')")

// Zendesk Users
odataToSQL("role eq 'agent' and active eq true and contains(email, '@company.com')")

// HubSpot Contacts
odataToSQL("lifecyclestage eq 'customer' and createdate ge '2024-01-01'")

// SAP Business One
odataToSQL("CardType eq 'C' and (GroupCode eq 100 or GroupCode eq 101)")
```

## API Reference

### `odataToSQL(expression: string): SQLResult`

All-in-one function to parse and convert an OData filter expression to SQL.

**Parameters:**
- `expression` - OData filter expression string

**Returns:**
```typescript
{
  sql: string    // SQL WHERE clause with ? placeholders
  params: any[]  // Array of parameter values
}
```

**Throws:** Error if the expression cannot be parsed

### `parseFilter(expression: string): ParseResult`

Parse an OData filter expression into an AST.

**Returns:**
```typescript
{
  ast: ASTNode         // Abstract Syntax Tree
  errors: ParseError[] // Array of parse errors (empty if successful)
}
```

### `filterToSQL(ast: ASTNode): SQLResult`

Convert an AST to SQL WHERE clause.

**Parameters:**
- `ast` - Abstract Syntax Tree from `parseFilter()`

**Returns:**
```typescript
{
  sql: string    // SQL WHERE clause
  params: any[]  // Parameter values
}
```

## AST Structure

The parser generates a strongly-typed AST:

```typescript
type ASTNode =
  | BinaryExpression   // eq, ne, gt, ge, lt, le
  | UnaryExpression    // not
  | LogicalExpression  // and, or
  | FunctionCall       // contains, startswith, endswith
  | Identifier         // field names
  | Literal            // string, number, boolean, null
```

## Error Handling

The parser provides helpful error messages:

```typescript
const result = parseFilter("status eq")

if (result.errors.length > 0) {
  result.errors.forEach(error => {
    console.error(`Error at position ${error.position}: ${error.message}`)
  })
}
```

## Security

All values are parameterized to prevent SQL injection:

```typescript
// SAFE - uses parameterized queries
const { sql, params } = odataToSQL("name eq 'John'")
await db.prepare(`SELECT * FROM users WHERE ${sql}`).bind(...params).all()

// NEVER do this - SQL injection risk
const filter = "name eq 'John'"
await db.prepare(`SELECT * FROM users WHERE name = '${filter}'`).all()
```

## Use Cases

### API Query Parameters

```typescript
// GET /api/users?$filter=status eq 'active'
export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url)
    const filter = url.searchParams.get('$filter')

    if (filter) {
      const { sql, params } = odataToSQL(filter)
      return env.DB.prepare(`SELECT * FROM users WHERE ${sql}`)
        .bind(...params)
        .all()
    }

    return env.DB.prepare('SELECT * FROM users').all()
  }
}
```

### OData Service Implementation

```typescript
import { odataToSQL } from '@dotdo/odata-filter'

class ODataService {
  async query(entity: string, filter?: string) {
    let sql = `SELECT * FROM ${entity}`

    if (filter) {
      const { sql: whereSql, params } = odataToSQL(filter)
      sql += ` WHERE ${whereSql}`
      return this.db.prepare(sql).bind(...params).all()
    }

    return this.db.prepare(sql).all()
  }
}
```

### Dynamics 365 / SAP / Salesforce Compatibility

```typescript
// Your OData-compatible API
GET /api/data/v9.2/accounts?$filter=revenue gt 1000000

// Implementation
const { sql, params } = odataToSQL(request.query.$filter)
const accounts = await env.DB.prepare(`
  SELECT * FROM accounts WHERE ${sql}
`).bind(...params).all()
```

## Limitations

- Does not support all OData functions (only `contains`, `startswith`, `endswith`)
- Does not support `$expand`, `$select`, `$orderby` (use separate packages)
- Identifiers are not escaped (validate against whitelist in production)
- Case-sensitive by default (use SQL `COLLATE NOCASE` if needed)

## Contributing

Contributions welcome! See [CONTRIBUTING.md](../../CONTRIBUTING.md).

## License

MIT - see [LICENSE](../../LICENSE)
