# Podcast AI Generation Service

Multi-speaker dialogue and long-form audio content generation using OpenAI TTS, ElevenLabs, and Google Cloud TTS.

## Features

- **Multi-Speaker Support**: Generate podcasts with 1-10 different speakers
- **Multiple Formats**: Deep dives, interviews, debates, news discussions, storytelling
- **Provider Flexibility**: Mix and match voices from OpenAI, ElevenLabs, and Google Cloud
- **Emotion Control**: Specify emotion and pause timing for each dialogue line
- **Background Music**: Optional background music integration
- **R2 Storage**: Automatic upload to Cloudflare R2
- **Database Tracking**: Full lifecycle tracking (pending → processing → completed)

## Podcast Formats

| Format | Description | Use Cases |
|--------|-------------|-----------|
| **deep-dive** | Educational exploration of a topic | Course content, technical tutorials |
| **interview** | Q&A with a guest expert | Business interviews, expert insights |
| **debate** | Discussion with opposing viewpoints | Product reviews, policy discussions |
| **news-discussion** | News analysis and commentary | Tech news, industry updates |
| **storytelling** | Narrative with characters | Audio drama, branded content |

## API Reference

### RPC Methods

```typescript
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
```

### HTTP Endpoints

**Generate Podcast:**
```bash
curl -X POST https://podcast.services.do/generate \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My Podcast",
    "format": "interview",
    "speakers": [...],
    "dialogue": [...]
  }'
```

**Generate Test Batch:**
```bash
curl -X POST https://podcast.services.do/generate/test
```

**Get Podcast Status:**
```bash
curl https://podcast.services.do/{id}
```

**List Templates:**
```bash
curl https://podcast.services.do/templates
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
```typescript
{
  speaker: 'host1',  // Speaker ID from speakers array
  text: 'Welcome to our show!',
}
```

### With Emotion
```typescript
{
  speaker: 'guest1',
  text: 'I'm excited to share this with you.',
  emotion: 'enthusiastic'
}
```

### With Pause
```typescript
{
  speaker: 'narrator',
  text: 'And then, everything changed.',
  pause: 1.5  // 1.5 seconds pause before this line
}
```

## Prompt Templates

The service includes 5 diverse podcast templates:

1. **Tech News Discussion** - AI developments with host and expert
2. **Business Interview** - SaaS founder success story
3. **Educational Deep Dive** - Quantum computing explained
4. **Story Podcast** - The last lighthouse keeper (narrative)
5. **Product Review Discussion** - Smart home debate with moderator and panelists

Access templates via:
```bash
curl https://podcast.services.do/templates
```

## Development

### Install Dependencies
```bash
pnpm install
```

### Run Dev Server
```bash
pnpm dev
```

### Run Tests
```bash
pnpm test
```

### Deploy
```bash
pnpm deploy
```

## Architecture

The podcast service orchestrates multi-speaker audio generation:

1. **Request Processing**: Validates podcast structure and speakers
2. **Voice Generation**: Calls voice service for each dialogue line
3. **Audio Assembly**: Concatenates voice segments with pauses
4. **Background Music**: Optionally mixes in background audio
5. **R2 Upload**: Stores final MP3 file
6. **Database Tracking**: Updates status throughout lifecycle

### Service Dependencies

- **Voice Service** (binding: `VOICE`): Generates individual voice segments
- **Database Service** (binding: `DB`): Stores podcast metadata
- **R2 Bucket** (binding: `AUDIO`): Stores final audio files

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

## Examples

See `src/prompts.ts` for complete template examples including:
- Multi-speaker news discussions
- Business interviews
- Educational deep dives
- Narrative storytelling
- Debate formats

## Error Handling

The service handles these error scenarios:

- **Invalid speakers**: Returns 400 with validation error
- **Voice generation failure**: Retries up to 3 times, then fails
- **R2 upload failure**: Retries with exponential backoff
- **Database error**: Logs error, returns 500

Check podcast status via `/podcasts/{id}` to see detailed error messages.

## Monitoring

Track podcast generation metrics:

- Generation success rate by format
- Average processing time per minute of audio
- Voice provider distribution
- Storage usage trends
- Failed generation reasons

## Related Services

- **voice/** - Single voice generation (used internally)
- **veo/** - Video generation service
- **imagen/** - Image generation service

---

**Version:** 1.0.0
**Last Updated:** 2025-10-03
**Maintainer:** Claude Code
