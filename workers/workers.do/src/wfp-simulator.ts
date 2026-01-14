/**
 * WfP Dispatch Namespace Simulator
 *
 * Provides a simulated dispatch namespace for local testing.
 * In production, real WfP uses the Cloudflare API for deployment.
 *
 * This simulator:
 * 1. Stores worker code in memory
 * 2. Evaluates worker modules when fetch is called
 * 3. Supports bindings and env vars
 *
 * @module src/wfp-simulator
 */

/**
 * Stored worker definition
 */
export interface StoredWorker {
  name: string
  code: string
  compiledCode?: string
  bindings?: WorkerBindings
  env?: Record<string, string>
  createdAt: string
  updatedAt: string
}

/**
 * Worker bindings configuration
 */
export interface WorkerBindings {
  kv?: { name: string; namespace: KVNamespace }[]
  vars?: Record<string, string>
}

/**
 * Simulated dispatch namespace that stores and executes workers
 */
export class SimulatedDispatchNamespace {
  private workers: Map<string, StoredWorker> = new Map()
  private kvNamespaces: Map<string, SimulatedKV> = new Map()

  /**
   * Deploy a worker to the simulated namespace
   */
  async put(
    name: string,
    code: string,
    options?: {
      bindings?: WorkerBindings
      env?: Record<string, string>
    }
  ): Promise<void> {
    const now = new Date().toISOString()
    const existing = this.workers.get(name)

    this.workers.set(name, {
      name,
      code,
      bindings: options?.bindings,
      env: options?.env,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    })
  }

