/**
 * Test Data Generators
 *
 * Provides utilities to generate and seed test data
 */

import { createTestThing, createTestRelationship, createTestUser, createTestAgent, createTestWorkflow, createTestBatch } from './factories'

/**
 * Generate a single thing
 */
export function generateThing(ns: string = 'test', overrides: Partial<any> = {}) {
  return createTestThing({ ns, ...overrides })
}

/**
 * Generate multiple things
 */
export function generateThings(count: number, ns: string = 'test', overrides: Partial<any>[] = []) {
  return createTestBatch((override) => createTestThing({ ns, ...override }), count, overrides)
}

/**
 * Generate a relationship between two things
 */
export function generateRelationship(fromThing: any, toThing: any, type: string = 'related-to', overrides: Partial<any> = {}) {
  return createTestRelationship({
    fromNs: fromThing.ns,
    fromId: fromThing.id,
    toNs: toThing.ns,
    toId: toThing.id,
    type,
    ...overrides,
  })
}

/**
 * Generate a graph of things with relationships
 */
export function generateThingGraph(nodeCount: number, edgeCount: number) {
  const things = generateThings(nodeCount)
  const relationships: any[] = []

  for (let i = 0; i < edgeCount; i++) {
    const from = things[Math.floor(Math.random() * things.length)]
    const to = things[Math.floor(Math.random() * things.length)]

    if (from.id !== to.id) {
      relationships.push(generateRelationship(from, to))
    }
  }

  return { things, relationships }
}

/**
 * Generate test users
 */
export function generateUsers(count: number, overrides: Partial<any>[] = []) {
  return createTestBatch(createTestUser, count, overrides)
}

/**
 * Generate test agents
 */
export function generateAgents(count: number, overrides: Partial<any>[] = []) {
  return createTestBatch(createTestAgent, count, overrides)
}

/**
 * Generate test workflows
 */
export function generateWorkflows(count: number, overrides: Partial<any>[] = []) {
  return createTestBatch(createTestWorkflow, count, overrides)
}

/**
 * Database seeder
 */
export class DatabaseSeeder {
  private data: Map<string, Map<string, any>> = new Map()

  /**
   * Seed things
   */
  seedThings(ns: string, things: any[]) {
    if (!this.data.has(ns)) {
      this.data.set(ns, new Map())
    }

    const nsData = this.data.get(ns)!
    for (const thing of things) {
      nsData.set(thing.id, thing)
    }
  }

  /**
   * Get thing by ID
   */
  getThing(ns: string, id: string): any | undefined {
    return this.data.get(ns)?.get(id)
  }

  /**
   * Get all things in namespace
   */
  getThings(ns: string): any[] {
    const nsData = this.data.get(ns)
    return nsData ? Array.from(nsData.values()) : []
  }

  /**
   * Clear all data
   */
  clear() {
    this.data.clear()
  }

  /**
   * Clear namespace
   */
  clearNamespace(ns: string) {
    this.data.delete(ns)
  }

  /**
   * Export data
   */
  export() {
    const exported: Record<string, any[]> = {}

    for (const [ns, nsData] of this.data.entries()) {
      exported[ns] = Array.from(nsData.values())
    }

    return exported
  }

  /**
   * Import data
   */
  import(data: Record<string, any[]>) {
    for (const [ns, things] of Object.entries(data)) {
      this.seedThings(ns, things)
    }
  }
}

/**
 * Seed database with test data
 */
export async function seedDatabase(db: any, options: { things?: number; users?: number; agents?: number; workflows?: number } = {}) {
  const seeder = new DatabaseSeeder()

  // Seed things
  if (options.things) {
    const things = generateThings(options.things)
    seeder.seedThings('test', things)

    // Insert into database
    for (const thing of things) {
      await db.createThing(thing.ns, thing)
    }
  }

  // Seed users
  if (options.users) {
    const users = generateUsers(options.users)
    for (const user of users) {
      await db.createUser(user)
    }
  }

  // Seed agents
  if (options.agents) {
    const agents = generateAgents(options.agents)
    seeder.seedThings('agent', agents)

    for (const agent of agents) {
      await db.createThing('agent', agent)
    }
  }

  // Seed workflows
  if (options.workflows) {
    const workflows = generateWorkflows(options.workflows)
    seeder.seedThings('workflow', workflows)

    for (const workflow of workflows) {
      await db.createThing('workflow', workflow)
    }
  }

  return seeder
}

