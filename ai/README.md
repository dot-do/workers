# AI Service (@do/ai)

Multi-provider AI generation microservice with support for OpenAI, Anthropic (Claude), and Cloudflare Workers AI.

## Features

- **Multi-Provider Support**: OpenAI (GPT-5, GPT-4o), Anthropic (Claude Sonnet 4.5), Workers AI (Llama 3.1), Replicate (Stable Audio)
- **Automatic Fallback**: Seamless failover between providers on errors
- **Streaming Support**: Server-Sent Events (SSE) for real-time text generation
- **Embeddings**: Generate vector embeddings for semantic search
- **Content Analysis**: AI-powered content analysis (sentiment, topics, etc.)
- **Image Generation**: Create images with DALL-E 3 and other models
- **Speech Synthesis**: Text-to-speech with OpenAI TTS
- **Music Generation**: AI-generated music with Replicate Stable Audio 2.5
- **Cost Tracking**: Automatic cost calculation per request
- **MCP Tools**: Model Context Protocol integration for LLM agents
- **RPC Interface**: Service bindings for inter-worker communication
- **HTTP Interface**: RESTful API for direct access

## Architecture

```
workers/ai/
├── src/
│   ├── index.ts                 # Main AIService class
│   ├── types.ts                 # TypeScript types
│   ├── mcp.ts                   # MCP tools
│   ├── r2.ts                    # R2 storage utilities
│   └── providers/
│       ├── openai.ts            # OpenAI provider (text, images, speech)
│       ├── anthropic.ts         # Anthropic/Claude provider
│       ├── workers-ai.ts        # Workers AI provider
│       └── replicate.ts         # Replicate provider (music)
├── tests/
│   └── ai-service.test.ts       # Comprehensive tests
├── worker.ts                    # Worker entry point
├── wrangler.jsonc               # Cloudflare configuration
└── package.json                 # Dependencies
```

## Installation

```bash
pnpm install
```

## Configuration

### Environment Variables

Set via `wrangler secret put`:

```bash
wrangler secret put OPENAI_API_KEY
wrangler secret put ANTHROPIC_API_KEY
wrangler secret put OPENROUTER_API_KEY  # Alternative to ANTHROPIC_API_KEY
wrangler secret put REPLICATE_API_KEY   # For music generation
```

Update `wrangler.jsonc`:

```jsonc
{
  "vars": {
    "CLOUDFLARE_ACCOUNT_ID": "your-account-id"
  }
}
```

## Usage

### RPC Interface (Service Binding)

From another worker:

```typescript
// In wrangler.jsonc
{
  "services": [
    { "binding": "AI", "service": "ai" }
  ]
}

// In your worker
const result = await env.AI.generate('Write a haiku about coding')
console.log(result.text)
console.log(`Cost: $${result.cost}`)
```

### HTTP Interface

#### Generate Text

```bash
curl -X POST https://ai.api.mw/ai/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Explain quantum computing in simple terms",
    "provider": "openai",
    "model": "gpt-4o-mini",
    "temperature": 0.7,
    "maxTokens": 500
  }'
```

Response:

```json
{
  "text": "Quantum computing is...",
  "model": "gpt-4o-mini",
  "provider": "openai",
  "usage": {
    "promptTokens": 12,
    "completionTokens": 95,
    "totalTokens": 107
  },
  "cost": 0.000016,
  "latency": 1250
}
```

#### Stream Text (SSE)

```bash
curl -X POST https://ai.api.mw/ai/stream \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Write a story about a robot",
    "provider": "anthropic",
    "model": "anthropic/claude-sonnet-4.5"
  }'
```

#### Generate Embeddings

```bash
curl -X POST https://ai.api.mw/ai/embed \
  -H "Content-Type: application/json" \
  -d '{
    "text": "This is a test sentence for embeddings",
    "provider": "openai",
    "model": "text-embedding-3-small"
  }'
```

Response:

```json
{
  "embedding": [0.123, -0.456, 0.789, ...],
  "model": "text-embedding-3-small",
  "provider": "openai",
  "usage": {
    "promptTokens": 8,
    "totalTokens": 8
  },
  "cost": 0.00000016,
  "latency": 320
}
```

#### Analyze Content

```bash
curl -X POST https://ai.api.mw/ai/analyze \
  -H "Content-Type": "application/json" \
  -d '{
    "content": "This product is absolutely amazing! Best purchase ever!",
    "analysis": "sentiment",
    "provider": "openai",
    "model": "gpt-4o"
  }'
```

#### Generate Music

```bash
curl -X POST https://ai.api.mw/ai/generate-music \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "upbeat electronic music for a video game",
    "duration": 30,
    "style": "electronic",
    "mood": "energetic",
    "bpm": 128,
    "format": "mp3"
  }'
```

Response:

```json
{
  "audioUrl": "https://r2.example.com/music/abc123.mp3",
  "model": "stability-ai/stable-audio-open-1.0",
  "provider": "replicate",
  "duration": 30,
  "format": "mp3",
  "cost": 0.08,
  "latency": 45000,
  "usage": {
    "seconds": 30
  },
  "metadata": {
    "style": "electronic",
    "mood": "energetic",
    "bpm": 128
  }
}
```