  /**
   * Get a worker from the namespace
   * Returns a Fetcher-like object that executes the worker
   */
  get(name: string): Fetcher {
    const worker = this.workers.get(name)

    if (!worker) {
      // Return a fetcher that returns 404
      return {
        fetch: async () => {
          return new Response(
            JSON.stringify({ error: 'Worker not found', name }),
            {
              status: 404,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        },
        connect: () => {
          throw new Error('connect not supported in simulator')
        },
      } as Fetcher
    }

    // Return a fetcher that executes the worker code
    return {
      fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
        return this.executeWorker(worker, input, init)
      },
      connect: () => {
        throw new Error('connect not supported in simulator')
      },
    } as Fetcher
  }

  /**
   * Delete a worker from the namespace
   */
  async delete(name: string): Promise<boolean> {
    return this.workers.delete(name)
  }

  /**
   * List all workers in the namespace
   */
  list(): string[] {
    return Array.from(this.workers.keys())
  }

  /**
   * Check if a worker exists
   */
  has(name: string): boolean {
    return this.workers.has(name)
  }

  /**
   * Get worker metadata
   */
  getMetadata(name: string): StoredWorker | undefined {
    return this.workers.get(name)
  }

  /**
   * Get or create a simulated KV namespace
   */
  getKV(name: string): SimulatedKV {
    let kv = this.kvNamespaces.get(name)
    if (!kv) {
      kv = new SimulatedKV()
      this.kvNamespaces.set(name, kv)
    }
    return kv
  }

  /**
   * Execute worker code and return response
   */
  private async executeWorker(
    worker: StoredWorker,
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    try {
      // Create the request
      const request =
        input instanceof Request ? input : new Request(input, init)

      // Build the env object with bindings
      const env = this.buildEnv(worker)

      // Execute the worker module
      const module = await this.evaluateWorkerCode(worker.code)

      if (!module.default?.fetch) {
        return new Response('Worker does not export a fetch handler', {
          status: 500,
        })
      }

      // Call the worker's fetch handler
      return await module.default.fetch(request, env)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return new Response(
        JSON.stringify({ error: 'Worker execution failed', message }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }
  }

  /**
   * Build environment object with bindings
   */
  private buildEnv(worker: StoredWorker): Record<string, unknown> {
    const env: Record<string, unknown> = {}

    // Add environment variables
    if (worker.env) {
      Object.assign(env, worker.env)
    }

    // Add var bindings
    if (worker.bindings?.vars) {
      Object.assign(env, worker.bindings.vars)
    }

    // Add KV bindings
    if (worker.bindings?.kv) {
      for (const binding of worker.bindings.kv) {
        env[binding.name] = binding.namespace || this.getKV(binding.name)
      }
    }

    return env
  }

  /**
   * Evaluate worker code as a module
   *
   * This uses dynamic evaluation to execute the worker code.
   * In a real production environment, this would use the Cloudflare API.
   */
  private async evaluateWorkerCode(
    code: string
  ): Promise<{ default?: { fetch?: (req: Request, env: unknown) => Promise<Response> } }> {
    // For ESM worker code, we need to transform and evaluate it
    // This is a simplified version - real implementation would use esbuild

    // Strip TypeScript syntax if present (very basic)
    let jsCode = code
      .replace(/: Request/g, '')
      .replace(/: Response/g, '')
      .replace(/: Promise<Response>/g, '')
      .replace(/: any/g, '')
      .replace(/: string/g, '')
      .replace(/: number/g, '')
      .replace(/: boolean/g, '')
      .replace(/: void/g, '')
      .replace(/: unknown/g, '')
      .replace(/<[^>]+>/g, '') // Remove generic type parameters

    // Convert ESM export to CommonJS-compatible format
    // Handle `export default { ... }` pattern
    if (jsCode.includes('export default')) {
      jsCode = jsCode.replace('export default', 'return')
    }

    // Create a function that returns the module
    const moduleFactory = new Function(jsCode)
    const moduleExports = moduleFactory()

    return { default: moduleExports }
  }
}

/**
 * Simulated KV namespace for testing
 */
export class SimulatedKV implements KVNamespace {
  private store: Map<string, { value: string; metadata?: unknown }> = new Map()

  async get(
    key: string,
    options?: Partial<KVNamespaceGetOptions<undefined>>
  ): Promise<string | null>
  async get(key: string, type: 'text'): Promise<string | null>
  async get<ExpectedValue = unknown>(
    key: string,
    type: 'json'
  ): Promise<ExpectedValue | null>
  async get(key: string, type: 'arrayBuffer'): Promise<ArrayBuffer | null>
  async get(key: string, type: 'stream'): Promise<ReadableStream | null>
  async get(
    key: string,
    options?: Partial<KVNamespaceGetOptions<undefined>> | string
  ): Promise<string | ArrayBuffer | ReadableStream | unknown | null> {
    const entry = this.store.get(key)
    if (!entry) return null

    const type = typeof options === 'string' ? options : options?.type || 'text'

    switch (type) {
      case 'json':
        return JSON.parse(entry.value)
      case 'arrayBuffer':
        return new TextEncoder().encode(entry.value).buffer
      case 'stream':
        return new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(entry.value))
            controller.close()
          },
        })
      default:
        return entry.value
    }
  }

  async put(
    key: string,
    value: string | ArrayBuffer | ReadableStream,
    options?: KVNamespacePutOptions
  ): Promise<void> {
    let stringValue: string
    if (typeof value === 'string') {
      stringValue = value
    } else if (value instanceof ArrayBuffer) {
      stringValue = new TextDecoder().decode(value)
    } else {
      // ReadableStream
      const reader = value.getReader()
      const chunks: Uint8Array[] = []
      while (true) {
        const { done, value: chunk } = await reader.read()
        if (done) break
        chunks.push(chunk)
      }
      const totalLength = chunks.reduce((acc, c) => acc + c.length, 0)
      const result = new Uint8Array(totalLength)
      let offset = 0
      for (const chunk of chunks) {
        result.set(chunk, offset)
        offset += chunk.length
      }
      stringValue = new TextDecoder().decode(result)
    }

    this.store.set(key, { value: stringValue, metadata: options?.metadata })
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key)
  }

  async list(options?: KVNamespaceListOptions): Promise<KVNamespaceListResult<unknown, string>> {
    const prefix = options?.prefix || ''
    const limit = options?.limit || 1000

    const keys: { name: string; metadata?: unknown }[] = []
    for (const [name, entry] of this.store) {
      if (name.startsWith(prefix)) {
        keys.push({ name, metadata: entry.metadata })
        if (keys.length >= limit) break
      }
    }

    return {
      keys,
      list_complete: keys.length < limit,
      cacheStatus: null,
    }
  }

  async getWithMetadata<Metadata = unknown>(
    key: string,
    options?: Partial<KVNamespaceGetOptions<undefined>> | 'text'
  ): Promise<KVNamespaceGetWithMetadataResult<string, Metadata>>
  async getWithMetadata<Metadata = unknown>(
    key: string,
    type: 'json'
  ): Promise<KVNamespaceGetWithMetadataResult<unknown, Metadata>>
  async getWithMetadata<Metadata = unknown>(
    key: string,
    type: 'arrayBuffer'
  ): Promise<KVNamespaceGetWithMetadataResult<ArrayBuffer, Metadata>>
  async getWithMetadata<Metadata = unknown>(
    key: string,
    type: 'stream'
  ): Promise<KVNamespaceGetWithMetadataResult<ReadableStream, Metadata>>
  async getWithMetadata<Metadata = unknown>(
    key: string,
    options?: Partial<KVNamespaceGetOptions<undefined>> | string
  ): Promise<KVNamespaceGetWithMetadataResult<string | ArrayBuffer | ReadableStream | unknown, Metadata>> {
    const entry = this.store.get(key)
    if (!entry) {
      return { value: null, metadata: null, cacheStatus: null }
    }

    const value = await this.get(key, options as any)
    return {
      value,
      metadata: entry.metadata as Metadata | null,
      cacheStatus: null,
    }
  }
}

/**
 * Global simulated dispatch namespace instance
 * Used for testing when real WfP is not available
 */
let globalSimulator: SimulatedDispatchNamespace | null = null

/**
 * Get or create the global simulated dispatch namespace
 */
export function getSimulatedDispatchNamespace(): SimulatedDispatchNamespace {
  if (!globalSimulator) {
    globalSimulator = new SimulatedDispatchNamespace()
  }
  return globalSimulator
}

/**
 * Reset the global simulator (useful between tests)
 */
export function resetSimulatedDispatchNamespace(): void {
  globalSimulator = new SimulatedDispatchNamespace()
}

/**
 * Create a new simulated dispatch namespace
 */
export function createSimulatedDispatchNamespace(): SimulatedDispatchNamespace {
  return new SimulatedDispatchNamespace()
}
