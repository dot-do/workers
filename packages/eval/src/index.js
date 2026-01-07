/**
 * @dotdo/eval - Workers-compatible Code Executor
 *
 * Provides secure sandboxed code execution for Cloudflare Workers.
 * This module does NOT use Node.js vm module (not available in Workers).
 *
 * Implementation uses Function constructor with:
 * - Strict context binding to prevent global access
 * - Proxy-based sandboxing for globalThis isolation
 * - Timeout enforcement via Promise.race
 * - Console log capture
 */
/**
 * TypeScript compiler import for transpilation.
 * Uses the TypeScript compiler API which works in-memory without file system access.
 * This is Workers-compatible as it doesn't use fs, path, or other Node.js modules.
 */
import ts from 'typescript';
// Node.js specific globals that must be blocked (set to undefined)
const BLOCKED_NODE_GLOBALS = [
    'require',
    'module',
    '__dirname',
    '__filename',
    'Buffer',
    'process',
    'global',
    'exports',
];
/**
 * Create frozen versions of built-in prototypes to prevent prototype pollution.
 * These are created once and reused across all sandbox instances.
 */
function createFrozenBuiltins() {
    // Create frozen copies of prototypes that sandbox code will reference
    const frozenArrayPrototype = Object.create(null);
    const frozenObjectPrototype = Object.create(null);
    const frozenFunctionPrototype = Object.create(null);
    const frozenStringPrototype = Object.create(null);
    const frozenNumberPrototype = Object.create(null);
    // Copy Array.prototype methods
    for (const key of Object.getOwnPropertyNames(Array.prototype)) {
        if (key === 'constructor')
            continue;
        try {
            const desc = Object.getOwnPropertyDescriptor(Array.prototype, key);
            if (desc) {
                Object.defineProperty(frozenArrayPrototype, key, { ...desc, writable: false, configurable: false });
            }
        }
        catch { /* ignore */ }
    }
    // Copy Object.prototype methods
    for (const key of Object.getOwnPropertyNames(Object.prototype)) {
        if (key === 'constructor' || key === '__proto__')
            continue;
        try {
            const desc = Object.getOwnPropertyDescriptor(Object.prototype, key);
            if (desc) {
                Object.defineProperty(frozenObjectPrototype, key, { ...desc, writable: false, configurable: false });
            }
        }
        catch { /* ignore */ }
    }
    // Copy Function.prototype methods
    for (const key of Object.getOwnPropertyNames(Function.prototype)) {
        if (key === 'constructor')
            continue;
        try {
            const desc = Object.getOwnPropertyDescriptor(Function.prototype, key);
            if (desc) {
                Object.defineProperty(frozenFunctionPrototype, key, { ...desc, writable: false, configurable: false });
            }
        }
        catch { /* ignore */ }
    }
    // Copy String.prototype methods
    for (const key of Object.getOwnPropertyNames(String.prototype)) {
        if (key === 'constructor')
            continue;
        try {
            const desc = Object.getOwnPropertyDescriptor(String.prototype, key);
            if (desc) {
                Object.defineProperty(frozenStringPrototype, key, { ...desc, writable: false, configurable: false });
            }
        }
        catch { /* ignore */ }
    }
    // Copy Number.prototype methods
    for (const key of Object.getOwnPropertyNames(Number.prototype)) {
        if (key === 'constructor')
            continue;
        try {
            const desc = Object.getOwnPropertyDescriptor(Number.prototype, key);
            if (desc) {
                Object.defineProperty(frozenNumberPrototype, key, { ...desc, writable: false, configurable: false });
            }
        }
        catch { /* ignore */ }
    }
    // Freeze all prototypes
    Object.freeze(frozenArrayPrototype);
    Object.freeze(frozenObjectPrototype);
    Object.freeze(frozenFunctionPrototype);
    Object.freeze(frozenStringPrototype);
    Object.freeze(frozenNumberPrototype);
    return {
        frozenArrayPrototype,
        frozenObjectPrototype,
        frozenFunctionPrototype,
        frozenStringPrototype,
        frozenNumberPrototype,
    };
}
// Create frozen builtins once at module load
const FROZEN_BUILTINS = createFrozenBuiltins();
/**
 * Create a sandboxed Object with frozen prototype to prevent pollution
 */
