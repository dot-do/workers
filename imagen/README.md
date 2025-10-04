# Imagen AI Image Generation Service

AI image generation using Google Imagen 3 and OpenAI DALL-E 3 with R2 storage.

## Features

- **Dual Provider Support** - Google Imagen 3 and OpenAI DALL-E 3
- **R2 Storage** - Automatic upload and hosting of generated images
- **Batch Processing** - Generate multiple images simultaneously
- **Database Tracking** - Track status, metadata, and URLs for all images
- **Test Prompts** - 5 pre-built prompts covering diverse industries
- **Flexible Sizing** - Support for square, landscape, and portrait orientations

## Supported Providers

### Google Imagen 3
- State-of-the-art photorealism
- Multiple aspect ratios
- Negative prompts for precise control
- Fast generation times

### OpenAI DALL-E 3
- High quality and HD options
- Natural and vivid styles
- Excellent prompt understanding
- 1024x1024, 1792x1024, 1024x1792 sizes

## API Endpoints

### Generate Single Image

```bash
POST /generate
```

```json
{
  "prompt": "A surgeon examining holographic medical data...",
  "provider": "google-imagen",
  "size": "1024x1024",
  "quality": "hd",
  "style": "vivid",
  "negativePrompt": "cartoon, low quality",
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
      "provider": "google-imagen",
      "size": "1024x1024"
    },
    {
      "prompt": "...",
      "provider": "openai-dalle",
      "size": "1792x1024"
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

Generates 5 images using pre-built prompts covering:
- Healthcare (surgeon with holographic data)
- Manufacturing (welder with robotic arm)
- Technology (data analyst with floating charts)
- Retail (barista with AI coffee robot)
- Construction (operator controlling autonomous excavator)

Alternates between Google Imagen and OpenAI DALL-E providers.

### Get Image Status

```bash
GET /images/:id
```

Returns image status, URL, and metadata.

### List Available Prompts

```bash
GET /prompts
```

Returns all available prompt templates.

## RPC Interface

```typescript
const imagenService = env.IMAGEN_SERVICE

// Generate image
const image = await imagenService.generateImage({
  prompt: '...',
  provider: 'google-imagen',
  size: '1024x1024',
})

// Generate batch
const batch = await imagenService.generateBatch({
  prompts: [...]
})

// Generate test batch
const test = await imagenService.generateTestBatch()

// Get image
const image = await imagenService.getImage('01HXYZ...')
```

## Prompt Best Practices

The service follows best practices for both providers:

1. **Be descriptive and specific** - Include details about subject, setting, style
2. **Specify visual style** - Photography, illustration, digital art, etc.
3. **Describe lighting** - Natural light, dramatic shadows, golden hour, etc.
4. **Set mood and atmosphere** - Professional, inviting, powerful, innovative
5. **Include composition details** - Framing, perspective, focal point
6. **Specify quality level** - 4K, professional, high detail, sharp focus

## Provider Selection

### Choose Google Imagen 3 when:
- Need photorealistic results
- Want custom aspect ratios
- Need precise control with negative prompts
- Generating product photography or realistic scenes

### Choose OpenAI DALL-E 3 when:
- Need creative interpretations
- Want consistent style variations
- Generating conceptual or abstract imagery
- Need HD quality for large prints

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
OPENAI_API_KEY=your-openai-api-key
```

## Database Schema

```sql
CREATE TABLE imagen_images (
  id TEXT PRIMARY KEY,
  prompt TEXT NOT NULL,
  provider TEXT NOT NULL,
  size TEXT NOT NULL,
  status TEXT NOT NULL,
  image_url TEXT,
  r2_key TEXT,
  error TEXT,
  created_at TEXT NOT NULL,
  completed_at TEXT,
  metadata TEXT
);
```

## Configuration

The service is configured in `wrangler.jsonc`:

- **R2 Bucket** - `imagen-images` for image storage
- **Database** - Binds to `db` service
- **Domain** - `imagen.services.do/*`

## Comparison with Veo Service

| Feature | Veo (Video) | Imagen (Image) |
|---------|-------------|----------------|
| **Output** | MP4 videos | PNG/JPEG images |
| **Providers** | Google Veo 3 | Google Imagen 3, OpenAI DALL-E 3 |
| **Generation Time** | 30-60 seconds | 5-15 seconds |
| **Storage** | ~50-200 MB per video | ~1-5 MB per image |
| **Prompts** | Detailed with audio cues | Visual and compositional details |
| **Use Cases** | Marketing videos, demos | Social media, ads, thumbnails |

## TODO

- [ ] Implement actual Google Imagen 3 API integration
- [ ] Add retry logic for failed generations
- [ ] Add webhook notifications for completion
- [ ] Add queue-based processing for scalability
- [ ] Add MCP tools for AI agent integration
- [ ] Add image optimization and compression
- [ ] Add upscaling for HD versions
- [ ] Add style transfer and image-to-image
