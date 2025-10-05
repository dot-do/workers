# generate

# Generate Worker

A Cloudflare Worker for AI text generation with streaming responses, multi-model support, and real-time analytics.

## Overview

This worker provides a simple HTTP API for generating text using various AI models via OpenRouter. It streams responses in real-time with YAML frontmatter and markdown content, tracks usage and costs, and pipes events to analytics pipelines.

## Features

- ✅ **Multi-Model Support** - Access 15+ AI models (Claude, GPT-4, Gemini, etc.)
- ✅ **Streaming Responses** - Real-time text generation with progressive rendering
- ✅ **YAML Frontmatter** - Structured metadata with every response
- ✅ **Usage Tracking** - Token counts, latency, thinking time, cost calculation
- ✅ **Event Pipelines** - Real-time analytics via Cloudflare Pipelines
- ✅ **OpenRouter Integration** - Single API for multiple AI providers
- ✅ **AI Gateway** - Cloudflare AI Gateway for request routing and caching
- ✅ **Smart Placement** - Automatic routing to optimal data centers
- ✅ **Cost Calculation** - Per-request cost tracking using ai-generation package

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Generate Worker                       │
└─────────────────────────────────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────┐
              │  Query Parameters         │
              │  - q / prompt             │
              │  - model                  │
              │  - temperature, etc.      │
              └───────────┬───────────────┘
                          │
                          ▼
              ┌───────────────────────────┐
              │  Cloudflare AI Gateway    │
              │  (Cache + Route)          │
              └───────────┬───────────────┘
                          │
                          ▼
              ┌───────────────────────────┐
              │  OpenRouter API           │
              │  (Multi-provider)         │
              └───────────┬───────────────┘
                          │
                          ▼
              ┌───────────────────────────┐
              │  Stream Response          │
              │  - YAML frontmatter       │
              │  - Thinking (optional)    │
              │  - Generated text         │
              │  - Usage metadata         │
              └───────────┬───────────────┘
                          │
                          ▼
              ┌───────────────────────────┐
              │  Cloudflare Pipeline      │
              │  (Analytics)              │
              └───────────────────────────┘
```

## API

### Generate Text

**Endpoint**: `GET https://generate.apis.do/*`

**Query Parameters**:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `q` | string | - | Short query/prompt |
| `prompt` | string | - | Full prompt (alias for `q`) |
| `model` | string | `google/gemini-2.5-flash` | AI model to use |
| `seed` | string | - | Random seed for reproducibility |
| `system` | string | - | System message/instructions |
| `temperature` | number | - | Randomness (0.0-2.0) |
| `maxTokens` | number | - | Maximum tokens to generate |
| `topP` | number | - | Nucleus sampling parameter |
| `topK` | number | - | Top-K sampling parameter |
| `output` | `markdown` \| `json` | `markdown` | Output format |

**Example Request**:

```bash
curl "https://generate.apis.do/?q=Explain+Markdown&model=anthropic/claude-sonnet-4"
```

**Example Response**:

```markdown
---
$id: https://generate.apis.do/01JHRXK...
$type: markdown
$context: https://generate.apis.do
system: null
prompt: Explain Markdown
model: anthropic/claude-sonnet-4
seed: null
temperature: null
maxTokens: null
topP: null
topK: null
actions:
  model:
    anthropic/claude-opus-4: https://generate.apis.do/01JHRXK...?model=anthropic%2Fclaude-opus-4
    anthropic/claude-sonnet-4: https://generate.apis.do/01JHRXK...?model=anthropic%2Fclaude-sonnet-4
    google/gemini-2.5-pro: https://generate.apis.do/01JHRXK...?model=google%2Fgemini-2.5-pro
    ...
---


# Markdown Explained

Markdown is a lightweight markup language...

<usage>
latency: 1234
thinkingTime: null
totalTime: 5678
tokensPerSecond: 450
cost: $0.000123
promptTokens: 50
completionTokens: 200
totalTokens: 250
</usage>
```

## Supported Models

### Anthropic Claude

- `anthropic/claude-opus-4` - Most capable, for complex tasks
- `anthropic/claude-sonnet-4` - Balanced performance and cost

### Google Gemini

- `google/gemini-2.5-pro` - Advanced reasoning
- `google/gemini-2.5-flash` - Fast, cost-effective (default)
- `google/gemini-2.5-flash-lite-preview-06-17` - Ultra-fast preview

### OpenAI GPT

- `openai/gpt-4.1` - Latest GPT-4
- `openai/gpt-4.1-mini` - Faster, cheaper
- `openai/gpt-4.1-nano` - Ultra-fast

### OpenAI O-series (Reasoning Models)

- `openai/o3` - Advanced reasoning
- `openai/o3-pro` - Maximum reasoning capability
- `openai/o4-mini` - Fast reasoning
- `openai/o4-mini-high` - Enhanced reasoning

## Response Format

### YAML Frontmatter

Every response begins with YAML frontmatter containing:

```yaml
$id: https://generate.apis.do/01JHRXK...  # Unique generation ID (ULID)
$type: markdown                            # Output type
$context: https://generate.apis.do         # Origin context
prompt: Explain Markdown                   # Actual prompt used
model: google/gemini-2.5-flash            # Model used
seed: null                                 # Random seed (if provided)
temperature: null                          # Temperature (if provided)
maxTokens: null                            # Max tokens (if provided)
topP: null                                 # Top-P (if provided)
topK: null                                 # Top-K (if provided)
actions:
  model:                                   # Quick model switching links
    anthropic/claude-opus-4: https://...
    google/gemini-2.5-pro: https://...
    ...
```

### Thinking Tags (Reasoning Models)

