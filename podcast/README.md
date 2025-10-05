# podcast

# Podcast AI Generation Service

Multi-speaker dialogue and long-form audio content generation using OpenAI TTS, ElevenLabs, and Google Cloud TTS.

## Overview

The Podcast service orchestrates AI-powered multi-speaker audio generation for various formats including educational content, interviews, debates, news discussions, and storytelling. It coordinates voice generation across multiple providers, assembles dialogue segments, and manages the complete podcast lifecycle from request to final audio delivery.

## Features

- ✅ **Multi-Speaker Support** - Generate podcasts with 1-10 different speakers
- ✅ **Multiple Formats** - Deep dives, interviews, debates, news discussions, storytelling
- ✅ **Provider Flexibility** - Mix and match voices from OpenAI, ElevenLabs, and Google Cloud
- ✅ **Emotion Control** - Specify emotion and pause timing for each dialogue line
- ✅ **Background Music** - Optional background music integration
- ✅ **R2 Storage** - Automatic upload to Cloudflare R2 with organized structure
- ✅ **Database Tracking** - Full lifecycle tracking (pending → processing → completed)
- ✅ **RPC Interface** - Service-to-service communication support
- ✅ **Batch Generation** - Generate multiple podcasts efficiently
- ✅ **Template System** - Pre-built podcast templates for common formats
- ✅ **Observability** - Tail consumers for monitoring and analytics

## Podcast Formats

| Format | Description | Use Cases |
|--------|-------------|-----------|
| **deep-dive** | Educational exploration of a topic | Course content, technical tutorials |
| **interview** | Q&A with a guest expert | Business interviews, expert insights |
| **debate** | Discussion with opposing viewpoints | Product reviews, policy discussions |
| **news-discussion** | News analysis and commentary | Tech news, industry updates |
| **storytelling** | Narrative with characters | Audio drama, branded content |

## Architecture

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ POST /generate
       ▼
┌─────────────────┐
│ Podcast Service │ ◄── Validate and save to DB_SERVICE
│  (HTTP Handler) │     Create podcast record (pending)
└────────┬────────┘
         │ Background processing
         │
         ├── For each dialogue line:
         │   ├── Call VOICE_SERVICE.generateVoice()
         │   ├── Wait for voice generation
         │   └── Add pause if specified
         │
         ├── Concatenate audio segments
         ├── Add background music (optional)
         ├── Save to R2 (AUDIO bucket)
         └── Update DB status (completed)
```

**Service Dependencies:**
- **Voice Service** (binding: `VOICE`) - Generates individual voice segments
- **Database Service** (binding: `DB`) - Stores podcast metadata and status
- **R2 Bucket** (binding: `AUDIO`) - Stores final audio files
- **Pipeline** (tail consumer) - Observability and logging

## API

### RPC Methods

The service exports a `PodcastService` class that can be called via RPC:

```ts
// Generate a podcast episode
const result = await env.PODCAST.generatePodcast({
  title: 'AI in Software Development',
  format: 'news-discussion',
  topic: 'Latest AI developments and their impact',
  speakers: [
    {
      id: 'host1',
      name: 'Alex',
      role: 'host',
      provider: 'openai',
      voice: 'onyx',
      description: 'Tech podcast host'
    },
    {
      id: 'expert1',
      name: 'Dr. Sarah Chen',
      role: 'expert',
      provider: 'elevenlabs',
      voice: 'rachel',
      description: 'AI researcher'
    }
  ],
  dialogue: [
    {
      speaker: 'host1',
      text: 'Welcome to Tech Frontiers! Today we're discussing AI...',
      emotion: 'enthusiastic'
    },
    {
      speaker: 'expert1',
      text: 'Thanks for having me, Alex.',
      emotion: 'warm',
      pause: 0.5
    }
  ],
  duration: 30,
  backgroundMusic: false
})

// Generate batch of podcasts
const batch = await env.PODCAST.generateBatch({
  podcasts: [request1, request2, request3]
})

// Generate test batch (using built-in templates)
const testBatch = await env.PODCAST.generateTestBatch()