function createSandboxedObject() {
    const SandboxedObject = function SandboxedObject(value) {
        if (value === undefined || value === null) {
            return {};
        }
        return Object(value);
    };
    // Copy static methods with frozen wrappers
    const staticMethods = [
        'keys', 'values', 'entries', 'assign', 'create', 'defineProperty',
        'defineProperties', 'freeze', 'seal', 'preventExtensions',
        'getOwnPropertyDescriptor', 'getOwnPropertyDescriptors', 'getOwnPropertyNames',
        'getOwnPropertySymbols', 'getPrototypeOf', 'is', 'isExtensible', 'isFrozen',
        'isSealed', 'fromEntries', 'hasOwn'
    ];
    for (const method of staticMethods) {
        if (method in Object) {
            // Wrap setPrototypeOf to prevent modifying host prototypes
            if (method === 'setPrototypeOf') {
                SandboxedObject[method] = function (obj, proto) {
                    // Block modification of built-in prototypes
                    if (obj === Array.prototype || obj === Object.prototype ||
                        obj === Function.prototype || obj === String.prototype ||
                        obj === Number.prototype) {
                        throw new TypeError('Cannot modify built-in prototype');
                    }
                    return Object.setPrototypeOf(obj, proto);
                };
            }
            else {
                SandboxedObject[method] = Object[method];
            }
        }
    }
    // Add setPrototypeOf with protection
    SandboxedObject.setPrototypeOf = function (obj, proto) {
        // Block modification of built-in prototypes
        if (obj === Array.prototype || obj === Object.prototype ||
            obj === Function.prototype || obj === String.prototype ||
            obj === Number.prototype) {
            throw new TypeError('Cannot modify built-in prototype');
        }
        return Object.setPrototypeOf(obj, proto);
    };
    // Set frozen prototype
    Object.defineProperty(SandboxedObject, 'prototype', {
        value: FROZEN_BUILTINS.frozenObjectPrototype,
        writable: false,
        configurable: false,
    });
    return SandboxedObject;
}
/**
 * Create a sandboxed Array with frozen prototype
 */
function createSandboxedArray() {
    const SandboxedArray = function SandboxedArray(...args) {
        return new Array(...args);
    };
    // Copy static methods
    const staticMethods = ['isArray', 'from', 'of'];
    for (const method of staticMethods) {
        SandboxedArray[method] = Array[method];
    }
    // Set frozen prototype
    Object.defineProperty(SandboxedArray, 'prototype', {
        value: FROZEN_BUILTINS.frozenArrayPrototype,
        writable: false,
        configurable: false,
    });
    return SandboxedArray;
}
/**
 * Create a sandboxed Function constructor that prevents escapes
 */
function createSandboxedFunction() {
    // Return a function that throws when trying to use Function constructor
    const SandboxedFunction = function SandboxedFunction() {
        throw new Error('Function constructor is not allowed in sandbox');
    };
    Object.defineProperty(SandboxedFunction, 'prototype', {
        value: FROZEN_BUILTINS.frozenFunctionPrototype,
        writable: false,
        configurable: false,
    });
    return SandboxedFunction;
}
/**
 * Create a sandboxed Reflect object that prevents prototype attacks
 */
function createSandboxedReflect() {
    const SandboxedReflect = Object.create(null);
    // Copy most Reflect methods
    const safeMethods = [
        'apply', 'construct', 'defineProperty', 'deleteProperty', 'get',
        'getOwnPropertyDescriptor', 'has', 'isExtensible', 'ownKeys',
        'preventExtensions', 'set'
    ];
    for (const method of safeMethods) {
        if (method in Reflect) {
            SandboxedReflect[method] = Reflect[method];
        }
    }
    // Wrap setPrototypeOf to prevent modifying built-in prototypes
    SandboxedReflect.setPrototypeOf = function (target, proto) {
        // Block modification of built-in prototypes
        if (target === Array.prototype || target === Object.prototype ||
            target === Function.prototype || target === String.prototype ||
            target === Number.prototype) {
            throw new TypeError('Cannot modify built-in prototype');
        }
        return Reflect.setPrototypeOf(target, proto);
    };
    // Wrap getPrototypeOf to return sandboxed prototypes
    SandboxedReflect.getPrototypeOf = function (target) {
        return Reflect.getPrototypeOf(target);
    };
    Object.freeze(SandboxedReflect);
    return SandboxedReflect;
}
// Safe globals that should be available in the sandbox
const SAFE_GLOBALS = {
    // Standard built-ins - using sandboxed versions where needed
    Object: createSandboxedObject(),
    Array: createSandboxedArray(),
    String,
    Number,
    Boolean,
    Symbol,
    BigInt,
    Math,
    JSON,
    Date,
    RegExp,
    Error,
    TypeError,
    ReferenceError,
    SyntaxError,
    RangeError,
    URIError,
    EvalError,
    // Collections
    Map,
    Set,
    WeakMap,
    WeakSet,
    // Async
    Promise,
    // Typed arrays
    ArrayBuffer,
    SharedArrayBuffer,
    DataView,
    Int8Array,
    Uint8Array,
    Uint8ClampedArray,
    Int16Array,
    Uint16Array,
    Int32Array,
    Uint32Array,
    Float32Array,
    Float64Array,
    BigInt64Array,
    BigUint64Array,
    // Utils
    isNaN,
    isFinite,
    parseFloat,
    parseInt,
    decodeURI,
    decodeURIComponent,
    encodeURI,
    encodeURIComponent,
    // Sandboxed dangerous objects
    Function: createSandboxedFunction(),
    Reflect: createSandboxedReflect(),
    Proxy, // Proxy is safe because it operates on sandbox objects
    // Primitives and constants
    undefined,
    NaN,
    Infinity,
};
/**
 * Create a sandboxed globalThis proxy
 */
