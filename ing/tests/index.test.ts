/**
 * Basic tests for ing worker
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { IngService } from '../src/index'
import type { Env } from '../src/types'

// Mock environment
const mockEnv: Env = {
  DB_SERVICE: {
    // Thing operations
    getThing: async () => null,
    createThing: async () => ({ id: 'test', ns: 'ing', createdAt: new Date() }),
    updateThing: async () => ({ id: 'test', ns: 'ing', updatedAt: new Date() }),
    deleteThing: async () => {},
    listThings: async () => [],

    // Relationship operations
    getRelationships: async () => ({}),
    queryRelationships: async () => [],
    getIncomingRelationships: async () => [],
    upsertRelationship: async () => ({
      id: 'test:rel:type:test',
      subject: 'ing:test',
      predicate: 'type',
      object: 'ing:test',
      createdAt: new Date(),
    }),
    deleteRelationship: async () => {},

    // Stats operations
    stats: async () => ({ thingsByNamespace: {}, relationshipsByType: {} }),
    typeDistribution: async () => ({}),
  },
  AUTH_SERVICE: {
    getUser: async () => null,
    validateSession: async () => null,
    checkPermission: async () => false,
  },
  SEMANTIC_TRIPLES_QUEUE: {} as any,
  ENVIRONMENT: 'test',
}

describe('IngService', () => {
  let service: IngService

  beforeEach(() => {
    service = new IngService({} as any, mockEnv)
  })

  describe('Verb Resolution', () => {
    it('should resolve GS1 verb', async () => {
      const verb = await service.resolveVerb('invoicing')
      expect(verb).toBeDefined()
      expect(verb?.gerund).toBe('invoicing')
      expect(verb?.base_form).toBe('invoice')
    })

    it('should return null for unknown verb', async () => {
      const verb = await service.resolveVerb('unknown_verb_12345')
      expect(verb).toBeNull()
    })

    it('should list all verbs', async () => {
      const verbs = await service.listVerbs()
      expect(verbs.length).toBeGreaterThan(0)
    })

    it('should list verbs by category', async () => {
      const verbs = await service.listVerbs('supply-chain')
      expect(verbs.length).toBeGreaterThan(0)
      expect(verbs.every(v => v.category === 'supply-chain')).toBe(true)
    })
  })

  describe('Role Resolution', () => {
    it('should resolve predefined role', async () => {
      const role = await service.resolveRole('accountant')
      expect(role).toBeDefined()
      expect(role?.name).toBe('accountant')
      expect(role?.capabilities).toContain('invoicing')
    })

    it('should return null for unknown role', async () => {
      const role = await service.resolveRole('unknown_role_12345')
      expect(role).toBeNull()
    })

    it('should list all roles', async () => {
      const roles = await service.listRoles()
      expect(roles.length).toBeGreaterThan(0)
    })
  })

  describe('Capability Checks', () => {
    it('should allow accountant to invoice', async () => {
      const capability = await service.checkCapability('accountant', 'invoicing')
      expect(capability.allowed).toBe(true)
    })

    it('should deny viewer from deleting', async () => {
      const capability = await service.checkCapability('viewer', 'deleting')
      expect(capability.allowed).toBe(false)
    })

    it('should allow admin wildcard access', async () => {
      const capability = await service.checkCapability('admin', 'any_verb')
      expect(capability.allowed).toBe(true)
    })

    it('should include danger level in capability check', async () => {
      const capability = await service.checkCapability('accountant', 'deleting')
      expect(capability.danger_level).toBe('critical')
    })
  })

  describe('Role Capabilities', () => {
    it('should get all capabilities for role', async () => {
      const capabilities = await service.getRoleCapabilities('accountant')
      expect(capabilities).toContain('invoicing')
      expect(capabilities).toContain('reading')
    })

    it('should inherit parent capabilities', async () => {
      const capabilities = await service.getRoleCapabilities('senior_developer')
      expect(capabilities).toContain('coding') // From parent
      expect(capabilities).toContain('deploying') // Own capability
    })
  })
})

describe('Verb Registry', () => {
  it('should contain all 37 GS1 verbs', async () => {
    const service = new IngService({} as any, mockEnv)
    const verbs = await service.listVerbs('supply-chain')
    expect(verbs.length).toBe(37)
  })

  it('should have correct danger levels', async () => {
    const service = new IngService({} as any, mockEnv)

    const safe = await service.resolveVerb('reading')
    expect(safe?.danger_level).toBe('safe')

    const critical = await service.resolveVerb('destroying')
    expect(critical?.danger_level).toBe('critical')
    expect(critical?.requires_approval).toBe(true)
  })
})

describe('Role Registry', () => {
  it('should have admin with wildcard capability', async () => {
    const service = new IngService({} as any, mockEnv)
    const role = await service.resolveRole('admin')
    expect(role?.capabilities).toContain('*')
  })

  it('should have correct O*NET codes', async () => {
    const service = new IngService({} as any, mockEnv)

    const accountant = await service.resolveRole('accountant')
    expect(accountant?.onet_code).toBe('13-2011.00')

    const developer = await service.resolveRole('developer')
    expect(developer?.onet_code).toBe('15-1252.00')
  })
})
