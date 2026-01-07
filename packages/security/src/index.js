// @dotdo/security - Security utilities for Cloudflare Workers
// SQL Injection Prevention - Types and Stub Implementations
// Re-export XSS prevention utilities
export * from './xss';
// Re-export Prototype Pollution prevention utilities
export * from './prototype-pollution';
/**
 * Error thrown when SQL injection is detected
 */
export class SqlInjectionError extends Error {
    result;
    constructor(message, result) {
        super(message);
        this.name = 'SqlInjectionError';
        this.result = result;
    }
}
// SQL keywords that should not be used as identifiers
const SQL_KEYWORDS = new Set([
    'select', 'insert', 'update', 'delete', 'drop', 'create', 'alter',
    'truncate', 'grant', 'revoke', 'from', 'where', 'and', 'or', 'not',
    'null', 'true', 'false', 'in', 'is', 'like', 'between', 'exists',
    'having', 'group', 'order', 'by', 'asc', 'desc', 'limit', 'offset',
    'join', 'inner', 'outer', 'left', 'right', 'cross', 'on', 'using',
    'union', 'intersect', 'except', 'all', 'distinct', 'as', 'case',
    'when', 'then', 'else', 'end', 'if', 'begin', 'commit', 'rollback',
    'table', 'index', 'view', 'procedure', 'function', 'trigger',
    'primary', 'foreign', 'key', 'references', 'constraint', 'default',
    'values', 'into', 'set', 'exec', 'execute', 'declare', 'fetch',
    'cursor', 'open', 'close', 'deallocate'
]);
/**
 * Detect SQL injection attempts in a string
 *
 * @param input - The string to check for SQL injection patterns
 * @returns Detection result with pattern information
 */
export function detectSqlInjection(input) {
    const patterns = [];
    const lowerInput = input.toLowerCase();
    // Empty string is safe
    if (!input) {
        return { isInjection: false, patterns: [], input };
    }
    // Check for SQL comment patterns (-- or /* or #)
    if (/--/.test(input) || /\/\*/.test(input) || /#/.test(input)) {
        patterns.push('comment');
    }
    // Check for UNION SELECT attacks (case insensitive)
    if (/\bunion\b\s+\bselect\b/i.test(input) || /\bunion\b\s+\ball\b/i.test(input)) {
        patterns.push('union');
    }
    // Check for tautology patterns (OR 1=1, OR 'a'='a', etc.)
    if (/\bor\b\s+\d+\s*=\s*\d+/i.test(input) ||
        /\bor\b\s+['"][^'"]*['"]\s*=\s*['"][^'"]*['"]/i.test(input) ||
        /\bor\b\s+\w+\s*=\s*\w+/i.test(input)) {
        patterns.push('tautology');
    }
    // Check for stacked queries (semicolon followed by SQL keywords)
    if (/;\s*(select|insert|update|delete|drop|create|alter|truncate|exec|execute)\b/i.test(input)) {
        patterns.push('stacked');
    }
    // Check for hex-encoded attacks (0x followed by hex chars that could be SQL)
    if (/0x[0-9a-f]{8,}/i.test(input)) {
        patterns.push('hex');
    }
    return {
        isInjection: patterns.length > 0,
        patterns,
        input
    };
}
/**
 * Sanitize input by removing or escaping dangerous characters
 *
 * @param input - The string to sanitize
 * @param options - Sanitization options
 * @returns Sanitized string
 */
export function sanitizeInput(input, options) {
    const { allowlist, maxLength, trim = true } = options || {};
    let result = input;
    // Apply allowlist if specified
    if (allowlist) {
        result = input.split('').filter(char => allowlist.test(char)).join('');
    }
    else {
        // Default: remove dangerous SQL characters
        // Remove single quotes, double quotes, semicolons, comments, backslashes, backticks
        result = result.replace(/['"`;\\`]/g, '');
        // Remove SQL comment patterns
        result = result.replace(/--/g, '');
        result = result.replace(/\/\*/g, '');
        result = result.replace(/\*\//g, '');
    }
    // Trim whitespace if enabled
    if (trim) {
        result = result.trim();
    }
    // Apply max length
    if (maxLength !== undefined && result.length > maxLength) {
        result = result.slice(0, maxLength);
    }
    return result;
}
/**
 * Create a parameterized query from SQL template and parameters
 *
 * @param sql - SQL template with placeholders (? or :name)
 * @param params - Array or object of parameter values
 * @returns ParameterizedQuery with separated SQL and params
 */
export function createParameterizedQuery(sql, params) {
    // Handle positional parameters (?)
    if (Array.isArray(params)) {
        // Count the number of ? placeholders in the SQL
        const placeholderCount = (sql.match(/\?/g) || []).length;
        if (placeholderCount !== params.length) {
            throw new Error('Parameter count mismatch');
        }
        return { sql, params };
    }
    // Handle named parameters (:name)
    const namedParams = params;
    const orderedParams = [];
    // Find all named parameters in the SQL
    const namedPlaceholders = sql.match(/:\w+/g) || [];
    for (const placeholder of namedPlaceholders) {
        const paramName = placeholder.slice(1); // Remove the leading :
        if (!(paramName in namedParams)) {
            throw new Error(`Missing parameter: ${paramName}`);
        }
        orderedParams.push(namedParams[paramName]);
    }
    return { sql, params: orderedParams };
}
/**
 * Escape a string for safe use in SQL
 *
 * @param value - The string to escape
 * @returns Escaped string safe for SQL
 */
export function escapeString(value) {
    if (!value)
        return value;
    return value
        // Escape backslashes first (before other escape sequences)
        .replace(/\\/g, '\\\\')
        // Escape single quotes by doubling them
        .replace(/'/g, "''")
        // Escape newlines
        .replace(/\n/g, '\\n')
        // Escape carriage returns
        .replace(/\r/g, '\\r')
        // Escape null bytes
        .replace(/\0/g, '\\0')
        // Escape tabs
        .replace(/\t/g, '\\t');
}
/**
 * Validate that an identifier (table name, column name) is safe
 *
 * @param identifier - The identifier to validate
 * @returns true if the identifier is safe to use
 */
export function isValidIdentifier(identifier) {
    // Empty identifiers are not valid
    if (!identifier || identifier.length === 0) {
        return false;
    }
    // Check if it's a SQL keyword (case insensitive)
    if (SQL_KEYWORDS.has(identifier.toLowerCase())) {
        return false;
    }
    // Valid identifiers must:
    // - Start with a letter or underscore
    // - Contain only letters, numbers, and underscores
    // - Not contain any special characters like ; -- ' etc.
    const validIdentifierPattern = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
    return validIdentifierPattern.test(identifier);
}
