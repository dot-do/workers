# voice

# Voice AI Generation Service

**Professional voiceovers and text-to-speech (TTS) using OpenAI, ElevenLabs, and Google Cloud**

The Voice service is a multi-provider TTS microservice that generates high-quality voiceovers for various use cases including business narration, educational content, podcasts, audiobooks, and IVR systems. It supports 3 major TTS providers, 50+ languages, and multiple audio formats with automatic R2 storage and database tracking.

## Features

### Multi-Provider Support
- **OpenAI TTS** - Fast, natural voices with steerable emotions
- **ElevenLabs** - Professional voice cloning and multilingual support
- **Google Cloud TTS** - SSML support with precise prosody control

### Voice Options
- **6+ OpenAI Voices** - Alloy, Echo, Fable, Onyx, Nova, Shimmer
- **1000+ ElevenLabs Voices** - Including voice cloning
- **100+ Google Voices** - Neural2, Studio, Chirp 3 HD

### Advanced Features
- **Steerable TTS** - Control emotion, style, tone with OpenAI gpt-4o-mini-tts
- **SSML Support** - Advanced prosody control with Google Cloud TTS
- **Professional Quality** - TTS-1 (real-time) and TTS-1-HD (high quality)
- **Multi-Format** - MP3, WAV, Opus, AAC, FLAC
- **50+ Languages** - Multilingual support across all providers
- **R2 Storage** - Automatic upload and hosting of generated audio
- **Database Tracking** - Track status, metadata, URLs, and errors
- **Batch Processing** - Generate multiple voiceovers in one request

## Architecture

```
┌─────────────────┐
│  Voice Service  │
│   (RPC + HTTP)  │
└────────┬────────┘
         │
         ├─────────┐
         │         │
         ▼         ▼
    ┌────────┐ ┌────────┐
    │   DB   │ │   R2   │
    │Service │ │ Audio  │
    └────────┘ └────────┘
         │
         ▼
   ┌──────────┐
   │ Provider │
   │   APIs   │
   └──────────┘
         │
    ┌────┴────┬───────────┐
    ▼         ▼           ▼
┌────────┐ ┌──────────┐ ┌────────┐
│ OpenAI │ │ElevenLabs│ │ Google │
│  TTS   │ │   TTS    │ │  TTS   │
└────────┘ └──────────┘ └────────┘
```

## API Reference

### HTTP Endpoints

#### Health Check
```bash
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "service": "voice",
  "version": "1.0.0"
}
```

#### Generate Single Voiceover
```bash
POST /generate
```

**Request Body:**
```json
{
  "text": "Welcome to our platform. Transform your business with AI.",
  "provider": "openai",
  "voice": "onyx",
  "model": "tts-1-hd",
  "format": "mp3",
  "speed": 1.0,
  "emotion": "confident and authoritative",
  "style": "professional",
  "metadata": {
    "campaign": "product-demo",
    "version": "v2"
  }
}
```

**Response:**
```json
{
  "id": "01HXYZ...",
  "status": "pending",
  "text": "Welcome to our platform...",
  "provider": "openai",
  "voice": "onyx",
  "createdAt": "2025-10-04T12:00:00Z",
  "metadata": {
    "campaign": "product-demo",
    "version": "v2"
  }
}
```

#### Generate Batch
```bash
POST /generate/batch
```

**Request Body:**
```json
{
  "voices": [
    {
      "text": "Welcome to episode 1...",
      "provider": "openai",
      "voice": "nova"
    },
    {
      "text": "This is a professional narration...",
      "provider": "elevenlabs",
      "voice": "rachel"
    }
  ],
  "metadata": {
    "project": "podcast-series",
    "season": 1
  }
}
```

**Response:**
```json
{
  "batchId": "01HXYZ...",
  "voices": [...],
  "total": 2,
  "pending": 2,
  "completed": 0,
  "failed": 0
}
```

#### Generate Test Batch
```bash
POST /generate/test
```

Generates 5 voiceovers using pre-built prompts:
- Professional business narration (OpenAI Onyx)
- Educational explainer (ElevenLabs Rachel)
- Podcast intro (OpenAI Nova)
- Audiobook excerpt (ElevenLabs Sarah)
- Customer service greeting (Google Neural2-C)

**Response:**
```json
{
  "batchId": "01HXYZ...",
  "voices": [...],
  "total": 5,
  "pending": 5,
  "completed": 0,
  "failed": 0
}
```

#### Get Voice Status
```bash
GET /voices/:id
```

