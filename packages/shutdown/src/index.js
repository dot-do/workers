/**
 * @dotdo/shutdown - Graceful shutdown utilities for Cloudflare Workers
 *
 * Provides in-flight request tracking, cleanup hooks, WebSocket connection
 * draining, and timeout handling for graceful shutdown sequences.
 */
/**
 * Shutdown state values
 */
export var ShutdownState;
(function (ShutdownState) {
    ShutdownState["Running"] = "running";
    ShutdownState["Draining"] = "draining";
    ShutdownState["Shutdown"] = "shutdown";
})(ShutdownState || (ShutdownState = {}));
/**
 * GracefulShutdown - Graceful shutdown handling for Cloudflare Workers
 *
 * Provides:
 * - In-flight request tracking
 * - Cleanup hook registration and execution
 * - WebSocket connection draining
 * - Timeout handling for graceful termination
 * - Event emission for shutdown lifecycle
 */
export class GracefulShutdown {
    state = ShutdownState.Running;
    config;
    inFlightRequests = new Map();
    cleanups = new Map();
    webSockets = new Map();
    eventListeners = new Map();
    persistStateHook;
    shutdownPromise;
    requestIdCounter = 0;
    requestsDrainedCount = 0;
    constructor(config = {}) {
        this.config = {
            timeout: config.timeout ?? 30000,
            webSocketGracePeriod: config.webSocketGracePeriod ?? 0,
            webSocketCloseCode: config.webSocketCloseCode ?? 1001,
            webSocketCloseMessage: config.webSocketCloseMessage ?? 'Server shutting down',
        };
    }
    /**
     * Get current shutdown state
     */
    getState() {
        return this.state;
    }
    /**
     * Get shutdown configuration
     */
    getConfig() {
        return { ...this.config };
    }
    /**
     * Check if new requests can be accepted
     */
    canAcceptRequest() {
        return this.state === ShutdownState.Running;
    }
    /**
     * Initiate graceful shutdown
     */
    initiateShutdown() {
        // Return existing promise if shutdown already in progress
        if (this.shutdownPromise) {
            return this.shutdownPromise;
        }
        this.shutdownPromise = this.performShutdown();
        return this.shutdownPromise;
    }
    async performShutdown() {
        const startTime = Date.now();
        this.state = ShutdownState.Draining;
        // Emit initiated event
        this.emit({
            type: 'shutdown:initiated',
            timestamp: Date.now(),
        });
        // Emit draining event
        this.emit({
            type: 'shutdown:draining',
            timestamp: Date.now(),
            inFlightCount: this.inFlightRequests.size,
        });
        // Persist state if hook registered
        let persistenceError;
        if (this.persistStateHook) {
            try {
                await this.persistStateHook({
                    inFlightRequests: this.getInFlightRequests(),
                    timestamp: Date.now(),
                });
            }
            catch (error) {
                persistenceError = error instanceof Error ? error : new Error(String(error));
            }
        }
        // Wait for in-flight requests with timeout
        const { timedOut, remainingRequests } = await this.drainRequests();
        // Wait WebSocket grace period if configured
        if (this.config.webSocketGracePeriod > 0 && this.webSockets.size > 0) {
            await this.delay(this.config.webSocketGracePeriod);
        }
        // Close WebSocket connections
        this.closeWebSockets();
        // Execute cleanup hooks
        const { cleanupErrors, cleanupsExecuted } = await this.executeCleanups();
        // Mark as shutdown
        this.state = ShutdownState.Shutdown;
        // Emit appropriate completion event
        if (timedOut) {
            this.emit({
                type: 'shutdown:timeout',
                timestamp: Date.now(),
                remainingRequests,
            });
        }
        this.emit({
            type: 'shutdown:complete',
            timestamp: Date.now(),
        });
        const result = {
            success: !timedOut && cleanupErrors.length === 0,
            timedOut,
            duration: Date.now() - startTime,
            remainingRequests: timedOut ? remainingRequests : 0,
            requestsDrained: this.requestsDrainedCount,
            cleanupsExecuted,
            cleanupErrors: cleanupErrors.length > 0 ? cleanupErrors : undefined,
            persistenceError,
        };
        return result;
    }
    async drainRequests() {
        return new Promise((resolve) => {
            // Check if already drained
            if (this.inFlightRequests.size === 0) {
                resolve({ timedOut: false, remainingRequests: 0 });
                return;
            }
            // Set up timeout
            const timeoutId = setTimeout(() => {
                resolve({
                    timedOut: true,
                    remainingRequests: this.inFlightRequests.size,
                });
            }, this.config.timeout);
            // Poll for request completion
            const checkInterval = setInterval(() => {
                if (this.inFlightRequests.size === 0) {
                    clearTimeout(timeoutId);
                    clearInterval(checkInterval);
                    resolve({ timedOut: false, remainingRequests: 0 });
                }
            }, 10);
        });
    }
    closeWebSockets() {
        for (const { ws } of this.webSockets.values()) {
            try {
                // Only close if connection is open (readyState 1 = OPEN)
                if (ws.readyState === 1) {
                    ws.close(this.config.webSocketCloseCode, this.config.webSocketCloseMessage);
                }
            }
            catch {
                // Ignore close errors
            }
        }
    }
    async executeCleanups() {
        const cleanupErrors = [];
        let cleanupsExecuted = 0;
        // Sort by priority (higher first)
        const sortedCleanups = Array.from(this.cleanups.values())
            .sort((a, b) => b.options.priority - a.options.priority);
        for (const cleanup of sortedCleanups) {
            try {
                await this.executeCleanupWithTimeout(cleanup);
                cleanupsExecuted++;
            }
            catch (error) {
                cleanupErrors.push(error instanceof Error ? error : new Error(String(error)));
                cleanupsExecuted++;
            }
        }
        return { cleanupErrors, cleanupsExecuted };
    }
    async executeCleanupWithTimeout(cleanup) {
        const { hook, options } = cleanup;
        if (options.timeout === 0) {
            await hook();
            return;
        }
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error(`Cleanup '${cleanup.name}' timeout after ${options.timeout}ms`));
            }, options.timeout);
        });
        await Promise.race([hook(), timeoutPromise]);
    }
    /**
     * Track an in-flight request
     */
    trackRequest(id) {
        if (!this.canAcceptRequest()) {
            throw new Error('Cannot accept new requests during shutdown');
        }
        const requestId = id ?? `req-${++this.requestIdCounter}`;
        this.inFlightRequests.set(requestId, true);
        return {
            id: requestId,
            complete: () => {
                if (this.inFlightRequests.delete(requestId)) {
                    this.requestsDrainedCount++;
                }
            },
            completeWithError: () => {
                if (this.inFlightRequests.delete(requestId)) {
                    this.requestsDrainedCount++;
                }
            },
        };
    }
    /**
     * Get count of in-flight requests
     */
    getInFlightCount() {
        return this.inFlightRequests.size;
    }
    /**
     * Get list of in-flight request IDs
     */
    getInFlightRequests() {
        return Array.from(this.inFlightRequests.keys());
    }
    /**
     * Register a cleanup hook to be executed during shutdown
     */
    registerCleanup(name, hook, options = {}) {
        this.cleanups.set(name, {
            name,
            hook,
            options: {
                priority: options.priority ?? 0,
                timeout: options.timeout ?? 5000,
            },
        });
    }
    /**
     * Unregister a cleanup hook
     */
    unregisterCleanup(name) {
        this.cleanups.delete(name);
    }
    /**
     * Get list of registered cleanup hook names
     */
    getRegisteredCleanups() {
        return Array.from(this.cleanups.keys());
    }
    /**
     * Track a WebSocket connection
     */
    trackWebSocket(id, ws) {
        this.webSockets.set(id, { id, ws });
    }
    /**
     * Untrack a WebSocket connection
     */
    untrackWebSocket(id) {
        this.webSockets.delete(id);
    }
    /**
     * Get count of tracked WebSocket connections
     */
    getWebSocketCount() {
        return this.webSockets.size;
    }
    /**
     * Register an event listener
     */
    on(event, listener) {
        let listeners = this.eventListeners.get(event);
        if (!listeners) {
            listeners = new Set();
            this.eventListeners.set(event, listeners);
        }
        listeners.add(listener);
    }
    /**
     * Remove an event listener
     */
    off(event, listener) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.delete(listener);
        }
    }
    emit(event) {
        const listeners = this.eventListeners.get(event.type);
        if (listeners) {
            for (const listener of listeners) {
                try {
                    listener(event);
                }
                catch {
                    // Ignore listener errors
                }
            }
        }
    }
    /**
     * Register a state persistence hook
     */
    onPersistState(hook) {
        this.persistStateHook = hook;
    }
    /**
     * Wrap a request handler with shutdown-aware tracking
     */
    wrapHandler(handler) {
        const wrappedHandler = async (request) => {
            if (!this.canAcceptRequest()) {
                return new Response('Service Unavailable - Shutting Down', {
                    status: 503,
                    headers: {
                        'Content-Type': 'text/plain',
                        'Retry-After': '30',
                    },
                });
            }
            const tracker = this.trackRequest();
            try {
                return await handler(request);
            }
            finally {
                tracker.complete();
            }
        };
        return wrappedHandler;
    }
    /**
     * Reset to running state (for testing)
     */
    async reset() {
        this.state = ShutdownState.Running;
        this.inFlightRequests.clear();
        this.cleanups.clear();
        this.webSockets.clear();
        this.eventListeners.clear();
        this.persistStateHook = undefined;
        this.shutdownPromise = undefined;
        this.requestIdCounter = 0;
        this.requestsDrainedCount = 0;
    }
    delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
