# TODO - AI Service (@do/ai)

## High Priority

### Image Generation with OpenAI Imagen
- [ ] Add `generateImage()` RPC method to AIService class
- [ ] Implement OpenAI DALL-E 3 integration
- [ ] Support image generation parameters:
  - `prompt`: string - Text description of image
  - `size`: '1024x1024' | '1792x1024' | '1024x1792'
  - `quality`: 'standard' | 'hd'
  - `style`: 'vivid' | 'natural'
  - `n`: number - Number of images (1-10)
- [ ] Add HTTP endpoint: `POST /ai/generate-image`
- [ ] Add MCP tool: `generate_image`
- [ ] Add cost tracking (DALL-E 3 pricing: $0.040-0.120 per image)
- [ ] Add tests for image generation
- [ ] Update README.md with image generation docs
- [ ] Add type definitions to types.ts

**Use Case:** Generate avatar images for named agents (Amy, Alex, Morgan, Riley, Jordan, Taylor, Sam)

**Example API:**
```typescript
// RPC
const result = await env.AI.generateImage({
  prompt: "Professional headshot of a warm, consultative sales representative, friendly smile, confident expression, modern office background, studio lighting, 8k",
  size: "1024x1024",
  quality: "hd",
  style: "natural",
  n: 1
})

// HTTP
POST /ai/generate-image
{
  "prompt": "...",
  "size": "1024x1024",
  "quality": "hd"
}

// Response
{
  "images": [
    {
      "url": "https://...",
      "b64_json": "base64...",
      "revised_prompt": "..."
    }
  ],
  "model": "dall-e-3",
  "provider": "openai",
  "cost": 0.040,
  "latency": 8500
}
```

**OpenAI API Reference:**
- https://platform.openai.com/docs/api-reference/images/create
- Model: `dall-e-3`
- Endpoint: `https://api.openai.com/v1/images/generations`

## Medium Priority

- [ ] Add vision/multimodal support (GPT-4 Vision, Claude with images)
- [ ] Add audio transcription (Whisper)
- [ ] Add text-to-speech (OpenAI TTS)
- [ ] Improve streaming performance
- [ ] Add caching layer for repeated prompts

## Low Priority

- [ ] Add fine-tuning support
- [ ] Add batch processing for embeddings
- [ ] Implement request queuing for rate limits
- [ ] Add prompt templates library

---

**Last Updated:** 2025-10-04
**Next Task:** Implement image generation for agent avatar creation