**Response:**
```json
{
  "id": "01HXYZ...",
  "status": "completed",
  "text": "Welcome to our platform...",
  "provider": "openai",
  "voice": "onyx",
  "audioUrl": "https://audio.services.do/voice/2025/10/01HXYZ.mp3",
  "r2Key": "voice/2025/10/01HXYZ.mp3",
  "duration": 8.5,
  "createdAt": "2025-10-04T12:00:00Z",
  "completedAt": "2025-10-04T12:00:05Z",
  "metadata": {
    "campaign": "product-demo"
  }
}
```

#### List Available Voices
```bash
GET /voices?provider=openai
```

**Query Parameters:**
- `provider` - Filter by provider: `openai`, `elevenlabs`, `google`, or `all`

**Response:**
```json
[
  {
    "id": "alloy",
    "name": "Alloy",
    "description": "Neutral and balanced"
  },
  {
    "id": "echo",
    "name": "Echo",
    "description": "Warm and inclusive"
  }
]
```

#### List Prompt Templates
```bash
GET /prompts
```

**Response:**
```json
[
  {
    "template": {
      "name": "Professional Business Narration",
      "useCase": "Corporate video, product demo, explainer video",
      "text": "...",
      "provider": "openai",
      "voice": "onyx"
    },
    "config": {
      "text": "...",
      "provider": "openai",
      "voice": "onyx",
      "style": "professional",
      "emotion": "confident and authoritative"
    }
  }
]
```

### RPC Interface



## Provider Comparison

| Provider | Models | Voices | Languages | Latency | Best For |
|----------|--------|--------|-----------|---------|----------|
| **OpenAI** | tts-1, tts-1-hd, gpt-4o-mini-tts | 6 voices | 50+ | ~1-2s | Fast generation, conversational AI, real-time |
| **ElevenLabs** | eleven_multilingual_v2, eleven_turbo_v2, eleven_flash_v2 | 1000+ voices | 29 | ~75ms | Audiobooks, podcasts, voice cloning |
| **Google** | Neural2, Studio, Chirp 3 HD | 100+ voices | 40+ | ~2-3s | IVR systems, assistants, SSML control |

### OpenAI TTS

**Models:**
- `tts-1` - Real-time, optimized for speed (~1s latency)
- `tts-1-hd` - High definition, optimized for quality (~2s latency)
- `gpt-4o-mini-tts` - Steerable emotions and styles

**Voices:**
- `alloy` - Neutral and balanced
- `echo` - Warm and inclusive
- `fable` - Expressive and dynamic
- `onyx` - Deep and authoritative
- `nova` - Bright and energetic
- `shimmer` - Soft and soothing

**Features:**
- Speed control: 0.25x to 4.0x (1.0 is normal)
- Steerable emotions with gpt-4o-mini-tts
- Multiple audio formats
- Multilingual support

**Best Practices:**
- Use `tts-1` for real-time applications (chatbots, assistants)
- Use `tts-1-hd` for quality (audiobooks, podcasts, videos)
- Use `gpt-4o-mini-tts` with `emotion` and `style` parameters for steerable TTS

### ElevenLabs

**Models:**
- `eleven_multilingual_v2` - High quality, 29 languages
- `eleven_turbo_v2` - Fast, optimized for latency
- `eleven_flash_v2` - Ultra-fast, 75ms latency

**Features:**
- Professional Voice Clones (PVC)
- Voice design and voice cloning
- 29 languages
- Voice settings: stability, clarity, style exaggeration
- Speaker boost for quality

**Best Practices:**
- Use `eleven_flash_v2` for real-time applications
- Use `eleven_multilingual_v2` for quality
- Adjust voice settings for fine control
- Use Professional Voice Clones for highest quality

### Google Cloud TTS

**Voices:**
- Neural2 - Balanced quality/performance
- Studio - Highest quality
- Chirp 3 HD - Latest model, best naturalness

**Features:**
- SSML support (pauses, emphasis, prosody)
- Precise pitch and speed control
- Say-as for numbers, dates, currencies
- Multiple audio encodings

**Best Practices:**
- Use SSML for advanced control
- Use Studio voices for highest quality
- Use Neural2 for balanced quality/performance
- Specify language code for non-English content

## Usage Examples

### Basic Voice Generation

