/**
 * RED Tests: workers/ai classify/summarize tests
 *
 * These tests define the contract for AIDO.is(), AIDO.summarize(), and AIDO.diagram() methods.
 *
 * Per README.md:
 * - is(value, condition) returns boolean classification
 * - summarize(text, options?) condenses text to key points
 * - diagram(description, options?) generates diagrams (mermaid, svg)
 *
 * RED PHASE: These tests MUST FAIL because AIDO is not implemented yet.
 * The implementation will be done in the GREEN phase (workers-jfso0).
 *
 * @see workers/ai/README.md
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  createMockState,
  createMockEnv,
  type MockDOState,
  type MockAIEnv,
  type IsOptions,
  type SummarizeOptions,
  type DiagramOptions,
  type DiagramResult,
} from './helpers.js'

/**
 * Interface definition for AIDO - this defines the contract
 * The implementation must satisfy this interface
 */
export interface AIDOContract {
  // Boolean classification
  is(value: string, condition: string, options?: IsOptions): Promise<boolean>

  // Text summarization
  summarize(text: string, options?: SummarizeOptions): Promise<string>

  // Diagram generation
  diagram(description: string, options?: DiagramOptions): Promise<DiagramResult>

  // RPC interface
  hasMethod(name: string): boolean
  call(method: string, params: unknown[]): Promise<unknown>

  // HTTP handler
  fetch(request: Request): Promise<Response>
}

/**
 * Attempt to load AIDO - this will fail in RED phase
 * In GREEN phase, the module will exist and tests will pass
 */
async function loadAIDO(): Promise<new (ctx: MockDOState, env: MockAIEnv) => AIDOContract> {
  // This dynamic import will fail because src/ai.js doesn't exist yet
  const module = await import('../src/ai.js')
  return module.AIDO
}

describe('AIDO.is() - Boolean Classification', () => {
  let ctx: MockDOState
  let env: MockAIEnv
  let AIDO: new (ctx: MockDOState, env: MockAIEnv) => AIDOContract

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv()
    // This will throw in RED phase because the module doesn't exist
    AIDO = await loadAIDO()
  })

  describe('basic classification', () => {
    it('should return true for matching condition', async () => {
      const instance = new AIDO(ctx, env)
      const result = await instance.is(
        'I love this product! Best purchase ever!',
        'positive sentiment'
      )
      expect(result).toBe(true)
    })

    it('should return false for non-matching condition', async () => {
      const instance = new AIDO(ctx, env)
      const result = await instance.is(
        'I love this product! Best purchase ever!',
        'negative sentiment'
      )
      expect(result).toBe(false)
    })

    it('should return boolean type', async () => {
      const instance = new AIDO(ctx, env)
      const result = await instance.is('Some text', 'any condition')
      expect(typeof result).toBe('boolean')
    })
  })

  describe('spam detection', () => {
    it('should detect spam content', async () => {
      const instance = new AIDO(ctx, env)
      const result = await instance.is(
        'Buy now! Limited offer! Act fast! Click here!!!',
        'spam or promotional content'
      )
      expect(result).toBe(true)
    })

    it('should not flag legitimate content as spam', async () => {
      const instance = new AIDO(ctx, env)
      const result = await instance.is(
        'Thank you for your order. Your package will arrive next week.',
        'spam or promotional content'
      )
      expect(result).toBe(false)
    })
  })

  describe('urgency detection', () => {
    it('should detect urgent tickets', async () => {
      const instance = new AIDO(ctx, env)
      const result = await instance.is(
        'CRITICAL: Production server is down! All services unavailable!',
        'requires immediate attention'
      )
      expect(result).toBe(true)
    })

    it('should not flag low-priority tickets as urgent', async () => {
      const instance = new AIDO(ctx, env)
      const result = await instance.is(
        'Minor typo in documentation on page 42.',
        'requires immediate attention'
      )
      expect(result).toBe(false)
    })
  })

  describe('code validation', () => {
    it('should validate correct TypeScript', async () => {
      const instance = new AIDO(ctx, env)
      const result = await instance.is(
        'const greeting: string = "hello";',
        'syntactically correct TypeScript'
      )
      expect(result).toBe(true)
    })

    it('should detect invalid TypeScript', async () => {
      const instance = new AIDO(ctx, env)
      const result = await instance.is(
        'const x: string = ',
        'syntactically correct TypeScript'
      )
      expect(result).toBe(false)
    })
  })

  describe('options', () => {
    it('should support model selection', async () => {
      const instance = new AIDO(ctx, env)
      const result = await instance.is(
        'Test message',
        'valid',
        { model: '@cf/meta/llama-3.1-8b-instruct' }
      )
      expect(typeof result).toBe('boolean')
    })

    it('should respect threshold option', async () => {
      const instance = new AIDO(ctx, env)
      // With high threshold, borderline cases should return false
      const result = await instance.is(
        'Maybe this could be spam?',
        'spam',
        { threshold: 0.9 }
      )
      expect(typeof result).toBe('boolean')
    })

    it('should use default threshold of 0.5', async () => {
      const instance = new AIDO(ctx, env)
      const result = await instance.is('Some text', 'condition')
      expect(typeof result).toBe('boolean')
    })
  })

  describe('edge cases', () => {
    it('should handle empty string', async () => {
      const instance = new AIDO(ctx, env)
      const result = await instance.is('', 'contains text')
      expect(result).toBe(false)
    })

    it('should handle very long text', async () => {
      const instance = new AIDO(ctx, env)
      const longText = 'This is a positive message. '.repeat(1000)
      const result = await instance.is(longText, 'positive sentiment')
      expect(typeof result).toBe('boolean')
    })

    it('should handle special characters', async () => {
      const instance = new AIDO(ctx, env)
      const result = await instance.is(
        '<script>alert("xss")</script>',
        'malicious code'
      )
      expect(typeof result).toBe('boolean')
    })

    it('should handle unicode text', async () => {
      const instance = new AIDO(ctx, env)
      const result = await instance.is(
        'Merci beaucoup! Vielen Dank!',
        'contains gratitude'
      )
      expect(typeof result).toBe('boolean')
    })
  })
})

