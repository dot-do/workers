# Voice AI Generation Service

Professional voiceovers and TTS using OpenAI, ElevenLabs, and Google Cloud.

## Features

- **Multi-Provider Support** - OpenAI TTS, ElevenLabs, Google Cloud TTS
- **6+ OpenAI Voices** - Alloy, Echo, Fable, Onyx, Nova, Shimmer
- **Steerable TTS** - Control emotion, style, tone with OpenAI gpt-4o-mini-tts
- **SSML Support** - Advanced control with Google Cloud TTS
- **Professional Quality** - TTS-1 (real-time) and TTS-1-HD (high quality)
- **R2 Storage** - Automatic upload and hosting of generated audio
- **Multi-Format** - MP3, WAV, Opus, AAC, FLAC
- **50+ Languages** - Multilingual support across providers
- **Database Tracking** - Track status, metadata, and URLs

## Supported Providers

### OpenAI TTS
- **Models**: tts-1 (real-time), tts-1-hd (quality), gpt-4o-mini-tts (steerable)
- **Voices**: alloy, echo, fable, onyx, nova, shimmer
- **Features**: Speed control (0.25-4.0x), steerable emotions/styles
- **Best for**: Fast generation, conversational AI, real-time applications

### ElevenLabs
- **Models**: eleven_multilingual_v2, eleven_turbo_v2, eleven_flash_v2
- **Voices**: 1000+ voices including voice cloning
- **Features**: 29 languages, 75ms latency, professional voice clones
- **Best for**: Audiobooks, podcasts, professional voiceovers

### Google Cloud TTS
- **Voices**: Neural2, Studio, Chirp 3 HD
- **Features**: SSML support, precise prosody control
- **Best for**: IVR systems, assistants, multilingual content

## API Endpoints

### Generate Single Voiceover

```bash
POST /generate
```

```json
{
  "text": "Welcome to our platform...",
  "provider": "openai",
  "voice": "onyx",
  "model": "tts-1-hd",
  "format": "mp3",
  "speed": 1.0,
  "emotion": "confident and authoritative",
  "style": "professional",
  "metadata": {
    "campaign": "product-demo"
  }
}
```

### Generate Batch

```bash
POST /generate/batch
```

```json
{
  "voices": [
    {
      "text": "...",
      "provider": "openai",
      "voice": "nova"
    },
    {
      "text": "...",
      "provider": "elevenlabs",
      "voice": "rachel"
    }
  ]
}
```

### Generate Test Batch

```bash
POST /generate/test
```

Generates 5 voiceovers using pre-built prompts:
- Professional business narration (OpenAI Onyx)
- Educational explainer (ElevenLabs Rachel)
- Podcast intro (OpenAI Nova)
- Audiobook excerpt (ElevenLabs Sarah)
- Customer service greeting (Google Neural2-C)

### Get Voice Status

```bash
GET /voices/:id
```

### List Available Voices

```bash
GET /voices?provider=openai
```

### List Prompt Templates

```bash
GET /prompts
```

## RPC Interface

```typescript
const voiceService = env.VOICE_SERVICE

// Generate voiceover
const voice = await voiceService.generateVoice({
  text: 'Hello world',
  provider: 'openai',
  voice: 'alloy',
})

// Generate batch
const batch = await voiceService.generateBatch({
  voices: [...]
})

// Generate test batch
const test = await voiceService.generateTestBatch()

// Get voice
const voice = await voiceService.getVoice('01HXYZ...')
```

## Best Practices

### Text Preparation
- Use clear, well-structured sentences
- Add pauses with punctuation (periods, commas)
- Spell out acronyms phonetically if needed
- Break long text into shorter segments

### OpenAI TTS
- Use `tts-1` for real-time applications (low latency)
- Use `tts-1-hd` for quality (audiobooks, podcasts)
- Use `gpt-4o-mini-tts` with instructions for steerable emotions
- Speed range: 0.25x to 4.0x (1.0 is normal)

### ElevenLabs
- Use `eleven_flash_v2` for lowest latency (75ms)
- Use `eleven_multilingual_v2` for quality
- Adjust voice settings (stability, clarity, style exaggeration)
- Use Professional Voice Clones (PVC) for highest quality

### Google Cloud TTS
- Use SSML for advanced control (pauses, emphasis, pitch)
- Use Studio voices for highest quality
- Use Neural2 for balanced quality/performance
- Specify language code for non-English content

## SSML Examples

### Pauses and Emphasis

```xml
<speak>
  Welcome to our service.
  <break time="1s"/>
  <emphasis level="strong">This is important!</emphasis>
</speak>
```

### Prosody Control

```xml
<speak>
  <prosody rate="slow" pitch="+2st">
    Speak slowly with higher pitch
  </prosody>
</speak>
```

### Say-As (Numbers, Dates)

```xml
<speak>
  <say-as interpret-as="cardinal">12345</say-as>
  <say-as interpret-as="date" format="mdy">10/3/2025</say-as>
</speak>
```

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
OPENAI_API_KEY=sk-...
ELEVENLABS_API_KEY=...
GOOGLE_CLOUD_API_KEY=...
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
```

## Use Cases

### Business & Marketing
- Product demos and explainer videos
- Corporate training and e-learning
- Marketing videos and commercials
- Brand voice consistency

### Media & Entertainment
- Audiobook narration
- Podcast production
- Character voices for animation
- Documentary narration

### Customer Service
- IVR systems and phone menus
- Automated customer support
- Chatbot voices
- Welcome messages

### Education
- Online courses and tutorials
- Language learning
- Accessibility (text-to-speech for visually impaired)
- Educational videos

## Comparison with Other Services

| Feature | Voice (Audio) | Veo (Video) | Imagen (Image) |
|---------|---------------|-------------|----------------|
| **Output** | MP3/WAV audio | MP4 videos | PNG/JPEG images |
| **Providers** | OpenAI, ElevenLabs, Google | Google Veo 3 | Google Imagen 3, DALL-E 3 |
| **Generation Time** | 1-5 seconds | 30-60 seconds | 5-15 seconds |
| **Storage** | ~1-5 MB per minute | ~50-200 MB per video | ~1-5 MB per image |
| **Best for** | Voiceovers, podcasts, IVR | Marketing videos, demos | Social media, ads |

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
