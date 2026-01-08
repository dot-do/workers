/**
 * Chat App Example - WebSocket Messaging with Durable Objects
 *
 * Demonstrates:
 * - WebSocket messaging with hibernation
 * - Presence indicators (online/offline users)
 * - Message history with pagination
 * - Room-based chat isolation
 *
 * @module examples/chat-app
 */

import { DOCore, type DOState, type DOEnv } from '@dotdo/do'

// ============================================================================
// Types
// ============================================================================

interface Message {
  id: string
  userId: string
  username: string
  content: string
  timestamp: number
  roomId: string
}

interface User {
  id: string
  username: string
  joinedAt: number
  lastSeen: number
}

interface PresenceUpdate {
  type: 'presence'
  users: User[]
  count: number
}

interface ChatEnv extends DOEnv {
  CHAT_ROOM: DurableObjectNamespace
}

type IncomingMessage =
  | { type: 'message'; content: string }
  | { type: 'join'; username: string }
  | { type: 'leave' }
  | { type: 'typing' }
  | { type: 'history'; before?: number; limit?: number }

type OutgoingMessage =
  | { type: 'message'; message: Message }
  | { type: 'joined'; user: User; users: User[] }
  | { type: 'left'; userId: string; users: User[] }
  | { type: 'typing'; userId: string; username: string }
  | { type: 'history'; messages: Message[]; hasMore: boolean }
  | { type: 'presence'; users: User[]; count: number }
  | { type: 'error'; message: string }

// ============================================================================
// Chat Room Durable Object
// ============================================================================

export class ChatRoomDO extends DOCore<ChatEnv> {
  private users: Map<string, User> = new Map()
  private wsToUser: Map<WebSocket, string> = new Map()

  constructor(ctx: DOState, env: ChatEnv) {
    super(ctx, env)

    // Load users on startup
    ctx.blockConcurrencyWhile(async () => {
      const stored = await ctx.storage.get<Map<string, User>>('users')
      if (stored) {
        this.users = new Map(Object.entries(stored))
      }
    })
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    // WebSocket upgrade
    if (request.headers.get('Upgrade') === 'websocket') {
      return this.handleWebSocketUpgrade(request)
    }

    // REST API
    const method = request.method
    const path = url.pathname

    // GET /messages - Get message history
    if (method === 'GET' && path === '/messages') {
      return this.handleGetMessages(url)
    }

    // GET /users - Get online users
    if (method === 'GET' && path === '/users') {
      return this.handleGetUsers()
    }

    // GET /stats - Get room stats
    if (method === 'GET' && path === '/stats') {
      return this.handleGetStats()
    }

    return new Response('Not Found', { status: 404 })
  }

  // ============================================================================
  // WebSocket Handling
  // ============================================================================

