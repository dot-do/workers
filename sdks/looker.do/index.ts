/**
 * looker.do - Looker Analytics SDK
 *
 * Strongly-typed client for Looker Business Intelligence Platform.
 * Provides access to dashboards, looks, queries, and data exploration.
 *
 * @see https://looker.do
 *
 * @example
 * ```typescript
 * import { looker } from 'looker.do'
 *
 * // Run a query
 * const results = await looker.queries.run({
 *   model: 'ecommerce',
 *   view: 'orders',
 *   fields: ['orders.count', 'orders.created_date'],
 *   filters: { 'orders.status': 'complete' }
 * })
 *
 * // Get a dashboard
 * const dashboard = await looker.dashboards.get('sales-overview')
 *
 * // Or with custom options
 * import { Looker } from 'looker.do'
 * const myLooker = Looker({ baseURL: 'https://company.looker.com' })
 * ```
 */

import { createClient, type ClientOptions } from 'rpc.do'

// Types

export interface LookerCredentials {
  /** Looker API client ID */
  clientId: string
  /** Looker API client secret */
  clientSecret: string
  /** Base URL of Looker instance (e.g., https://company.looker.com) */
  baseUrl?: string
}

export interface AuthResponse {
  /** Access token for API requests */
  accessToken: string
  /** Token type (usually "Bearer") */
  tokenType: string
  /** Token expiration time in seconds */
  expiresIn: number
  /** Refresh token for obtaining new access tokens */
  refreshToken?: string
}

export interface Query {
  /** Unique query ID */
  id?: string
  /** Model name */
  model: string
  /** View name */
  view: string
  /** Fields to select */
  fields: string[]
  /** Filters to apply */
  filters?: Record<string, string | string[]>
  /** Sorts to apply */
  sorts?: string[]
  /** Limit number of results */
  limit?: number
  /** Offset for pagination */
  offset?: number
  /** Column limit */
  columnLimit?: number
  /** Row total */
  rowTotal?: boolean
  /** Subtotals */
  subtotals?: string[]
  /** Pivots */
  pivots?: string[]
  /** Fill fields */
  fillFields?: string[]
  /** Dynamic fields */
  dynamicFields?: string
  /** Filter expression */
  filterExpression?: string
  /** Client ID for caching */
  clientId?: string
}

export interface QueryResult {
  /** Query data rows */
  data: Array<Record<string, unknown>>
  /** Field metadata */
  fields: QueryField[]
  /** SQL query that was executed */
  sql?: string
  /** Query execution time in milliseconds */
  executionTime?: number
  /** Total row count (may differ from data.length if limited) */
  totalRows?: number
  /** Pivots applied */
  pivots?: Record<string, unknown>[]
}

export interface QueryField {
  /** Field name */
  name: string
  /** Display label */
  label: string
  /** Field type (string, number, date, etc.) */
  type: string
  /** Category (dimension, measure, filter) */
  category?: string
  /** Is numeric */
  isNumeric?: boolean
  /** Format string */
  format?: string
}

export interface Dashboard {
  /** Dashboard ID */
  id: string
  /** Dashboard title */
  title: string
  /** Dashboard description */
  description?: string
  /** User ID of creator */
  userId?: string
  /** Folder ID containing dashboard */
  folderId?: string
  /** Dashboard tiles/elements */
  dashboardElements?: DashboardElement[]
  /** Dashboard filters */
  dashboardFilters?: DashboardFilter[]
  /** Space ID */
  spaceId?: string
  /** Model */
  model?: string
  /** View count */
  viewCount?: number
  /** Last viewed at */
  lastViewedAt?: string
  /** Created at */
  createdAt?: string
  /** Updated at */
  updatedAt?: string
}

export interface DashboardElement {
  /** Element ID */
  id: string
  /** Element type (vis, text, button, etc.) */
  type: string
  /** Dashboard ID */
  dashboardId?: string
  /** Look ID (if element is a Look) */
  lookId?: string
  /** Query ID (if element has a query) */
  queryId?: string
  /** Title */
  title?: string
  /** Title text */
  titleText?: string
  /** Subtitle text */
  subtitleText?: string
  /** Body text (for text elements) */
  bodyText?: string
  /** Note text */
  noteText?: string
  /** Position and size */
  row?: number
  column?: number
  width?: number
  height?: number
  /** Result maker ID */
  resultMakerId?: string
  /** Query */
  query?: Query
}

