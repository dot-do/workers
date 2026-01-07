/**
 * RED Phase TDD: WebSocket Hibernation Contract Tests
 *
 * These tests define the contract for WebSocket hibernation support.
 * All tests should FAIL initially - implementation comes in GREEN phase.
 *
 * The WebSocket hibernation contract includes:
 * - Accepting WebSockets with ctx.acceptWebSocket()
 * - WebSocket tagging for filtering
 * - Auto-response for ping/pong
 * - Hibernation-compatible event handlers
 * - Session state via attachments
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DOCore, } from '../src/index.js';
// Mock WebSocket implementation for testing
class MockWebSocket {
    readyState = 1; // OPEN
    url = 'ws://example.com';
    sentMessages = [];
    closed = false;
    closeCode;
    closeReason;
    attachment = null;
    tags = [];
    send(data) {
        if (this.readyState !== 1) {
            throw new Error('WebSocket is not open');
        }
        this.sentMessages.push(data);
    }
    close(code, reason) {
        this.closed = true;
        this.closeCode = code;
        this.closeReason = reason;
        this.readyState = 3; // CLOSED
    }
    serializeAttachment(attachment) {
        this.attachment = attachment;
    }
    deserializeAttachment() {
        return this.attachment;
    }
    // For testing - set tags
    setTags(tags) {
        this.tags = tags;
    }
    getTags() {
        return this.tags;
    }
}
// Mock implementations
function createMockId() {
    return {
        name: undefined,
        toString: () => 'mock-id',
        equals: (other) => other.toString() === 'mock-id',
    };
}
function createMockSqlCursor() {
    return {
        columnNames: [],
        rowsRead: 0,
        rowsWritten: 0,
        toArray: () => [],
        one: () => null,
        raw: function* () { },
        [Symbol.iterator]: function* () { },
    };
}
function createMockSqlStorage() {
    return {
        exec: () => createMockSqlCursor(),
    };
}
function createMockStorage() {
    const store = new Map();
    let alarmTime = null;
    return {
        get: vi.fn(async (keyOrKeys) => {
            if (Array.isArray(keyOrKeys)) {
                const result = new Map();
                for (const key of keyOrKeys) {
                    const value = store.get(key);
                    if (value !== undefined)
                        result.set(key, value);
                }
                return result;
            }
            return store.get(keyOrKeys);
        }),
        put: vi.fn(async (keyOrEntries, value) => {
            if (typeof keyOrEntries === 'string') {
                store.set(keyOrEntries, value);
            }
            else {
                for (const [k, v] of Object.entries(keyOrEntries)) {
                    store.set(k, v);
                }
            }
        }),
        delete: vi.fn(async (keyOrKeys) => {
            if (Array.isArray(keyOrKeys)) {
                let count = 0;
                for (const key of keyOrKeys) {
                    if (store.delete(key))
                        count++;
                }
                return count;
            }
            return store.delete(keyOrKeys);
        }),
        deleteAll: vi.fn(async () => store.clear()),
        list: vi.fn(async () => new Map(store)),
        getAlarm: vi.fn(async () => alarmTime),
        setAlarm: vi.fn(async (time) => {
            alarmTime = time instanceof Date ? time.getTime() : time;
        }),
        deleteAlarm: vi.fn(async () => { alarmTime = null; }),
        transaction: vi.fn(async (closure) => {
            return closure(createMockStorage());
        }),
        sql: createMockSqlStorage(),
    };
}
function createMockState() {
    const webSockets = new Map();
    let autoResponsePair = null;
    return {
        id: createMockId(),
        storage: createMockStorage(),
        blockConcurrencyWhile: vi.fn(async (callback) => callback()),
        acceptWebSocket: vi.fn((ws, tags) => {
            const mockWs = ws;
            if (tags)
                mockWs.setTags(tags);
            const id = crypto.randomUUID();
            webSockets.set(id, mockWs);
        }),
        getWebSockets: vi.fn((tag) => {
            const result = [];
            for (const ws of webSockets.values()) {
                if (!tag || ws.getTags().includes(tag)) {
                    result.push(ws);
                }
            }
            return result;
        }),
        setWebSocketAutoResponse: vi.fn((pair) => {
            autoResponsePair = pair;
        }),
        webSockets,
        autoResponsePair,
    };
}
describe('WebSocket Hibernation Contract', () => {
    let ctx;
    beforeEach(() => {
        ctx = createMockState();
    });
    describe('acceptWebSocket()', () => {
        it('should accept a WebSocket for hibernation', () => {
            const ws = new MockWebSocket();
            ctx.acceptWebSocket(ws);
            expect(ctx.acceptWebSocket).toHaveBeenCalledWith(ws);
            expect(ctx.webSockets.size).toBe(1);
        });
        it('should accept WebSocket with tags', () => {
            const ws = new MockWebSocket();
            ctx.acceptWebSocket(ws, ['room:123', 'user:456']);
            expect(ctx.acceptWebSocket).toHaveBeenCalledWith(ws, ['room:123', 'user:456']);
        });
        it('should support multiple WebSocket connections', () => {
            const ws1 = new MockWebSocket();
            const ws2 = new MockWebSocket();
            const ws3 = new MockWebSocket();
            ctx.acceptWebSocket(ws1);
            ctx.acceptWebSocket(ws2);
            ctx.acceptWebSocket(ws3);
            expect(ctx.webSockets.size).toBe(3);
        });
    });
    describe('getWebSockets()', () => {
        it('should return all WebSockets when no tag specified', () => {
            const ws1 = new MockWebSocket();
            const ws2 = new MockWebSocket();
            ctx.acceptWebSocket(ws1);
            ctx.acceptWebSocket(ws2);
            const sockets = ctx.getWebSockets();
            expect(sockets).toHaveLength(2);
        });
        it('should filter WebSockets by tag', () => {
            const ws1 = new MockWebSocket();
            const ws2 = new MockWebSocket();
            const ws3 = new MockWebSocket();
            ctx.acceptWebSocket(ws1, ['room:A']);
            ctx.acceptWebSocket(ws2, ['room:A', 'room:B']);
            ctx.acceptWebSocket(ws3, ['room:B']);
            const roomASockets = ctx.getWebSockets('room:A');
            const roomBSockets = ctx.getWebSockets('room:B');
            expect(roomASockets).toHaveLength(2);
            expect(roomBSockets).toHaveLength(2);
        });
        it('should return empty array when no matches', () => {
            const ws = new MockWebSocket();
            ctx.acceptWebSocket(ws, ['room:A']);
            const sockets = ctx.getWebSockets('nonexistent');
            expect(sockets).toHaveLength(0);
        });
    });
    describe('setWebSocketAutoResponse()', () => {
        it('should set auto-response pair', () => {
            const pair = {
                request: 'ping',
                response: 'pong',
            };
            ctx.setWebSocketAutoResponse(pair);
            expect(ctx.setWebSocketAutoResponse).toHaveBeenCalledWith(pair);
        });
    });
    describe('webSocketMessage() handler', () => {
        it('should exist on DOCore', () => {
            const instance = new DOCore(ctx, {});
            expect(typeof instance.webSocketMessage).toBe('function');
        });
        it('should throw not implemented in base DOCore', async () => {
            const instance = new DOCore(ctx, {});
            const ws = new MockWebSocket();
            await expect(instance.webSocketMessage(ws, 'test')).rejects.toThrow('not implemented');
        });
        it('should handle string messages in subclass', async () => {
            class MessageDO extends DOCore {
                receivedMessages = [];
                async webSocketMessage(_ws, message) {
                    if (typeof message === 'string') {
                        this.receivedMessages.push(message);
                    }
                }
            }
            const instance = new MessageDO(ctx, {});
            const ws = new MockWebSocket();
            await instance.webSocketMessage(ws, 'hello');
            await instance.webSocketMessage(ws, 'world');
            expect(instance.receivedMessages).toEqual(['hello', 'world']);
        });
        it('should handle ArrayBuffer messages in subclass', async () => {
            class BinaryDO extends DOCore {
                receivedBinary = [];
                async webSocketMessage(_ws, message) {
                    if (message instanceof ArrayBuffer) {
                        this.receivedBinary.push(message);
                    }
                }
            }
            const instance = new BinaryDO(ctx, {});
            const ws = new MockWebSocket();
            const buffer = new ArrayBuffer(8);
            await instance.webSocketMessage(ws, buffer);
            expect(instance.receivedBinary).toHaveLength(1);
        });
        it('should allow sending responses back', async () => {
            class EchoDO extends DOCore {
                async webSocketMessage(ws, message) {
                    if (typeof message === 'string') {
                        const mockWs = ws;
                        mockWs.send(`echo: ${message}`);
                    }
                }
            }
            const instance = new EchoDO(ctx, {});
            const ws = new MockWebSocket();
            await instance.webSocketMessage(ws, 'test');
            expect(ws.sentMessages).toEqual(['echo: test']);
        });
        it('should support JSON message parsing', async () => {
            class RpcDO extends DOCore {
                async webSocketMessage(ws, message) {
                    if (typeof message !== 'string')
                        return;
                    const data = JSON.parse(message);
                    if (data.type === 'rpc') {
                        const result = await this.handleRpc(data.method, data.args);
                        const mockWs = ws;
                        mockWs.send(JSON.stringify({ id: data.id, result }));
                    }
                }
                async handleRpc(method, _args) {
                    if (method === 'ping')
                        return 'pong';
                    throw new Error(`Unknown method: ${method}`);
                }
            }
            const instance = new RpcDO(ctx, {});
            const ws = new MockWebSocket();
            await instance.webSocketMessage(ws, JSON.stringify({ type: 'rpc', method: 'ping', args: [], id: '123' }));
            expect(ws.sentMessages).toHaveLength(1);
            const response = JSON.parse(ws.sentMessages[0]);
            expect(response.id).toBe('123');
            expect(response.result).toBe('pong');
        });
    });
    describe('webSocketClose() handler', () => {
        it('should exist on DOCore', () => {
            const instance = new DOCore(ctx, {});
            expect(typeof instance.webSocketClose).toBe('function');
        });
        it('should throw not implemented in base DOCore', async () => {
            const instance = new DOCore(ctx, {});
            const ws = new MockWebSocket();
            await expect(instance.webSocketClose(ws, 1000, 'Normal closure', true)).rejects.toThrow('not implemented');
        });
        it('should handle close events in subclass', async () => {
            class CleanupDO extends DOCore {
                closedSockets = [];
                async webSocketClose(_ws, code, reason, _wasClean) {
                    this.closedSockets.push({ code, reason });
                }
            }
            const instance = new CleanupDO(ctx, {});
            const ws = new MockWebSocket();
            await instance.webSocketClose(ws, 1000, 'bye', true);
            expect(instance.closedSockets).toEqual([{ code: 1000, reason: 'bye' }]);
        });
        it('should support cleanup on close', async () => {
            class SessionDO extends DOCore {
                async webSocketClose(ws, _code, _reason, _wasClean) {
                    const mockWs = ws;
                    const session = mockWs.deserializeAttachment();
                    if (session?.sessionId) {
                        await this.ctx.storage.delete(`session:${session.sessionId}`);
                    }
                }
            }
            const instance = new SessionDO(ctx, {});
            const ws = new MockWebSocket();
            ws.serializeAttachment({ sessionId: 'abc123' });
            ctx.acceptWebSocket(ws);
            await instance.webSocketClose(ws, 1000, '', true);
            expect(ctx.storage.delete).toHaveBeenCalledWith('session:abc123');
        });
    });
    describe('webSocketError() handler', () => {
        it('should exist on DOCore', () => {
            const instance = new DOCore(ctx, {});
            expect(typeof instance.webSocketError).toBe('function');
        });
        it('should throw not implemented in base DOCore', async () => {
            const instance = new DOCore(ctx, {});
            const ws = new MockWebSocket();
            await expect(instance.webSocketError(ws, new Error('test'))).rejects.toThrow('not implemented');
        });
        it('should handle errors in subclass', async () => {
            class ErrorLogDO extends DOCore {
                errors = [];
                async webSocketError(_ws, error) {
                    const message = error instanceof Error ? error.message : 'Unknown error';
                    this.errors.push(message);
                }
            }
            const instance = new ErrorLogDO(ctx, {});
            const ws = new MockWebSocket();
            await instance.webSocketError(ws, new Error('Connection lost'));
            expect(instance.errors).toEqual(['Connection lost']);
        });
    });
    describe('WebSocket Attachments (Session State)', () => {
        it('should support serializing attachment', () => {
            const ws = new MockWebSocket();
            const session = { userId: 'user123', permissions: ['read', 'write'] };
            ws.serializeAttachment(session);
            expect(ws.deserializeAttachment()).toEqual(session);
        });
        it('should persist session across hibernation', async () => {
            class SessionDO extends DOCore {
                async webSocketMessage(ws, message) {
                    const mockWs = ws;
                    if (typeof message !== 'string')
                        return;
                    const data = JSON.parse(message);
                    if (data.action === 'login') {
                        mockWs.serializeAttachment({ userId: data.userId, loggedInAt: Date.now() });
                        mockWs.send(JSON.stringify({ success: true }));
                    }
                    if (data.action === 'whoami') {
                        const session = mockWs.deserializeAttachment();
                        mockWs.send(JSON.stringify({ userId: session?.userId ?? null }));
                    }
                }
            }
            const instance = new SessionDO(ctx, {});
            const ws = new MockWebSocket();
            // Login
            await instance.webSocketMessage(ws, JSON.stringify({ action: 'login', userId: 'alice' }));
            // Check session (simulating after hibernation wake)
            await instance.webSocketMessage(ws, JSON.stringify({ action: 'whoami' }));
            const lastResponse = JSON.parse(ws.sentMessages[ws.sentMessages.length - 1]);
            expect(lastResponse.userId).toBe('alice');
        });
    });
    describe('Broadcast Patterns', () => {
        it('should support broadcasting to all connections', async () => {
            class BroadcastDO extends DOCore {
                async broadcast(message) {
                    const sockets = this.ctx.getWebSockets();
                    for (const ws of sockets) {
                        const mockWs = ws;
                        mockWs.send(message);
                    }
                }
            }
            const instance = new BroadcastDO(ctx, {});
            const ws1 = new MockWebSocket();
            const ws2 = new MockWebSocket();
            const ws3 = new MockWebSocket();
            ctx.acceptWebSocket(ws1);
            ctx.acceptWebSocket(ws2);
            ctx.acceptWebSocket(ws3);
            await instance.broadcast('Hello everyone!');
            expect(ws1.sentMessages).toContain('Hello everyone!');
            expect(ws2.sentMessages).toContain('Hello everyone!');
            expect(ws3.sentMessages).toContain('Hello everyone!');
        });
        it('should support room-based broadcasting', async () => {
            class RoomDO extends DOCore {
                async broadcastToRoom(room, message) {
                    const sockets = this.ctx.getWebSockets(`room:${room}`);
                    for (const ws of sockets) {
                        const mockWs = ws;
                        mockWs.send(message);
                    }
                }
            }
            const instance = new RoomDO(ctx, {});
            const ws1 = new MockWebSocket();
            const ws2 = new MockWebSocket();
            const ws3 = new MockWebSocket();
            ctx.acceptWebSocket(ws1, ['room:lobby']);
            ctx.acceptWebSocket(ws2, ['room:lobby']);
            ctx.acceptWebSocket(ws3, ['room:private']);
            await instance.broadcastToRoom('lobby', 'Lobby message');
            expect(ws1.sentMessages).toContain('Lobby message');
            expect(ws2.sentMessages).toContain('Lobby message');
            expect(ws3.sentMessages).not.toContain('Lobby message');
        });
        it('should handle dead sockets during broadcast', async () => {
            class SafeBroadcastDO extends DOCore {
                async safeBroadcast(message) {
                    const sockets = this.ctx.getWebSockets();
                    let sent = 0;
                    for (const ws of sockets) {
                        const mockWs = ws;
                        try {
                            if (mockWs.readyState === 1) { // OPEN
                                mockWs.send(message);
                                sent++;
                            }
                        }
                        catch {
                            // Socket is dead, ignore
                        }
                    }
                    return sent;
                }
            }
            const instance = new SafeBroadcastDO(ctx, {});
            const ws1 = new MockWebSocket();
            const ws2 = new MockWebSocket();
            ws2.readyState = 3; // CLOSED
            ctx.acceptWebSocket(ws1);
            ctx.acceptWebSocket(ws2);
            const sent = await instance.safeBroadcast('test');
            expect(sent).toBe(1);
            expect(ws1.sentMessages).toContain('test');
        });
    });
    describe('HTTP to WebSocket Upgrade', () => {
        it('should handle WebSocket upgrade in fetch', async () => {
            class WebSocketDO extends DOCore {
                async fetch(request) {
                    if (request.headers.get('Upgrade') === 'websocket') {
                        // In real Workers, this creates a WebSocketPair and returns 101
                        // For testing in Node.js, we simulate the upgrade with a marker
                        // (Node.js Response doesn't support 101 status)
                        const ws = new MockWebSocket();
                        this.ctx.acceptWebSocket(ws);
                        this.ctx.setWebSocketAutoResponse({ request: 'ping', response: 'pong' });
                        // Return marker response (in Workers runtime this would be status 101)
                        return new Response('websocket-upgrade-accepted', {
                            status: 200,
                            headers: { 'X-Upgrade': 'websocket' },
                        });
                    }
                    return new Response('Expected WebSocket', { status: 400 });
                }
            }
            const instance = new WebSocketDO(ctx, {});
            const request = new Request('https://example.com/ws', {
                headers: { 'Upgrade': 'websocket' },
            });
            const response = await instance.fetch(request);
            // In Workers runtime, this would be 101. In Node.js tests, we use a marker.
            expect(response.headers.get('X-Upgrade')).toBe('websocket');
            expect(ctx.acceptWebSocket).toHaveBeenCalled();
            expect(ctx.setWebSocketAutoResponse).toHaveBeenCalledWith({
                request: 'ping',
                response: 'pong',
            });
        });
    });
});