function createSandboxedGlobal(logs, customGlobals) {
    // Create a console that captures logs
    const sandboxConsole = {
        log: (...args) => {
            logs.push({ level: 'log', args, timestamp: Date.now() });
        },
        warn: (...args) => {
            logs.push({ level: 'warn', args, timestamp: Date.now() });
        },
        error: (...args) => {
            logs.push({ level: 'error', args, timestamp: Date.now() });
        },
        info: (...args) => {
            logs.push({ level: 'info', args, timestamp: Date.now() });
        },
        debug: (...args) => {
            logs.push({ level: 'debug', args, timestamp: Date.now() });
        },
    };
    // Create blocked globals object (all set to undefined)
    const blockedGlobals = {};
    for (const name of BLOCKED_NODE_GLOBALS) {
        blockedGlobals[name] = undefined;
    }
    // Create the sandbox object - blocked globals must shadow any real ones
    const sandbox = {
        ...SAFE_GLOBALS,
        ...blockedGlobals,
        ...customGlobals,
        console: sandboxConsole,
    };
    // Create a proxy for globalThis that isolates access
    const globalProxy = new Proxy(sandbox, {
        get(target, prop) {
            if (prop === Symbol.unscopables) {
                return undefined;
            }
            // Block Node.js specific globals
            if (prop === 'require' ||
                prop === 'module' ||
                prop === '__dirname' ||
                prop === '__filename' ||
                prop === 'Buffer' ||
                prop === 'process' ||
                prop === 'global' ||
                prop === 'exports') {
                return undefined;
            }
            // Block eval - it's a security risk
            if (prop === 'eval') {
                return undefined;
            }
            if (prop === 'globalThis' || prop === 'self' || prop === 'window') {
                return globalProxy;
            }
            return target[prop];
        },
        set(target, prop, value) {
            // Allow setting properties on the sandbox, but they're isolated
            target[prop] = value;
            return true;
        },
        has(target, prop) {
            // Block Node.js specific globals
            if (prop === 'require' ||
                prop === 'module' ||
                prop === '__dirname' ||
                prop === '__filename' ||
                prop === 'Buffer' ||
                prop === 'process' ||
                prop === 'global' ||
                prop === 'exports' ||
                prop === 'eval') {
                return false;
            }
            return prop in target || prop === 'globalThis';
        },
    });
    sandbox.globalThis = globalProxy;
    return sandbox;
}
/**
 * Parse syntax error to extract location
 */
function parseErrorLocation(error) {
    const message = error.message;
    // Try to extract line/column from error message
    // Format varies by engine, but commonly includes something like "line 3" or ":3:5"
    const lineMatch = message.match(/line\s+(\d+)/i) || message.match(/:(\d+):(\d+)/);
    if (lineMatch && lineMatch[1]) {
        return {
            line: parseInt(lineMatch[1], 10),
            column: lineMatch[2] ? parseInt(lineMatch[2], 10) : 0,
        };
    }
    // Default to line 1 if we can't parse
    return { line: 1, column: 0 };
}
/**
 * Sanitize error stack traces to remove host file paths and internal details
 */
