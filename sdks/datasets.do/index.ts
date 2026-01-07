/**
 * datasets.do - What do you want datasets to .do for you?
 *
 * Managed datasets for AI training and evaluation.
 * Version, annotate, and split your data with confidence.
 *
 * @see https://datasets.do
 *
 * @example
 * ```typescript
 * import datasets from 'datasets.do'
 *
 * // Tagged template - describe what you want
 * const dataset = await datasets.do`
 *   Create a sentiment analysis dataset with
 *   positive, negative, and neutral labels
 * `
 *
 * // Upload and manage
 * await datasets.upload('training-data', records)
 * await datasets.annotate('training-data', { labels: ['positive', 'negative', 'neutral'] })
 * await datasets.split('training-data', { train: 0.8, test: 0.2 })
 * ```
 */

import { createClient, type ClientOptions } from 'rpc.do'

// Types
export interface Schema {
  fields: SchemaField[]
  primaryKey?: string
  description?: string
}

export interface SchemaField {
  name: string
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'date' | 'embedding'
  required?: boolean
  description?: string
  default?: unknown
}

export interface Dataset {
  id: string
  name: string
  description?: string
  schema?: Schema
  recordCount: number
  size: number // bytes
  format: 'json' | 'jsonl' | 'csv' | 'parquet'
  tags?: string[]
  metadata?: Record<string, unknown>
  currentVersion: string
  createdAt: Date
  updatedAt: Date
}

export interface Record {
  id: string
  datasetId: string
  data: unknown
  annotations?: Annotation[]
  metadata?: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

export interface Version {
  id: string
  datasetId: string
  version: string
  description?: string
  recordCount: number
  size: number
  checksum: string
  parent?: string
  createdAt: Date
}

export interface Split {
  id: string
  datasetId: string
  name: string // 'train', 'test', 'validation'
  recordCount: number
  percentage: number
  seed?: number
  createdAt: Date
}

export interface Annotation {
  id: string
  recordId: string
  datasetId: string
  label: string
  value: unknown
  confidence?: number
  annotatorId?: string
  metadata?: Record<string, unknown>
  createdAt: Date
}

export interface AnnotationConfig {
  labels?: string[]
  type?: 'classification' | 'ner' | 'qa' | 'generation' | 'custom'
  instructions?: string
  schema?: Schema
}

export interface SplitConfig {
  train?: number
  test?: number
  validation?: number
  seed?: number
  stratify?: string // field name to stratify by
}

export interface UploadOptions {
  format?: 'json' | 'jsonl' | 'csv' | 'parquet'
  schema?: Schema
  deduplicate?: boolean
  validate?: boolean
}

export interface DownloadOptions {
  format?: 'json' | 'jsonl' | 'csv' | 'parquet'
  version?: string
  split?: string
  limit?: number
  offset?: number
}

export interface ListOptions {
  limit?: number
  offset?: number
  tags?: string[]
  search?: string
}

export interface DoOptions {
  context?: Record<string, unknown>
  schema?: Schema
}

// Tagged template helper
type TaggedTemplate<T> = {
  (strings: TemplateStringsArray, ...values: unknown[]): T
  (prompt: string, options?: DoOptions): T
}

function tagged<T>(fn: (prompt: string, options?: DoOptions) => T): TaggedTemplate<T> {
  return function (stringsOrPrompt: TemplateStringsArray | string, ...values: unknown[]): T {
    if (typeof stringsOrPrompt === 'string') {
      return fn(stringsOrPrompt, values[0] as DoOptions | undefined)
    }
    const prompt = stringsOrPrompt.reduce((acc, str, i) =>
      acc + str + (values[i] !== undefined ? String(values[i]) : ''), ''
    )
    return fn(prompt)
  } as TaggedTemplate<T>
}

// Client interface
export interface DatasetsClient {
  /**
   * Create a dataset from natural language
   *
   * @example
   * ```typescript
   * const dataset = await datasets.do`
   *   Create a sentiment analysis dataset with
   *   text, label, and confidence fields
   * `
   * ```
   */
  do: TaggedTemplate<Promise<Dataset>>

  /**
   * Create a new dataset
   *
   * @example
   * ```typescript
   * const dataset = await datasets.create({
   *   name: 'sentiment-data',
   *   description: 'Customer review sentiment',
   *   schema: {
   *     fields: [
   *       { name: 'text', type: 'string', required: true },
   *       { name: 'label', type: 'string', required: true }
   *     ]
   *   }
   * })
   * ```
   */
  create(options: {
    name: string
    description?: string
    schema?: Schema
    format?: Dataset['format']
    tags?: string[]
    metadata?: Record<string, unknown>
  }): Promise<Dataset>

