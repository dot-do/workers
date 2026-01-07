/**
 * Mock factory functions for Cloudflare Workers runtime objects.
 *
 * These functions create mock implementations of Request, Response,
 * Durable Objects, KV Namespaces, and other Cloudflare runtime primitives.
 */
export function createMockRequest(options = {}) {
    let { url = 'https://example.com/', method = 'GET', headers = {}, body, json, params, cf, } = options;
    // Add query params to URL
    if (params && Object.keys(params).length > 0) {
        const urlObj = new URL(url);
        for (const [key, value] of Object.entries(params)) {
            urlObj.searchParams.set(key, value);
        }
        url = urlObj.toString();
    }
    const requestHeaders = new Headers(headers);
    let requestBody = body ?? null;
    if (json !== undefined) {
        requestBody = JSON.stringify(json);
        if (!requestHeaders.has('Content-Type')) {
            requestHeaders.set('Content-Type', 'application/json');
        }
    }
    const request = new Request(url, {
        method,
        headers: requestHeaders,
        body: requestBody,
    });
    // Add cf property
    if (cf) {
        Object.defineProperty(request, 'cf', {
            value: cf,
            writable: false,
            enumerable: true,
        });
    }
    return request;
}
export function createMockResponse(options = {}) {
    const { status = 200, statusText, headers = {}, body, json, } = options;
    const responseHeaders = new Headers(headers);
    let responseBody = body ?? null;
    if (json !== undefined) {
        responseBody = JSON.stringify(json);
        if (!responseHeaders.has('Content-Type')) {
            responseHeaders.set('Content-Type', 'application/json');
        }
    }
    return new Response(responseBody, {
        status,
        statusText,
        headers: responseHeaders,
    });
}
export function createMockDurableObjectStorage(options) {
    const store = new Map();
    let alarm = null;
    // Seed initial data
    if (options?.initialData) {
        for (const [key, value] of Object.entries(options.initialData)) {
            store.set(key, value);
        }
    }
    const storage = {
        async get(keyOrKeys) {
            if (Array.isArray(keyOrKeys)) {
                const result = new Map();
                for (const key of keyOrKeys) {
                    const value = store.get(key);
                    if (value !== undefined) {
                        result.set(key, value);
                    }
                }
                return result;
            }
            return store.get(keyOrKeys);
        },
        async put(keyOrEntries, value) {
            if (typeof keyOrEntries === 'string') {
                store.set(keyOrEntries, value);
            }
            else {
                for (const [k, v] of Object.entries(keyOrEntries)) {
                    store.set(k, v);
                }
            }
        },
        async delete(keyOrKeys) {
            if (Array.isArray(keyOrKeys)) {
                let count = 0;
                for (const key of keyOrKeys) {
                    if (store.delete(key)) {
                        count++;
                    }
                }
                return count;
            }
            return store.delete(keyOrKeys);
        },
        async deleteAll() {
            store.clear();
        },
        async list(options) {
            const result = new Map();
            let entries = Array.from(store.entries());
            if (options?.prefix) {
                entries = entries.filter(([key]) => key.startsWith(options.prefix));
            }
            if (options?.start) {
                entries = entries.filter(([key]) => key >= options.start);
            }
            if (options?.end) {
                entries = entries.filter(([key]) => key < options.end);
            }
            entries.sort((a, b) => a[0].localeCompare(b[0]));
            if (options?.reverse) {
                entries.reverse();
            }
            if (options?.limit) {
                entries = entries.slice(0, options.limit);
            }
            for (const [key, value] of entries) {
                result.set(key, value);
            }
            return result;
        },
        async getAlarm() {
            return alarm;
        },
        async setAlarm(scheduledTime) {
            alarm = typeof scheduledTime === 'number' ? scheduledTime : scheduledTime.getTime();
        },
        async deleteAlarm() {
            alarm = null;
        },
        async sync() {
            // No-op for mock
        },
        async transaction(closure) {
            // For simplicity, just run the closure with self - no real transactional semantics
            return closure(storage);
        },
    };
    return storage;
}
export function createMockDurableObjectId(options) {
    // Handle legacy string argument
    const opts = typeof options === 'string' ? { name: options } : options;
    const name = opts?.name;
    const idString = opts?.id ?? name ?? `id-${Math.random().toString(36).slice(2)}`;
    return {
        name,
        toString() {
            return idString;
        },
        equals(other) {
            return this.toString() === other.toString();
        },
    };
}
export function createMockDurableObjectState(options) {
    const id = options?.id ?? createMockDurableObjectId();
    const storage = options?.storage ?? createMockDurableObjectStorage();
    const waitUntilPromises = [];
    const webSockets = [];
    return {
        id,
        storage,
        waitUntil(promise) {
            waitUntilPromises.push(promise);
        },
        async blockConcurrencyWhile(callback) {
            return callback();
        },
        acceptWebSocket(ws, tags) {
            webSockets.push({ ws, tags: tags ?? [] });
        },
        getWebSockets(tag) {
            if (tag) {
                return webSockets.filter(s => s.tags.includes(tag)).map(s => s.ws);
            }
            return webSockets.map(s => s.ws);
        },
    };
}
export function createMockDurableObjectStub(options) {
    const id = options?.id ?? createMockDurableObjectId(options?.name ? { name: options.name } : undefined);
    const handler = options?.handler ?? options?.fetchHandler;
    return {
        id,
        name: options?.name,
        async fetch(requestOrUrl, init) {
            const request = typeof requestOrUrl === 'string'
                ? new Request(requestOrUrl, init)
                : requestOrUrl;
            if (!handler) {
                throw new Error('No handler defined for DurableObjectStub. Provide a handler in options.');
            }
            return handler(request);
        },
    };
}
export function createMockKVNamespace(options) {
    const store = new Map();
    const simulateExpiration = options?.simulateExpiration ?? true;
    // Seed initial data
    if (options?.initialData) {
        for (const [key, value] of Object.entries(options.initialData)) {
            const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
            store.set(key, { value: stringValue });
        }
    }
    const isExpired = (entry) => {
        if (!simulateExpiration)
            return false;
        if (!entry.expiration)
            return false;
        return entry.expiration < Date.now() / 1000;
    };
    return {
        async get(key, getOptions) {
            const entry = store.get(key);
            if (!entry)
                return null;
            // Check expiration
            if (isExpired(entry)) {
                store.delete(key);
                return null;
            }
            const type = getOptions?.type ?? 'text';
            switch (type) {
                case 'json':
                    return JSON.parse(entry.value);
                case 'arrayBuffer':
                    return new TextEncoder().encode(entry.value).buffer;
                case 'stream':
                    return new ReadableStream({
                        start(controller) {
                            controller.enqueue(new TextEncoder().encode(entry.value));
                            controller.close();
                        },
                    });
                case 'text':
                default:
                    return entry.value;
            }
        },
        async getWithMetadata(key, getOptions) {
            const entry = store.get(key);
            if (!entry)
                return { value: null, metadata: null };
            // Check expiration
            if (isExpired(entry)) {
                store.delete(key);
                return { value: null, metadata: null };
            }
            const type = getOptions?.type ?? 'text';
            let value;
            switch (type) {
                case 'json':
                    value = JSON.parse(entry.value);
                    break;
                case 'text':
                default:
                    value = entry.value;
            }
            return { value, metadata: entry.metadata ?? null };
        },
        async put(key, value, putOptions) {
            let stringValue;
            if (typeof value === 'string') {
                stringValue = value;
            }
            else if (value instanceof ArrayBuffer) {
                stringValue = new TextDecoder().decode(value);
            }
            else if (ArrayBuffer.isView(value)) {
                stringValue = new TextDecoder().decode(value);
            }
            else {
                // ReadableStream - consume it
                const reader = value.getReader();
                const chunks = [];
                while (true) {
                    const { done, value: chunk } = await reader.read();
                    if (done)
                        break;
                    chunks.push(chunk);
                }
                const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
                const combined = new Uint8Array(totalLength);
                let offset = 0;
                for (const chunk of chunks) {
                    combined.set(chunk, offset);
                    offset += chunk.length;
                }
                stringValue = new TextDecoder().decode(combined);
            }
            let expiration;
            if (putOptions?.expiration) {
                expiration = putOptions.expiration;
            }
            else if (putOptions?.expirationTtl) {
                expiration = Math.floor(Date.now() / 1000) + putOptions.expirationTtl;
            }
            store.set(key, { value: stringValue, metadata: putOptions?.metadata, expiration });
        },
        async delete(key) {
            store.delete(key);
        },
        async list(listOptions) {
            const prefix = listOptions?.prefix ?? '';
            const limit = listOptions?.limit ?? 1000;
            const startIndex = listOptions?.cursor ? parseInt(listOptions.cursor, 10) : 0;
            const allKeys = Array.from(store.entries())
                .filter(([key, entry]) => {
                if (!key.startsWith(prefix))
                    return false;
                if (isExpired(entry)) {
                    store.delete(key);
                    return false;
                }
                return true;
            })
                .map(([name, entry]) => ({ name, expiration: entry.expiration, metadata: entry.metadata }))
                .sort((a, b) => a.name.localeCompare(b.name));
            const keys = allKeys.slice(startIndex, startIndex + limit);
            const list_complete = startIndex + limit >= allKeys.length;
            return {
                keys,
                list_complete,
                cursor: list_complete ? undefined : String(startIndex + limit),
            };
        },
    };
}
export function createMockR2Bucket() {
    const store = new Map();
    const createR2Object = (key, value) => ({
        key,
        size: new TextEncoder().encode(value).length,
        etag: `"${Math.random().toString(36).slice(2)}"`,
        body: new ReadableStream({
            start(controller) {
                controller.enqueue(new TextEncoder().encode(value));
                controller.close();
            },
        }),
        async text() { return value; },
        async json() { return JSON.parse(value); },
        async arrayBuffer() { return new TextEncoder().encode(value).buffer; },
    });
    return {
        async get(key) {
            const entry = store.get(key);
            if (!entry)
                return null;
            return createR2Object(key, entry.value);
        },
        async put(key, value) {
            let stringValue;
            if (typeof value === 'string') {
                stringValue = value;
            }
            else if (value instanceof ArrayBuffer) {
                stringValue = new TextDecoder().decode(value);
            }
            else {
                const reader = value.getReader();
                const chunks = [];
                while (true) {
                    const { done, value: chunk } = await reader.read();
                    if (done)
                        break;
                    chunks.push(chunk);
                }
                stringValue = new TextDecoder().decode(new Uint8Array(chunks.flatMap(c => Array.from(c))));
            }
            store.set(key, { value: stringValue });
            return createR2Object(key, stringValue);
        },
        async delete(keyOrKeys) {
            const keys = Array.isArray(keyOrKeys) ? keyOrKeys : [keyOrKeys];
            for (const key of keys) {
                store.delete(key);
            }
        },
        async list(options) {
            const prefix = options?.prefix ?? '';
            const limit = options?.limit ?? 1000;
            const entries = Array.from(store.entries())
                .filter(([key]) => key.startsWith(prefix))
                .slice(0, limit)
                .map(([key, entry]) => createR2Object(key, entry.value));
            return { objects: entries, truncated: false };
        },
        async head(key) {
            const entry = store.get(key);
            if (!entry)
                return null;
            const obj = createR2Object(key, entry.value);
            delete obj.body;
            return obj;
        },
    };
}
export function createMockD1Database() {
    return {
        prepare(_query) {
            let _boundValues = [];
            const statement = {
                bind(...values) {
                    _boundValues = values;
                    return statement;
                },
                async first(_column) {
                    return null;
                },
                async all() {
                    return { results: [], success: true, meta: { duration: 0 } };
                },
                async run() {
                    return { results: [], success: true, meta: { duration: 0, changes: 0 } };
                },
                async raw() {
                    return [];
                },
            };
            return statement;
        },
        async batch(statements) {
            return statements.map(() => ({ results: [], success: true, meta: { duration: 0 } }));
        },
        async exec(_query) {
            return { count: 0, duration: 0 };
        },
    };
}
export function createMockQueue() {
    const messages = [];
    return {
        async send(message) {
            messages.push(message);
        },
        async sendBatch(batch) {
            for (const msg of batch) {
                messages.push(msg.body);
            }
        },
    };
}
export function createMockDurableObjectNamespace(options) {
    const stubs = new Map();
    return {
        get(id) {
            const idStr = id.toString();
            if (!stubs.has(idStr)) {
                stubs.set(idStr, createMockDurableObjectStub({
                    id: id,
                    handler: options?.handler,
                }));
            }
            return stubs.get(idStr);
        },
        idFromName(name) {
            return createMockDurableObjectId({ name, id: `name:${name}` });
        },
        idFromString(id) {
            return createMockDurableObjectId({ id });
        },
        newUniqueId() {
            return createMockDurableObjectId();
        },
    };
}
export function createMockEnv(options) {
    if (!options?.bindings) {
        return {};
    }
    const env = {};
    for (const [key, value] of Object.entries(options.bindings)) {
        if (value === null || value === undefined) {
            env[key] = value;
            continue;
        }
        // Check if it's a binding config with type
        if (typeof value === 'object' && !Array.isArray(value) && 'type' in value) {
            const config = value;
            switch (config.type) {
                case 'kv':
                    env[key] = createMockKVNamespace();
                    break;
                case 'durable_object':
                    env[key] = createMockDurableObjectNamespace({ handler: config.handler });
                    break;
                case 'r2':
                    env[key] = createMockR2Bucket();
                    break;
                case 'd1':
                    env[key] = createMockD1Database();
                    break;
                case 'queue':
                    env[key] = createMockQueue();
                    break;
                default:
                    env[key] = value;
            }
        }
        else {
            // Plain value or pre-created mock
            env[key] = value;
        }
    }
    return env;
}
export function createMockExecutionContext(options) {
    const waitUntilPromises = [];
    let passThroughOnException = false;
    const abortController = new AbortController();
    const throwOnReject = options?.throwOnWaitUntilReject ?? false;
    const ctx = {
        _waitUntilPromises: waitUntilPromises,
        _passThroughOnException: passThroughOnException,
        abortController,
        props: {},
        waitUntil(promise) {
            waitUntilPromises.push(promise);
        },
        passThroughOnException() {
            passThroughOnException = true;
            ctx._passThroughOnException = true;
        },
        getWaitUntilPromises() {
            return waitUntilPromises;
        },
        didPassThroughOnException() {
            return ctx._passThroughOnException;
        },
        async flushWaitUntil() {
            if (throwOnReject) {
                await Promise.all(waitUntilPromises);
            }
            else {
                await Promise.allSettled(waitUntilPromises);
            }
        },
        dispose() {
            abortController.abort();
        },
    };
    return ctx;
}
