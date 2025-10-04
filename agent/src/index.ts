/**
 * Agent Service - AI Code Generation Microservice
 *
 * Features:
 * - Durable Object-based code generation agent
 * - Real-time WebSocket updates
 * - Blueprint-based phase generation
 * - Code validation and error correction
 *
 * Interfaces:
 * - RPC (WorkerEntrypoint) for service-to-service calls
 * - HTTP (Hono) for REST API
 * - WebSocket for real-time updates
 * - MCP (optional) for AI agent integration
 */

import { WorkerEntrypoint, DurableObject } from 'cloudflare:workers'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type {
  AgentServiceEnv,
  CreateAgentRequest,
  CreateAgentResponse,
  GetAgentStatusResponse,
  GenerateCodeRequest,
  GenerateCodeResponse,
  AgentRpcMethods,
  CodeGenState,
  CurrentDevState,
  ApiResponse,
  WebSocketMessage,
  WebSocketMessageType
} from './types'
import { success, error } from './types'

/**
 * Agent Service RPC Interface
 */
export class AgentService extends WorkerEntrypoint<AgentServiceEnv> implements AgentRpcMethods {
  /**
   * Create new agent session
   */
  async createAgent(request: CreateAgentRequest): Promise<CreateAgentResponse> {
    try {
      const sessionId = crypto.randomUUID()
      const agentId = this.env.CODE_GENERATOR.idFromName(sessionId)
      const stub = this.env.CODE_GENERATOR.get(agentId)

      // Initialize agent
      await stub.initialize({
        query: request.query,
        language: request.language,
        frameworks: request.frameworks,
        inferenceContext: request.inferenceContext || {}
      })

      const hostname = this.env.CUSTOM_DOMAIN || 'localhost'
      const wsUrl = `wss://${hostname}/agent/${sessionId}/ws`

      return {
        success: true,
        agentId: agentId.toString(),
        sessionId,
        wsUrl
      }
    } catch (err) {
      return {
        success: false,
        agentId: '',
        sessionId: '',
        error: err instanceof Error ? err.message : 'Failed to create agent'
      }
    }
  }

  /**
   * Get agent status
   */
  async getStatus(sessionId: string): Promise<GetAgentStatusResponse> {
    try {
      const agentId = this.env.CODE_GENERATOR.idFromName(sessionId)
      const stub = this.env.CODE_GENERATOR.get(agentId)
      const state = await stub.getState()

      return {
        success: true,
        state: {
          sessionId: state.sessionId,
          query: state.query,
          currentDevState: state.currentDevState,
          mvpGenerated: state.mvpGenerated,
          phasesCounter: state.phasesCounter,
          previewURL: state.previewURL
        },
        previewURL: state.previewURL
      }
    } catch (err) {
      return {
        success: false,
        state: {} as any,
        error: err instanceof Error ? err.message : 'Failed to get status'
      }
    }
  }

  /**
   * Start code generation
   */
  async generateCode(sessionId: string, options?: GenerateCodeRequest): Promise<GenerateCodeResponse> {
    try {
      const agentId = this.env.CODE_GENERATOR.idFromName(sessionId)
      const stub = this.env.CODE_GENERATOR.get(agentId)

      await stub.generateCode(options?.reviewCycles || 3, options?.autoFix || true)

      return {
        success: true,
        message: 'Code generation started'
      }
    } catch (err) {
      return {
        success: false,
        message: 'Failed to start code generation',
        error: err instanceof Error ? err.message : 'Unknown error'
      }
    }
  }

