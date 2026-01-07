/**
 * MCP (Model Context Protocol) Error Handling
 *
 * Provides typed error classes for MCP protocol errors following JSON-RPC 2.0 spec.
 * Error codes are defined in the MCP specification and match JSON-RPC standard codes.
 */
/**
 * MCP Error Codes
 *
 * Standard JSON-RPC 2.0 error codes used by MCP protocol:
 * - ParseError (-32700): Invalid JSON was received
 * - InvalidRequest (-32600): JSON is not a valid Request object
 * - MethodNotFound (-32601): Method does not exist or is not available
 * - InvalidParams (-32602): Invalid method parameters
 * - InternalError (-32603): Internal JSON-RPC error
 *
 * Server error codes (-32000 to -32099) are reserved for implementation-defined errors.
 */
export var McpErrorCode;
(function (McpErrorCode) {
    /** Invalid JSON was received by the server */
    McpErrorCode[McpErrorCode["ParseError"] = -32700] = "ParseError";
    /** The JSON sent is not a valid Request object */
    McpErrorCode[McpErrorCode["InvalidRequest"] = -32600] = "InvalidRequest";
    /** The method does not exist or is not available */
    McpErrorCode[McpErrorCode["MethodNotFound"] = -32601] = "MethodNotFound";
    /** Invalid method parameter(s) */
    McpErrorCode[McpErrorCode["InvalidParams"] = -32602] = "InvalidParams";
    /** Internal JSON-RPC error */
    McpErrorCode[McpErrorCode["InternalError"] = -32603] = "InternalError";
    /** Server error - reserved for implementation-defined errors */
    McpErrorCode[McpErrorCode["ServerError"] = -32000] = "ServerError";
})(McpErrorCode || (McpErrorCode = {}));
/**
 * Typed error class for MCP protocol errors
 *
 * Provides proper TypeScript typing for error codes and optional data payload.
 * Supports serialization to JSON-RPC error format.
 *
 * @example
 * ```typescript
 * // Create a method not found error
 * const error = new McpError(
 *   McpErrorCode.MethodNotFound,
 *   `Method '${method}' not found`
 * );
 *
 * // Create an invalid params error with additional data
 * const error = new McpError(
 *   McpErrorCode.InvalidParams,
 *   'Missing required parameter: id',
 *   { requiredParams: ['id', 'name'] }
 * );
 *
 * // Serialize for JSON-RPC response
 * const response = {
 *   jsonrpc: '2.0',
 *   error: error.toJsonRpc(),
 *   id: null
 * };
 * ```
 */
export class McpError extends Error {
    code;
    data;
    /**
     * The error name, always 'McpError'
     */
    name = 'McpError';
    /**
     * Create a new MCP error
     *
     * @param code - The MCP/JSON-RPC error code
     * @param message - Human-readable error message
     * @param data - Optional additional error data
     */
    constructor(code, message, data) {
        super(message);
        this.code = code;
        this.data = data;
        // Maintains proper stack trace in V8 environments
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, McpError);
        }
    }
    /**
     * Serialize the error to JSON-RPC error format
     *
     * @returns JSON-RPC compatible error object
     */
    toJsonRpc() {
        const response = {
            code: this.code,
            message: this.message,
        };
        if (this.data !== undefined) {
            response.data = this.data;
        }
        return response;
    }
    /**
     * Create a ParseError (-32700)
     *
     * @param message - Optional custom message (default: 'Parse error')
     * @param data - Optional additional error data
     */
    static parseError(message = 'Parse error', data) {
        return new McpError(McpErrorCode.ParseError, message, data);
    }
    /**
     * Create an InvalidRequest error (-32600)
     *
     * @param message - Optional custom message (default: 'Invalid Request')
     * @param data - Optional additional error data
     */
    static invalidRequest(message = 'Invalid Request', data) {
        return new McpError(McpErrorCode.InvalidRequest, message, data);
    }
    /**
     * Create a MethodNotFound error (-32601)
     *
     * @param methodName - The method name that was not found
     * @param data - Optional additional error data
     */
    static methodNotFound(methodName, data) {
        const message = methodName
            ? `Method '${methodName}' not found`
            : 'Method not found';
        return new McpError(McpErrorCode.MethodNotFound, message, data);
    }
    /**
     * Create an InvalidParams error (-32602)
     *
     * @param message - Optional custom message (default: 'Invalid params')
     * @param data - Optional additional error data
     */
    static invalidParams(message = 'Invalid params', data) {
        return new McpError(McpErrorCode.InvalidParams, message, data);
    }
    /**
     * Create an InternalError (-32603)
     *
     * @param message - Optional custom message (default: 'Internal error')
     * @param data - Optional additional error data
     */
    static internalError(message = 'Internal error', data) {
        return new McpError(McpErrorCode.InternalError, message, data);
    }
    /**
     * Create a ServerError (-32000)
     *
     * @param message - Custom error message
     * @param data - Optional additional error data
     */
    static serverError(message, data) {
        return new McpError(McpErrorCode.ServerError, message, data);
    }
    /**
     * Create an McpError from a generic Error
     *
     * @param error - The original error
     * @param code - Error code to use (default: InternalError)
     */
    static fromError(error, code = McpErrorCode.InternalError) {
        return new McpError(code, error.message, {
            originalName: error.name,
            stack: error.stack,
        });
    }
}
/**
 * Type guard to check if an error is an McpError
 *
 * @param error - The error to check
 * @returns true if the error is an McpError instance
 *
 * @example
 * ```typescript
 * try {
 *   await callMethod(request);
 * } catch (error) {
 *   if (isMcpError(error)) {
 *     // TypeScript knows error is McpError here
 *     console.log(error.code, error.data);
 *   }
 * }
 * ```
 */
export function isMcpError(error) {
    return error instanceof McpError;
}
/**
 * Type guard to check if an error code is a valid MCP error code
 *
 * @param code - The code to check
 * @returns true if the code is a valid McpErrorCode
 */
export function isMcpErrorCode(code) {
    return (code === McpErrorCode.ParseError ||
        code === McpErrorCode.InvalidRequest ||
        code === McpErrorCode.MethodNotFound ||
        code === McpErrorCode.InvalidParams ||
        code === McpErrorCode.InternalError ||
        code === McpErrorCode.ServerError);
}
/**
 * Get the default message for an MCP error code
 *
 * @param code - The MCP error code
 * @returns The default message for the error code
 */
export function getDefaultMessage(code) {
    switch (code) {
        case McpErrorCode.ParseError:
            return 'Parse error';
        case McpErrorCode.InvalidRequest:
            return 'Invalid Request';
        case McpErrorCode.MethodNotFound:
            return 'Method not found';
        case McpErrorCode.InvalidParams:
            return 'Invalid params';
        case McpErrorCode.InternalError:
            return 'Internal error';
        case McpErrorCode.ServerError:
            return 'Server error';
        default:
            return 'Unknown error';
    }
}
