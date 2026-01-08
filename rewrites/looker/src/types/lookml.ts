/**
 * LookML types for schema generation
 */

/**
 * Database column information
 */
export interface DatabaseColumn {
  name: string
  type: string
  nullable?: boolean
  primaryKey?: boolean
  foreignKey?: {
    table: string
    column: string
  }
  defaultValue?: string | number | boolean | null
}

/**
 * Database table schema
 */
export interface DatabaseTable {
  name: string
  schema?: string
  columns: DatabaseColumn[]
}

/**
 * Database schema input
 */
export interface DatabaseSchema {
  tables: DatabaseTable[]
  connection?: string
}

/**
 * LookML dimension types
 */
export type DimensionType = 'string' | 'number' | 'time' | 'yesno' | 'date'

/**
 * LookML dimension
 */
export interface LookMLDimension {
  name: string
  type: DimensionType
  sql: string
  primaryKey?: boolean
  hidden?: boolean
  label?: string
  description?: string
}

/**
 * LookML dimension group (for time dimensions)
 */
export interface LookMLDimensionGroup {
  name: string
  type: 'time'
  timeframes: string[]
  sql: string
  datatype?: string
}

/**
 * LookML measure types
 */
export type MeasureType = 'count' | 'sum' | 'average' | 'min' | 'max' | 'count_distinct' | 'list'

/**
 * LookML measure
 */
export interface LookMLMeasure {
  name: string
  type: MeasureType
  sql?: string
  label?: string
  description?: string
  valueFormat?: string
  drillFields?: string[]
}

/**
 * LookML join types
 */
export type JoinType = 'left_outer' | 'inner' | 'full_outer' | 'cross'

/**
 * LookML join relationship
 */
export type JoinRelationship = 'one_to_one' | 'one_to_many' | 'many_to_one' | 'many_to_many'

/**
 * LookML join
 */
export interface LookMLJoin {
  name: string
  type: JoinType
  sqlOn: string
  relationship: JoinRelationship
  fields?: string[]
}

/**
 * LookML view
 */
export interface LookMLView {
  name: string
  sqlTableName: string
  dimensions: LookMLDimension[]
  dimensionGroups?: LookMLDimensionGroup[]
  measures: LookMLMeasure[]
}

/**
 * LookML explore
 */
export interface LookMLExplore {
  name: string
  label?: string
  description?: string
  joins?: LookMLJoin[]
  fields?: string[]
}

/**
 * LookML model
 */
export interface LookMLModel {
  connection: string
  includes: string[]
  explores: LookMLExplore[]
}

/**
 * Generated LookML output
 */
export interface GeneratedLookML {
  files: Record<string, string>
  views: LookMLView[]
  model: LookMLModel
}

/**
 * Options for LookML generation
 */
export interface GenerateLookMLOptions {
  /** Database connection string or name */
  connection?: string
  /** Schema/database name */
  schema?: string
  /** Specific tables to include (if not provided, all tables will be included) */
  tables?: string[]
  /** Whether to infer relationships from foreign keys */
  inferRelationships?: boolean
  /** Whether to generate common measures (count, sum, avg) */
  generateMeasures?: boolean
  /** Model name */
  modelName?: string
}
