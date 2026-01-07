# datasets.do

**Data that makes AI smarter.**

```bash
npm install datasets.do
```

## Quick Start

```typescript
// Workers - import env adapter first
import 'rpc.do/env'
import { datasets } from 'datasets.do'

// Or use the factory for custom config
import { Datasets } from 'datasets.do'
const datasets = Datasets({ baseURL: 'https://custom.example.com' })
```

---

## Your Training Data Is a Mess

You're building AI, but your data is scattered across S3 buckets, local folders, and random spreadsheets. Nobody knows which version was used for the last training run.

Managing datasets for AI means:
- Data scattered across systems with no central source of truth
- No versioning - "which dataset did we train the production model on?"
- Inconsistent formats that break your training pipeline
- Annotation workflows that exist in Slack threads and shared docs
- Splitting data manually and hoping you didn't leak test into train
- Reproducing results is basically impossible

**Your AI is only as good as your data. And your data is chaos.**

## What If Your Data Just Worked?

```typescript
import { datasets } from 'datasets.do'

// Describe what you want in plain English
const sentiment = await datasets.do`
  Create a sentiment analysis dataset with
  text, label, and confidence fields
`

// Upload your data
await datasets.upload('sentiment-data', [
  { text: 'Absolutely love this product!', label: 'positive' },
  { text: 'Complete waste of money', label: 'negative' },
  { text: 'It works as expected', label: 'neutral' }
])

// Annotate, split, version - all managed
await datasets.annotate('sentiment-data', { labels: ['positive', 'negative', 'neutral'] })
await datasets.split('sentiment-data', { train: 0.8, test: 0.1, validation: 0.1 })
await datasets.version('sentiment-data', { version: 'v1.0.0' })
```

**datasets.do** gives you:
- One place for all your training and evaluation data
- Automatic versioning with full history
- Built-in annotation workflows
- Smart splits with stratification
- Any format: JSON, JSONL, CSV, Parquet

## Data Management in 3 Steps

### 1. Upload Your Data

```typescript
import { datasets } from 'datasets.do'

// Create a dataset with schema
const dataset = await datasets.create({
  name: 'customer-reviews',
  description: 'Product reviews for sentiment analysis',
  schema: {
    fields: [
      { name: 'text', type: 'string', required: true },
      { name: 'rating', type: 'number', required: true },
      { name: 'category', type: 'string' }
    ]
  }
})

// Upload records
await datasets.upload('customer-reviews', reviews, {
  format: 'jsonl',
  deduplicate: true,
  validate: true
})
```

### 2. Annotate Your Data

```typescript
// Set up annotation task
await datasets.annotate('customer-reviews', {
  type: 'classification',
  labels: ['positive', 'negative', 'neutral'],
  instructions: 'Label the overall sentiment of each review'
})

// Add annotations programmatically
await datasets.addAnnotation('customer-reviews', recordId, {
  label: 'sentiment',
  value: 'positive',
  confidence: 0.95
})

// Track annotation progress
const stats = await datasets.stats('customer-reviews')
console.log(stats.annotations) // { positive: 450, negative: 320, neutral: 230 }
```

### 3. Version and Split

```typescript
// Create reproducible splits
await datasets.split('customer-reviews', {
  train: 0.8,
  test: 0.1,
  validation: 0.1,
  seed: 42,
  stratify: 'sentiment' // balanced splits
})

// Version your dataset
await datasets.version('customer-reviews', {
  version: 'v1.0.0',
  description: 'Initial release - 1000 annotated reviews'
})

// Download specific split
const trainData = await datasets.download('customer-reviews', {
  split: 'train',
  format: 'jsonl'
})
```

## The Difference

**Without datasets.do:**
- Data scattered across S3, GCS, local folders
- "Which version did we use for training?"
- Manual Excel sheets for annotation tracking
- Copy-paste errors in train/test splits
- Impossible to reproduce last month's results
- Hours wasted finding the right data

**With datasets.do:**
- Single source of truth for all datasets
- Every version tracked with checksums
- Built-in annotation workflows
- Reproducible splits with seeds
- Full lineage and history
- Find any data in seconds

## Everything You Need

```typescript
// Natural language dataset creation
const qa = await datasets.do`
  Create a question-answering dataset with
  context, question, and answer fields
`

// Clone and modify
const qaV2 = await datasets.clone('qa-dataset', 'qa-dataset-v2')

// Merge datasets
await datasets.merge(['reviews-2023', 'reviews-2024'], 'reviews-all')

// Sample for quick testing
const sample = await datasets.sample('reviews-all', 100, { seed: 42 })

// Search your data
const results = await datasets.search('reviews-all', 'battery life', {
  field: 'text',
  limit: 50
})

// Validate against schema
const validation = await datasets.validate('reviews-all')
if (!validation.valid) {
  console.log(validation.errors)
}

// Get full statistics
const stats = await datasets.stats('reviews-all')
console.log(`${stats.recordCount} records, ${stats.size} bytes`)
```

## Dataset Formats

| Format | Best For |
|--------|----------|
| `json` | Small datasets, easy inspection |
| `jsonl` | Streaming, large datasets |
| `csv` | Spreadsheet compatibility |
| `parquet` | Analytics, columnar queries |

## Configuration

```typescript
// Workers - import env adapter for automatic env resolution
import 'rpc.do/env'
import { datasets } from 'datasets.do'

// Or use factory with custom config
import { Datasets } from 'datasets.do'
const customDatasets = Datasets({
  baseURL: 'https://custom.example.com',
  apiKey: 'your-api-key'
})
```

Set `DATASETS_API_KEY` or `DO_API_KEY` in your environment.

## Stop Losing Your Data

Your models are only as good as the data you train them on. Stop managing data in spreadsheets and start versioning it like code.

**Your data is your competitive advantage. Treat it that way.**

```bash
npm install datasets.do
```

[Start managing data at datasets.do](https://datasets.do)

---

MIT License