```ts
// Generate simple voiceover
const result = await fetch('https://voice.services.do/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: 'Hello, welcome to our service!',
    provider: 'openai',
    voice: 'alloy'
  })
})

const voice = await result.json()
console.log('Voice ID:', voice.id)
console.log('Status:', voice.status)

// Check status
const status = await fetch(`https://voice.services.do/voices/${voice.id}`)
const voiceData = await status.json()
console.log('Audio URL:', voiceData.audioUrl)
```

### Professional Narration

```ts
const result = await fetch('https://voice.services.do/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: 'Transform your business with AI-powered automation. Our platform streamlines workflows, eliminates repetitive tasks, and empowers teams to focus on innovation.',
    provider: 'openai',
    voice: 'onyx',
    model: 'tts-1-hd',
    emotion: 'confident and authoritative',
    style: 'professional',
    speed: 1.0,
    metadata: {
      campaign: 'product-demo',
      version: 'v2'
    }
  })
})
```

### Educational Content

```ts
const result = await fetch('https://voice.services.do/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: "Let's dive into machine learning! Imagine teaching a computer to recognize patterns. Today we'll explore supervised learning, unsupervised learning, and reinforcement learning.",
    provider: 'elevenlabs',
    voice: 'rachel',
    model: 'eleven_multilingual_v2',
    emotion: 'enthusiastic and engaging',
    style: 'educational'
  })
})
```

### Podcast Episode

```ts
const result = await fetch('https://voice.services.do/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: "Hey everyone, welcome back to Tech Horizons! I'm your host, and today we have an incredible episode. We'll discuss quantum computing breakthroughs and interview a pioneer in sustainable AI.",
    provider: 'openai',
    voice: 'nova',
    model: 'tts-1',
    emotion: 'warm and welcoming',
    style: 'conversational',
    speed: 1.05
  })
})
```

### IVR System

```ts
const result = await fetch('https://voice.services.do/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: 'Thank you for calling TechSupport. Press 1 for account inquiries. Press 2 for technical support. Press 3 to speak with a representative.',
    provider: 'google',
    voice: 'en-US-Neural2-C',
    ssml: true,
    speed: 0.95,
    metadata: {
      system: 'ivr',
      language: 'en-US'
    }
  })
})
```

### Batch Generation

```ts
const result = await fetch('https://voice.services.do/generate/batch', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    voices: [
      {
        text: 'Episode 1: Introduction to AI',
        provider: 'openai',
        voice: 'nova'
      },
      {
        text: 'Episode 2: Machine Learning Basics',
        provider: 'openai',
        voice: 'nova'
      },
      {
        text: 'Episode 3: Deep Learning',
        provider: 'openai',
        voice: 'nova'
      }
    ],
    metadata: {
      project: 'ai-course',
      season: 1
    }
  })
})

const batch = await result.json()
console.log('Batch ID:', batch.batchId)
console.log('Total:', batch.total)
```

## SSML Examples

SSML (Speech Synthesis Markup Language) provides advanced control over speech synthesis with Google Cloud TTS.

### Basic SSML Structure

```xml
<speak>
  Welcome to our service.
  <break time="1s"/>
  Let's get started!
</speak>
```

### Pauses and Emphasis

```xml
<speak>
  Welcome to our service.
  <break time="1s"/>
  <emphasis level="strong">This is very important!</emphasis>
  <break time="500ms"/>
  Thank you for your attention.
</speak>
```

### Prosody Control

```xml
<speak>
  <prosody rate="slow" pitch="+2st">
    Speak slowly with higher pitch
  </prosody>
  <break time="500ms"/>
  <prosody rate="fast" pitch="-2st">
    Speak quickly with lower pitch
  </prosody>
</speak>
```

### Say-As (Numbers, Dates, Currencies)

```xml
<speak>
  The total is <say-as interpret-as="cardinal">12345</say-as> dollars.
  <break time="500ms"/>
  The date is <say-as interpret-as="date" format="mdy">10/4/2025</say-as>.
  <break time="500ms"/>
  The price is <say-as interpret-as="currency">$99.99</say-as>.
</speak>
```

### Combined Example

```xml
<speak>
  Welcome to <emphasis level="strong">TechSupport Solutions</emphasis>.
  <break time="1s"/>
  Your account balance is <say-as interpret-as="currency">$1,234.56</say-as>.
  <break time="500ms"/>
  <prosody rate="slow">
    Please listen carefully to the following options.
  </prosody>
  <break time="1s"/>
  Press <say-as interpret-as="cardinal">1</say-as> for billing.
  <break time="500ms"/>
  Press <say-as interpret-as="cardinal">2</say-as> for support.
</speak>
```

## Database Schema

```sql
CREATE TABLE voice_generations (
  id TEXT PRIMARY KEY,
  text TEXT NOT NULL,
  provider TEXT NOT NULL,
  voice TEXT NOT NULL,
  model TEXT,
  format TEXT NOT NULL,
  status TEXT NOT NULL,
  audio_url TEXT,
  r2_key TEXT,
  duration REAL,
  error TEXT,
  created_at TEXT NOT NULL,
  completed_at TEXT,
  metadata TEXT
);

