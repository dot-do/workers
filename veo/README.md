# Veo 3 Video Generation Service

AI video generation using Google Veo 3 with R2 storage.

## Features

- **Google Veo 3 Integration** - State-of-the-art text-to-video generation
- **R2 Storage** - Automatic upload and hosting of generated videos
- **Batch Processing** - Generate multiple videos simultaneously
- **Database Tracking** - Track status, metadata, and URLs for all videos
- **Test Prompts** - 5 pre-built prompts covering diverse industries

## API Endpoints

### Generate Single Video

```bash
POST /generate
```

```json
{
  "prompt": "A surgeon performs delicate surgery...",
  "aspectRatio": "16:9",
  "duration": 10,
  "negativePrompt": "low quality, cartoon",
  "metadata": {
    "campaign": "healthcare-demo"
  }
}
```

### Generate Batch

```bash
POST /generate/batch
```

```json
{
  "prompts": [
    {
      "prompt": "...",
      "aspectRatio": "16:9"
    },
    {
      "prompt": "...",
      "aspectRatio": "9:16"
    }
  ],
  "metadata": {
    "batchType": "test"
  }
}
```

### Generate Test Batch

```bash
POST /generate/test
```

Generates 5 videos using pre-built prompts covering:
- Healthcare (surgeon)
- Manufacturing (welder)
- Technology (data analyst)
- Retail (barista)
- Construction (equipment operator)

### Get Video Status

```bash
GET /videos/:id
```

Returns video status, URL, and metadata.

### List Available Prompts

```bash
GET /prompts
```

Returns all available prompt templates.

## RPC Interface

```typescript
const veoService = env.VEO_SERVICE

// Generate video
const video = await veoService.generateVideo({
  prompt: '...',
  aspectRatio: '16:9',
})

// Generate batch
const batch = await veoService.generateBatch({
  prompts: [...]
})

// Generate test batch
const test = await veoService.generateTestBatch()

// Get video
const video = await veoService.getVideo('01HXYZ...')
```

## Prompt Best Practices

The service follows Google's Veo 3 best practices:

1. **Be vividly descriptive** - Include specific details about characters, setting, lighting
2. **Set scene and atmosphere** - Use sensory language, mention time/place/mood
3. **Specify camera and style** - Indicate angles, shots, visual style
4. **Describe actions in sequence** - Break down complex scenes step-by-step
5. **Include audio cues** - Native audio generation with ambient sounds/dialogue

## Development

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Run tests
pnpm test

# Deploy
pnpm deploy
```

## Environment Variables

```bash
GOOGLE_API_KEY=your-google-api-key
```

## Database Schema

```sql
CREATE TABLE veo_videos (
  id TEXT PRIMARY KEY,
  prompt TEXT NOT NULL,
  aspect_ratio TEXT NOT NULL,
  status TEXT NOT NULL,
  video_url TEXT,
  r2_key TEXT,
  error TEXT,
  created_at TEXT NOT NULL,
  completed_at TEXT,
  metadata TEXT
);
```

## Configuration

The service is configured in `wrangler.jsonc`:

- **R2 Bucket** - `veo-videos` for video storage
- **Database** - Binds to `db` service
- **Domain** - `veo.services.do/*`

## TODO

- [ ] Implement actual Google Veo 3 API integration
- [ ] Add retry logic for failed generations
- [ ] Add webhook notifications for completion
- [ ] Add queue-based processing for scalability
- [ ] Add MCP tools for AI agent integration
- [ ] Add video thumbnail generation
- [ ] Add video transcription/metadata extraction