describe('AIDO.summarize() - Text Summarization', () => {
  let ctx: MockDOState
  let env: MockAIEnv
  let AIDO: new (ctx: MockDOState, env: MockAIEnv) => AIDOContract

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv()
    AIDO = await loadAIDO()
  })

  describe('basic summarization', () => {
    it('should summarize long text', async () => {
      const instance = new AIDO(ctx, env)
      const longText = `
        Artificial intelligence (AI) is intelligence demonstrated by machines,
        as opposed to natural intelligence displayed by animals including humans.
        AI research has been defined as the field of study of intelligent agents,
        which refers to any system that perceives its environment and takes actions
        that maximize its chance of achieving its goals. The term "artificial intelligence"
        had previously been used to describe machines that mimic and display "human"
        cognitive skills that are associated with the human mind, such as "learning" and
        "problem-solving". This definition has since been rejected by major AI researchers
        who now describe AI in terms of rationality and acting rationally, which does not
        limit how intelligence can be articulated.
      `.repeat(5)
      const result = await instance.summarize(longText)
      expect(typeof result).toBe('string')
      expect(result.length).toBeLessThan(longText.length)
      expect(result.length).toBeGreaterThan(0)
    })

    it('should return string type', async () => {
      const instance = new AIDO(ctx, env)
      const result = await instance.summarize('Some text to summarize.')
      expect(typeof result).toBe('string')
    })

    it('should preserve key information', async () => {
      const instance = new AIDO(ctx, env)
      const text = 'John Smith founded Acme Corp in 2020. The company now has 500 employees.'
      const result = await instance.summarize(text)
      expect(typeof result).toBe('string')
      // Summary should contain key facts (implementation will verify)
    })
  })

  describe('length options', () => {
    it('should produce short summaries with length: short', async () => {
      const instance = new AIDO(ctx, env)
      const text = 'A detailed article about technology trends.'.repeat(50)
      const result = await instance.summarize(text, { length: 'short' })
      expect(typeof result).toBe('string')
      expect(result.length).toBeLessThan(200)
    })

    it('should produce medium summaries with length: medium', async () => {
      const instance = new AIDO(ctx, env)
      const text = 'A detailed article about technology trends.'.repeat(50)
      const result = await instance.summarize(text, { length: 'medium' })
      expect(typeof result).toBe('string')
      expect(result.length).toBeLessThan(500)
    })

    it('should produce longer summaries with length: long', async () => {
      const instance = new AIDO(ctx, env)
      const text = 'A detailed article about technology trends.'.repeat(50)
      const short = await instance.summarize(text, { length: 'short' })
      const long = await instance.summarize(text, { length: 'long' })
      expect(long.length).toBeGreaterThan(short.length)
    })

    it('should respect maxLength option', async () => {
      const instance = new AIDO(ctx, env)
      const text = 'A detailed article about technology trends.'.repeat(50)
      const result = await instance.summarize(text, { maxLength: 100 })
      expect(result.length).toBeLessThanOrEqual(110) // Allow small tolerance
    })
  })

  describe('format options', () => {
    it('should produce paragraph format by default', async () => {
      const instance = new AIDO(ctx, env)
      const text = 'First point. Second point. Third point. Fourth point.'
      const result = await instance.summarize(text, { format: 'paragraph' })
      expect(typeof result).toBe('string')
      // Should be prose, not bullet points
      expect(result).not.toMatch(/^[-*]\s/)
    })

    it('should produce bullet format when requested', async () => {
      const instance = new AIDO(ctx, env)
      const text = 'First point about A. Second point about B. Third point about C.'
      const result = await instance.summarize(text, { format: 'bullets' })
      expect(typeof result).toBe('string')
      // Should contain bullet points
      expect(result).toMatch(/[-*]/)
    })
  })

  describe('model selection', () => {
    it('should support model option', async () => {
      const instance = new AIDO(ctx, env)
      const result = await instance.summarize(
        'Text to summarize',
        { model: '@cf/meta/llama-3.1-8b-instruct' }
      )
      expect(typeof result).toBe('string')
    })
  })

  describe('edge cases', () => {
    it('should handle empty text', async () => {
      const instance = new AIDO(ctx, env)
      const result = await instance.summarize('')
      expect(result).toBe('')
    })

    it('should handle text shorter than summary length', async () => {
      const instance = new AIDO(ctx, env)
      const shortText = 'Hello world.'
      const result = await instance.summarize(shortText)
      expect(typeof result).toBe('string')
    })

    it('should handle text with special formatting', async () => {
      const instance = new AIDO(ctx, env)
      const text = `
        # Header
        - List item 1
        - List item 2

        > Quote

        **Bold text** and *italic text*
      `
      const result = await instance.summarize(text)
      expect(typeof result).toBe('string')
    })

    it('should handle code blocks in text', async () => {
      const instance = new AIDO(ctx, env)
      const text = 'This document explains the function:\n```javascript\nfunction hello() { return "world"; }\n```\nIt returns a greeting.'
      const result = await instance.summarize(text)
      expect(typeof result).toBe('string')
    })
  })
})

