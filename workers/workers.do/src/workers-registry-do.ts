/**
 * WorkersRegistryDO - Durable Object for worker registry
 *
 * Stores and manages worker metadata for a user.
 * Extends dotdo's DO class for SQLite storage and automatic Cap'n Web RPC.
 */

import { DO } from 'dotdo/objects'

export interface Worker {
  $id: string
  $type: 'Worker'
  name: string
  url: string
  createdAt: string
  deployedAt?: string
  accessedAt?: string
  linkedFolders?: string[]
}

export interface ListOptions {
  sortBy?: 'created' | 'deployed' | 'accessed'
  limit?: number
}

export interface LinkOptions {
  folder: string
}

export class WorkersRegistryDO extends DO {
  /**
   * List workers with sorting by created, deployed, or accessed timestamp.
   * Exposed via Cap'n Web RPC automatically.
   */
  async listWorkers(options: ListOptions = {}): Promise<Worker[]> {
    const { sortBy = 'accessed', limit = 20 } = options

    // Get all workers from the things store
    const workers = await this.things.list({ type: 'Worker' }) as unknown as Worker[]

    // Sort by requested field (descending - most recent first)
    workers.sort((a, b) => {
      const aDate = sortBy === 'created' ? a.createdAt :
                    sortBy === 'deployed' ? (a.deployedAt || a.createdAt) :
                    (a.accessedAt || a.createdAt)
      const bDate = sortBy === 'created' ? b.createdAt :
                    sortBy === 'deployed' ? (b.deployedAt || b.createdAt) :
                    (b.accessedAt || b.createdAt)
      return new Date(bDate).getTime() - new Date(aDate).getTime()
    })

    return workers.slice(0, limit)
  }

  /**
   * Get a single worker by ID.
   * Exposed via Cap'n Web RPC automatically.
   */
  async getWorker(workerId: string): Promise<Worker | null> {
    const thing = await this.things.get(workerId)
    if (!thing || thing.$type !== 'Worker') {
      return null
    }
    return this.thingToWorker(thing)
  }

  /**
   * Link a folder to a worker.
   * Exposed via Cap'n Web RPC automatically.
   */
  async linkWorker(workerId: string, options: LinkOptions): Promise<boolean> {
    const thing = await this.things.get(workerId)
    if (!thing || thing.$type !== 'Worker') {
      return false
    }

    const worker = this.thingToWorker(thing)
    const folders = worker.linkedFolders || []
    if (!folders.includes(options.folder)) {
      folders.push(options.folder)
    }

    const existingData = (thing.data as Record<string, unknown>) || {}
    await this.things.update(workerId, {
      data: {
        ...existingData,
        linkedFolders: folders,
        accessedAt: new Date().toISOString()
      }
    })

    return true
  }

  /**
   * Register a new worker.
   * Exposed via Cap'n Web RPC automatically.
   */
  async registerWorker(worker: Omit<Worker, '$type' | 'createdAt'>): Promise<Worker> {
    const now = new Date().toISOString()

    const created = await this.things.create({
      $id: worker.$id,
      $type: 'Worker',
      name: worker.name,
      data: {
        url: worker.url,
        createdAt: now,
        accessedAt: now,
        deployedAt: worker.deployedAt,
        linkedFolders: worker.linkedFolders || []
      }
    })

    return this.thingToWorker(created)
  }

  /**
   * Update the accessed timestamp for a worker.
   * Exposed via Cap'n Web RPC automatically.
   */
  async updateAccessed(workerId: string): Promise<void> {
    const thing = await this.things.get(workerId)
    if (!thing || thing.$type !== 'Worker') {
      return
    }

    const existingData = (thing.data as Record<string, unknown>) || {}
    await this.things.update(workerId, {
      data: {
        ...existingData,
        accessedAt: new Date().toISOString()
      }
    })
  }

  /**
   * Update the deployed timestamp for a worker.
   * Exposed via Cap'n Web RPC automatically.
   */
  async updateDeployed(workerId: string): Promise<void> {
    const thing = await this.things.get(workerId)
    if (!thing || thing.$type !== 'Worker') {
      return
    }

    const now = new Date().toISOString()
    const existingData = (thing.data as Record<string, unknown>) || {}
    await this.things.update(workerId, {
      data: {
        ...existingData,
        deployedAt: now,
        accessedAt: now
      }
    })
  }

  /**
   * Convert a ThingEntity to a Worker interface.
   * The Worker fields are stored in Thing.data for flexibility.
   */
  private thingToWorker(thing: { $id: string; $type: string; name: string | null; data: unknown }): Worker {
    const data = thing.data as Record<string, unknown> || {}
    return {
      $id: thing.$id,
      $type: 'Worker',
      name: thing.name || '',
      url: data.url as string || '',
      createdAt: data.createdAt as string || '',
      deployedAt: data.deployedAt as string | undefined,
      accessedAt: data.accessedAt as string | undefined,
      linkedFolders: data.linkedFolders as string[] | undefined
    }
  }
}
