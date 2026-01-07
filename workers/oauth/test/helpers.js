/**
 * Test helpers for oauth.do worker tests
 *
 * Provides mock implementations for OAuthDO testing.
 */
import { vi } from 'vitest';
/**
 * Create a mock DurableObjectId
 */
export function createMockId(name) {
    const idString = name ?? `mock-id-${Math.random().toString(36).slice(2, 10)}`;
    return {
        name,
        toString: () => idString,
        equals: (other) => other.toString() === idString,
    };
}
/**
 * Create a mock DOStorage with optional initial data
 */
export function createMockStorage(initialData) {
    const store = new Map();
    if (initialData) {
        for (const [key, value] of Object.entries(initialData)) {
            store.set(key, value);
        }
    }
    const getImpl = async (keyOrKeys) => {
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
    };
    const putImpl = async (keyOrEntries, value) => {
        if (typeof keyOrEntries === 'string') {
            store.set(keyOrEntries, value);
        }
        else {
            for (const [k, v] of Object.entries(keyOrEntries)) {
                store.set(k, v);
            }
        }
    };
    const deleteImpl = async (keyOrKeys) => {
        if (Array.isArray(keyOrKeys)) {
            let count = 0;
            for (const key of keyOrKeys) {
                if (store.delete(key))
                    count++;
            }
            return count;
        }
        return store.delete(keyOrKeys);
    };
    const deleteAllImpl = async () => {
        store.clear();
    };
    const listImpl = async (options) => {
        let entries = Array.from(store.entries());
        if (options?.prefix) {
            entries = entries.filter(([key]) => key.startsWith(options.prefix));
        }
        entries.sort(([a], [b]) => a.localeCompare(b));
        if (options?.limit !== undefined) {
            entries = entries.slice(0, options.limit);
        }
        return new Map(entries);
    };
    const storage = {
        get: vi.fn(getImpl),
        put: vi.fn(putImpl),
        delete: vi.fn(deleteImpl),
        deleteAll: vi.fn(deleteAllImpl),
        list: vi.fn(listImpl),
        transaction: vi.fn(async (closure) => {
            return closure(storage);
        }),
    };
    return storage;
}
/**
 * Create a mock DOState
 */
export function createMockState(options) {
    const id = options?.id ?? createMockId();
    const storage = options?.storage ?? createMockStorage(options?.initialData);
    return {
        id,
        storage,
        blockConcurrencyWhile: vi.fn(async (callback) => callback()),
        acceptWebSocket: vi.fn(),
        getWebSockets: vi.fn(() => []),
        setWebSocketAutoResponse: vi.fn(),
    };
}
/**
 * Create a mock WorkOS client
 */
export function createMockWorkOSClient() {
    return {
        userManagement: {
            authenticateWithCode: vi.fn(),
            authenticateWithRefreshToken: vi.fn(),
            getUser: vi.fn(),
            getAuthorizationUrl: vi.fn(),
            getLogoutUrl: vi.fn(),
            revokeSession: vi.fn(),
        },
        sso: {
            getAuthorizationUrl: vi.fn(),
        },
    };
}
/**
 * Create mock environment
 */
export function createMockEnv() {
    return {
        OAUTH_DO: {
            get: vi.fn(),
            idFromName: vi.fn((name) => createMockId(name)),
        },
        WORKOS_API_KEY: 'sk_test_mock_api_key',
        WORKOS_CLIENT_ID: 'client_mock_id',
        WORKOS_REDIRECT_URI: 'https://oauth.do/callback',
        COOKIE_SECRET: 'mock-cookie-secret-for-testing',
    };
}
/**
 * Create a mock session
 */
export function createMockSession(overrides) {
    return {
        id: 'session_mock_123',
        userId: 'user_mock_456',
        accessToken: 'access_token_mock',
        refreshToken: 'refresh_token_mock',
        expiresAt: Date.now() + 3600000, // 1 hour from now
        createdAt: Date.now(),
        ...overrides,
    };
}
/**
 * Create a mock user
 */
export function createMockUser(overrides) {
    return {
        id: 'user_mock_456',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        emailVerified: true,
        profilePictureUrl: 'https://example.com/avatar.png',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...overrides,
    };
}
/**
 * Create a mock authorization code response
 */
export function createMockAuthCodeResponse() {
    return {
        accessToken: 'access_token_from_code',
        refreshToken: 'refresh_token_from_code',
        expiresIn: 3600,
        user: createMockUser(),
    };
}