describe('AIDO.diagram() - Diagram Generation', () => {
  let ctx: MockDOState
  let env: MockAIEnv
  let AIDO: new (ctx: MockDOState, env: MockAIEnv) => AIDOContract

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv()
    AIDO = await loadAIDO()
  })

  describe('basic diagram generation', () => {
    it('should generate a diagram from description', async () => {
      const instance = new AIDO(ctx, env)
      const result = await instance.diagram('User authentication flow with OAuth')
      expect(result).toHaveProperty('content')
      expect(result).toHaveProperty('format')
      expect(typeof result.content).toBe('string')
      expect(result.content.length).toBeGreaterThan(0)
    })

    it('should return DiagramResult type', async () => {
      const instance = new AIDO(ctx, env)
      const result = await instance.diagram('Simple flowchart')
      expect(result).toHaveProperty('content')
      expect(result).toHaveProperty('format')
    })
  })

  describe('mermaid format', () => {
    it('should generate mermaid format by default', async () => {
      const instance = new AIDO(ctx, env)
      const result = await instance.diagram('User login flow')
      expect(result.format).toBe('mermaid')
    })

    it('should generate valid mermaid syntax', async () => {
      const instance = new AIDO(ctx, env)
      const result = await instance.diagram(
        'Simple flowchart: Start -> Process -> End',
        { format: 'mermaid' }
      )
      expect(result.format).toBe('mermaid')
      // Mermaid diagrams should start with diagram type
      expect(result.content).toMatch(/^(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram|erDiagram)/i)
    })

    it('should generate flowchart style', async () => {
      const instance = new AIDO(ctx, env)
      const result = await instance.diagram(
        'Process flow: Input -> Validate -> Transform -> Output',
        { format: 'mermaid', style: 'flowchart' }
      )
      expect(result.format).toBe('mermaid')
      expect(result.content).toMatch(/flowchart|graph/i)
    })

    it('should generate sequence diagram style', async () => {
      const instance = new AIDO(ctx, env)
      const result = await instance.diagram(
        'API request: Client sends request to Server, Server responds',
        { format: 'mermaid', style: 'sequence' }
      )
      expect(result.format).toBe('mermaid')
      expect(result.content).toMatch(/sequenceDiagram/i)
    })

    it('should generate class diagram style', async () => {
      const instance = new AIDO(ctx, env)
      const result = await instance.diagram(
        'Class hierarchy: Animal base class with Cat and Dog subclasses',
        { format: 'mermaid', style: 'class' }
      )
      expect(result.format).toBe('mermaid')
      expect(result.content).toMatch(/classDiagram/i)
    })

    it('should generate state diagram style', async () => {
      const instance = new AIDO(ctx, env)
      const result = await instance.diagram(
        'Order states: Created -> Paid -> Shipped -> Delivered',
        { format: 'mermaid', style: 'state' }
      )
      expect(result.format).toBe('mermaid')
      expect(result.content).toMatch(/stateDiagram/i)
    })

    it('should generate ER diagram style', async () => {
      const instance = new AIDO(ctx, env)
      const result = await instance.diagram(
        'Database schema: Users have many Orders, Orders have many Items',
        { format: 'mermaid', style: 'er' }
      )
      expect(result.format).toBe('mermaid')
      expect(result.content).toMatch(/erDiagram/i)
    })
  })

  describe('svg format', () => {
    it('should generate SVG format when requested', async () => {
      const instance = new AIDO(ctx, env)
      const result = await instance.diagram(
        'Simple box diagram',
        { format: 'svg' }
      )
      expect(result.format).toBe('svg')
      expect(result.content).toMatch(/<svg/)
      expect(result.content).toMatch(/<\/svg>/)
    })
  })

  describe('ascii format', () => {
    it('should generate ASCII format when requested', async () => {
      const instance = new AIDO(ctx, env)
      const result = await instance.diagram(
        'Simple flowchart',
        { format: 'ascii' }
      )
      expect(result.format).toBe('ascii')
      expect(typeof result.content).toBe('string')
      // ASCII diagrams use characters like +, -, |, etc.
    })
  })

  describe('model selection', () => {
    it('should support model option', async () => {
      const instance = new AIDO(ctx, env)
      const result = await instance.diagram(
        'Architecture diagram',
        { model: '@cf/meta/llama-3.1-8b-instruct' }
      )
      expect(result).toHaveProperty('content')
    })
  })

  describe('complex diagrams', () => {
    it('should handle complex multi-component architecture', async () => {
      const instance = new AIDO(ctx, env)
      const result = await instance.diagram(
        'Microservices architecture: API Gateway connects to Auth Service, User Service, and Order Service. Each service has its own database.'
      )
      expect(result).toHaveProperty('content')
      expect(result.content.length).toBeGreaterThan(50)
    })

    it('should handle workflow descriptions', async () => {
      const instance = new AIDO(ctx, env)
      const result = await instance.diagram(
        'CI/CD Pipeline: Developer commits code, triggers build, runs tests, deploys to staging, runs integration tests, deploys to production'
      )
      expect(result).toHaveProperty('content')
    })
  })

  describe('edge cases', () => {
    it('should handle empty description', async () => {
      const instance = new AIDO(ctx, env)
      await expect(instance.diagram('')).rejects.toThrow(/empty|description required/i)
    })

    it('should handle very long descriptions', async () => {
      const instance = new AIDO(ctx, env)
      const longDescription = 'A complex system with many components. '.repeat(100)
      const result = await instance.diagram(longDescription)
      expect(result).toHaveProperty('content')
    })

    it('should handle technical jargon', async () => {
      const instance = new AIDO(ctx, env)
      const result = await instance.diagram(
        'Kubernetes cluster: Pod -> ReplicaSet -> Deployment -> Service -> Ingress'
      )
      expect(result).toHaveProperty('content')
    })
  })
})