function sanitizeErrorStack(error) {
    // Remove file paths (Unix and Windows)
    let sanitized = error.replace(/\/Users\/[^\s:)]+/g, '<sandbox>');
    sanitized = sanitized.replace(/\/home\/[^\s:)]+/g, '<sandbox>');
    sanitized = sanitized.replace(/C:\\[^\s:)]+/g, '<sandbox>');
    sanitized = sanitized.replace(/file:\/\/[^\s:)]+/g, '<sandbox>');
    // Remove node_modules paths
    sanitized = sanitized.replace(/node_modules\/[^\s:)]+/g, '<internal>');
    // Remove internal implementation references - be more aggressive with patterns
    sanitized = sanitized.replace(/createExecutor/g, '<internal>');
    sanitized = sanitized.replace(/sandbox-security[^\s]*/g, '<internal>');
    sanitized = sanitized.replace(/CodeExecutorImpl/g, '<internal>');
    sanitized = sanitized.replace(/code-executor[^\s]*/g, '<internal>');
    // Remove eval stack traces that reference implementation
    sanitized = sanitized.replace(/at eval \(eval at [^)]+\)/g, 'at <sandbox>');
    sanitized = sanitized.replace(/eval at execute[^)]+/g, '<sandbox>');
    return sanitized;
}
/**
 * Instrument code with timeout checks in loops
 * This inserts a timeout check at the start of while/for/do-while loops
 */
