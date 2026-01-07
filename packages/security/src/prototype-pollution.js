// @dotdo/security - Prototype Pollution Prevention
// Implementation for TDD GREEN phase
/**
 * Error thrown when prototype pollution is detected
 */
export class PrototypePollutionError extends Error {
    result;
    constructor(message, result) {
        super(message);
        this.name = 'PrototypePollutionError';
        this.result = result;
    }
}
/**
 * Set of dangerous keys that can be used for prototype pollution
 */
const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
/**
 * Check if a key is a prototype pollution key
 *
 * @param key - The key to check
 * @returns true if the key could be used for prototype pollution
 */
export function hasPrototypePollutionKey(key) {
    return DANGEROUS_KEYS.has(key);
}
/**
 * Check if an object has a custom prototype that indicates pollution via __proto__ literal
 * This detects when __proto__ was set via object literal syntax like { '__proto__': {...} }
 */
function hasCustomPrototype(obj) {
    const proto = Object.getPrototypeOf(obj);
    // A custom prototype is one that is neither Object.prototype, null, nor Array.prototype
    if (proto === Object.prototype || proto === null || proto === Array.prototype) {
        return false;
    }
    // Check if the prototype has any own properties (indicating pollution via __proto__ literal)
    return Object.getOwnPropertyNames(proto).length > 0;
}
/**
 * Detect prototype pollution attempts in an object
 * Checks for dangerous keys like __proto__, constructor, and prototype
 *
 * @param obj - The object to check for prototype pollution
 * @returns Detection result with dangerous keys and paths found
 */
export function detectPrototypePollution(obj) {
    const dangerousKeys = [];
    const paths = [];
    const seen = new WeakSet();
    function traverse(current, path) {
        // Skip non-objects, null, and primitives
        if (current === null || typeof current !== 'object') {
            return;
        }
        // Handle circular references
        if (seen.has(current)) {
            return;
        }
        seen.add(current);
        // Check if this object has a custom prototype (from __proto__ literal assignment)
        if (hasCustomPrototype(current)) {
            if (!dangerousKeys.includes('__proto__')) {
                dangerousKeys.push('__proto__');
            }
            paths.push(path ? `${path}.__proto__` : '__proto__');
        }
        // Handle arrays
        if (Array.isArray(current)) {
            for (let i = 0; i < current.length; i++) {
                traverse(current[i], path ? `${path}[${i}]` : `[${i}]`);
            }
            return;
        }
        // Handle objects - use getOwnPropertyNames to include __proto__ if explicitly set as own property
        const keys = Object.getOwnPropertyNames(current);
        for (const key of keys) {
            const newPath = path ? `${path}.${key}` : key;
            if (hasPrototypePollutionKey(key)) {
                if (!dangerousKeys.includes(key)) {
                    dangerousKeys.push(key);
                }
                paths.push(newPath);
            }
            // Recursively check nested objects
            traverse(current[key], newPath);
        }
    }
    traverse(obj, '');
    return {
        isPolluted: dangerousKeys.length > 0,
        dangerousKeys,
        paths,
        input: obj,
    };
}
/**
 * Safely deep clone an object, filtering out prototype pollution keys
 * Uses null prototype to ensure no inherited constructor/prototype properties
 *
 * @param obj - The object to clone
 * @returns A new cloned object without prototype pollution
 */
export function safeDeepClone(obj) {
    // Handle primitives and null
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    // Handle arrays
    if (Array.isArray(obj)) {
        return obj.map((item) => safeDeepClone(item));
    }
    // Handle objects - use null prototype to avoid inheriting constructor
    const result = Object.create(null);
    const keys = Object.getOwnPropertyNames(obj);
    for (const key of keys) {
        if (!hasPrototypePollutionKey(key)) {
            result[key] = safeDeepClone(obj[key]);
        }
    }
    return result;
}
/**
 * Safely deep merge objects, filtering out prototype pollution keys
 * Uses null prototype to ensure no inherited constructor/prototype properties
 *
 * @param target - The target object to merge into
 * @param source - The source object to merge from
 * @returns A new merged object without prototype pollution
 */
export function safeDeepMerge(target, source) {
    // Use null prototype to avoid inheriting constructor
    const result = Object.create(null);
    // Copy target properties (excluding dangerous keys)
    const targetKeys = Object.getOwnPropertyNames(target);
    for (const key of targetKeys) {
        if (!hasPrototypePollutionKey(key)) {
            result[key] = safeDeepClone(target[key]);
        }
    }
    // Merge source properties (excluding dangerous keys)
    const sourceKeys = Object.getOwnPropertyNames(source);
    for (const key of sourceKeys) {
        if (hasPrototypePollutionKey(key)) {
            continue;
        }
        const targetValue = target[key];
        const sourceValue = source[key];
        // Deep merge if both are plain objects
        if (targetValue !== null &&
            typeof targetValue === 'object' &&
            !Array.isArray(targetValue) &&
            sourceValue !== null &&
            typeof sourceValue === 'object' &&
            !Array.isArray(sourceValue)) {
            result[key] = safeDeepMerge(targetValue, sourceValue);
        }
        else {
            // Otherwise, use safe clone of source value
            result[key] = safeDeepClone(sourceValue);
        }
    }
    return result;
}
/**
 * Safely parse JSON, filtering out prototype pollution keys
 *
 * @param json - The JSON string to parse
 * @returns Parsed object without prototype pollution
 */
export function safeJsonParse(json) {
    const parsed = JSON.parse(json);
    return safeDeepClone(parsed);
}
/**
 * Freeze built-in prototypes to prevent runtime modifications
 * Should be called early in application startup
 *
 * NOTE: Tests using this function may need isolation since freezing prototypes
 * affects the entire JavaScript runtime and cannot be undone. Consider running
 * such tests in a separate process or using VM isolation.
 */
export function freezePrototypes() {
    Object.freeze(Object.prototype);
    Object.freeze(Array.prototype);
    Object.freeze(Function.prototype);
}
