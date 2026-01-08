# Scoring Engine

Rubric-based scoring, programmatic scorers, and aggregation logic for AI evaluations.

## Features

- **Rubric-based Scoring**: Define multi-criteria rubrics with weights and scales
- **Programmatic Scorers**: Register custom scoring functions
- **Aggregation Logic**: Combine multiple scores with different strategies
- **Type-safe**: Full TypeScript support with comprehensive types

## Usage

### Rubric-based Scoring

Define a rubric with multiple criteria:

```typescript
import { RubricScorer, type Rubric } from '@dotdo/evals'

const rubric: Rubric = {
  name: 'Code Quality',
  description: 'Evaluates code quality',
  criteria: [
    {
      id: 'correctness',
      name: 'Correctness',
      description: 'Code produces correct results',
      weight: 0.6,
      scale: {
        type: 'numeric',
        min: 0,
        max: 100,
      },
    },
    {
      id: 'style',
      name: 'Style',
      description: 'Code follows style guidelines',
      weight: 0.4,
      scale: {
        type: 'categorical',
        categories: [
          { label: 'Poor', value: 1 },
          { label: 'Fair', value: 2 },
          { label: 'Good', value: 3 },
          { label: 'Excellent', value: 4 },
        ],
      },
    },
  ],
}

// Score with manual criterion scores
const scorer = new RubricScorer()
const result = await scorer.scoreWithCriterionScores(
  rubric,
  { correctness: 85, style: 3 },
  0.7 // threshold
)

console.log(result.score) // Overall score (0-1)
console.log(result.passed) // Whether it passed the threshold
console.log(result.criterionScores) // Individual criterion scores
```

### Programmatic Scorers

Register and use custom scoring functions:

```typescript
import { registerScorer, ProgrammaticScorer } from '@dotdo/evals'

// Register a custom scorer
registerScorer('word_count', (input) => {
  const words = input.output.split(/\s+/).length
  return words >= 100 ? 1 : words / 100
})

// Use the scorer
const scorer = new ProgrammaticScorer()
const result = await scorer.score(
  { output: 'Your output text here...' },
  { method: 'programmatic', scorerFunction: 'word_count' }
)
```

Built-in scorers:
- `exact_match`: Returns 1 if output exactly matches expected, 0 otherwise
- `length`: Scores based on output length relative to expected
- `contains`: Returns 1 if output contains expected substring

### Aggregation

Combine multiple scoring results:

```typescript
import { aggregateResults } from '@dotdo/evals'

const results = [
  { score: 0.8, /* ... */ },
  { score: 0.6, /* ... */ },
]

// Mean aggregation
const mean = aggregateResults(results, 'mean')

// Weighted aggregation
const weighted = aggregateResults(results, 'weighted', [0.7, 0.3])

// Min/Max
const min = aggregateResults(results, 'min')
const max = aggregateResults(results, 'max')
```

### Comparison

Compare two scoring results:

```typescript
import { compareResults } from '@dotdo/evals'

const comparison = compareResults(resultA, resultB)
console.log(comparison.scoreDifference) // Numeric difference
console.log(comparison.improvement) // Boolean: did it improve?
console.log(comparison.criterionComparisons) // Per-criterion comparison
```

## Types

### Rubric Definition

```typescript
interface Rubric {
  name: string
  description: string
  criteria: RubricCriterion[]
  guidelines?: string[]
  version?: string
  metadata?: Record<string, unknown>
}

interface RubricCriterion {
  id: string
  name: string
  description: string
  weight: number // 0-1, must sum to 1.0 across all criteria
  scale: Scale
  guidelines?: string[]
  examples?: RubricExample[]
}
```

### Scales

Three types of scales are supported:

**Numeric**:
```typescript
{
  type: 'numeric',
  min: 0,
  max: 100
}
```

**Categorical**:
```typescript
{
  type: 'categorical',
  categories: [
    { label: 'Poor', value: 1 },
    { label: 'Fair', value: 2 },
    { label: 'Good', value: 3 },
    { label: 'Excellent', value: 4 }
  ]
}
```

**Binary**:
```typescript
{
  type: 'binary'
}
```

### Scoring Result

```typescript
interface ScoringResult {
  score: number // Overall score (0-1)
  passed: boolean // Whether threshold was met
  criterionScores: CriterionScore[] // Individual scores
  method: 'rubric' | 'programmatic' | 'llm-judge' | 'semantic' | 'exact_match'
  justification?: string
  timestamp: string
  metadata?: Record<string, unknown>
}

interface CriterionScore {
  criterionId: string
  rawScore: number // Original score value
  normalizedScore: number // Normalized to 0-1
  weightedScore: number // Normalized * weight
  justification?: string
}
```

## Validation

Rubrics are automatically validated:

```typescript
import { validateRubric } from '@dotdo/evals'

const validation = validateRubric(rubric)
if (!validation.valid) {
  console.error('Rubric errors:', validation.errors)
}
```

Validation checks:
- Rubric has a name
- At least one criterion
- Weights sum to 1.0
- Each criterion has required fields
- Scales are properly configured

## Testing

Run tests:

```bash
npm test -- test/scoring.test.ts
```

32 comprehensive tests cover:
- Rubric validation
- Score normalization (numeric, categorical, binary)
- Score aggregation
- Rubric scoring
- Programmatic scoring
- Scorer factory
- Result aggregation (mean, min, max, weighted)
- Result comparison
- Result formatting