export interface DashboardFilter {
  /** Filter ID */
  id: string
  /** Dashboard ID */
  dashboardId?: string
  /** Filter name */
  name: string
  /** Filter title */
  title: string
  /** Filter type */
  type: string
  /** Default value */
  defaultValue?: string
  /** Model */
  model?: string
  /** Explore */
  explore?: string
  /** Dimension */
  dimension?: string
  /** Field */
  field?: Record<string, unknown>
  /** Allow multiple values */
  allowMultipleValues?: boolean
  /** Required */
  required?: boolean
  /** UI config */
  uiConfig?: Record<string, unknown>
}

export interface Look {
  /** Look ID */
  id: string
  /** Look title */
  title: string
  /** Look description */
  description?: string
  /** User ID of creator */
  userId?: string
  /** Folder ID */
  folderId?: string
  /** Space ID */
  spaceId?: string
  /** Query ID */
  queryId?: string
  /** Query */
  query?: Query
  /** View count */
  viewCount?: number
  /** Last viewed at */
  lastViewedAt?: string
  /** Created at */
  createdAt?: string
  /** Updated at */
  updatedAt?: string
  /** Public */
  public?: boolean
  /** Public slug */
  publicSlug?: string
  /** Deleted */
  deleted?: boolean
}

export interface Explore {
  /** Explore name */
  name: string
  /** Explore label */
  label?: string
  /** Explore description */
  description?: string
  /** Model name */
  modelName: string
  /** Fields */
  fields?: ExploreFields
  /** Joins */
  joins?: ExploreJoin[]
  /** Supported measure types */
  supportedMeasureTypes?: string[]
  /** Always filter */
  alwaysFilter?: string[]
  /** Conditionally filter */
  conditionallyFilter?: string[]
  /** Access filters */
  accessFilters?: Record<string, unknown>[]
}

export interface ExploreFields {
  /** Dimensions */
  dimensions?: ExploreField[]
  /** Measures */
  measures?: ExploreField[]
  /** Filters */
  filters?: ExploreField[]
  /** Parameters */
  parameters?: ExploreField[]
}

export interface ExploreField {
  /** Field name */
  name: string
  /** Field label */
  label?: string
  /** Field description */
  description?: string
  /** Field type */
  type: string
  /** Category (dimension, measure, filter) */
  category?: string
  /** Can filter */
  canFilter?: boolean
  /** Can time filter */
  canTimeFilter?: boolean
  /** Suggestable */
  suggestable?: boolean
  /** Hidden */
  hidden?: boolean
  /** Tags */
  tags?: string[]
  /** View */
  view?: string
  /** View label */
  viewLabel?: string
}

export interface ExploreJoin {
  /** Join name */
  name: string
  /** Dependent on */
  dependentOn?: string
  /** Fields */
  fields?: string[]
  /** Foreign key */
  foreignKey?: string
  /** From */
  from?: string
  /** Outer only */
  outerOnly?: boolean
  /** Relationship */
  relationship?: string
  /** Required joins */
  requiredJoins?: string[]
  /** SQL foreign key */
  sqlForeignKey?: string
  /** SQL on */
  sqlOn?: string
  /** SQL table name */
  sqlTableName?: string
  /** Type */
  type?: string
  /** View label */
  viewLabel?: string
}

export interface Folder {
  /** Folder ID */
  id: string
  /** Folder name */
  name: string
  /** Parent folder ID */
  parentId?: string
  /** Child count */
  childCount?: number
  /** Dashboards */
  dashboards?: Dashboard[]
  /** Looks */
  looks?: Look[]
}

export interface User {
  /** User ID */
  id: string
  /** First name */
  firstName?: string
  /** Last name */
  lastName?: string
  /** Email */
  email?: string
  /** Display name */
  displayName?: string
  /** Avatar URL */
  avatarUrl?: string
  /** Is disabled */
  isDisabled?: boolean
  /** Role IDs */
  roleIds?: string[]
}