/**
 * Generate realistic test data
 */
export class RealisticDataGenerator {
  /**
   * Generate a realistic agent with tools and metadata
   */
  generateRealisticAgent() {
    return createTestAgent({
      prompt: `You are a helpful assistant specialized in ${this.randomSpecialization()}.`,
      model: this.randomModel(),
      temperature: Math.random() * 0.5 + 0.5, // 0.5-1.0
      maxTokens: [500, 1000, 2000, 4000][Math.floor(Math.random() * 4)],
      tools: this.randomTools(),
      metadata: {
        category: this.randomSpecialization(),
        tags: this.randomTags(),
        public: Math.random() > 0.5,
      },
    })
  }

  /**
   * Generate a realistic workflow with steps
   */
  generateRealisticWorkflow() {
    const stepCount = Math.floor(Math.random() * 5) + 2 // 2-6 steps

    return createTestWorkflow({
      steps: Array.from({ length: stepCount }, (_, i) => ({
        id: `step-${i + 1}`,
        name: `Step ${i + 1}`,
        type: this.randomStepType(),
        config: {},
      })),
      triggers: [
        {
          type: 'manual',
          config: {},
        },
      ],
      metadata: {
        category: 'automation',
        complexity: stepCount < 4 ? 'simple' : 'complex',
      },
    })
  }

  private randomSpecialization(): string {
    const specializations = ['software development', 'data analysis', 'content writing', 'customer support', 'research', 'design']
    return specializations[Math.floor(Math.random() * specializations.length)]
  }

  private randomModel(): string {
    const models = ['gpt-4o', 'gpt-4o-mini', 'claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022']
    return models[Math.floor(Math.random() * models.length)]
  }

  private randomTools(): string[] {
    const allTools = ['search', 'calculator', 'code-interpreter', 'file-reader', 'web-scraper', 'email']
    const count = Math.floor(Math.random() * 4) + 1
    const tools = new Set<string>()

    while (tools.size < count) {
      tools.add(allTools[Math.floor(Math.random() * allTools.length)])
    }

    return Array.from(tools)
  }

  private randomTags(): string[] {
    const allTags = ['productivity', 'automation', 'ai', 'data', 'analytics', 'communication', 'development']
    const count = Math.floor(Math.random() * 3) + 1
    const tags = new Set<string>()

    while (tags.size < count) {
      tags.add(allTags[Math.floor(Math.random() * allTags.length)])
    }

    return Array.from(tags)
  }

  private randomStepType(): string {
    const types = ['action', 'condition', 'loop', 'parallel', 'transform']
    return types[Math.floor(Math.random() * types.length)]
  }
}

/**
 * Create a realistic data generator
 */
export function createRealisticGenerator() {
  return new RealisticDataGenerator()
}

/**
 * Bulk insert helper
 */
export async function bulkInsert<T>(items: T[], insertFn: (item: T) => Promise<void>, batchSize: number = 10): Promise<void> {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    await Promise.all(batch.map(insertFn))
  }
}

/**
 * Generate performance test data
 */
export function generatePerformanceTestData(scale: 'small' | 'medium' | 'large') {
  const scales = {
    small: { things: 100, relationships: 200, users: 50 },
    medium: { things: 1000, relationships: 2000, users: 500 },
    large: { things: 10000, relationships: 20000, users: 5000 },
  }

  const config = scales[scale]

  return {
    things: generateThings(config.things),
    relationships: [],
    users: generateUsers(config.users),
  }
}
