/**
 * Core DO types and base class
 *
 * Separated to avoid circular imports with agent.ts
 * This file has NO imports from other do-core modules.
 */
/**
 * Base class for slim Durable Objects
 * Tests define what this class must implement
 */
export class DOCore {
    ctx;
    env;
    constructor(ctx, env) {
        this.ctx = ctx;
        this.env = env;
    }
    /**
     * Handle incoming HTTP requests
     * This is the primary entry point for DO
     */
    async fetch(_request) {
        // Stub - implementation in GREEN phase
        throw new Error('DOCore.fetch() not implemented');
    }
    /**
     * Handle scheduled alarms
     */
    async alarm() {
        // Stub - implementation in GREEN phase
        throw new Error('DOCore.alarm() not implemented');
    }
    /**
     * Handle WebSocket messages (hibernation-compatible)
     */
    async webSocketMessage(_ws, _message) {
        // Stub - implementation in GREEN phase
        throw new Error('DOCore.webSocketMessage() not implemented');
    }
    /**
     * Handle WebSocket close events (hibernation-compatible)
     */
    async webSocketClose(_ws, _code, _reason, _wasClean) {
        // Stub - implementation in GREEN phase
        throw new Error('DOCore.webSocketClose() not implemented');
    }
    /**
     * Handle WebSocket errors (hibernation-compatible)
     */
    async webSocketError(_ws, _error) {
        // Stub - implementation in GREEN phase
        throw new Error('DOCore.webSocketError() not implemented');
    }
}
