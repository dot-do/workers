/**
 * FHIR Date Search Parameter Parsing
 *
 * Implements FHIR R4 date search parameter handling including:
 * - Date prefix parsing (ge, gt, le, lt, eq, ne, sa, eb, ap)
 * - ISO date string parsing
 * - Date range comparison logic
 *
 * @see https://www.hl7.org/fhir/search.html#date
 */

/**
 * FHIR date search prefixes
 */
export type DatePrefix = 'eq' | 'ne' | 'gt' | 'lt' | 'ge' | 'le' | 'sa' | 'eb' | 'ap'

/**
 * Parsed date search parameter
 */
export interface ParsedDateParam {
  /** The comparison prefix */
  prefix: DatePrefix
  /** The date value as ISO string */
  value: string
  /** Parsed Date object */
  date: Date
  /** Precision of the date (year, month, day, etc.) */
  precision: DatePrecision
}

/**
 * Date precision levels
 */
export type DatePrecision = 'year' | 'month' | 'day' | 'hour' | 'minute' | 'second' | 'millisecond'

/**
 * Default prefix when none is specified
 */
const DEFAULT_PREFIX: DatePrefix = 'eq'

/**
 * Valid prefix patterns
 */
const PREFIX_PATTERN = /^(eq|ne|gt|lt|ge|le|sa|eb|ap)/

/**
 * Parses a FHIR date search parameter string
 *
 * @param param - The search parameter value (e.g., "ge2024-01-01", "2024-01")
 * @returns Parsed date parameter or null if invalid
 *
 * @example
 * ```ts
 * parseDateParam('ge2024-01-01')
 * // { prefix: 'ge', value: '2024-01-01', date: Date, precision: 'day' }
 *
 * parseDateParam('2024-01')
 * // { prefix: 'eq', value: '2024-01', date: Date, precision: 'month' }
 * ```
 */
export function parseDateParam(param: string): ParsedDateParam | null {
  if (!param || typeof param !== 'string') {
    return null
  }

  const trimmed = param.trim()
  if (!trimmed) {
    return null
  }

  // Extract prefix if present
  const prefixMatch = trimmed.match(PREFIX_PATTERN)
  const prefix: DatePrefix = prefixMatch ? (prefixMatch[1] as DatePrefix) : DEFAULT_PREFIX
  const dateString = prefixMatch ? trimmed.slice(prefixMatch[1].length) : trimmed

  // Validate and parse the date
  const date = parseDate(dateString)
  if (!date) {
    return null
  }

  const precision = detectPrecision(dateString)

  return {
    prefix,
    value: dateString,
    date,
    precision,
  }
}

/**
 * Parses multiple comma-separated date parameters
 *
 * @param param - Comma-separated date parameters (e.g., "ge2024-01-01,le2024-12-31")
 * @returns Array of parsed date parameters
 */
export function parseDateParams(param: string): ParsedDateParam[] {
  if (!param) return []

  return param
    .split(',')
    .map((p) => parseDateParam(p.trim()))
    .filter((p): p is ParsedDateParam => p !== null)
}

/**
 * Parses a date string into a Date object
 */
function parseDate(dateString: string): Date | null {
  if (!dateString) return null

  // Try to parse as ISO date
  const date = new Date(dateString)

  // Check if valid
  if (isNaN(date.getTime())) {
    return null
  }

  return date
}

/**
 * Detects the precision level of a date string
 */
function detectPrecision(dateString: string): DatePrecision {
  // Count segments to determine precision
  // YYYY -> year
  // YYYY-MM -> month
  // YYYY-MM-DD -> day
  // YYYY-MM-DDTHH -> hour
  // YYYY-MM-DDTHH:MM -> minute
  // YYYY-MM-DDTHH:MM:SS -> second
  // YYYY-MM-DDTHH:MM:SS.sss -> millisecond

  if (dateString.includes('.')) {
    return 'millisecond'
  }

  const timeIndex = dateString.indexOf('T')

  if (timeIndex === -1) {
    // Date only
    const segments = dateString.split('-').length
    switch (segments) {
      case 1:
        return 'year'
      case 2:
        return 'month'
      default:
        return 'day'
    }
  }

  // Has time component
  const timePart = dateString.slice(timeIndex + 1)
  const colonCount = (timePart.match(/:/g) || []).length

  switch (colonCount) {
    case 0:
      return 'hour'
    case 1:
      return 'minute'
    default:
      return 'second'
  }
}

/**
 * Compares a date against a parsed date parameter
 *
 * @param targetDate - The date to compare
 * @param param - The parsed date parameter
 * @returns true if the comparison matches
 */