export interface Model {
  /** Model name */
  name: string
  /** Model label */
  label?: string
  /** Project name */
  projectName?: string
  /** Explores */
  explores?: Explore[]
  /** Allowed database connection names */
  allowedDbConnectionNames?: string[]
}

export interface RunQueryOptions {
  /** Result format (json, csv, xlsx, html, etc.) */
  format?: 'json' | 'csv' | 'xlsx' | 'html' | 'sql' | 'json_detail'
  /** Apply formatting */
  applyFormatting?: boolean
  /** Apply vis */
  applyVis?: boolean
  /** Cache */
  cache?: boolean
  /** Cache only */
  cacheOnly?: boolean
  /** Generate drill links */
  generateDrillLinks?: boolean
  /** Force production */
  forceProduction?: boolean
  /** Server table calcs */
  serverTableCalcs?: boolean
  /** Limit */
  limit?: number
}

export interface ScheduledPlan {
  /** Plan ID */
  id?: string
  /** Plan name */
  name: string
  /** User ID */
  userId?: string
  /** Run as recipient */
  runAsRecipient?: boolean
  /** Enabled */
  enabled?: boolean
  /** Look ID */
  lookId?: string
  /** Dashboard ID */
  dashboardId?: string
  /** Lookml dashboard ID */
  lookmlDashboardId?: string
  /** Filters string */
  filtersString?: string
  /** Dashboard filters */
  dashboardFilters?: string
  /** Require results */
  requireResults?: boolean
  /** Require no results */
  requireNoResults?: boolean
  /** Require change */
  requireChange?: boolean
  /** Send all results */
  sendAllResults?: boolean
  /** Crontab */
  crontab?: string
  /** Datagroup */
  datagroup?: string
  /** Timezone */
  timezone?: string
  /** Query ID */
  queryId?: string
  /** Scheduled plan destination */
  scheduledPlanDestination?: ScheduledPlanDestination[]
  /** Created at */
  createdAt?: string
  /** Updated at */
  updatedAt?: string
}

export interface ScheduledPlanDestination {
  /** Destination ID */
  id?: string
  /** Scheduled plan ID */
  scheduledPlanId?: string
  /** Format */
  format: string
  /** Apply formatting */
  applyFormatting?: boolean
  /** Apply vis */
  applyVis?: boolean
  /** Address */
  address?: string
  /** Type */
  type: 'email' | 'webhook' | 's3' | 'sftp'
  /** Parameters */
  parameters?: string
  /** Secret parameters */
  secretParameters?: string
  /** Message */
  message?: string
}

// Client interface
export interface LookerClient {
  /**
   * Authentication methods
   */
  auth: {
    /**
     * Login with API credentials to get access token
     */
    login(credentials: LookerCredentials): Promise<AuthResponse>

    /**
     * Logout and invalidate current access token
     */
    logout(): Promise<void>

    /**
     * Get current session information
     */
    session(): Promise<{ workspace_id: string; sudo_user_id?: string }>
  }

  /**
   * Query execution
   */
  queries: {
    /**
     * Create a new query
     */
    create(query: Query): Promise<Query & { id: string }>

    /**
     * Get a query by ID
     */
    get(queryId: string): Promise<Query>

    /**
     * Run a query and get results
     */
    run(query: Query | string, options?: RunQueryOptions): Promise<QueryResult>

    /**
     * Run an inline query (create and run in one call)
     */
    runInline(query: Query, options?: RunQueryOptions): Promise<QueryResult>

    /**
     * Kill a running query
     */
    kill(queryId: string): Promise<void>
  }

  /**
   * Dashboard access
   */
  dashboards: {
    /**
     * List all dashboards
     */
    list(options?: { folderId?: string; fields?: string }): Promise<Dashboard[]>

    /**
     * Get a dashboard by ID
     */
    get(dashboardId: string): Promise<Dashboard>

    /**
     * Create a new dashboard
     */
    create(dashboard: Partial<Dashboard>): Promise<Dashboard>

    /**
     * Update a dashboard
     */
    update(dashboardId: string, dashboard: Partial<Dashboard>): Promise<Dashboard>

    /**
     * Delete a dashboard
     */
    delete(dashboardId: string): Promise<void>

    /**
     * Run all queries in a dashboard
     */
    run(dashboardId: string, filters?: Record<string, string>): Promise<Record<string, QueryResult>>
  }

