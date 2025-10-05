/**
 * Custom assertion helpers for tests
 */

/**
 * Assert result is a successful response
 */
export function assertSuccess(result: any): boolean {
  return result && (result.success === true || result.status === 'ok' || result.error === undefined)
}

/**
 * Assert result contains all required fields
 */
export function assertHasFields(result: any, fields: string[]): boolean {
  if (!result || typeof result !== 'object') return false
  return fields.every((field) => field in result)
}

/**
 * Assert result is an array with expected length
 */
export function assertArray(result: any, minLength?: number, maxLength?: number): boolean {
  if (!Array.isArray(result)) return false
  if (minLength !== undefined && result.length < minLength) return false
  if (maxLength !== undefined && result.length > maxLength) return false
  return true
}

/**
 * Assert timestamp is recent (within last N seconds)
 */
export function assertRecentTimestamp(timestamp: number, maxAgeSeconds: number = 60): boolean {
  const now = Math.floor(Date.now() / 1000)
  return timestamp > now - maxAgeSeconds && timestamp <= now
}

/**
 * Assert value is a valid UUID
 */
export function assertUUID(value: any): boolean {
  if (typeof value !== 'string') return false
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(value)
}

/**
 * Assert value is a valid email
 */
export function assertEmail(value: any): boolean {
  if (typeof value !== 'string') return false
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(value)
}

/**
 * Assert value is a valid URL
 */
export function assertURL(value: any): boolean {
  if (typeof value !== 'string') return false
  try {
    new URL(value)
    return true
  } catch {
    return false
  }
}

/**
 * Assert value matches regex pattern
 */
export function assertPattern(value: any, pattern: RegExp): boolean {
  if (typeof value !== 'string') return false
  return pattern.test(value)
}

/**
 * Assert object has non-empty values
 */
export function assertNonEmpty(obj: any): boolean {
  if (!obj || typeof obj !== 'object') return false
  const values = Object.values(obj)
  return values.length > 0 && values.every((v) => v !== null && v !== undefined && v !== '')
}

/**
 * Assert error has expected properties
 */
export function assertError(error: any, code?: string, message?: string): boolean {
  if (!error) return false
  if (code && error.code !== code) return false
  if (message && !error.message?.includes(message)) return false
  return true
}