**Options:**
- `duration` - Audio duration in seconds (default: 30, max: 180)
- `style` - Music style/genre (e.g., 'electronic', 'classical', 'jazz')
- `mood` - Mood descriptor (e.g., 'upbeat', 'relaxed', 'dramatic')
- `bpm` - Beats per minute (60-180)
- `format` - Audio format: `mp3` (default), `wav`, `flac`
- `seed` - Random seed for reproducibility

### MCP Tools (for LLM Agents)

The AI service exposes MCP tools for use by AI agents:

#### Available Tools

1. **generate_text** - Generate text using AI models
2. **analyze_content** - Analyze content (sentiment, topics, etc.)
3. **embed_text** - Generate embedding vectors

#### Example MCP Request

```json
{
  "jsonrpc": "2.0",
  "id": "1",
  "method": "tools/call",
  "params": {
    "name": "generate_text",
    "arguments": {
      "prompt": "Write a haiku about AI",
      "provider": "anthropic",
      "model": "anthropic/claude-sonnet-4.5",
      "temperature": 0.8
    }
  }
}
```

## Providers

### OpenAI

- **Models**: gpt-5, gpt-5-mini, gpt-5-nano, gpt-4o, gpt-4o-mini
- **Embeddings**: text-embedding-3-small, text-embedding-3-large
- **Images**: dall-e-3
- **Speech**: tts-1, tts-1-hd
- **Gateway**: Cloudflare AI Gateway
- **Cost**: Variable by model

### Anthropic (Claude)

- **Models**: claude-sonnet-4.5, claude-opus-4, claude-haiku-4
- **Route**: Via OpenRouter + Cloudflare AI Gateway
- **Embeddings**: Not supported (auto-fallback to OpenAI/Workers AI)
- **Cost**: Variable by model

### Workers AI (Cloudflare)

- **Models**: @cf/meta/llama-3.1-8b-instruct
- **Embeddings**: @cf/baai/bge-base-en-v1.5, @cf/google/embeddinggemma-300m
- **Cost**: Free (within generous limits)

### Replicate

- **Music Models**: stability-ai/stable-audio-open-1.0, meta/musicgen, riffusion/riffusion
- **Duration**: 30-180 seconds per generation
- **Formats**: mp3, wav, flac
- **Cost**: ~$0.08 per generation

## Automatic Fallback

The service automatically falls back to alternative providers on failure:

```
openai → anthropic → workers-ai
```

Disable fallback per request:

```typescript
await env.AI.generate('prompt', { fallback: false })
```

## Cost Estimation

All responses include cost estimates based on token usage:

```json
{
  "usage": {
    "promptTokens": 50,
    "completionTokens": 200,
    "totalTokens": 250
  },
  "cost": 0.000375
}
```

Pricing per 1M tokens (input/output):
- GPT-5: $15/$60
- GPT-4o: $2.50/$10
- Claude Sonnet 4.5: $3/$15
- Workers AI: Free

## Development

### Run Locally

```bash
pnpm dev
```

### Run Tests

```bash
pnpm test        # Run once
pnpm test:watch  # Watch mode
```

### Type Check

```bash
pnpm typecheck
```

### Generate Types

```bash
pnpm types
```

### Deploy

```bash
pnpm deploy
```

## Testing

Comprehensive test suite with 80%+ coverage:

- Provider selection
- Text generation
- Streaming
- Embeddings
- Content analysis
- Provider fallback
- HTTP interface
- Error handling
- Performance benchmarks

Run tests:

```bash
pnpm test
```

## Performance

- Generation latency: <2s (p95)
- Embedding latency: <500ms (p95)
- Streaming: Real-time chunks
- Fallback: <5s total with retries

## Dependencies

- **@ai-sdk/openai** - OpenAI integration
- **@ai-sdk/anthropic** - Anthropic integration
- **ai** - Vercel AI SDK
- **@cloudflare/workers-types** - TypeScript types
- **vitest** - Testing framework

## Integration with Gateway (WS-003)

The AI service integrates with the API gateway for routing:

```
Gateway (api.api.mw) → AI Service (ai.api.mw)
```

Routes:
- `/ai/generate` → Text generation
- `/ai/stream` → Streaming
- `/ai/embed` → Embeddings
- `/ai/analyze` → Content analysis
- `/ai/generate-image` → Image generation
- `/ai/generate-speech` → Speech synthesis
- `/ai/generate-music` → Music generation
- `/ai/health` → Health check

## Success Criteria

✅ Text generation with OpenAI, Anthropic, Workers AI
✅ Streaming responses (SSE)
✅ Embedding generation (text → vector)
✅ Provider fallback working
✅ Content analysis functionality
✅ Image generation with OpenAI DALL-E 3
✅ Speech synthesis with OpenAI TTS
✅ Music generation with Replicate Stable Audio 2.5
✅ Gateway routes /ai/* correctly
✅ Generation latency <2s for text (p95)
✅ All tests passing (80%+ coverage)
⏳ Deployed to staging

## License

MIT
