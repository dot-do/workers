/**
 * Queue Glyph (卌)
 *
 * Queue operations with push/pop, consumer registration, and backpressure support.
 *
 * Visual metaphor: 卌 looks like items standing in a line - a queue.
 *
 * Usage:
 *   const tasks = 卌<Task>()
 *   await tasks.push(task)
 *   const next = await tasks.pop()
 *
 * Consumer pattern:
 *   卌.process(async (task) => { ... })
 *
 * ASCII alias: q
 */

/**
 * Options for creating a queue
 */
export interface QueueOptions {
  /** Maximum number of items in queue (undefined = unbounded) */
  maxSize?: number
  /** Timeout in ms for blocking operations */
  timeout?: number
  /** Default concurrency for process() */
  concurrency?: number
}

/**
 * Options for the process() consumer
 */
export interface ProcessOptions {
  /** Number of concurrent handlers (default: 1) */
  concurrency?: number
  /** Number of retry attempts (default: 0) */
  retries?: number
  /** Delay between retries in ms (default: 0) */
  retryDelay?: number
}

/**
 * Queue event types
 */
export type QueueEvent = 'push' | 'pop' | 'empty' | 'full'

/**
 * Queue event handler
 */
export type QueueEventHandler<T> = (item?: T) => void

/**
 * Queue instance interface
 */
export interface Queue<T> {
  /** Push an item to the queue (blocks if full) */
  push(item: T): Promise<void>

  /** Pop the first item from the queue */
  pop(): Promise<T | undefined>

  /** Peek at the first item without removing */
  peek(): T | undefined

  /** Push multiple items at once */
  pushMany(items: T[]): Promise<void>

  /** Pop multiple items at once */
  popMany(count: number): Promise<T[]>

  /** Register a consumer to process items */
  process(handler: (item: T) => Promise<void>, options?: ProcessOptions): () => void

  /** Non-blocking push - returns false if queue is full */
  tryPush(item: T): boolean

  /** Clear all items from the queue */
  clear(): void

  /** Drain all items and return them */
  drain(): T[]

  /** Subscribe to queue events */
  on(event: QueueEvent, handler: QueueEventHandler<T>): void

  /** Unsubscribe from queue events */
  off(event: QueueEvent, handler: QueueEventHandler<T>): void

  /** Dispose the queue and release resources */
  dispose(): void

  /** Number of items in queue */
  readonly length: number

  /** Whether queue is empty */
  readonly isEmpty: boolean

  /** Whether queue is at maxSize */
  readonly isFull: boolean

  /** Maximum size (undefined if unbounded) */
  readonly maxSize: number | undefined

  /** Timeout option */
  readonly timeout: number | undefined

  /** Concurrency option */
  readonly concurrency: number | undefined

  /** Queue name (for named queues) */
  readonly name: string | undefined

  /** Async iterator support */
  [Symbol.asyncIterator](): AsyncIterableIterator<T>
}

/**
 * Queue factory interface - callable and with static methods
 */
export interface QueueFactory {
  /** Create a typed queue with optional name or options */
  <T>(nameOrOptions?: string | QueueOptions): Queue<T>

  /** Tagged template for pushing to default queue */
  (strings: TemplateStringsArray, ...values: unknown[]): Promise<void>

  /** Global process handler for default queue */
  process(handler: (item: unknown) => Promise<void>, options?: ProcessOptions): () => void
}

// Store for named queues
const namedQueues = new Map<string, Queue<unknown>>()

// Default queue for tagged template usage
let defaultQueue: Queue<unknown> | null = null

function getDefaultQueue(): Queue<unknown> {
  if (!defaultQueue) {
    defaultQueue = createQueueInstance<unknown>(undefined, undefined)
  }
  return defaultQueue
}

/**
 * Create a queue instance
 */