// Get podcast by ID
const podcast = await env.PODCAST.getPodcast('01HQRS9WXYZ...')
```

### HTTP Endpoints

#### `POST /generate`

Generate a podcast episode.

**Request:**
```json
{
  "title": "My Podcast",
  "format": "interview",
  "topic": "Building successful startups",
  "speakers": [
    {
      "id": "host1",
      "name": "Jordan",
      "role": "host",
      "provider": "openai",
      "voice": "nova",
      "description": "Business podcast host"
    },
    {
      "id": "guest1",
      "name": "Marcus Williams",
      "role": "guest",
      "provider": "google",
      "voice": "en-US-Neural2-D",
      "description": "SaaS founder"
    }
  ],
  "dialogue": [
    {
      "speaker": "host1",
      "text": "Welcome to Founder Stories...",
      "emotion": "professional"
    },
    {
      "speaker": "guest1",
      "text": "Thanks for having me.",
      "emotion": "humble",
      "pause": 0.5
    }
  ],
  "duration": 30,
  "backgroundMusic": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "01HQRS9WXYZ...",
    "status": "pending",
    "title": "My Podcast",
    "format": "interview",
    "speakers": [...],
    "createdAt": "2025-10-04T00:00:00Z"
  }
}
```

#### `POST /generate/batch`

Generate multiple podcasts in a batch.

**Request:**
```json
{
  "podcasts": [
    { "title": "Podcast 1", "format": "interview", ... },
    { "title": "Podcast 2", "format": "deep-dive", ... }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "batchId": "01HQRS9...",
    "podcasts": [...],
    "total": 2
  }
}
```

#### `POST /generate/test`

Generate a test batch using built-in templates.

**Response:**
```json
{
  "success": true,
  "data": {
    "batchId": "01HQRS9...",
    "podcasts": [
      {
        "id": "01HQRS9A...",
        "title": "Tech News Discussion",
        "format": "news-discussion",
        "status": "pending"
      },
      {
        "id": "01HQRS9B...",
        "title": "Business Interview",
        "format": "interview",
        "status": "pending"
      }
    ],
    "total": 5
  }
}
```

#### `GET /:id`

Get podcast status and details.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "01HQRS9WXYZ...",
    "status": "completed",
    "title": "My Podcast",
    "format": "interview",
    "speakers": [...],
    "audioUrl": "https://podcast-audio.do/podcast/2025/10/01HQRS9WXYZ....mp3",
    "r2Key": "podcast/2025/10/01HQRS9WXYZ....mp3",
    "duration": 1847,
    "createdAt": "2025-10-04T00:00:00Z",
    "completedAt": "2025-10-04T00:05:23Z"
  }
}
```

#### `GET /templates`

List available podcast templates.

**Response:**
```json
{
  "success": true,
  "data": {
    "templates": [
      {
        "name": "Tech News Discussion",
        "format": "news-discussion",
        "topic": "Latest AI developments and their impact",
        "speakerCount": 2,
        "dialogueLines": 8
      },
      {
        "name": "Business Interview",
        "format": "interview",
        "topic": "Building a successful SaaS startup",
        "speakerCount": 2,
        "dialogueLines": 8
      }
    ],
    "total": 5
  }
}
```

## Voice Provider Options

### OpenAI Voices
- `alloy` - Neutral, versatile
- `echo` - Clear, professional
- `fable` - Expressive, storytelling
- `onyx` - Deep, authoritative
- `nova` - Warm, engaging
- `shimmer` - Bright, friendly

### ElevenLabs Voices
- `rachel` - Professional female
- `clyde` - Professional male
- `domi` - Warm female
- `dave` - Casual male
- `fin` - Young male
- `sarah` - Confident female
- `antoni` - Gentle male
- `thomas` - Authoritative male
- `charlie` - Natural male
- `emily` - Friendly female

### Google Cloud Voices
- `en-US-Neural2-A` - Male, casual
- `en-US-Neural2-C` - Female, professional
- `en-US-Neural2-D` - Male, authoritative
- `en-US-Neural2-E` - Female, warm
- `en-US-Neural2-F` - Female, bright
- `en-US-Neural2-G` - Female, clear
- `en-US-Neural2-H` - Female, expressive
- `en-US-Neural2-I` - Male, deep
- `en-US-Neural2-J` - Male, aged

## Dialogue Configuration

### Basic Dialogue Line
```ts
{
  speaker: 'host1',  // Speaker ID from speakers array
  text: 'Welcome to our show!',
}
```

### With Emotion
```ts
{
  speaker: 'guest1',
  text: 'I'm excited to share this with you.',
  emotion: 'enthusiastic'
}
```

### With Pause
```ts
{
  speaker: 'narrator',
  text: 'And then, everything changed.',
  pause: 1.5  // 1.5 seconds pause before this line
}
```

## Built-in Templates

The service includes 5 diverse podcast templates:

