/**
 * JSON-RPC Handler for Cloudflare Workers
 *
 * This implementation is designed to work with Workers runtime,
 * reading configuration from env bindings (NOT process.env).
 */
/**
 * JSON-RPC error codes
 */
const JSON_RPC_ERRORS = {
    PARSE_ERROR: -32700,
    INVALID_REQUEST: -32600,
    METHOD_NOT_FOUND: -32601,
    INVALID_PARAMS: -32602,
    INTERNAL_ERROR: -32603,
};
/**
 * Built-in methods
 */
const BUILT_IN_METHODS = {
    ping: () => 'pong',
    echo: (params) => {
        if (Array.isArray(params) && params.length > 0) {
            return params[0];
        }
        return params;
    },
    generateId: () => crypto.randomUUID(),
};
/**
 * JSON-RPC Handler Implementation
 * Reads all configuration from Workers env bindings, never from process.env
 */
class JsonRpcHandlerImpl {
    /**
     * Get configuration from Workers env bindings only
     * Never reads from process.env
     */
    getConfig(env) {
        // Default values
        const defaults = {
            maxBodySize: 1024 * 1024, // 1MB
            timeout: 30000, // 30s
            debug: false,
            apiKey: undefined,
            corsOrigins: [],
        };
        // Parse from env bindings only (NEVER from process.env)
        return {
            maxBodySize: env.MAX_BODY_SIZE ? parseInt(env.MAX_BODY_SIZE, 10) : defaults.maxBodySize,
            timeout: env.REQUEST_TIMEOUT ? parseInt(env.REQUEST_TIMEOUT, 10) : defaults.timeout,
            debug: env.DEBUG === 'true',
            apiKey: env.API_KEY,
            corsOrigins: env.CORS_ORIGINS
                ? env.CORS_ORIGINS.split(',').map((s) => s.trim())
                : defaults.corsOrigins,
        };
    }
    /**
     * Handle a JSON-RPC request
     */
    async handle(request, env) {
        const config = this.getConfig(env);
        const origin = request.headers.get('Origin');
        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return this.handlePreflight(origin, config);
        }
        // Debug logging
        if (config.debug) {
            console.log(`[JSON-RPC] ${request.method} ${request.url}`);
        }
        // Check body size
        const contentLength = request.headers.get('Content-Length');
        if (contentLength && parseInt(contentLength, 10) > config.maxBodySize) {
            return new Response('Payload Too Large', { status: 413 });
        }
        // Read and parse body
        let body;
        try {
            body = await request.text();
        }
        catch {
            return new Response('Payload Too Large', { status: 413 });
        }
        // Check body size after reading
        if (body.length > config.maxBodySize) {
            return new Response('Payload Too Large', { status: 413 });
        }
        // Parse JSON
        let parsed;
        try {
            parsed = JSON.parse(body);
        }
        catch {
            return this.jsonResponse({
                jsonrpc: '2.0',
                error: { code: JSON_RPC_ERRORS.PARSE_ERROR, message: 'Parse error' },
                id: null,
            }, origin, config);
        }
        // Check authentication if API_KEY is configured AND Authorization header is provided
        // If no Authorization header, allow the request (public methods)
        // If Authorization header is provided, it must match the API_KEY
        const authHeader = request.headers.get('Authorization');
        if (config.apiKey && authHeader) {
            const providedKey = authHeader.replace('Bearer ', '');
            if (providedKey !== config.apiKey) {
                return new Response('Unauthorized', { status: 401 });
            }
        }
        // Handle batch requests
        if (Array.isArray(parsed)) {
            const results = await Promise.all(parsed.map((req) => this.processRequest(req, config)));
            return this.jsonResponse(results, origin, config);
        }
        // Handle single request
        const result = await this.processRequest(parsed, config);
        return this.jsonResponse(result, origin, config);
    }
    /**
     * Process a single JSON-RPC request
     */
    async processRequest(request, config) {
        const { method, params, id } = request;
        // Check if method exists
        if (!BUILT_IN_METHODS[method]) {
            return {
                jsonrpc: '2.0',
                error: { code: JSON_RPC_ERRORS.METHOD_NOT_FOUND, message: 'Method not found' },
                id: id ?? null,
            };
        }
        try {
            const result = await BUILT_IN_METHODS[method](params);
            if (config.debug) {
                console.log(`[JSON-RPC] ${method} -> ${JSON.stringify(result)}`);
            }
            return {
                jsonrpc: '2.0',
                result,
                id: id ?? null,
            };
        }
        catch (error) {
            return {
                jsonrpc: '2.0',
                error: {
                    code: JSON_RPC_ERRORS.INTERNAL_ERROR,
                    message: error instanceof Error ? error.message : 'Internal error',
                },
                id: id ?? null,
            };
        }
    }
    /**
     * Handle CORS preflight request
     */
    handlePreflight(origin, config) {
        const headers = {
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Max-Age': '86400',
        };
        if (origin && this.isOriginAllowed(origin, config)) {
            headers['Access-Control-Allow-Origin'] = origin;
        }
        return new Response(null, { status: 204, headers });
    }
    /**
     * Check if origin is allowed
     */
    isOriginAllowed(origin, config) {
        if (config.corsOrigins.length === 0) {
            return true; // No CORS restriction if not configured
        }
        return config.corsOrigins.includes(origin);
    }
    /**
     * Create a JSON response with CORS headers
     */
    jsonResponse(body, origin, config) {
        const headers = {
            'Content-Type': 'application/json',
        };
        if (origin && this.isOriginAllowed(origin, config)) {
            headers['Access-Control-Allow-Origin'] = origin;
        }
        return new Response(JSON.stringify(body), { headers });
    }
}
/**
 * Factory function to create JSON-RPC handler
 */
export function createJsonRpcHandler() {
    return new JsonRpcHandlerImpl();
}