  /**
   * Send user message
   */
  async sendMessage(sessionId: string, message: string): Promise<{ success: boolean; response?: string; error?: string }> {
    try {
      const agentId = this.env.CODE_GENERATOR.idFromName(sessionId)
      const stub = this.env.CODE_GENERATOR.get(agentId)
      const response = await stub.processUserMessage(message)

      return {
        success: true,
        response
      }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to send message'
      }
    }
  }

  /**
   * Get generated files
   */
  async getFiles(sessionId: string): Promise<{ success: boolean; files: Record<string, any>; error?: string }> {
    try {
      const agentId = this.env.CODE_GENERATOR.idFromName(sessionId)
      const stub = this.env.CODE_GENERATOR.get(agentId)
      const state = await stub.getState()

      return {
        success: true,
        files: state.generatedFilesMap || {}
      }
    } catch (err) {
      return {
        success: false,
        files: {},
        error: err instanceof Error ? err.message : 'Failed to get files'
      }
    }
  }

  /**
   * Get preview URL
   */
  async getPreviewURL(sessionId: string): Promise<{ success: boolean; previewURL?: string; error?: string }> {
    try {
      const agentId = this.env.CODE_GENERATOR.idFromName(sessionId)
      const stub = this.env.CODE_GENERATOR.get(agentId)
      const state = await stub.getState()

      return {
        success: true,
        previewURL: state.previewURL
      }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to get preview URL'
      }
    }
  }

  /**
   * Cancel generation
   */
  async cancelGeneration(sessionId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const agentId = this.env.CODE_GENERATOR.idFromName(sessionId)
      const stub = this.env.CODE_GENERATOR.get(agentId)
      await stub.cancelGeneration()

      return {
        success: true
      }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to cancel generation'
      }
    }
  }

  /**
   * HTTP handler
   */
  fetch(request: Request): Response | Promise<Response> {
    return app.fetch(request, this.env, this.ctx)
  }
}

/**
 * Code Generator Durable Object
 */
export class CodeGeneratorAgent extends DurableObject<AgentServiceEnv> {
  private state: CodeGenState
  private connections: Set<WebSocket>

  constructor(ctx: DurableObjectState, env: AgentServiceEnv) {
    super(ctx, env)
    this.connections = new Set()

    // Initialize state
    this.state = {
      sessionId: '',
      query: '',
      hostname: '',
      generatedFilesMap: {},
      generatedPhases: [],
      phasesCounter: 0,
      currentDevState: CurrentDevState.IDLE,
      mvpGenerated: false,
      shouldBeGenerating: false,
      agentMode: 'deterministic'
    }
  }

  /**
   * Initialize agent with query and settings
   */
  async initialize(args: {
    query: string
    language?: string
    frameworks?: string[]
    inferenceContext?: any
  }): Promise<void> {
    this.state.sessionId = crypto.randomUUID()
    this.state.query = args.query
    this.state.currentDevState = CurrentDevState.INITIALIZING

    // Broadcast state update
    this.broadcast({
      type: WebSocketMessageType.STATE_UPDATE,
      data: {
        currentDevState: this.state.currentDevState,
        sessionId: this.state.sessionId
      }
    })

    // TODO: Generate blueprint using AI_SERVICE
    // const blueprint = await this.generateBlueprint(args)
    // this.state.blueprint = blueprint

    this.state.currentDevState = CurrentDevState.IDLE
  }

  /**
   * Get current state
   */
  async getState(): Promise<CodeGenState> {
    return this.state
  }

  /**
   * Start code generation
   */
  async generateCode(reviewCycles: number, autoFix: boolean): Promise<void> {
    this.state.currentDevState = CurrentDevState.PHASE_GENERATING
    this.state.shouldBeGenerating = true
    this.state.reviewCycles = reviewCycles

    // Broadcast state update
    this.broadcast({
      type: WebSocketMessageType.STATE_UPDATE,
      data: {
        currentDevState: this.state.currentDevState
      }
    })

    // TODO: Implement phase-wise generation
    // for (const phase of this.state.blueprint?.phases || []) {
    //   await this.generatePhase(phase)
    //   await this.implementPhase(phase)
    //   if (autoFix) {
    //     await this.reviewAndFix(reviewCycles)
    //   }
    // }

    this.state.currentDevState = CurrentDevState.COMPLETE
    this.state.mvpGenerated = true
    this.state.shouldBeGenerating = false

    this.broadcast({
      type: WebSocketMessageType.COMPLETE,
      data: {
        mvpGenerated: true
      }
    })
  }

  /**
   * Process user message
   */
  async processUserMessage(message: string): Promise<string> {
    // TODO: Process user message using AI_SERVICE
    return 'Message received'
  }