  /**
   * Looks (saved queries with visualizations)
   */
  looks: {
    /**
     * List all looks
     */
    list(options?: { folderId?: string; fields?: string }): Promise<Look[]>

    /**
     * Get a look by ID
     */
    get(lookId: string): Promise<Look>

    /**
     * Create a new look
     */
    create(look: Partial<Look>): Promise<Look>

    /**
     * Update a look
     */
    update(lookId: string, look: Partial<Look>): Promise<Look>

    /**
     * Delete a look
     */
    delete(lookId: string): Promise<void>

    /**
     * Run a look and get results
     */
    run(lookId: string, options?: RunQueryOptions): Promise<QueryResult>
  }

  /**
   * Explores (data models)
   */
  explores: {
    /**
     * List explores in a model
     */
    list(modelName: string): Promise<Explore[]>

    /**
     * Get an explore
     */
    get(modelName: string, exploreName: string): Promise<Explore>
  }

  /**
   * Models
   */
  models: {
    /**
     * List all models
     */
    list(): Promise<Model[]>

    /**
     * Get a model
     */
    get(modelName: string): Promise<Model>
  }

  /**
   * Folders
   */
  folders: {
    /**
     * List all folders
     */
    list(): Promise<Folder[]>

    /**
     * Get a folder
     */
    get(folderId: string): Promise<Folder>

    /**
     * Get folder children (dashboards and looks)
     */
    children(folderId: string): Promise<Folder>

    /**
     * Search folders
     */
    search(query: string): Promise<Folder[]>
  }

  /**
   * Users
   */
  users: {
    /**
     * List all users
     */
    list(options?: { fields?: string }): Promise<User[]>

    /**
     * Get a user by ID
     */
    get(userId: string): Promise<User>

    /**
     * Get current user
     */
    me(): Promise<User>
  }

  /**
   * Scheduled plans
   */
  scheduledPlans: {
    /**
     * List all scheduled plans
     */
    list(options?: { userId?: string; allUsers?: boolean }): Promise<ScheduledPlan[]>

    /**
     * Get a scheduled plan by ID
     */
    get(planId: string): Promise<ScheduledPlan>

    /**
     * Create a scheduled plan
     */
    create(plan: ScheduledPlan): Promise<ScheduledPlan>

    /**
     * Update a scheduled plan
     */
    update(planId: string, plan: Partial<ScheduledPlan>): Promise<ScheduledPlan>

    /**
     * Delete a scheduled plan
     */
    delete(planId: string): Promise<void>

    /**
     * Run a scheduled plan once immediately
     */
    runOnce(planId: string): Promise<{ success: boolean }>
  }

  /**
   * SQL Runner - run arbitrary SQL queries
   */
  sql: {
    /**
     * Run a SQL query
     */
    run(sql: string, options?: { connectionName?: string; modelName?: string }): Promise<QueryResult>
  }
}

/**
 * Create a configured Looker client (PascalCase factory)
 *
 * @example
 * ```typescript
 * import { Looker } from 'looker.do'
 * const myLooker = Looker({ baseURL: 'https://company.looker.com' })
 * ```
 */
export function Looker(options?: ClientOptions): LookerClient {
  return createClient<LookerClient>('https://looker.do', options)
}

/**
 * Default Looker client instance (camelCase)
 * For Workers: import 'rpc.do/env' first to enable env-based API key resolution
 *
 * API key is read from LOOKER_API_KEY or DO_API_KEY environment variables.
 *
 * @example
 * ```typescript
 * import { looker } from 'looker.do'
 *
 * const results = await looker.queries.run({
 *   model: 'ecommerce',
 *   view: 'orders',
 *   fields: ['orders.count']
 * })
 * ```
 */
export const looker: LookerClient = Looker()

// Default export = camelCase instance
export default looker

// Re-export types
export type { ClientOptions } from 'rpc.do'