function createQueueInstance<T>(name: string | undefined, options: QueueOptions | undefined): Queue<T> {
  const items: T[] = []
  const eventHandlers = new Map<QueueEvent, Set<QueueEventHandler<T>>>()
  const waitingPushes: Array<{ item: T; resolve: () => void }> = []
  const waitingPops: Array<{ resolve: (item: T) => void }> = []

  let disposed = false
  let activeProcessors = 0
  const processorStopFuncs: Array<() => void> = []

  const maxSize = options?.maxSize
  const timeout = options?.timeout
  const concurrency = options?.concurrency

  function emit(event: QueueEvent, item?: T): void {
    const handlers = eventHandlers.get(event)
    if (handlers) {
      for (const handler of handlers) {
        handler(item)
      }
    }
  }

  function checkWaitingPushes(): void {
    while (waitingPushes.length > 0 && (maxSize === undefined || items.length < maxSize)) {
      const waiting = waitingPushes.shift()!
      items.push(waiting.item)
      emit('push', waiting.item)
      if (maxSize !== undefined && items.length === maxSize) {
        emit('full')
      }
      waiting.resolve()
    }
  }

  function checkWaitingPops(): void {
    while (waitingPops.length > 0 && items.length > 0) {
      const waiting = waitingPops.shift()!
      const item = items.shift()!
      emit('pop', item)
      if (items.length === 0) {
        emit('empty')
      }
      waiting.resolve(item)
    }
  }

  const queue: Queue<T> = {
    async push(item: T): Promise<void> {
      if (disposed) {
        throw new Error('Queue has been disposed')
      }

      // If there are waiting pops, deliver directly
      if (waitingPops.length > 0) {
        const waiting = waitingPops.shift()!
        emit('push', item)
        emit('pop', item)
        waiting.resolve(item)
        return
      }

      // If queue is full, wait
      if (maxSize !== undefined && items.length >= maxSize) {
        return new Promise<void>((resolve) => {
          waitingPushes.push({ item, resolve })
        })
      }

      items.push(item)
      emit('push', item)
      if (maxSize !== undefined && items.length === maxSize) {
        emit('full')
      }
    },

    async pop(): Promise<T | undefined> {
      if (disposed) {
        return undefined
      }

      // Check waiting pushes first
      checkWaitingPushes()

      if (items.length > 0) {
        const item = items.shift()!
        emit('pop', item)
        if (items.length === 0) {
          emit('empty')
        }
        // Allow waiting pushes to proceed
        checkWaitingPushes()
        return item
      }

      return undefined
    },

    peek(): T | undefined {
      return items[0]
    },

    async pushMany(newItems: T[]): Promise<void> {
      for (const item of newItems) {
        await queue.push(item)
      }
    },

    async popMany(count: number): Promise<T[]> {
      const result: T[] = []
      for (let i = 0; i < count; i++) {
        const item = await queue.pop()
        if (item === undefined) break
        result.push(item)
      }
      return result
    },

    process(handler: (item: T) => Promise<void>, opts?: ProcessOptions): () => void {
      const processConcurrency = opts?.concurrency ?? 1
      const retries = opts?.retries ?? 0
      const retryDelay = opts?.retryDelay ?? 0

      let stopped = false
      let activeWorkers = 0
      const itemAvailable: Array<() => void> = []

      async function processItem(item: T): Promise<void> {
        let attempts = 0
        const maxAttempts = retries > 0 ? retries : 1
        while (attempts < maxAttempts) {
          try {
            await handler(item)
            return
          } catch {
            attempts++
            if (attempts < maxAttempts && retryDelay > 0) {
              await new Promise((resolve) => setTimeout(resolve, retryDelay))
            }
          }
        }
      }

      // Listen for push events to wake up waiting workers
      function onPush(): void {
        if (stopped) return
        // Wake up a waiting worker if there's one
        if (itemAvailable.length > 0) {
          const wakeUp = itemAvailable.shift()!
          wakeUp()
        }
      }

      queue.on('push', onPush)

      async function worker(): Promise<void> {
        while (!stopped) {
          // Check if there are items to process and we have capacity
          if (items.length > 0 && activeWorkers < processConcurrency) {
            activeWorkers++
            const item = items.shift()!
            emit('pop', item)
            if (items.length === 0) {
              emit('empty')
            }
            checkWaitingPushes()
            await processItem(item)
            activeWorkers--
          } else if (activeWorkers < processConcurrency) {
            // No items available, wait for a push event
            await new Promise<void>((resolve) => {
              itemAvailable.push(resolve)
            })
            // After waking up, check if stopped before continuing
            if (stopped) break
            // Don't increment activeWorkers here - loop back to check items
          } else {
            // At concurrency limit, wait a tick
            await new Promise((resolve) => setTimeout(resolve, 0))
          }
        }
      }

      // Start workers
      for (let i = 0; i < processConcurrency; i++) {
        worker()
      }

      const stop = () => {
        stopped = true
        queue.off('push', onPush)
        // Wake up any waiting workers so they can exit
        for (const wakeUp of itemAvailable) {
          wakeUp()
        }
        itemAvailable.length = 0
      }

      processorStopFuncs.push(stop)
      return stop
    },

    tryPush(item: T): boolean {
      if (disposed) return false
      if (maxSize !== undefined && items.length >= maxSize) {
        return false
      }
      items.push(item)
      emit('push', item)
      if (maxSize !== undefined && items.length === maxSize) {
        emit('full')
      }
      return true
    },

    clear(): void {
      items.length = 0
    },

    drain(): T[] {
      const drained = [...items]
      items.length = 0
      return drained
    },

    on(event: QueueEvent, handler: QueueEventHandler<T>): void {
      if (!eventHandlers.has(event)) {
        eventHandlers.set(event, new Set())
      }
      eventHandlers.get(event)!.add(handler)
    },

    off(event: QueueEvent, handler: QueueEventHandler<T>): void {
      const handlers = eventHandlers.get(event)
      if (handlers) {
        handlers.delete(handler)
      }
    },

    dispose(): void {
      disposed = true
      // Stop all processors
      for (const stop of processorStopFuncs) {
        stop()
      }
      processorStopFuncs.length = 0
      // Clear the queue
      items.length = 0
      // Clear waiting operations
      waitingPushes.length = 0
      waitingPops.length = 0
      // Clear event handlers
      eventHandlers.clear()
    },

    get length(): number {
      return items.length
    },

    get isEmpty(): boolean {
      return items.length === 0
    },

    get isFull(): boolean {
      if (maxSize === undefined) return false
      return items.length >= maxSize
    },

    get maxSize(): number | undefined {
      return maxSize
    },

    get timeout(): number | undefined {
      return timeout
    },

    get concurrency(): number | undefined {
      return concurrency
    },

    get name(): string | undefined {
      return name
    },

    async *[Symbol.asyncIterator](): AsyncIterableIterator<T> {
      while (!disposed) {
        // First try to get an existing item
        if (items.length > 0) {
          const item = items.shift()!
          emit('pop', item)
          if (items.length === 0) {
            emit('empty')
          }
          checkWaitingPushes()
          yield item
        } else {
          // Wait for a new item
          const item = await new Promise<T>((resolve) => {
            waitingPops.push({ resolve })
          })
          yield item
        }
      }
    },
  }

  return queue
}