1. **Tech News Discussion** - AI developments with host and expert
2. **Business Interview** - SaaS founder success story
3. **Educational Deep Dive** - Quantum computing explained
4. **Story Podcast** - The last lighthouse keeper (narrative)
5. **Product Review Discussion** - Smart home debate with moderator and panelists

Access templates via `GET /templates` or use test batch generation.

## Database Schema

Podcasts are stored in the `podcasts` table:

```sql
CREATE TABLE IF NOT EXISTS podcasts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  format TEXT NOT NULL,
  topic TEXT,
  speakers TEXT NOT NULL, -- JSON array
  dialogue TEXT NOT NULL, -- JSON array
  status TEXT NOT NULL DEFAULT 'pending',
  audio_url TEXT,
  r2_key TEXT,
  duration INTEGER, -- seconds
  error TEXT,
  created_at TEXT NOT NULL,
  completed_at TEXT,
  metadata TEXT -- JSON object
);

CREATE INDEX IF NOT EXISTS idx_podcasts_status ON podcasts(status);
CREATE INDEX IF NOT EXISTS idx_podcasts_created_at ON podcasts(created_at);
CREATE INDEX IF NOT EXISTS idx_podcasts_format ON podcasts(format);
```

## R2 Storage Structure

Audio files are organized by date:

```
podcast-audio/
├── podcast/
│   ├── 2025/
│   │   ├── 01/
│   │   │   ├── 01HQRS9A....mp3
│   │   │   ├── 01HQRS9B....mp3
│   │   │   └── ...
│   │   ├── 02/
│   │   └── ...
│   └── ...
```

## Processing Workflow

1. **Request Validation** - Validate podcast structure using Zod schemas
2. **Database Insert** - Create record with `pending` status
3. **Background Processing** (via `waitUntil`):
   - Update status to `processing`
   - Generate voice segments for each dialogue line
   - Add pauses between lines
   - Concatenate audio segments
   - Add background music (if requested)
   - Save final audio to R2
   - Update database with `completed` status and audio URL
4. **Error Handling** - Update status to `failed` with error message

## Best Practices

### Speaker Configuration
- Use 1-3 speakers for clarity (max 10 supported)
- Mix voice providers for variety
- Match voice characteristics to roles (authoritative for expert, warm for host)

### Dialogue Writing
- Keep individual lines under 500 characters
- Use natural conversational flow
- Add pauses for dramatic effect or transitions
- Specify emotions sparingly (only when it changes the delivery)

### Audio Quality
- Keep total duration under 180 minutes
- Use background music sparingly (it can distract)
- Test different voice combinations before production

### Performance
- Batch similar requests to optimize provider API usage
- Use test batch endpoint to validate before production
- Monitor R2 storage usage for large podcast libraries

## Limitations

- Maximum 10 speakers per episode
- Maximum 500 dialogue lines per episode
- Maximum 180 minutes duration
- Individual dialogue lines limited to 5000 characters
- Processing time varies by length (typically 1-2x real-time)

## Error Handling

The service handles these error scenarios:

- **Invalid speakers** - Returns 400 with validation error
- **Voice generation failure** - Retries up to 3 times, then fails
- **R2 upload failure** - Retries with exponential backoff
- **Database error** - Logs error, returns 500
- **Timeout** - Voice generation waits max 1 minute per segment

Check podcast status via `GET /:id` to see detailed error messages.

## Monitoring

Track podcast generation metrics via tail consumers:

- Generation success rate by format
- Average processing time per minute of audio
- Voice provider distribution
- Storage usage trends
- Failed generation reasons

## Implementation

### Types (Documentation)