  /**
   * Get a dataset by name or ID
   */
  get(nameOrId: string): Promise<Dataset>

  /**
   * List all datasets
   */
  list(options?: ListOptions): Promise<Dataset[]>

  /**
   * Update a dataset
   */
  update(nameOrId: string, updates: Partial<Pick<Dataset, 'name' | 'description' | 'schema' | 'tags' | 'metadata'>>): Promise<Dataset>

  /**
   * Delete a dataset
   */
  delete(nameOrId: string): Promise<void>

  /**
   * Upload records to a dataset
   *
   * @example
   * ```typescript
   * await datasets.upload('sentiment-data', [
   *   { text: 'Great product!', label: 'positive' },
   *   { text: 'Not worth it', label: 'negative' }
   * ])
   * ```
   */
  upload(nameOrId: string, records: unknown[], options?: UploadOptions): Promise<{ recordCount: number; size: number }>

  /**
   * Download records from a dataset
   *
   * @example
   * ```typescript
   * const records = await datasets.download('sentiment-data', {
   *   format: 'jsonl',
   *   split: 'train'
   * })
   * ```
   */
  download(nameOrId: string, options?: DownloadOptions): Promise<unknown[]>

  /**
   * Split a dataset into train/test/validation
   *
   * @example
   * ```typescript
   * await datasets.split('sentiment-data', {
   *   train: 0.8,
   *   test: 0.1,
   *   validation: 0.1,
   *   stratify: 'label'
   * })
   * ```
   */
  split(nameOrId: string, config: SplitConfig): Promise<Split[]>

  /**
   * Annotate records in a dataset
   *
   * @example
   * ```typescript
   * await datasets.annotate('raw-data', {
   *   labels: ['positive', 'negative', 'neutral'],
   *   type: 'classification',
   *   instructions: 'Label the sentiment of each review'
   * })
   * ```
   */
  annotate(nameOrId: string, config: AnnotationConfig): Promise<{ pending: number; completed: number }>

  /**
   * Create a new version of the dataset
   *
   * @example
   * ```typescript
   * const version = await datasets.version('sentiment-data', {
   *   version: 'v1.0.0',
   *   description: 'Initial release with 10k records'
   * })
   * ```
   */
  version(nameOrId: string, options: { version: string; description?: string }): Promise<Version>

  /**
   * List versions of a dataset
   */
  versions(nameOrId: string): Promise<Version[]>

  /**
   * Get splits for a dataset
   */
  splits(nameOrId: string): Promise<Split[]>

  /**
   * Get records from a dataset
   */
  records(nameOrId: string, options?: { split?: string; limit?: number; offset?: number }): Promise<Record[]>

  /**
   * Get a specific record
   */
  record(datasetNameOrId: string, recordId: string): Promise<Record>

  /**
   * Add annotation to a record
   */
  addAnnotation(datasetNameOrId: string, recordId: string, annotation: Omit<Annotation, 'id' | 'recordId' | 'datasetId' | 'createdAt'>): Promise<Annotation>

  /**
   * Get annotations for a dataset
   */
  annotations(nameOrId: string, options?: { label?: string; limit?: number }): Promise<Annotation[]>

  /**
   * Validate dataset against schema
   */
  validate(nameOrId: string): Promise<{ valid: boolean; errors: Array<{ recordId: string; field: string; error: string }> }>

  /**
   * Get dataset statistics
   */
  stats(nameOrId: string): Promise<{
    recordCount: number
    size: number
    splits: { [name: string]: number }
    annotations: { [label: string]: number }
    schema: Schema | null
  }>

  /**
   * Clone a dataset
   */
  clone(nameOrId: string, newName: string): Promise<Dataset>

  /**
   * Merge multiple datasets
   */
  merge(sourceIds: string[], targetName: string): Promise<Dataset>

  /**
   * Sample records from a dataset
   */
  sample(nameOrId: string, count: number, options?: { seed?: number; split?: string }): Promise<Record[]>

  /**
   * Search records in a dataset
   */
  search(nameOrId: string, query: string, options?: { limit?: number; field?: string }): Promise<Record[]>
}

/**
 * Create a configured datasets client
 */
export function Datasets(options?: ClientOptions): DatasetsClient {
  return createClient<DatasetsClient>('https://datasets.do', options)
}

/**
 * Default datasets client
 */
export const datasets: DatasetsClient = Datasets({
  apiKey: typeof process !== 'undefined' ? (process.env?.DATASETS_API_KEY || process.env?.DO_API_KEY) : undefined,
})

export default datasets

export type { ClientOptions } from 'rpc.do'