function instrumentWithTimeoutChecks(code, timeoutVar) {
    // Insert timeout checks after loop keywords
    // Match: while(...) { -> while(...) { if(Date.now() > __timeout__) throw new Error('timeout');
    // This is a simple approach - a full AST-based solution would be more robust
    // Pattern for while loops: while (...) {
    let result = code.replace(/\b(while\s*\([^)]*\)\s*\{)/g, `$1 if(Date.now() > ${timeoutVar}) throw new Error('Execution timeout');`);
    // Pattern for for loops: for (...) {
    result = result.replace(/\b(for\s*\([^)]*\)\s*\{)/g, `$1 if(Date.now() > ${timeoutVar}) throw new Error('Execution timeout');`);
    // Pattern for do-while: do {
    result = result.replace(/\b(do\s*\{)/g, `$1 if(Date.now() > ${timeoutVar}) throw new Error('Execution timeout');`);
    return result;
}
/**
 * Dangerous code patterns that should be blocked in the sandbox.
 * These patterns can be used to escape the sandbox or pollute prototypes.
 */
const DANGEROUS_PATTERNS = [
    // Prototype pollution patterns via __proto__
    /\.__proto__\s*[=\[]/, // obj.__proto__ = or obj.__proto__[
    /\.__proto__\s*\./, // obj.__proto__.foo - any property access on __proto__
    /\["__proto__"\]\s*=/, // obj["__proto__"] =
    /\['__proto__'\]\s*=/, // obj['__proto__'] =
    // Prototype pollution via .prototype
    /\.prototype\s*\.\s*\w+\s*=/, // SomeClass.prototype.foo =
    /\.prototype\s*\[/, // SomeClass.prototype[
    /\.constructor\s*\.\s*prototype/, // obj.constructor.prototype
    // Constructor escape patterns - accessing Function constructor via prototype chain
    /\.constructor\s*\(\s*['"`]/, // fn.constructor('...') - trying to create new functions
    /\.constructor\s*\(\s*`/, // fn.constructor(`...`) - template literal version
    // Block assigning .constructor to a variable (used for indirect Function/Generator constructor escapes)
    /=\s*\w+\.constructor\s*[;\n,)]/, // const X = fn.constructor; or X = fn.constructor\n
    /=\s*\w+\.constructor\s*$/, // const X = fn.constructor (at end of code)
    // setPrototypeOf attacks on built-ins
    /Object\.setPrototypeOf\s*\(\s*(Array|Object|Function|String|Number|Boolean|RegExp|Date|Map|Set|WeakMap|WeakSet|Promise|Error)\.prototype/,
    /Reflect\.setPrototypeOf\s*\(\s*(Array|Object|Function|String|Number|Boolean|RegExp|Date|Map|Set|WeakMap|WeakSet|Promise|Error)\.prototype/,
];
/**
 * Check if code contains dangerous patterns that could escape sandbox
 */
function containsDangerousPatterns(code) {
    for (const pattern of DANGEROUS_PATTERNS) {
        if (pattern.test(code)) {
            return { dangerous: true, pattern: pattern.toString() };
        }
    }
    return { dangerous: false };
}
/**
 * Generate security preamble that protects against prototype pollution and constructor escapes.
 * This code is prepended to all user code to intercept dangerous operations at runtime.
 *
 * Note: Object.setPrototypeOf and Reflect.setPrototypeOf are already sandboxed via
 * createSandboxedObject() and createSandboxedReflect() - no runtime patching needed.
 */
function generateSecurityPreamble() {
    // The sandbox already provides frozen/sandboxed versions of Object and Reflect
    // that block prototype modifications. No runtime patching is needed.
    return '';
}
/**
 * Internal executor implementation
 */
class CodeExecutorImpl {
    disposed = false;
    config;
    constructor(config = {}) {
        this.config = {
            maxTimeout: config.maxTimeout ?? 30000,
            strictMode: config.strictMode ?? true,
            globals: config.globals ?? {},
        };
    }
    async execute(code, options = {}) {
        if (this.disposed) {
            throw new Error('Executor has been disposed');
        }
        const logs = [];
        const startTime = Date.now();
        // Determine effective timeout
        const requestedTimeout = options.timeout ?? 30000;
        const effectiveTimeout = Math.min(requestedTimeout, this.config.maxTimeout);
        // Create sandbox
        const sandbox = createSandboxedGlobal(logs, this.config.globals);
        // Merge in context
        const context = options.context ?? {};
        for (const [key, value] of Object.entries(context)) {
            sandbox[key] = value;
        }
        try {
            // Build the function body
            const allowAsync = options.allowAsync ?? false;
            // Check for dangerous patterns that could escape sandbox or pollute prototypes
            const dangerCheck = containsDangerousPatterns(code);
            if (dangerCheck.dangerous) {
                return {
                    success: false,
                    error: `Security violation: Code contains potentially dangerous pattern`,
                    logs,
                    duration: Date.now() - startTime,
                };
            }
            // Add timeout deadline to sandbox
            const timeoutDeadline = startTime + effectiveTimeout;
            sandbox.__timeout__ = timeoutDeadline;
            // Wrap code in a function that has access to sandbox variables
            // We'll use a with statement alternative by passing variables as function params
            const contextKeys = Object.keys(sandbox);
            const contextValues = contextKeys.map((k) => sandbox[k]);
            // Instrument code with timeout checks for loops
            const instrumentedCode = instrumentWithTimeoutChecks(code, '__timeout__');
            // Add security preamble to freeze prototypes and block escapes
            const securityPreamble = generateSecurityPreamble();
            // Wrap code in strict mode if configured
            const wrappedCode = this.config.strictMode
                ? `"use strict";\n${securityPreamble}\n${instrumentedCode}`
                : `${securityPreamble}\n${instrumentedCode}`;
            // Check if code contains await when async not allowed
            if (!allowAsync && /\bawait\b/.test(code)) {
                return {
                    success: false,
                    error: 'await is not allowed when allowAsync is false',
                    logs,
                    duration: Date.now() - startTime,
                };
            }
            // Create the function
            // We use AsyncFunction for async support
            let fn;
            if (allowAsync) {
                const AsyncFunction = Object.getPrototypeOf(async function () { }).constructor;
                fn = new AsyncFunction(...contextKeys, wrappedCode);
            }
            else {
                fn = new Function(...contextKeys, wrappedCode);
            }
            // Execute with timeout
            const executePromise = (async () => {
                const result = fn(...contextValues);
                // If it's a promise and async is allowed, await it
                if (allowAsync && result instanceof Promise) {
                    return await result;
                }
                return result;
            })();
            // Race against timeout
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => {
                    reject(new Error(`Execution timeout after ${effectiveTimeout}ms`));
                }, effectiveTimeout);
            });
            let value = await Promise.race([executePromise, timeoutPromise]);
            // Sanitize return value if it looks like a stack trace (contains file paths)
            if (typeof value === 'string' && (value.includes('/Users/') || value.includes('/home/') || value.includes('at '))) {
                value = sanitizeErrorStack(value);
            }
            return {
                success: true,
                value,
                logs,
                duration: Date.now() - startTime,
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            const stack = error instanceof Error ? error.stack : undefined;
            // Sanitize error to remove host paths and internal details
            const sanitizedError = sanitizeErrorStack(stack || errorMessage);
            return {
                success: false,
                error: sanitizedError,
                logs,
                duration: Date.now() - startTime,
            };
        }
    }
    validate(code) {
        if (this.disposed) {
            throw new Error('Executor has been disposed');
        }
        try {
            // Try to create a function with the code to check syntax
            // We wrap in a function body to allow return statements
            new Function(code);
            return { valid: true };
        }
        catch (error) {
            if (error instanceof SyntaxError) {
                return {
                    valid: false,
                    error: error.message,
                    location: parseErrorLocation(error),
                };
            }
            return {
                valid: false,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }
    dispose() {
        this.disposed = true;
    }
}
/**
 * Create a Workers-compatible code executor
 */
export function createExecutor(config) {
    return new CodeExecutorImpl(config);
}
/**
 * Evaluator class - alternative API for code execution
 * Compatible with ai-evaluate interface
 */
export class Evaluator {
    executor;
    constructor(config) {
        this.executor = new CodeExecutorImpl(config);
    }
    async execute(code, options) {
        return this.executor.execute(code, options);
    }
    validate(code) {
        return this.executor.validate(code);
    }
    dispose() {
        this.executor.dispose();
    }
}
/**
 * Create an Evaluator instance (ai-evaluate compatible factory)
 */
export function createEvaluator(config) {
    return new Evaluator(config);
}
/**
 * Map TranspileOptions target to TypeScript ScriptTarget
 */
function mapTarget(target) {
    switch (target) {
        case 'ES5': return ts.ScriptTarget.ES5;
        case 'ES2015': return ts.ScriptTarget.ES2015;
        case 'ES2016': return ts.ScriptTarget.ES2016;
        case 'ES2017': return ts.ScriptTarget.ES2017;
        case 'ES2018': return ts.ScriptTarget.ES2018;
        case 'ES2019': return ts.ScriptTarget.ES2019;
        case 'ES2020': return ts.ScriptTarget.ES2020;
        case 'ES2021': return ts.ScriptTarget.ES2021;
        case 'ES2022': return ts.ScriptTarget.ES2022;
        case 'ESNext': return ts.ScriptTarget.ESNext;
        default: return ts.ScriptTarget.ES2022;
    }
}
/**
 * Map TranspileOptions module to TypeScript ModuleKind
 */
function mapModule(module) {
    switch (module) {
        case 'CommonJS': return ts.ModuleKind.CommonJS;
        case 'ES2015': return ts.ModuleKind.ES2015;
        case 'ES2020': return ts.ModuleKind.ES2020;
        case 'ESNext': return ts.ModuleKind.ESNext;
        case 'None': return ts.ModuleKind.None;
        default: return ts.ModuleKind.ESNext;
    }
}
/**
 * Map TranspileOptions jsx to TypeScript JsxEmit
 */
function mapJsx(jsx) {
    switch (jsx) {
        case 'react': return ts.JsxEmit.React;
        case 'react-jsx': return ts.JsxEmit.ReactJSX;
        case 'react-jsxdev': return ts.JsxEmit.ReactJSXDev;
        case 'preserve': return ts.JsxEmit.Preserve;
        case 'react-native': return ts.JsxEmit.ReactNative;
        default: return undefined;
    }
}
/**
 * Internal transpiler implementation using TypeScript compiler API.
 * This implementation is Workers-compatible as it:
 * - Uses in-memory transpilation (no file system access)
 * - Doesn't use Node.js-specific modules
 * - Works entirely with strings and compiler options
 */
class TypeScriptTranspilerImpl {
    disposed = false;
    config;
    constructor(config = {}) {
        this.config = {
            target: config.target ?? 'ES2022',
            module: config.module ?? 'ESNext',
            strict: config.strict ?? true,
            jsx: config.jsx,
            sourceMap: config.sourceMap ?? false,
            experimentalDecorators: config.experimentalDecorators ?? false,
        };
    }
    transpile(code, options) {
        if (this.disposed) {
            throw new Error('Transpiler has been disposed');
        }
        // Merge config with per-call options
        const effectiveOptions = { ...this.config, ...options };
        // Build TypeScript compiler options
        const compilerOptions = {
            target: mapTarget(effectiveOptions.target),
            module: mapModule(effectiveOptions.module),
            strict: effectiveOptions.strict,
            sourceMap: effectiveOptions.sourceMap,
            experimentalDecorators: effectiveOptions.experimentalDecorators,
            // Remove comments for cleaner output
            removeComments: false,
            // Don't emit helpers inline
            importHelpers: false,
            // Allow synthetic default imports
            esModuleInterop: true,
            // Skip lib check for faster transpilation
            skipLibCheck: true,
        };
        // Add JSX options if specified
        if (effectiveOptions.jsx) {
            compilerOptions.jsx = mapJsx(effectiveOptions.jsx);
            // React JSX classic mode needs factory settings
            if (effectiveOptions.jsx === 'react') {
                compilerOptions.jsxFactory = 'React.createElement';
                compilerOptions.jsxFragmentFactory = 'React.Fragment';
            }
        }
        try {
            // Pre-validation: Check for invalid decorator usage
            // transpileModule doesn't catch semantic errors like decorators on non-class members
            const invalidDecoratorError = this.checkInvalidDecorators(code);
            if (invalidDecoratorError) {
                return invalidDecoratorError;
            }
            // Use TypeScript's transpileModule for in-memory transpilation
            // This doesn't require file system access - pure string transformation
            const result = ts.transpileModule(code, {
                compilerOptions,
                reportDiagnostics: true,
                fileName: effectiveOptions.jsx ? 'input.tsx' : 'input.ts',
            });
            // Check for diagnostics (errors)
            if (result.diagnostics && result.diagnostics.length > 0) {
                const firstError = result.diagnostics[0];
                if (firstError) {
                    const errorMessage = ts.flattenDiagnosticMessageText(firstError.messageText, '\n');
                    // Extract location from diagnostic
                    let location;
                    if (firstError.file && firstError.start !== undefined) {
                        const { line, character } = firstError.file.getLineAndCharacterOfPosition(firstError.start);
                        location = { line: line + 1, column: character + 1 };
                    }
                    return {
                        success: false,
                        error: errorMessage,
                        location,
                    };
                }
            }
            // Return successful result
            const transpileResult = {
                success: true,
                code: result.outputText,
            };
            // Add source map if generated
            if (effectiveOptions.sourceMap && result.sourceMapText) {
                transpileResult.sourceMap = result.sourceMapText;
            }
            return transpileResult;
        }
        catch (error) {
            // Handle unexpected errors
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                success: false,
                error: errorMessage,
            };
        }
    }
    /**
     * Check for invalid decorator usage that transpileModule doesn't catch.
     * Decorators are only valid on classes, methods, accessors, properties, and parameters.
     * Returns an error result if invalid decorator usage is detected, or undefined if valid.
     */
    checkInvalidDecorators(code) {
        // Parse the code to get the AST
        const sourceFile = ts.createSourceFile('input.ts', code, ts.ScriptTarget.Latest, true, // setParentNodes
        ts.ScriptKind.TS);
        // Check if there are any decorators on invalid targets
        let invalidDecoratorError;
        const visit = (node) => {
            if (invalidDecoratorError)
                return; // Already found an error
            // Check for decorator as a direct child - this indicates invalid placement
            // TypeScript parses decorators on invalid targets (like variable statements) as direct children
            let firstDecoratorChild;
            ts.forEachChild(node, (child) => {
                if (child.kind === ts.SyntaxKind.Decorator && !firstDecoratorChild) {
                    firstDecoratorChild = child;
                }
            });
            if (firstDecoratorChild) {
                // Check if this node is a valid decorator target
                const isValidTarget = ts.isClassDeclaration(node) ||
                    ts.isMethodDeclaration(node) ||
                    ts.isGetAccessor(node) ||
                    ts.isSetAccessor(node) ||
                    ts.isPropertyDeclaration(node) ||
                    ts.isParameter(node) ||
                    ts.isClassExpression(node);
                if (!isValidTarget) {
                    const { line, character } = sourceFile.getLineAndCharacterOfPosition(firstDecoratorChild.getStart(sourceFile));
                    invalidDecoratorError = {
                        success: false,
                        error: 'Decorators are not valid here.',
                        location: { line: line + 1, column: character + 1 },
                    };
                    return;
                }
            }
            ts.forEachChild(node, visit);
        };
        ts.forEachChild(sourceFile, visit);
        return invalidDecoratorError;
    }
    dispose() {
        this.disposed = true;
    }
}
/**
 * Create a Workers-compatible TypeScript transpiler
 */
export function createTypeScriptTranspiler(config) {
    return new TypeScriptTranspilerImpl(config);
}
