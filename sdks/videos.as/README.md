# videos.as

**Video that just works. No infrastructure required.**

```bash
npm install videos.as
```

---

## Video Is the Future. Video Infrastructure Is a Nightmare.

You know video converts better. You know video builds trust. You know video is what your audience wants.

But adding video means:
- Transcoding pipelines that break at scale
- CDN configuration across regions
- Player implementations across devices
- Storage costs that spiral
- Caption generation that's never accurate
- Analytics that require a data team

**You wanted to add video to your product, not become a video company.**

## Video Infrastructure That Disappears

```typescript
import { videos } from 'videos.as'

const video = await videos.upload({
  file: './tutorial.mp4',
  title: 'Getting Started Tutorial',
  captions: true  // AI-generated captions
})

// Embed anywhere
console.log(video.embedCode)

// AI understands your content
const summary = await videos.summarize(video.id)
```

**videos.as** gives you:
- Upload and forget - transcoding handled
- Global CDN - fast everywhere
- AI captions in any language
- Smart chapters and summaries
- Detailed analytics
- Live streaming included

## Add Video in 3 Steps

### 1. Upload Your Content

```typescript
import { videos } from 'videos.as'

const video = await videos.upload({
  file: videoBuffer,  // or URL
  title: 'Product Demo',
  description: 'See how easy it is to get started',
  visibility: 'public',
  captions: true
})

// Status updates as it processes
console.log(video.status)  // 'processing' -> 'ready'
```

### 2. Embed Everywhere

```typescript
// Get embed code
const embed = await videos.embed(video.id, {
  autoplay: false,
  controls: true,
  width: 800
})

// Or use the direct URLs
console.log(video.url)        // Web player
console.log(video.hlsUrl)     // HLS stream
console.log(video.thumbnailUrl)
```

### 3. Let AI Enhance Your Content

```typescript
// Generate smart chapters
const chapters = await videos.generateChapters(video.id)
// [{ title: 'Introduction', startTime: 0 }, { title: 'Setup', startTime: 45 }, ...]

// Get AI summary
const content = await videos.summarize(video.id)
console.log(content.summary)     // TL;DR of your video
console.log(content.highlights)  // Key points
console.log(content.keywords)    // SEO tags

// Search within videos
const results = await videos.search(video.id, 'pricing')
// Jump to exact moments that mention pricing
```

## Video Without the Pain

**The old way:**
- FFmpeg pipelines to maintain
- S3 + CloudFront to configure
- Custom player development
- Manual caption uploads
- No idea what's working

**The videos.as way:**
- Upload and it works
- CDN included
- Player included
- AI captions included
- Analytics included

## Everything for Video-First Products

```typescript
// Organize with folders
const folder = await videos.createFolder({ name: 'Tutorials' })
await videos.moveToFolder(video.id, folder.id)

// Track engagement
const metrics = await videos.metrics(video.id)
console.log(`${metrics.views} views`)
console.log(`${metrics.avgWatchTime}s average watch time`)
console.log(`${metrics.completionRate}% completion rate`)
console.log(`Drop-off at: ${metrics.dropOffPoints[0].time}s`)

// Create clips from longer videos
const clip = await videos.clip(video.id, {
  start: 30,
  end: 60,
  title: 'The Key Insight'
})

// Go live
const stream = await videos.createLiveStream({ title: 'Launch Event' })
console.log(`RTMP URL: ${stream.rtmpUrl}`)
console.log(`Stream Key: ${stream.streamKey}`)
```

## Your Content Deserves Great Video

Video builds connection. Video builds trust. Video converts.

**Don't let infrastructure be the reason you're not using video.**

```bash
npm install videos.as
```

[Start streaming at videos.as](https://videos.as)

---

MIT License