For reasoning models (o3, o3-pro, o4-mini, o4-mini-high):

```markdown
<thinking>

Step-by-step reasoning process...

</thinking>


Generated response...
```

### Usage Metadata

Every response ends with usage metadata:

```xml
<usage>
latency: 1234              # Time to first token (ms)
thinkingTime: 5000         # Reasoning time (ms, if applicable)
totalTime: 8500            # Total generation time (ms)
tokensPerSecond: 450       # Throughput
cost: $0.000123            # Calculated cost
promptTokens: 50           # Input tokens
completionTokens: 200      # Output tokens
totalTokens: 250           # Total tokens
</usage>
```

## Implementation



## Use Cases

### 1. Interactive Documentation

```bash
curl "https://generate.apis.do/?q=Explain+TypeScript+generics&model=anthropic/claude-sonnet-4"
```

### 2. Code Examples

```bash
curl "https://generate.apis.do/?prompt=Write+a+React+hook+for+fetching+data&model=openai/gpt-4.1"
```

### 3. Content Generation

```bash
curl "https://generate.apis.do/?q=Write+a+blog+post+about+Web3&model=google/gemini-2.5-pro&temperature=0.7"
```

### 4. Quick Answers

```bash
curl "https://generate.apis.do/?q=What+is+REST+API&model=google/gemini-2.5-flash"
```

### 5. Complex Reasoning

```bash
curl "https://generate.apis.do/?prompt=Solve+this+math+problem...&model=openai/o3-pro"
```

## Advanced Features

### Model Switching

Each response includes quick links to regenerate with different models:

```yaml
actions:
  model:
    anthropic/claude-opus-4: https://generate.apis.do/01JHRXK...?model=anthropic%2Fclaude-opus-4
    google/gemini-2.5-pro: https://generate.apis.do/01JHRXK...?model=google%2Fgemini-2.5-pro
```

Click any link to see how a different model would respond.

### Reproducible Results

Use `seed` parameter for deterministic generation:

```bash
curl "https://generate.apis.do/?q=Random+story&seed=42"
```

The same seed + prompt + model will produce identical results.

### System Messages

Guide the model's behavior with system messages:

```bash
curl "https://generate.apis.do/?q=Tell+me+about+cats&system=You+are+a+veterinarian"
```

### Cost Tracking

Every response includes calculated costs:

```yaml
cost: $0.000123  # Calculated using ai-generation package
```

Costs are based on current model pricing and actual token usage.

## Cloudflare Features

### AI Gateway

All requests route through Cloudflare AI Gateway for:
- **Caching** - Identical requests served from cache
- **Analytics** - Request volume, latency, errors
- **Rate Limiting** - Prevent abuse
- **Logging** - Full request/response logs

### Pipelines

All completions are sent to Cloudflare Pipelines for real-time analytics:
- Generation volume by model
- Average cost per generation
- Token usage trends
- Latency percentiles
- Popular prompts

### Smart Placement

Worker automatically deploys to optimal locations based on:
- OpenRouter API latency
- User geographic distribution
- Cloudflare network topology

### Tail Consumers

Generation events are tailed to `pipeline` service for processing:
- Real-time dashboards
- Cost aggregation
- Usage alerts
- Model performance tracking

## Dependencies

### Runtime Dependencies

- `hono` - Web framework
- `ai` - Vercel AI SDK (streamText, streamObject)
- `@openrouter/ai-sdk-provider` - OpenRouter adapter
- `@ai-sdk/openai` - OpenAI adapter
- `yaml` - YAML parsing/stringification
- `zod` - Input validation
- `ulid` - ID generation
- `ai-generation` - Cost calculation (from sdk/)

### Bindings

- `ai` - Cloudflare Workers AI
- `pipeline` - Cloudflare Pipeline (events-realtime)
- `db` - Database service binding

## Monitoring

### Cloudflare Dashboard

View in Workers Analytics:
- Request volume by model
- Average response time
- Error rates
- Cost trends

### Pipeline Analytics

View in Pipeline dashboard:
- Real-time generation feed
- Model usage distribution
- Cost per model
- Token throughput

### Tail Logs

Stream logs in real-time:

```bash
wrangler tail
```

## Future Enhancements

### Planned Features

- [ ] JSON output mode (structured responses)
- [ ] Multi-turn conversations (chat history)
- [ ] Image generation (DALL-E, Stable Diffusion)
- [ ] Function calling (tool use)
- [ ] Embeddings endpoint
- [ ] Rate limiting by user
- [ ] Prompt templates library
- [ ] Response caching in R2

### Integration Ideas

- Slack bot for quick answers
- Documentation generator
- Code reviewer
- Content summarizer
- Translation service

## Related Documentation

- [Vercel AI SDK](https://sdk.vercel.ai/docs)
- [OpenRouter Docs](https://openrouter.ai/docs)
- [Cloudflare AI Gateway](https://developers.cloudflare.com/ai-gateway/)
- [Cloudflare Pipelines](https://developers.cloudflare.com/pipelines/)
- [ai-generation package](../sdk/packages/ai-generation/)

## Tech Stack

- **Hono** - Fast web framework
- **Vercel AI SDK** - Unified AI interface
- **OpenRouter** - Multi-provider AI API
- **Cloudflare AI Gateway** - Request routing and caching
- **Cloudflare Pipelines** - Real-time analytics
- **YAML** - Structured metadata
- **ULID** - Unique IDs
- **Zod** - Input validation

---

**Generated from:** generate.mdx

**Build command:** `tsx scripts/build-mdx-worker.ts generate.mdx`

---

**Generated from:** generate.mdx

**Build command:** `tsx scripts/build-mdx-worker.ts generate.mdx`