describe('AIDO RPC Interface', () => {
  let ctx: MockDOState
  let env: MockAIEnv
  let AIDO: new (ctx: MockDOState, env: MockAIEnv) => AIDOContract

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv()
    AIDO = await loadAIDO()
  })

  describe('hasMethod()', () => {
    it('should expose is method', async () => {
      const instance = new AIDO(ctx, env)
      expect(instance.hasMethod('is')).toBe(true)
    })

    it('should expose summarize method', async () => {
      const instance = new AIDO(ctx, env)
      expect(instance.hasMethod('summarize')).toBe(true)
    })

    it('should expose diagram method', async () => {
      const instance = new AIDO(ctx, env)
      expect(instance.hasMethod('diagram')).toBe(true)
    })

    it('should not expose internal methods', async () => {
      const instance = new AIDO(ctx, env)
      expect(instance.hasMethod('_internal')).toBe(false)
      expect(instance.hasMethod('constructor')).toBe(false)
    })
  })

  describe('call()', () => {
    it('should call is via RPC', async () => {
      const instance = new AIDO(ctx, env)
      const result = await instance.call('is', ['Hello', 'greeting'])
      expect(typeof result).toBe('boolean')
    })

    it('should call summarize via RPC', async () => {
      const instance = new AIDO(ctx, env)
      const result = await instance.call('summarize', ['Some long text to summarize.'])
      expect(typeof result).toBe('string')
    })

    it('should call diagram via RPC', async () => {
      const instance = new AIDO(ctx, env)
      const result = await instance.call('diagram', ['Simple flowchart']) as DiagramResult
      expect(result).toHaveProperty('content')
      expect(result).toHaveProperty('format')
    })

    it('should pass options through RPC', async () => {
      const instance = new AIDO(ctx, env)
      const result = await instance.call('summarize', ['Text', { length: 'short' }])
      expect(typeof result).toBe('string')
    })

    it('should throw error for unknown method', async () => {
      const instance = new AIDO(ctx, env)
      await expect(instance.call('unknown', [])).rejects.toThrow(/not found|unknown|not allowed/i)
    })
  })
})

