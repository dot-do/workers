import { describe, it, expect } from 'vitest'
import launch, { StartupsNew, startups } from '../index.js'
import type {
  StartupsNewClient,
  LaunchOptions,
  LaunchResult,
  StartupTemplate,
  ServiceType,
  Template,
  ValidationResult,
} from '../index.js'

describe('startups.new SDK', () => {
  describe('exports', () => {
    it('exports default client', () => {
      expect(launch).toBeDefined()
      expect(typeof launch.create).toBe('function')
      expect(typeof launch.do).toBe('function')
    })

    it('exports named client', () => {
      expect(startups).toBeDefined()
      expect(startups).toBe(launch)
    })

    it('exports factory function', () => {
      expect(StartupsNew).toBeDefined()
      expect(typeof StartupsNew).toBe('function')
    })

    it('factory creates client with custom options', () => {
      const client = StartupsNew({
        apiKey: 'test-key',
        baseURL: 'https://custom.startups.new',
      })
      expect(client).toBeDefined()
      expect(typeof client.create).toBe('function')
    })
  })

  describe('client interface', () => {
    it('has tagged template interface', () => {
      expect(typeof launch.do).toBe('function')
    })

    it('has template methods', () => {
      expect(typeof launch.fromTemplate).toBe('function')
      expect(typeof launch.fromCustomTemplate).toBe('function')
    })

    it('has CRUD methods', () => {
      expect(typeof launch.create).toBe('function')
      expect(typeof launch.status).toBe('function')
      expect(typeof launch.list).toBe('function')
      expect(typeof launch.cancel).toBe('function')
    })

    it('has watch method', () => {
      expect(typeof launch.watch).toBe('function')
    })

    it('has templates namespace', () => {
      expect(launch.templates).toBeDefined()
      expect(typeof launch.templates.list).toBe('function')
      expect(typeof launch.templates.get).toBe('function')
      expect(typeof launch.templates.preview).toBe('function')
    })

    it('has domains namespace', () => {
      expect(launch.domains).toBeDefined()
      expect(typeof launch.domains.check).toBe('function')
      expect(typeof launch.domains.checkBulk).toBe('function')
      expect(typeof launch.domains.suggest).toBe('function')
      expect(typeof launch.domains.config).toBe('function')
      expect(typeof launch.domains.configure).toBe('function')
      expect(typeof launch.domains.addAlias).toBe('function')
      expect(typeof launch.domains.removeAlias).toBe('function')
      expect(typeof launch.domains.setPrimary).toBe('function')
    })

    it('has services namespace', () => {
      expect(launch.services).toBeDefined()
      expect(typeof launch.services.list).toBe('function')
      expect(typeof launch.services.status).toBe('function')
      expect(typeof launch.services.enable).toBe('function')
      expect(typeof launch.services.disable).toBe('function')
      expect(typeof launch.services.configure).toBe('function')
      expect(typeof launch.services.available).toBe('function')
    })

    it('has validation methods', () => {
      expect(typeof launch.validate).toBe('function')
      expect(typeof launch.validateName).toBe('function')
      expect(typeof launch.validatePrompt).toBe('function')
    })

    it('has clone and fork methods', () => {
      expect(typeof launch.clone).toBe('function')
      expect(typeof launch.fork).toBe('function')
    })

    it('has quick launch helpers', () => {
      expect(typeof launch.saas).toBe('function')
      expect(typeof launch.marketplace).toBe('function')
      expect(typeof launch.api).toBe('function')
      expect(typeof launch.agency).toBe('function')
      expect(typeof launch.ecommerce).toBe('function')
      expect(typeof launch.media).toBe('function')
    })
  })

  describe('types', () => {
    it('exports all required types', () => {
      // Type assertions - these will fail at compile time if types are missing
      const template: StartupTemplate = 'saas'
      const service: ServiceType = 'auth'

      const options: LaunchOptions = {
        name: 'Test Startup',
        template: 'saas',
        services: ['auth', 'payments'],
      }

      // These are compile-time checks
      expect(template).toBe('saas')
      expect(service).toBe('auth')
      expect(options.name).toBe('Test Startup')
    })

    it('template types are correct', () => {
      const templates: StartupTemplate[] = [
        'saas',
        'marketplace',
        'api',
        'agency',
        'ecommerce',
        'media',
        'custom',
      ]
      expect(templates).toHaveLength(7)
    })

    it('service types are correct', () => {
      const services: ServiceType[] = [
        'auth',
        'payments',
        'database',
        'storage',
        'email',
        'analytics',
        'ai',
        'search',
        'queue',
      ]
      expect(services).toHaveLength(9)
    })
  })
})
