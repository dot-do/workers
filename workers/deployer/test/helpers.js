/**
 * Test helpers for deployer worker tests
 *
 * Provides mock implementations for DeployerDO testing.
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
        transaction: null,
    };
    storage.transaction = vi.fn(async (closure) => {
        return closure(storage);
    });
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
    };
}
/**
 * Create a mock Cloudflare API
 */
export function createMockCloudflareAPI() {
    const scripts = new Map();
    const deployments = new Map();
    const versions = new Map();
    return {
        workers: {
            scripts: {
                create: vi.fn(async ({ accountId, scriptName }) => {
                    const script = {
                        id: scriptName,
                        etag: `etag-${Date.now()}`,
                        script: '',
                        size: 0,
                        modified_on: new Date().toISOString(),
                        created_on: new Date().toISOString(),
                        usage_model: 'standard',
                        handlers: ['fetch'],
                    };
                    scripts.set(`${accountId}:${scriptName}`, script);
                    return script;
                }),
                get: vi.fn(async ({ accountId, scriptName }) => {
                    return scripts.get(`${accountId}:${scriptName}`) ?? null;
                }),
                delete: vi.fn(async ({ accountId, scriptName }) => {
                    scripts.delete(`${accountId}:${scriptName}`);
                }),
                list: vi.fn(async ({ accountId }) => {
                    return Array.from(scripts.entries())
                        .filter(([key]) => key.startsWith(`${accountId}:`))
                        .map(([, script]) => script);
                }),
            },
            deployments: {
                create: vi.fn(async ({ accountId, scriptName, versionId, annotations }) => {
                    const deployment = {
                        id: `deploy-${Date.now()}`,
                        source: 'api',
                        strategy: 'immediate',
                        author_email: 'test@example.com',
                        annotations: {
                            workers_tag: annotations?.workerTag,
                            workers_message: annotations?.message,
                        },
                        versions: [{ version_id: versionId, percentage: 100 }],
                        created_on: new Date().toISOString(),
                    };
                    const key = `${accountId}:${scriptName}`;
                    const existing = deployments.get(key) ?? [];
                    existing.push(deployment);
                    deployments.set(key, existing);
                    return deployment;
                }),
                get: vi.fn(async ({ accountId, scriptName, deploymentId }) => {
                    const key = `${accountId}:${scriptName}`;
                    const scriptDeployments = deployments.get(key) ?? [];
                    return scriptDeployments.find(d => d.id === deploymentId) ?? null;
                }),
                list: vi.fn(async ({ accountId, scriptName }) => {
                    const key = `${accountId}:${scriptName}`;
                    return deployments.get(key) ?? [];
                }),
            },
        },
        versions: {
            create: vi.fn(async ({ accountId, scriptName, content, metadata }) => {
                const key = `${accountId}:${scriptName}`;
                const existing = versions.get(key) ?? [];
                const version = {
                    id: `version-${Date.now()}`,
                    number: existing.length + 1,
                    metadata: metadata ?? {},
                    resources: {
                        script: typeof content === 'string' ? content : '[binary]',
                        bindings: [],
                        script_runtime: {
                            usage_model: 'standard',
                            limits: {},
                        },
                    },
                    created_on: new Date().toISOString(),
                };
                existing.push(version);
                versions.set(key, existing);
                return version;
            }),
            get: vi.fn(async ({ accountId, scriptName, versionId }) => {
                const key = `${accountId}:${scriptName}`;
                const scriptVersions = versions.get(key) ?? [];
                return scriptVersions.find(v => v.id === versionId) ?? null;
            }),
            list: vi.fn(async ({ accountId, scriptName }) => {
                const key = `${accountId}:${scriptName}`;
                return versions.get(key) ?? [];
            }),
            rollback: vi.fn(async ({ accountId, scriptName, versionId }) => {
                const deployment = {
                    id: `deploy-rollback-${Date.now()}`,
                    source: 'api',
                    strategy: 'immediate',
                    author_email: 'test@example.com',
                    annotations: {
                        workers_message: `Rollback to version ${versionId}`,
                    },
                    versions: [{ version_id: versionId, percentage: 100 }],
                    created_on: new Date().toISOString(),
                };
                const key = `${accountId}:${scriptName}`;
                const existing = deployments.get(key) ?? [];
                existing.push(deployment);
                deployments.set(key, existing);
                return deployment;
            }),
        },
    };
}
/**
 * Create mock environment
 */
export function createMockEnv(options) {
    return {
        DEPLOYER_DO: {
            get: vi.fn(),
            idFromName: vi.fn((name) => createMockId(name)),
        },
        CLOUDFLARE_API_TOKEN: options?.apiToken ?? 'mock-api-token',
        CLOUDFLARE_ACCOUNT_ID: options?.accountId ?? 'mock-account-id',
        CLOUDFLARE: options?.cloudflareApi ?? createMockCloudflareAPI(),
    };
}