/**
 * Create the queue factory
 */
function createQueueFactory(): QueueFactory {
  function factory<T>(nameOrOptions?: string | QueueOptions): Queue<T> {
    // Handle named queues
    if (typeof nameOrOptions === 'string') {
      const name = nameOrOptions
      if (namedQueues.has(name)) {
        return namedQueues.get(name) as Queue<T>
      }
      const queue = createQueueInstance<T>(name, undefined)
      namedQueues.set(name, queue as Queue<unknown>)
      return queue
    }

    // Handle options or no args
    return createQueueInstance<T>(undefined, nameOrOptions)
  }

  // Tagged template handler
  const taggedTemplate = async function (
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<void> {
    // Parse: 卌`task ${data}` or 卌`type:action ${data}`
    const template = strings[0].trim()
    const data = values.length === 1 ? values[0] : values.length > 1 ? { values } : undefined

    // Push to default queue with parsed data
    const item = {
      template,
      data,
      timestamp: Date.now(),
    }

    await getDefaultQueue().push(item)
  }

  // Create callable function that handles both forms
  const queueFactory = function <T>(
    stringsOrNameOrOptions?: TemplateStringsArray | string | QueueOptions,
    ...values: unknown[]
  ): Queue<T> | Promise<void> {
    // Check if called as tagged template
    if (
      stringsOrNameOrOptions &&
      typeof stringsOrNameOrOptions === 'object' &&
      'raw' in stringsOrNameOrOptions
    ) {
      return taggedTemplate(stringsOrNameOrOptions as TemplateStringsArray, ...values)
    }

    // Called as factory
    return factory<T>(stringsOrNameOrOptions as string | QueueOptions | undefined)
  } as QueueFactory

  // Add static process method
  queueFactory.process = function (
    handler: (item: unknown) => Promise<void>,
    options?: ProcessOptions
  ): () => void {
    return getDefaultQueue().process(handler, options)
  }

  return queueFactory
}

/**
 * The 卌 glyph - Queue operations with push/pop, consumer registration, and backpressure support
 *
 * Visual metaphor: 卌 looks like items standing in a line - a queue
 */
export const 卌: QueueFactory = createQueueFactory()

/**
 * ASCII alias for 卌
 */
export const q: QueueFactory = 卌