```ts
/**
 * Type definitions for Podcast AI generation service
 */

export type PodcastFormat = 'deep-dive' | 'interview' | 'debate' | 'news-discussion' | 'storytelling'
export type SpeakerRole = 'host' | 'guest' | 'narrator' | 'character' | 'expert'

export interface Env {
  AUDIO: R2Bucket
  DB: any
  VOICE: any // Voice service binding
  OPENAI_API_KEY: string
  ELEVENLABS_API_KEY: string
  GOOGLE_CLOUD_API_KEY: string
  pipeline: any
  do: any
}

export interface Speaker {
  id: string
  name: string
  role: SpeakerRole
  provider: 'openai' | 'elevenlabs' | 'google'
  voice: string
  description?: string
}

export interface DialogueLine {
  speaker: string // speaker id
  text: string
  emotion?: string
  pause?: number // seconds before this line
}

export interface PodcastGenerationRequest {
  title: string
  format: PodcastFormat
  topic?: string
  speakers: Speaker[]
  dialogue: DialogueLine[]
  duration?: number // target duration in minutes
  backgroundMusic?: boolean
  metadata?: Record<string, any>
}

export interface PodcastGenerationResponse {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  title: string
  format: PodcastFormat
  speakers: Speaker[]
  audioUrl?: string
  r2Key?: string
  duration?: number // actual duration in seconds
  error?: string
  createdAt: string
  completedAt?: string
  metadata?: Record<string, any>
}

export interface PodcastRecord {
  id: string
  title: string
  format: string
  topic: string | null
  speakers: string // JSON
  dialogue: string // JSON
  status: string
  audioUrl: string | null
  r2Key: string | null
  duration: number | null
  error: string | null
  createdAt: string
  completedAt: string | null
  metadata: string | null
}

export interface PodcastTemplate {
  name: string
  format: PodcastFormat
  topic: string
  speakers: Speaker[]
  dialogue: DialogueLine[]
}
```

### Validation Schemas (Documentation)

```ts
/**
 * Zod validation schemas for Podcast AI generation
 */

import { z } from 'zod'

export const formatSchema = z.enum(['deep-dive', 'interview', 'debate', 'news-discussion', 'storytelling'])
export const roleSchema = z.enum(['host', 'guest', 'narrator', 'character', 'expert'])

export const speakerSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: roleSchema,
  provider: z.enum(['openai', 'elevenlabs', 'google']),
  voice: z.string(),
  description: z.string().optional(),
})

export const dialogueLineSchema = z.object({
  speaker: z.string(),
  text: z.string().min(1).max(5000),
  emotion: z.string().optional(),
  pause: z.number().min(0).max(10).optional(),
})

export const podcastGenerationRequestSchema = z.object({
  title: z.string().min(1).max(200),
  format: formatSchema,
  topic: z.string().max(500).optional(),
  speakers: z.array(speakerSchema).min(1).max(10),
  dialogue: z.array(dialogueLineSchema).min(1).max(500),
  duration: z.number().min(1).max(180).optional(),
  backgroundMusic: z.boolean().optional(),
  metadata: z.record(z.any()).optional(),
})
```

### Main Service (Implementation)



## Usage Examples

### Generate Tech News Podcast

```bash
curl -X POST https://podcast.services.do/generate \
  -H "Content-Type: application/json" \
  -d '{
    "title": "AI in Software Development",
    "format": "news-discussion",
    "topic": "Latest AI developments and their impact",
    "speakers": [
      {
        "id": "host1",
        "name": "Alex",
        "role": "host",
        "provider": "openai",
        "voice": "onyx",
        "description": "Tech podcast host"
      },
      {
        "id": "expert1",
        "name": "Dr. Sarah Chen",
        "role": "expert",
        "provider": "elevenlabs",
        "voice": "rachel",
        "description": "AI researcher"
      }
    ],
    "dialogue": [
      {
        "speaker": "host1",
        "text": "Welcome back to Tech Frontiers! Today we'\''re diving deep into the latest AI developments.",
        "emotion": "enthusiastic"
      },
      {
        "speaker": "host1",
        "text": "Joining me is Dr. Sarah Chen. Sarah, thanks for being here!",
        "pause": 0.5
      },
      {
        "speaker": "expert1",
        "text": "Thanks for having me, Alex.",
        "emotion": "warm"
      }
    ]
  }'
```

### Generate Test Batch

```bash
curl -X POST https://podcast.services.do/generate/test
```

### Check Podcast Status

```bash
curl https://podcast.services.do/01HQRS9WXYZ...
```

### List Templates

```bash
curl https://podcast.services.do/templates
```

## Development

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Type check
pnpm typecheck

# Run tests
pnpm test

# Deploy to production
pnpm deploy
```

## Related Services

- **voice/** - Single voice generation (used internally)
- **veo/** - Video generation service
- **imagen/** - Image generation service

## Tech Stack

- **Hono** - Fast web framework
- **Workers AI** - Multi-provider voice generation
- **R2** - Audio file storage
- **RPC** - Service-to-service communication
- **Zod** - Runtime validation
- **ULID** - Sortable unique IDs
- **TypeScript** - Type-safe development

---

**Generated from:** podcast.mdx

**Build command:** `tsx scripts/build-mdx-worker.ts podcast.mdx`

---

**Generated from:** podcast.mdx

**Build command:** `tsx scripts/build-mdx-worker.ts podcast.mdx`
