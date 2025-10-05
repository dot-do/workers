/**
 * Semantic Triple Network Types
 */

// ===== Core Triple Types =====

export interface Triple {
  id: string
  subject: string
  predicate: string
  object: string
  context?: Context
  created_at?: string
  created_by?: string
  updated_at?: string
  deleted_at?: string
  version?: number
  confidence?: number
}

export interface Context {
  // Temporal context (When?)
  temporal?: {
    start?: string
    end?: string
    duration?: number
    timestamp?: string
  }

  // Spatial context (Where?)
  spatial?: {
    location?: string
    coordinates?: [number, number] // [latitude, longitude]
    address?: string
    region?: string
  }

  // Causal context (Why?)
  causal?: {
    reason?: string
    goal?: string
    motivation?: string
  }

  // Relational context (With whom?)
  relational?: {
    team?: string[]
    collaborators?: string[]
    supervisor?: string
    client?: string
  }

  // Instrumental context (How?)
  instrumental?: {
    tools?: string[]
    methods?: string[]
    process?: string
    technique?: string
  }

  // Source metadata
  source?: string
  inferred?: boolean
  prediction?: boolean
  confidence?: number

  // Additional metadata
  [key: string]: any
}

export interface TriplePattern {
  subject?: string
  predicate?: string
  object?: string
  limit?: number
  offset?: number
  context?: Partial<Context>
}

export interface TripleFilter {
  subjects?: string[]
  predicates?: string[]
  objects?: string[]
  minConfidence?: number
  startDate?: string
  endDate?: string
  location?: string
  inferred?: boolean
}

// ===== Verb Types =====

export interface VerbDefinition {
  id: string
  gerund: string
  base_form: string
  category?: string

  // Source mappings
  gs1_step?: string
  onet_task_id?: string

  // Permissions
  required_role?: string[]
  danger_level?: 'safe' | 'low' | 'medium' | 'high' | 'critical'
  requires_approval?: boolean

  // Metadata
  description?: string
  examples?: string[]
  metadata?: Record<string, any>

  created_at?: string
  updated_at?: string
}

export interface VerbCategory {
  id: string
  name: string
  description?: string
  verbs: string[]
}

// ===== Role Types =====

export interface RoleDefinition {
  id: string
  name: string

  // Capabilities
  capabilities: string[]
  forbidden_verbs?: string[]

  // Hierarchy
  parent_role?: string

  // O*NET mapping
  onet_code?: string

  // Metadata
  description?: string
  metadata?: Record<string, any>

  created_at?: string
  updated_at?: string
}

export interface CapabilityCheck {
  allowed: boolean
  reason?: string
  requires_approval?: boolean
  danger_level?: string
}

// ===== Graph Types =====

export interface GraphNode {
  id: string
  type: 'subject' | 'predicate' | 'object'
  label: string
  properties?: Record<string, any>
}

export interface GraphEdge {
  from: string
  to: string
  predicate: string
  weight?: number
}

export interface GraphResult {
  nodes: GraphNode[]
  edges: GraphEdge[]
  depth: number
}

export interface Path {
  nodes: string[]
  edges: string[]
  length: number
  weight?: number
}

// ===== Query Types =====

export interface QueryPattern {
  subject?: string | '*'
  predicate?: string | '*'
  object?: string | '*'
  where?: QueryCondition[]
  limit?: number
  offset?: number
  orderBy?: OrderBy[]
}

export interface QueryCondition {
  field: string
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'LIKE' | 'IN' | 'BETWEEN'
  value: any
}

export interface OrderBy {
  field: string
  direction: 'ASC' | 'DESC'
}

export interface QueryResult {
  triples: Triple[]
  total: number
  hasMore: boolean
  cursor?: string
}

// ===== API Types =====

export interface CreateTripleRequest {
  subject: string
  predicate: string
  object: string
  context?: Context
}

export interface CreateTripleResponse {
  success: boolean
  triple?: Triple
  error?: string
}

export interface QueryTriplesRequest extends TriplePattern {}

export interface QueryTriplesResponse {
  success: boolean
  triples?: Triple[]
  total?: number
  error?: string
}

export interface ResolveVerbRequest {
  gerund: string
}

export interface ResolveVerbResponse {
  success: boolean
  verb?: VerbDefinition
  error?: string
}

export interface CheckCapabilityRequest {
  role: string
  verb: string
}

export interface CheckCapabilityResponse {
  success: boolean
  capability?: CapabilityCheck
  error?: string
}

export interface TraverseGraphRequest {
  start: string
  depth: number
  direction: 'forward' | 'backward' | 'both'
  filter?: TripleFilter
}

export interface TraverseGraphResponse {
  success: boolean
  graph?: GraphResult
  error?: string
}

export interface FindPathsRequest {
  from: string
  to: string
  maxDepth?: number
}

export interface FindPathsResponse {
  success: boolean
  paths?: Path[]
  error?: string
}

// ===== Environment Types =====

export interface Env {
  // Service bindings
  DB_SERVICE: any
  AUTH_SERVICE: any

  // Queue bindings
  SEMANTIC_TRIPLES_QUEUE: Queue

  // Environment variables
  ENVIRONMENT: string
}

// ===== MCP Tool Types =====

export interface McpTool {
  name: string
  description: string
  inputSchema: {
    type: string
    properties: Record<string, any>
    required?: string[]
  }
  handler: (input: any) => Promise<any>
}

// ===== Queue Message Types =====

export interface QueueMessage {
  type: 'CREATE_TRIPLE' | 'DELETE_TRIPLE' | 'INFER_TRIPLES' | 'SYNC_TO_GRAPH'
  payload: any
  timestamp?: string
  retryCount?: number
}

// ===== Utility Types =====

export type Tense = 'collection' | 'item' | 'action' | 'activity' | 'event'

export interface PathSegment {
  name: string
  tense: Tense
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  timestamp?: string
}