  /**
   * Cancel generation
   */
  async cancelGeneration(): Promise<void> {
    this.state.shouldBeGenerating = false
    this.state.currentDevState = CurrentDevState.IDLE
  }

  /**
   * WebSocket handler
   */
  async webSocketMessage(ws: WebSocket, message: string) {
    try {
      const data = JSON.parse(message)
      // Handle WebSocket messages
      console.log('WebSocket message:', data)
    } catch (err) {
      console.error('WebSocket error:', err)
    }
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean) {
    this.connections.delete(ws)
    console.log('WebSocket closed:', { code, reason, wasClean })
  }

  /**
   * Broadcast message to all connected clients
   */
  private broadcast(message: WebSocketMessage) {
    const data = JSON.stringify(message)
    for (const ws of this.connections) {
      try {
        ws.send(data)
      } catch (err) {
        console.error('Failed to send to WebSocket:', err)
        this.connections.delete(ws)
      }
    }
  }

  /**
   * HTTP handler for Durable Object
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    // WebSocket upgrade
    if (request.headers.get('Upgrade') === 'websocket') {
      const pair = new WebSocketPair()
      const [client, server] = Object.values(pair)

      this.ctx.acceptWebSocket(server)
      this.connections.add(server)

      return new Response(null, { status: 101, webSocket: client })
    }

    // HTTP endpoints
    if (url.pathname === '/state') {
      return Response.json(this.state)
    }

    return new Response('Not Found', { status: 404 })
  }
}

/**
 * HTTP API Interface
 */
const app = new Hono<{ Bindings: AgentServiceEnv }>()

// CORS
app.use('*', cors())

// Health check
app.get('/health', (c) => c.json({ status: 'ok', service: 'agent', timestamp: new Date().toISOString() }))

// Create agent
app.post('/agents', async (c) => {
  const service = new AgentService(c.executionCtx, c.env)
  const body = await c.req.json<CreateAgentRequest>()
  const result = await service.createAgent(body)
  return c.json(result)
})

// Get agent status
app.get('/agents/:sessionId', async (c) => {
  const service = new AgentService(c.executionCtx, c.env)
  const sessionId = c.req.param('sessionId')
  const result = await service.getStatus(sessionId)
  return c.json(result)
})

// Start code generation
app.post('/agents/:sessionId/generate', async (c) => {
  const service = new AgentService(c.executionCtx, c.env)
  const sessionId = c.req.param('sessionId')
  const body = await c.req.json<GenerateCodeRequest>().catch(() => ({}))
  const result = await service.generateCode(sessionId, body)
  return c.json(result)
})

// Send message
app.post('/agents/:sessionId/message', async (c) => {
  const service = new AgentService(c.executionCtx, c.env)
  const sessionId = c.req.param('sessionId')
  const { message } = await c.req.json<{ message: string }>()
  const result = await service.sendMessage(sessionId, message)
  return c.json(result)
})

// Get files
app.get('/agents/:sessionId/files', async (c) => {
  const service = new AgentService(c.executionCtx, c.env)
  const sessionId = c.req.param('sessionId')
  const result = await service.getFiles(sessionId)
  return c.json(result)
})

// Get preview URL
app.get('/agents/:sessionId/preview', async (c) => {
  const service = new AgentService(c.executionCtx, c.env)
  const sessionId = c.req.param('sessionId')
  const result = await service.getPreviewURL(sessionId)
  return c.json(result)
})

// Cancel generation
app.post('/agents/:sessionId/cancel', async (c) => {
  const service = new AgentService(c.executionCtx, c.env)
  const sessionId = c.req.param('sessionId')
  const result = await service.cancelGeneration(sessionId)
  return c.json(result)
})

// WebSocket endpoint
app.get('/agents/:sessionId/ws', async (c) => {
  const sessionId = c.req.param('sessionId')
  const agentId = c.env.CODE_GENERATOR.idFromName(sessionId)
  const stub = c.env.CODE_GENERATOR.get(agentId)

  // Upgrade to WebSocket
  return stub.fetch(c.req.raw)
})

export default {
  fetch: app.fetch
}
