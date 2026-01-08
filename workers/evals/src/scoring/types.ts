/**
 * Scoring types for evals.do worker
 *
 * Provides interfaces for rubric-based scoring, LLM-as-judge,
 * and programmatic scorers.
 */

/**
 * Scoring configuration for test suites and evaluations
 */
export interface ScoringConfig {
  /** Scoring method to use */
  method: 'exact_match' | 'semantic' | 'llm-judge' | 'rubric' | 'programmatic'
  /** Threshold score for pass/fail (0-1) */
  threshold?: number
  /** LLM model to use for judge scoring */
  judgeModel?: string
  /** Prompt for LLM judge */
  judgePrompt?: string
  /** Rubric definition for rubric-based scoring */
  rubric?: Rubric
  /** Programmatic scorer function name/ID */
  scorerFunction?: string
  /** Additional metadata */
  metadata?: Record<string, unknown>
}

/**
 * Scale types for rubric criteria
 */
export type ScaleType =
  | 'numeric'      // 0-100, 1-5, etc.
  | 'categorical'  // excellent, good, fair, poor
  | 'binary'       // pass/fail, yes/no

/**
 * Scale definition for a criterion
 */
export interface Scale {
  /** Type of scale */
  type: ScaleType
  /** Minimum value (for numeric scales) */
  min?: number
  /** Maximum value (for numeric scales) */
  max?: number
  /** Categories (for categorical scales) */
  categories?: ScaleCategory[]
  /** Description of the scale */
  description?: string
}

/**
 * Category in a categorical scale
 */
export interface ScaleCategory {
  /** Category label */
  label: string
  /** Numeric value associated with category */
  value: number
  /** Description of what this category means */
  description?: string
}

/**
 * Criterion in a rubric
 */
export interface RubricCriterion {
  /** Unique identifier for the criterion */
  id: string
  /** Human-readable name */
  name: string
  /** Description of what this criterion evaluates */
  description: string
  /** Weight of this criterion in overall score (0-1) */
  weight: number
  /** Scale used for this criterion */
  scale: Scale
  /** Guidelines for evaluating this criterion */
  guidelines?: string[]
  /** Example scores for different quality levels */
  examples?: RubricExample[]
}

/**
 * Example showing what different scores mean
 */
export interface RubricExample {
  /** Score value */
  score: number
  /** Description of what earns this score */
  description: string
  /** Example output that would receive this score */
  example?: string
}

/**
 * Complete rubric definition
 */
export interface Rubric {
  /** Rubric name */
  name: string
  /** Description of what this rubric evaluates */
  description: string
  /** List of criteria */
  criteria: RubricCriterion[]
  /** Overall guidelines */
  guidelines?: string[]
  /** Version of the rubric */
  version?: string
  /** Metadata */
  metadata?: Record<string, unknown>
}

/**
 * Score for a single criterion
 */
export interface CriterionScore {
  /** ID of the criterion */
  criterionId: string
  /** Raw score value */
  rawScore: number
  /** Normalized score (0-1) */
  normalizedScore: number
  /** Weighted score contribution */
  weightedScore: number
  /** Justification/reasoning for the score */
  justification?: string
  /** Metadata */
  metadata?: Record<string, unknown>
}

/**
 * Complete scoring result
 */
export interface ScoringResult {
  /** Overall score (0-1) */
  score: number
  /** Whether the result passed the threshold */
  passed: boolean
  /** Individual criterion scores */
  criterionScores: CriterionScore[]
  /** Method used for scoring */
  method: ScoringConfig['method']
  /** Overall justification */
  justification?: string
  /** Metadata */
  metadata?: Record<string, unknown>
  /** Timestamp */
  timestamp: string
}

/**
 * Input for scoring
 */
export interface ScoringInput {
  /** The output to be scored */
  output: string
  /** Expected output (if available) */
  expected?: string
  /** Additional context */
  context?: Record<string, unknown>
}

/**
 * Programmatic scorer function signature
 */
export type ScorerFunction = (input: ScoringInput) => number | Promise<number>

/**
 * Scorer interface for implementing custom scorers
 */
export interface Scorer {
  /** Score the input and return a result */
  score(input: ScoringInput, config: ScoringConfig): Promise<ScoringResult>
}