export function matchesDateParam(targetDate: Date | string, param: ParsedDateParam): boolean {
  const target = typeof targetDate === 'string' ? new Date(targetDate) : targetDate

  if (isNaN(target.getTime())) {
    return false
  }

  const { range } = getDateRange(param)

  switch (param.prefix) {
    case 'eq':
      return target >= range.start && target < range.end
    case 'ne':
      return target < range.start || target >= range.end
    case 'gt':
      return target >= range.end
    case 'lt':
      return target < range.start
    case 'ge':
      return target >= range.start
    case 'le':
      return target < range.end
    case 'sa':
      // Starts after - target is after the end of the parameter range
      return target >= range.end
    case 'eb':
      // Ends before - target is before the start of the parameter range
      return target < range.start
    case 'ap':
      // Approximately - within 10% of the range, or 1 day minimum
      const rangeDuration = range.end.getTime() - range.start.getTime()
      const tolerance = Math.max(rangeDuration * 0.1, 86400000) // 10% or 1 day
      const paddedStart = new Date(range.start.getTime() - tolerance)
      const paddedEnd = new Date(range.end.getTime() + tolerance)
      return target >= paddedStart && target < paddedEnd
    default:
      return false
  }
}

/**
 * Gets the implicit date range for a date parameter based on precision
 */
function getDateRange(param: ParsedDateParam): { range: { start: Date; end: Date } } {
  const start = new Date(param.date)
  const end = new Date(param.date)

  switch (param.precision) {
    case 'year':
      start.setMonth(0, 1)
      start.setHours(0, 0, 0, 0)
      end.setFullYear(end.getFullYear() + 1)
      end.setMonth(0, 1)
      end.setHours(0, 0, 0, 0)
      break
    case 'month':
      start.setDate(1)
      start.setHours(0, 0, 0, 0)
      end.setMonth(end.getMonth() + 1)
      end.setDate(1)
      end.setHours(0, 0, 0, 0)
      break
    case 'day':
      start.setHours(0, 0, 0, 0)
      end.setDate(end.getDate() + 1)
      end.setHours(0, 0, 0, 0)
      break
    case 'hour':
      start.setMinutes(0, 0, 0)
      end.setHours(end.getHours() + 1)
      end.setMinutes(0, 0, 0)
      break
    case 'minute':
      start.setSeconds(0, 0)
      end.setMinutes(end.getMinutes() + 1)
      end.setSeconds(0, 0)
      break
    case 'second':
      start.setMilliseconds(0)
      end.setSeconds(end.getSeconds() + 1)
      end.setMilliseconds(0)
      break
    case 'millisecond':
      end.setMilliseconds(end.getMilliseconds() + 1)
      break
  }

  return { range: { start, end } }
}

/**
 * Builds a SQL WHERE clause for date parameters
 *
 * @param column - The database column name
 * @param params - Array of parsed date parameters
 * @returns SQL fragment and parameter values
 */
export function buildDateSqlClause(
  column: string,
  params: ParsedDateParam[]
): { sql: string; values: (string | number)[] } {
  if (!params.length) {
    return { sql: '1=1', values: [] }
  }

  const clauses: string[] = []
  const values: (string | number)[] = []

  for (const param of params) {
    const { range } = getDateRange(param)
    const startIso = range.start.toISOString()
    const endIso = range.end.toISOString()

    switch (param.prefix) {
      case 'eq':
        clauses.push(`(${column} >= ? AND ${column} < ?)`)
        values.push(startIso, endIso)
        break
      case 'ne':
        clauses.push(`(${column} < ? OR ${column} >= ?)`)
        values.push(startIso, endIso)
        break
      case 'gt':
        clauses.push(`${column} >= ?`)
        values.push(endIso)
        break
      case 'lt':
        clauses.push(`${column} < ?`)
        values.push(startIso)
        break
      case 'ge':
        clauses.push(`${column} >= ?`)
        values.push(startIso)
        break
      case 'le':
        clauses.push(`${column} < ?`)
        values.push(endIso)
        break
      case 'sa':
        clauses.push(`${column} >= ?`)
        values.push(endIso)
        break
      case 'eb':
        clauses.push(`${column} < ?`)
        values.push(startIso)
        break
      case 'ap':
        const rangeDuration = range.end.getTime() - range.start.getTime()
        const tolerance = Math.max(rangeDuration * 0.1, 86400000)
        const paddedStart = new Date(range.start.getTime() - tolerance).toISOString()
        const paddedEnd = new Date(range.end.getTime() + tolerance).toISOString()
        clauses.push(`(${column} >= ? AND ${column} < ?)`)
        values.push(paddedStart, paddedEnd)
        break
    }
  }

  return { sql: clauses.join(' AND '), values }
}