  private handleWebSocketUpgrade(request: Request): Response {
    const pair = new WebSocketPair()
    const [client, server] = Object.values(pair)

    // Generate temporary user ID
    const userId = crypto.randomUUID()

    // Accept with hibernation for cost efficiency
    this.ctx.acceptWebSocket(server, [userId])
    this.wsToUser.set(server, userId)

    return new Response(null, {
      status: 101,
      webSocket: client,
    })
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    try {
      const data = JSON.parse(message.toString()) as IncomingMessage
      const userId = this.wsToUser.get(ws)

      if (!userId) {
        this.sendError(ws, 'Not authenticated')
        return
      }

      switch (data.type) {
        case 'join':
          await this.handleJoin(ws, userId, data.username)
          break
        case 'message':
          await this.handleMessage(ws, userId, data.content)
          break
        case 'leave':
          await this.handleLeave(ws, userId)
          break
        case 'typing':
          await this.handleTyping(ws, userId)
          break
        case 'history':
          await this.handleHistory(ws, data.before, data.limit)
          break
        default:
          this.sendError(ws, 'Unknown message type')
      }
    } catch (error) {
      this.sendError(ws, error instanceof Error ? error.message : 'Parse error')
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    const userId = this.wsToUser.get(ws)
    if (userId) {
      await this.handleLeave(ws, userId)
      this.wsToUser.delete(ws)
    }
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    await this.webSocketClose(ws)
  }

  // ============================================================================
  // Chat Operations
  // ============================================================================

  private async handleJoin(ws: WebSocket, userId: string, username: string): Promise<void> {
    const user: User = {
      id: userId,
      username: username || `User-${userId.slice(0, 8)}`,
      joinedAt: Date.now(),
      lastSeen: Date.now(),
    }

    this.users.set(userId, user)
    await this.persistUsers()

    // Send join confirmation to the user
    const users = Array.from(this.users.values())
    this.send(ws, { type: 'joined', user, users })

    // Broadcast presence update to all others
    this.broadcast({ type: 'presence', users, count: users.length }, ws)

    // Send recent message history
    const messages = await this.getRecentMessages(50)
    this.send(ws, { type: 'history', messages, hasMore: messages.length === 50 })
  }

  private async handleMessage(ws: WebSocket, userId: string, content: string): Promise<void> {
    const user = this.users.get(userId)
    if (!user) {
      this.sendError(ws, 'Please join first')
      return
    }

    if (!content || content.trim().length === 0) {
      this.sendError(ws, 'Message cannot be empty')
      return
    }

    const message: Message = {
      id: crypto.randomUUID(),
      userId,
      username: user.username,
      content: content.trim(),
      timestamp: Date.now(),
      roomId: this.ctx.id.toString(),
    }

    // Store message
    await this.ctx.storage.put(`msg:${message.timestamp}:${message.id}`, message)

    // Update user's last seen
    user.lastSeen = Date.now()
    await this.persistUsers()

    // Broadcast to all
    this.broadcast({ type: 'message', message })
  }

  private async handleLeave(ws: WebSocket, userId: string): Promise<void> {
    this.users.delete(userId)
    await this.persistUsers()

    const users = Array.from(this.users.values())
    this.broadcast({ type: 'left', userId, users }, ws)
  }

  private async handleTyping(ws: WebSocket, userId: string): Promise<void> {
    const user = this.users.get(userId)
    if (!user) return

    // Broadcast typing indicator (exclude sender)
    this.broadcast({ type: 'typing', userId, username: user.username }, ws)
  }

  private async handleHistory(ws: WebSocket, before?: number, limit: number = 50): Promise<void> {
    const messages = await this.getMessagesBefore(before || Date.now(), limit)
    this.send(ws, { type: 'history', messages, hasMore: messages.length === limit })
  }

  // ============================================================================
  // Storage Operations
  // ============================================================================

  private async persistUsers(): Promise<void> {
    const usersObj = Object.fromEntries(this.users)
    await this.ctx.storage.put('users', usersObj)
  }

  private async getRecentMessages(limit: number): Promise<Message[]> {
    const entries = await this.ctx.storage.list<Message>({
      prefix: 'msg:',
      reverse: true,
      limit,
    })
    return Array.from(entries.values()).reverse()
  }

  private async getMessagesBefore(before: number, limit: number): Promise<Message[]> {
    const entries = await this.ctx.storage.list<Message>({
      prefix: 'msg:',
      end: `msg:${before}`,
      reverse: true,
      limit,
    })
    return Array.from(entries.values()).reverse()
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  private send(ws: WebSocket, message: OutgoingMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message))
    }
  }

  private sendError(ws: WebSocket, message: string): void {
    this.send(ws, { type: 'error', message })
  }

  private broadcast(message: OutgoingMessage, exclude?: WebSocket): void {
    const payload = JSON.stringify(message)
    for (const ws of this.ctx.getWebSockets()) {
      if (ws !== exclude && ws.readyState === WebSocket.OPEN) {
        ws.send(payload)
      }
    }
  }

  // ============================================================================
  // HTTP Handlers
  // ============================================================================

  private async handleGetMessages(url: URL): Promise<Response> {
    const before = url.searchParams.get('before')
    const limit = parseInt(url.searchParams.get('limit') || '50', 10)
    const messages = before
      ? await this.getMessagesBefore(parseInt(before, 10), limit)
      : await this.getRecentMessages(limit)
    return Response.json({ messages, hasMore: messages.length === limit })
  }

  private async handleGetUsers(): Promise<Response> {
    const users = Array.from(this.users.values())
    return Response.json({ users, count: users.length })
  }

  private async handleGetStats(): Promise<Response> {
    const messageEntries = await this.ctx.storage.list({ prefix: 'msg:' })
    return Response.json({
      roomId: this.ctx.id.toString(),
      userCount: this.users.size,
      messageCount: messageEntries.size,
      users: Array.from(this.users.values()),
    })
  }
}

// ============================================================================
// Worker Entry Point
// ============================================================================

export default {
  async fetch(request: Request, env: ChatEnv): Promise<Response> {
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/').filter(Boolean)

    // Extract room name from path: /rooms/:roomName/...
    if (pathParts[0] !== 'rooms' || !pathParts[1]) {
      return Response.json({
        error: 'Invalid path',
        usage: '/rooms/:roomName/...',
        endpoints: [
          'GET /rooms/:room/messages',
          'GET /rooms/:room/users',
          'GET /rooms/:room/stats',
          'WebSocket /rooms/:room (for real-time chat)',
        ],
      }, { status: 400 })
    }

    const roomName = pathParts[1]

    // Get Durable Object for this room
    const id = env.CHAT_ROOM.idFromName(roomName)
    const stub = env.CHAT_ROOM.get(id)

    // Forward request, adjusting path
    const roomPath = '/' + pathParts.slice(2).join('/')
    const roomUrl = new URL(roomPath, request.url)
    roomUrl.search = url.search

    return stub.fetch(new Request(roomUrl.toString(), request))
  },
}
