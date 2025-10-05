# seo-tools

# SEO Tools & Utilities Worker

Comprehensive SEO toolset providing keyword research, competitor analysis, llms.txt generation, sitemap generation, technical SEO audits, and meta tag analysis.

## Features

### 1. llms.txt Generator
Generates valid llms.txt files from website content using OpenAI GPT for intelligent content summarization.

**Capabilities:**
- Crawls website pages
- Extracts key information (About, Products, Contact, etc.)
- Generates structured llms.txt format
- Validates output format

**Example llms.txt:**
```
# Company Name
> Brief company description

## About
Company information and mission

## Products
Product listings and descriptions

## Contact
Contact information and support details
```

### 2. Sitemap Generator
Creates XML and TXT sitemaps with proper formatting and validation.

**Features:**
- Crawls website for all pages
- Respects robots.txt
- Generates sitemap.xml
- Generates sitemap.txt
- Supports sitemap index for large sites
- Priority and change frequency hints

### 3. Meta Tag Analyzer
Analyzes page meta tags for SEO optimization.

**Checks:**
- Title tag (length, keywords, uniqueness)
- Meta description (length, keywords, compelling)
- Open Graph tags (og:title, og:description, og:image)
- Twitter Card tags
- Canonical URLs
- Robots directives
- Schema.org structured data

### 4. Technical SEO Audit
Comprehensive technical SEO analysis.

**Audit Areas:**
- Page speed and performance
- Mobile-friendliness
- HTTPS usage
- Structured data validation
- Internal linking structure
- Broken links detection
- Image optimization (alt tags, size)
- Header tag hierarchy (H1-H6)
- Content quality metrics
- Duplicate content detection

### 5. Keyword Research
Integrates with DataForSEO for keyword research and analysis.

**Features:**
- Search volume data
- Keyword difficulty scoring
- Related keywords discovery
- SERP features analysis
- Competitive keyword analysis
- Long-tail keyword suggestions

### 6. Competitor Analysis
Analyzes competitor websites for SEO insights.

**Analysis:**
- Top keywords
- Backlink profile
- Content strategy
- Technical SEO score
- SERP position tracking
- Content gaps identification

## API Endpoints

### llms.txt Generation
```bash
POST /generate-llms-txt
{
  "url": "https://example.com",
  "sections": ["about", "products", "contact"],
  "maxPages": 10
}
```

### Sitemap Generation
```bash
POST /generate-sitemap
{
  "url": "https://example.com",
  "format": "xml",
  "maxPages": 500,
  "includeImages": true
}
```

### Meta Tag Analysis
```bash
POST /analyze-meta
{
  "url": "https://example.com/page"
}
```

### Technical SEO Audit
```bash
POST /audit
{
  "url": "https://example.com",
  "depth": 2,
  "includePerformance": true
}
```

### Keyword Research
```bash
POST /keywords/research
{
  "keyword": "software development",
  "location": "United States",
  "language": "en"
}
```

### Competitor Analysis
```bash
POST /competitors/analyze
{
  "url": "https://example.com",
  "competitors": ["https://competitor1.com", "https://competitor2.com"]
}
```

## Architecture

```
┌─────────────────┐
│   HTTP Request  │
└────────┬────────┘
         │
    ┌────▼─────┐
    │   Hono   │
    │  Router  │
    └────┬─────┘
         │
    ┌────▼──────────────────────────┐
    │    SEOToolsService (RPC)      │
    ├───────────────────────────────┤
    │ - generateLlmsTxt()           │
    │ - generateSitemap()           │
    │ - analyzeMeta()               │
    │ - auditTechnical()            │
    │ - researchKeywords()          │
    │ - analyzeCompetitors()        │
    └────┬──────────────────────────┘
         │
    ┌────▼────────────────────────────┐
    │      External Services          │
    ├─────────────────────────────────┤
    │ - OpenAI GPT (llms.txt)         │
    │ - DataForSEO API (keywords)     │
    │ - Web Scraping (crawling)       │
    │ - Schema Validator              │
    └─────────────────────────────────┘
```

## Implementation



## Deployment

```bash
# Build worker
pnpm build-mdx seo-tools.mdx

# Deploy
cd seo-tools
wrangler deploy

# Test
curl https://seo-tools.services.do/health
```

## Environment Variables

Add to `.dev.vars` and production secrets:

```bash
OPENAI_API_KEY=sk-...
DATAFORSEO_LOGIN=your-login
DATAFORSEO_PASSWORD=your-password
```

## Testing

```bash
# Generate llms.txt
curl -X POST https://seo-tools.services.do/generate-llms-txt \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","sections":["about","products"]}'

# Generate sitemap
curl -X POST https://seo-tools.services.do/generate-sitemap \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","format":"xml"}'

# Analyze meta tags
curl -X POST https://seo-tools.services.do/analyze-meta \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}'
```

## Future Enhancements

- Add support for more keyword research providers
- Implement backlink analysis
- Add SERP tracking
- Content gap analysis
- Schema.org validator
- Page speed insights integration
- Mobile-first indexing analysis
- Core Web Vitals tracking

---

**Generated from:** seo-tools.mdx

**Build command:** `tsx scripts/build-mdx-worker.ts seo-tools.mdx`