CREATE INDEX idx_voice_generations_status ON voice_generations(status);
CREATE INDEX idx_voice_generations_created_at ON voice_generations(created_at);
CREATE INDEX idx_voice_generations_provider ON voice_generations(provider);
```

## Use Cases

### Business & Marketing
- **Product Demos** - Professional narration for product demonstrations
- **Explainer Videos** - Clear explanations of services and features
- **Corporate Training** - E-learning courses and training materials
- **Marketing Videos** - Commercials and promotional content
- **Brand Voice** - Consistent voice across all brand content

### Media & Entertainment
- **Audiobook Narration** - Professional audiobook production
- **Podcast Production** - Intro/outro and episode content
- **Character Voices** - Animation and game character voices
- **Documentary Narration** - Documentary and film narration

### Customer Service
- **IVR Systems** - Phone menu systems and automated responses
- **Customer Support** - Automated support and FAQ responses
- **Chatbot Voices** - Voice-enabled chatbots
- **Welcome Messages** - Greeting messages and announcements

### Education
- **Online Courses** - Course narration and tutorials
- **Language Learning** - Pronunciation and conversation practice
- **Accessibility** - Text-to-speech for visually impaired users
- **Educational Videos** - Explainer videos and lectures

## Best Practices

### Text Preparation
- Use clear, well-structured sentences
- Add pauses with punctuation (periods, commas)
- Spell out acronyms phonetically if needed
- Break long text into shorter segments (< 10,000 characters)
- Use natural conversational flow

### Provider Selection
- **OpenAI** - Fast, natural, good for real-time applications
- **ElevenLabs** - Best quality, voice cloning, professional narration
- **Google** - SSML control, IVR systems, precise prosody

### Voice Selection
- Test multiple voices for your use case
- Match voice to content tone (professional, casual, warm, etc.)
- Consider gender, accent, and speaking style
- Use consistent voices for brand identity

### Quality Optimization
- Use HD models for final production
- Use standard models for testing/prototyping
- Adjust speed for pacing (0.9-1.1x usually optimal)
- Use SSML for precise control (Google only)
- Add pauses for natural flow

### Error Handling
- Check status endpoint for completion
- Implement retry logic for failed generations
- Handle rate limits appropriately
- Monitor R2 storage usage

## Comparison with Other Services

| Feature | Voice (Audio) | Veo (Video) | Imagen (Image) |
|---------|---------------|-------------|----------------|
| **Output** | MP3/WAV audio | MP4 videos | PNG/JPEG images |
| **Providers** | OpenAI, ElevenLabs, Google | Google Veo 3 | Google Imagen 3, DALL-E 3 |
| **Generation Time** | 1-5 seconds | 30-60 seconds | 5-15 seconds |
| **Storage** | ~1-5 MB per minute | ~50-200 MB per video | ~1-5 MB per image |
| **Best for** | Voiceovers, podcasts, IVR | Marketing videos, demos | Social media, ads |
| **Batch Support** | ✅ Yes | ✅ Yes | ✅ Yes |

## Development

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Run tests
pnpm test

# Type check
pnpm typecheck

# Deploy
pnpm deploy
```

## Environment Variables

```bash
# .dev.vars
OPENAI_API_KEY=sk-...
ELEVENLABS_API_KEY=...
GOOGLE_CLOUD_API_KEY=...
```

## Testing

```bash
# Health check
curl https://voice.services.do/health

# Generate test batch
curl -X POST https://voice.services.do/generate/test

# List available voices
curl https://voice.services.do/voices?provider=openai

# List prompt templates
curl https://voice.services.do/prompts

# Generate single voice
curl -X POST https://voice.services.do/generate \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello world",
    "provider": "openai",
    "voice": "alloy"
  }'

# Get voice status
curl https://voice.services.do/voices/01HXYZ...
```

## TODO

- [ ] Implement actual OpenAI TTS API integration
- [ ] Implement actual ElevenLabs API integration
- [ ] Implement actual Google Cloud TTS API integration
- [ ] Add audio duration calculation
- [ ] Add retry logic for failed generations
- [ ] Add webhook notifications for completion
- [ ] Add queue-based processing
- [ ] Add MCP tools for AI agent integration
- [ ] Add audio format conversion
- [ ] Add voice cloning support (ElevenLabs)
- [ ] Add SSML validation and builder UI
- [ ] Add streaming audio support
- [ ] Add rate limiting per provider
- [ ] Add cost tracking per provider

## Related Services

- **[email](/email)** - Transactional email with Resend
- **[imagen](/imagen)** - AI image generation
- **[veo](/veo)** - AI video generation
- **[podcast](/podcast)** - AI podcast generation
- **[db](/db)** - Database service
- **[gateway](/gateway)** - API gateway

---

**Service:** voice
**Version:** 1.0.0
**Status:** Experimental (TODO: API integrations)
**Domain:** voice.services.do

## Code

---

**Generated from:** voice.mdx

**Build command:** `tsx scripts/build-mdx-worker.ts voice.mdx`
