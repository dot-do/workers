/**
 * Rubric-based scoring implementation
 *
 * Implements scoring against defined rubrics with multiple criteria,
 * weights, and scales.
 */

import type {
  Rubric,
  RubricCriterion,
  Scale,
  CriterionScore,
  ScoringResult,
  ScoringInput,
  ScoringConfig,
  Scorer,
} from './types.js'

/**
 * Validate a rubric definition
 */
export function validateRubric(rubric: Rubric): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!rubric.name) {
    errors.push('Rubric must have a name')
  }

  if (!rubric.criteria || rubric.criteria.length === 0) {
    errors.push('Rubric must have at least one criterion')
  }

  // Check that weights sum to 1.0 (with small tolerance for floating point)
  const totalWeight = rubric.criteria.reduce((sum, c) => sum + c.weight, 0)
  if (Math.abs(totalWeight - 1.0) > 0.001) {
    errors.push(`Criterion weights must sum to 1.0, got ${totalWeight}`)
  }

  // Validate each criterion
  for (const criterion of rubric.criteria) {
    if (!criterion.id) {
      errors.push('Each criterion must have an id')
    }
    if (!criterion.name) {
      errors.push(`Criterion ${criterion.id} must have a name`)
    }
    if (criterion.weight < 0 || criterion.weight > 1) {
      errors.push(`Criterion ${criterion.id} weight must be between 0 and 1`)
    }

    // Validate scale
    const scaleErrors = validateScale(criterion.scale, criterion.id)
    errors.push(...scaleErrors)
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Validate a scale definition
 */
function validateScale(scale: Scale, criterionId: string): string[] {
  const errors: string[] = []

  if (!scale.type) {
    errors.push(`Scale for criterion ${criterionId} must have a type`)
    return errors
  }

  switch (scale.type) {
    case 'numeric':
      if (scale.min === undefined || scale.max === undefined) {
        errors.push(`Numeric scale for criterion ${criterionId} must have min and max`)
      } else if (scale.min >= scale.max) {
        errors.push(`Numeric scale for criterion ${criterionId}: min must be less than max`)
      }
      break

    case 'categorical':
      if (!scale.categories || scale.categories.length === 0) {
        errors.push(`Categorical scale for criterion ${criterionId} must have categories`)
      }
      break

    case 'binary':
      // Binary scales are always 0 or 1
      break

    default:
      errors.push(`Unknown scale type for criterion ${criterionId}: ${scale.type}`)
  }

  return errors
}

/**
 * Normalize a raw score to 0-1 range based on scale
 */
export function normalizeScore(rawScore: number, scale: Scale): number {
  switch (scale.type) {
    case 'numeric':
      if (scale.min === undefined || scale.max === undefined) {
        throw new Error('Numeric scale must have min and max')
      }
      // Normalize to 0-1 range
      return (rawScore - scale.min) / (scale.max - scale.min)

    case 'categorical':
      if (!scale.categories || scale.categories.length === 0) {
        throw new Error('Categorical scale must have categories')
      }
      // Find the category with matching value
      const category = scale.categories.find(c => c.value === rawScore)
      if (!category) {
        throw new Error(`Raw score ${rawScore} does not match any category`)
      }
      // Normalize based on position in categories (assuming they're ordered)
      const maxValue = Math.max(...scale.categories.map(c => c.value))
      const minValue = Math.min(...scale.categories.map(c => c.value))
      return (rawScore - minValue) / (maxValue - minValue)

    case 'binary':
      // Binary is already 0 or 1
      return rawScore

    default:
      throw new Error(`Unknown scale type: ${scale.type}`)
  }
}

/**
 * Calculate weighted score contribution
 */
function calculateWeightedScore(
  normalizedScore: number,
  weight: number
): number {
  return normalizedScore * weight
}

/**
 * Aggregate criterion scores into overall score
 */
export function aggregateScores(criterionScores: CriterionScore[]): number {
  // Sum up weighted scores
  const totalScore = criterionScores.reduce(
    (sum, score) => sum + score.weightedScore,
    0
  )
  return totalScore
}

/**
 * Score input against a single criterion
 * This is a basic implementation that can be extended with LLM-based evaluation
 */
async function scoreCriterion(
  input: ScoringInput,
  criterion: RubricCriterion,
  _config?: ScoringConfig
): Promise<CriterionScore> {
  // For now, this is a placeholder that returns mid-range scores
  // In a real implementation, this would use LLM or other methods to evaluate
  // TODO: Use _config for LLM-based evaluation when implemented

  let rawScore: number
  let justification: string | undefined

  // Simple heuristic-based scoring (this should be replaced with actual evaluation logic)
  switch (criterion.scale.type) {
    case 'numeric': {
      const min = criterion.scale.min ?? 0
      const max = criterion.scale.max ?? 100
      // Simple length-based heuristic (replace with actual logic)
      const outputLength = input.output.length
      const ratio = Math.min(outputLength / 1000, 1)
      rawScore = min + (max - min) * ratio
      justification = `Output length: ${outputLength} characters`
      break
    }

    case 'categorical': {
      if (!criterion.scale.categories || criterion.scale.categories.length === 0) {
        throw new Error(`Criterion ${criterion.id} has no categories`)
      }
      // Default to middle category
      const midIndex = Math.floor(criterion.scale.categories.length / 2)
      rawScore = criterion.scale.categories[midIndex]!.value
      justification = `Category: ${criterion.scale.categories[midIndex]!.label}`
      break
    }

    case 'binary': {
      // Default to 1 (pass)
      rawScore = 1
      justification = 'Basic validation passed'
      break
    }

    default:
      throw new Error(`Unknown scale type: ${criterion.scale.type}`)
  }

  const normalizedScore = normalizeScore(rawScore, criterion.scale)
  const weightedScore = calculateWeightedScore(normalizedScore, criterion.weight)

  return {
    criterionId: criterion.id,
    rawScore,
    normalizedScore,
    weightedScore,
    justification,
  }
}

/**
 * Rubric scorer implementation
 */
export class RubricScorer implements Scorer {
  /**
   * Score input against a rubric
   */
  async score(
    input: ScoringInput,
    config: ScoringConfig
  ): Promise<ScoringResult> {
    if (!config.rubric) {
      throw new Error('Rubric config must include a rubric definition')
    }

    // Validate the rubric
    const validation = validateRubric(config.rubric)
    if (!validation.valid) {
      throw new Error(`Invalid rubric: ${validation.errors.join(', ')}`)
    }

    // Score each criterion
    const criterionScores: CriterionScore[] = []
    for (const criterion of config.rubric.criteria) {
      const score = await scoreCriterion(input, criterion, config)
      criterionScores.push(score)
    }

    // Aggregate scores
    const overallScore = aggregateScores(criterionScores)

    // Check against threshold
    const threshold = config.threshold ?? 0.7
    const passed = overallScore >= threshold

    return {
      score: overallScore,
      passed,
      criterionScores,
      method: 'rubric',
      justification: `Scored using rubric "${config.rubric.name}"`,
      timestamp: new Date().toISOString(),
      metadata: {
        rubricName: config.rubric.name,
        rubricVersion: config.rubric.version,
        threshold,
      },
    }
  }

  /**
   * Score with manual criterion scores (for testing or LLM-based evaluation)
   */
  async scoreWithCriterionScores(
    rubric: Rubric,
    criterionRawScores: Record<string, number>,
    threshold?: number
  ): Promise<ScoringResult> {
    // Validate the rubric
    const validation = validateRubric(rubric)
    if (!validation.valid) {
      throw new Error(`Invalid rubric: ${validation.errors.join(', ')}`)
    }

    // Build criterion scores from raw scores
    const criterionScores: CriterionScore[] = []
    for (const criterion of rubric.criteria) {
      const rawScore = criterionRawScores[criterion.id]
      if (rawScore === undefined) {
        throw new Error(`Missing score for criterion: ${criterion.id}`)
      }

      const normalizedScore = normalizeScore(rawScore, criterion.scale)
      const weightedScore = calculateWeightedScore(normalizedScore, criterion.weight)

      criterionScores.push({
        criterionId: criterion.id,
        rawScore,
        normalizedScore,
        weightedScore,
      })
    }

    // Aggregate scores
    const overallScore = aggregateScores(criterionScores)

    // Check against threshold
    const effectiveThreshold = threshold ?? 0.7
    const passed = overallScore >= effectiveThreshold

    return {
      score: overallScore,
      passed,
      criterionScores,
      method: 'rubric',
      justification: `Scored using rubric "${rubric.name}"`,
      timestamp: new Date().toISOString(),
      metadata: {
        rubricName: rubric.name,
        rubricVersion: rubric.version,
        threshold: effectiveThreshold,
      },
    }
  }
}

/**
 * Create a rubric scorer instance
 */
export function createRubricScorer(): RubricScorer {
  return new RubricScorer()
}