describe('AIDO HTTP Interface', () => {
  let ctx: MockDOState
  let env: MockAIEnv
  let AIDO: new (ctx: MockDOState, env: MockAIEnv) => AIDOContract

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv()
    AIDO = await loadAIDO()
  })

  describe('HATEOAS discovery', () => {
    it('should return discovery info on GET /', async () => {
      const instance = new AIDO(ctx, env)
      const request = new Request('http://ai.do/', { method: 'GET' })
      const response = await instance.fetch(request)
      expect(response.status).toBe(200)

      const data = await response.json() as { api: string; links: Record<string, string> }
      expect(data.api).toBe('ai.do')
      expect(data.links).toBeDefined()
      expect(data.links.is).toBeDefined()
      expect(data.links.summarize).toBeDefined()
      expect(data.links.diagram).toBeDefined()
    })
  })

  describe('POST /api/is endpoint', () => {
    it('should classify via HTTP', async () => {
      const instance = new AIDO(ctx, env)
      const request = new Request('http://ai.do/api/is', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          value: 'I love this!',
          condition: 'positive sentiment'
        })
      })
      const response = await instance.fetch(request)
      expect(response.status).toBe(200)

      const data = await response.json() as { result: boolean }
      expect(typeof data.result).toBe('boolean')
    })

    it('should accept options in request body', async () => {
      const instance = new AIDO(ctx, env)
      const request = new Request('http://ai.do/api/is', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          value: 'Test',
          condition: 'valid',
          options: { threshold: 0.7 }
        })
      })
      const response = await instance.fetch(request)
      expect(response.status).toBe(200)
    })
  })

  describe('POST /api/summarize endpoint', () => {
    it('should summarize via HTTP', async () => {
      const instance = new AIDO(ctx, env)
      const request = new Request('http://ai.do/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: 'A long article about AI and machine learning.'.repeat(20)
        })
      })
      const response = await instance.fetch(request)
      expect(response.status).toBe(200)

      const data = await response.json() as { summary: string }
      expect(typeof data.summary).toBe('string')
    })

    it('should accept options in request body', async () => {
      const instance = new AIDO(ctx, env)
      const request = new Request('http://ai.do/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: 'Long text here.',
          options: { length: 'short', format: 'bullets' }
        })
      })
      const response = await instance.fetch(request)
      expect(response.status).toBe(200)
    })
  })

  describe('POST /api/diagram endpoint', () => {
    it('should generate diagram via HTTP', async () => {
      const instance = new AIDO(ctx, env)
      const request = new Request('http://ai.do/api/diagram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: 'User authentication flow'
        })
      })
      const response = await instance.fetch(request)
      expect(response.status).toBe(200)

      const data = await response.json() as DiagramResult
      expect(data).toHaveProperty('content')
      expect(data).toHaveProperty('format')
    })

    it('should accept options in request body', async () => {
      const instance = new AIDO(ctx, env)
      const request = new Request('http://ai.do/api/diagram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: 'Database schema',
          options: { format: 'mermaid', style: 'er' }
        })
      })
      const response = await instance.fetch(request)
      expect(response.status).toBe(200)
    })
  })

  describe('POST /rpc endpoint', () => {
    it('should handle RPC calls via HTTP', async () => {
      const instance = new AIDO(ctx, env)
      const request = new Request('http://ai.do/rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'is',
          params: ['Hello', 'greeting']
        })
      })
      const response = await instance.fetch(request)
      expect(response.status).toBe(200)

      const data = await response.json() as { result: boolean }
      expect(typeof data.result).toBe('boolean')
    })

    it('should handle RPC batch calls', async () => {
      const instance = new AIDO(ctx, env)
      const request = new Request('http://ai.do/rpc/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([
          { method: 'is', params: ['Test', 'valid'] },
          { method: 'summarize', params: ['Long text here.'] },
        ])
      })
      const response = await instance.fetch(request)
      expect(response.status).toBe(200)

      const data = await response.json() as Array<{ result?: unknown; error?: string }>
      expect(data.length).toBe(2)
    })
  })

  describe('Error handling', () => {
    it('should return 400 for missing required fields', async () => {
      const instance = new AIDO(ctx, env)
      const request = new Request('http://ai.do/api/is', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: 'test' }) // missing condition
      })
      const response = await instance.fetch(request)
      expect(response.status).toBe(400)
    })

    it('should return 404 for unknown endpoints', async () => {
      const instance = new AIDO(ctx, env)
      const request = new Request('http://ai.do/api/unknown', { method: 'POST' })
      const response = await instance.fetch(request)
      expect(response.status).toBe(404)
    })

    it('should include request ID in response headers', async () => {
      const instance = new AIDO(ctx, env)
      const request = new Request('http://ai.do/api/is', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: 'test', condition: 'valid' })
      })
      const response = await instance.fetch(request)
      expect(response.headers.get('X-Request-Id')).toBeDefined()
    })
  })
})
