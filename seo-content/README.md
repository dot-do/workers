# SEO Content Optimizer Worker

E-E-A-T analysis, semantic SEO, and content quality optimization for modern SEO/AEO.

## Features

- **E-E-A-T Analysis** - Experience, Expertise, Authoritativeness, Trustworthiness scoring
- **Content Quality Metrics** - Word count, readability, heading structure, AEO score
- **Semantic Analysis** - LSI keywords, entities, topic clusters
- **Meta Tags Analysis** - Title, description, Open Graph, Twitter Cards
- **AI-Powered Recommendations** - 15+ recommendation types with priority and impact scoring
- **Full Content Audits** - Comprehensive analysis with caching

## API Endpoints

### HTTP API (Hono)

```bash
# Full content audit
POST /audit
{
  "url": "https://example.com/article",
  "content": "Article text content...",
  "html": "<html>...</html>"
}

# E-E-A-T analysis
POST /eeat
{
  "content": "Article content...",
  "metadata": {
    "author": { "credentials": true, "yearsOfExperience": 10 }
  }
}

# Quality metrics
POST /quality
{ "content": "...", "html": "..." }

# Semantic analysis
POST /semantics
{ "content": "...", "primaryKeyword": "SEO" }

# Meta tags analysis
POST /meta
{ "html": "...", "primaryKeyword": "SEO" }

# Get recommendations
POST /recommendations
{ /* ContentAuditResult */ }
```

### RPC Methods (Service Bindings)

```typescript
// Full audit (cached)
await env.SEO_CONTENT.auditContent(url, content, html)

// Individual analyses
await env.SEO_CONTENT.analyzeEEAT(content, metadata)
await env.SEO_CONTENT.analyzeQuality(content, html)
await env.SEO_CONTENT.analyzeSemantics(content, primaryKeyword)
await env.SEO_CONTENT.analyzeMeta(html, primaryKeyword)

// Get recommendations
await env.SEO_CONTENT.getRecommendations(audit)
```

## E-E-A-T Signals

**Experience (0-100)**
- First-hand experience indicators
- Personal anecdotes count
- Original photos and case studies
- Real results and outcomes

**Expertise (0-100)**
- Author credentials and certifications
- Industry awards and published works
- Speaking engagements
- Years of experience

**Authoritativeness (0-100)**
- Backlinks count and domain authority
- Media mentions
- Industry recognition
- Social proof (followers, engagement)

**Trustworthiness (0-100)**
- HTTPS enabled
- Privacy policy and contact info
- Transparent sourcing
- Fact-checking and error correction
- Content freshness

## Content Quality Metrics

- **Word Count** - Total words
- **Readability Score** - Flesch Reading Ease (0-100)
- **Keyword Density** - Primary keyword frequency
- **Heading Structure** - H1-H6 hierarchy
- **Internal/External Links** - Link counts
- **Media** - Images, videos, code blocks
- **FAQ Section** - Presence detection
- **Table of Contents** - Presence detection
- **Author Bio** - Presence detection
- **Freshness** - Publish/modified dates, update frequency
- **Uniqueness** - Duplicate content detection (0-100)
- **AEO Score** - Answer Engine Optimization (0-100)

## AEO (Answer Engine Optimization)

Optimizes content for AI search engines (ChatGPT, Claude, Perplexity, Gemini):

- ✅ **H2 → H3 → Bullets Pattern** - Hierarchical structure
- ✅ **Direct Answers** - Clear yes/no/answer format
- ✅ **Bullet Points** - Scannable lists
- ✅ **Statistics** - Data-driven content
- ✅ **Concise Language** - AI-friendly formatting

## Semantic Analysis

- **Primary Keyword** - Main topic focus
- **Secondary Keywords** - Related terms
- **LSI Keywords** - Latent Semantic Indexing terms
- **Entities** - Named entities (Person, Organization, Place, Product, etc.)
- **Topic Clusters** - Related topics with coverage and authority scores
- **Keyword Density** - Keyword frequency analysis
- **Semantic Relevance** - Overall topic relevance (0-100)

## Recommendations

**15+ Recommendation Types:**

**E-E-A-T:**
- Add Author Bio
- Add Credentials
- Add First-Hand Experience
- Add Citations
- Update Last Modified

**Content Structure:**
- Improve Heading Structure
- Add FAQ Section
- Add Table of Contents
- Optimize Word Count

**SEO Technical:**
- Optimize Meta Tags
- Add Schema Markup
- Improve Internal Linking
- Optimize Images

**AEO Optimization:**
- Add Direct Answers
- Add Bullet Points
- Add Statistics
- Simplify Language

**Freshness:**
- Update Statistics
- Add Recent Examples
- Update Timestamps

Each recommendation includes:
- **Type** - Specific recommendation enum
- **Title** - Human-readable title
- **Description** - What needs to be done
- **Priority** - High/Medium/Low
- **Effort** - Low/Medium/High
- **Impact** - Low/Medium/High
- **Implementation** - Step-by-step instructions

## Content Audit Result

Complete audit includes:
- URL and timestamp
- E-E-A-T signals (all 4 components)
- Quality metrics (13 metrics)
- Semantic analysis
- Meta tags analysis
- Recommendations with estimated impact
- Overall score (0-100)
- Grade (A+ to F)

**Grade Scale:**
- A+ (95-100)
- A (90-94)
- B+ (85-89)
- B (80-84)
- C+ (75-79)
- C (70-74)
- D (60-69)
- F (<60)

## Configuration

**wrangler.jsonc:**
- `CONTENT_CACHE` - KV for audit results (1 hour TTL)
- `EEAT_SCORES` - KV for E-E-A-T scores
- `CONTENT_ANALYTICS` - Analytics Engine for tracking
- `CONTENT_QUEUE` - Queue for async processing
- `DB` - Database service binding
- `AI` - AI service binding for semantic analysis

## Development

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Type check
pnpm typecheck

# Deploy
pnpm deploy
```

## Integration

**Service Binding:**
```jsonc
{
  "services": [
    { "binding": "SEO_CONTENT", "service": "seo-content" }
  ]
}
```

**Usage:**
```typescript
// Full content audit
const audit = await env.SEO_CONTENT.auditContent(
  'https://example.com/article',
  articleText,
  articleHTML
)

console.log('Overall Score:', audit.overallScore)
console.log('Grade:', audit.grade)
console.log('E-E-A-T:', audit.eeatSignals.overall.score)
console.log('AEO Score:', audit.qualityMetrics.aeoScore)
console.log('Recommendations:', audit.recommendations.recommendations.length)

// Apply high-priority recommendations
const highPriority = audit.recommendations.recommendations.filter(
  r => r.priority === 'high'
)

for (const rec of highPriority) {
  console.log(`[${rec.type}] ${rec.title}`)
  console.log(`  Impact: ${rec.impact} | Effort: ${rec.effort}`)
  console.log(`  Implementation: ${rec.implementation}`)
}
```

## Related

- **Types:** `@dot-do/seo-types` package
- **Issue:** #34
