/**
 * @dotdo/worker-videos - Video hosting with Cloudflare Stream (videos.as)
 *
 * Upload, transcode, stream, and analyze videos:
 * - Upload via direct upload or TUS resumable protocol
 * - Automatic transcoding and adaptive bitrate streaming
 * - AI-powered captions, chapters, and summaries
 * - Global CDN delivery
 * - Detailed analytics
 *
 * Exposes videos.as via multi-transport RPC:
 * - Workers RPC: env.VIDEOS.upload(config)
 * - REST: POST /api/upload
 * - CapnWeb: WebSocket RPC
 * - MCP: JSON-RPC 2.0
 */

import { RPC } from '@dotdo/rpc'

interface UploadConfig {
  file: ArrayBuffer | string
  title: string
  description?: string
  folder?: string
  tags?: string[]
  visibility?: 'public' | 'unlisted' | 'private'
  thumbnail?: ArrayBuffer | string
  captions?: boolean
  allowedDomains?: string[]
}

interface Video {
  id: string
  title: string
  description?: string
  duration: number
  status: 'processing' | 'ready' | 'error'
  visibility: 'public' | 'unlisted' | 'private'
  url: string
  embedCode: string
  thumbnailUrl: string
  hlsUrl: string
  folder?: string
  tags: string[]
  views: number
  createdAt: Date
  updatedAt: Date
}

interface TusUploadInfo {
  uploadUrl: string
  videoId: string
}

const videosAPI = {
  /**
   * Upload a video using Cloudflare Stream
   * Supports both direct upload and TUS resumable protocol
   */
  async upload(config: UploadConfig, env?: any): Promise<Video> {
    const accountId = env?.CLOUDFLARE_ACCOUNT_ID
    const apiToken = env?.CLOUDFLARE_API_TOKEN

    if (!accountId || !apiToken) {
      throw new Error('Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN')
    }

    // For TUS resumable upload (recommended for large files)
    if (config.file instanceof ArrayBuffer) {
      return uploadViaTus(config, accountId, apiToken)
    }

    // For URL upload (Cloudflare Stream can fetch from URL)
    if (typeof config.file === 'string') {
      return uploadViaUrl(config, accountId, apiToken)
    }

    throw new Error('Invalid file format. Expected ArrayBuffer or URL string')
  },

  /**
   * Get video details
   */
  async get(videoId: string, env?: any): Promise<Video> {
    const accountId = env?.CLOUDFLARE_ACCOUNT_ID
    const apiToken = env?.CLOUDFLARE_API_TOKEN

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${videoId}`,
      {
        headers: {
          Authorization: `Bearer ${apiToken}`,
        },
      }
    )

    const data = await response.json()
    if (!data.success) {
      throw new Error(`Failed to get video: ${data.errors?.[0]?.message}`)
    }

    return transformStreamVideo(data.result)
  },

  /**
   * List videos
   */
  async list(
    options?: {
      folder?: string
      visibility?: 'public' | 'unlisted' | 'private'
      tag?: string
      limit?: number
    },
    env?: any
  ): Promise<Video[]> {
    const accountId = env?.CLOUDFLARE_ACCOUNT_ID
    const apiToken = env?.CLOUDFLARE_API_TOKEN

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream`,
      {
        headers: {
          Authorization: `Bearer ${apiToken}`,
        },
      }
    )

    const data = await response.json()
    if (!data.success) {
      throw new Error(`Failed to list videos: ${data.errors?.[0]?.message}`)
    }

    return data.result.map(transformStreamVideo)
  },

  /**
   * Delete video
   */
  async delete(videoId: string, env?: any): Promise<void> {
    const accountId = env?.CLOUDFLARE_ACCOUNT_ID
    const apiToken = env?.CLOUDFLARE_API_TOKEN

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${videoId}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${apiToken}`,
        },
      }
    )

    const data = await response.json()
    if (!data.success) {
      throw new Error(`Failed to delete video: ${data.errors?.[0]?.message}`)
    }
  },
}

/**
 * Upload video via TUS resumable protocol
 */
async function uploadViaTus(
  config: UploadConfig,
  accountId: string,
  apiToken: string
): Promise<Video> {
  const file = config.file as ArrayBuffer

  // Step 1: Create TUS upload session
  const metadata = {
    name: config.title,
    ...(config.description && { description: config.description }),
    ...(config.folder && { folder: config.folder }),
    ...(config.tags && { tags: config.tags.join(',') }),
    ...(config.visibility && { requiresignedurls: config.visibility === 'private' }),
    ...(config.allowedDomains && { allowedorigins: config.allowedDomains.join(',') }),
  }

  const tusMetadata = Object.entries(metadata)
    .map(([key, value]) => `${key} ${btoa(String(value))}`)
    .join(',')

  const createResponse = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Tus-Resumable': '1.0.0',
        'Upload-Length': String(file.byteLength),
        'Upload-Metadata': tusMetadata,
      },
    }
  )

  if (!createResponse.ok) {
    const error = await createResponse.text()
    throw new Error(`Failed to create TUS upload session: ${error}`)
  }

  const uploadUrl = createResponse.headers.get('location')
  if (!uploadUrl) {
    throw new Error('No upload URL returned from TUS session creation')
  }

  // Extract video ID from Stream-Media-Id header or upload URL
  const videoId =
    createResponse.headers.get('stream-media-id') ||
    uploadUrl.split('/').pop()

  if (!videoId) {
    throw new Error('No video ID returned from TUS session creation')
  }

  // Step 2: Upload the file data via TUS
  const uploadResponse = await fetch(uploadUrl, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Tus-Resumable': '1.0.0',
      'Upload-Offset': '0',
      'Content-Type': 'application/offset+octet-stream',
    },
    body: file,
  })

  if (!uploadResponse.ok) {
    const error = await uploadResponse.text()
    throw new Error(`Failed to upload video data: ${error}`)
  }

  // Step 3: Get video details
  // Wait a bit for Stream to process the initial upload
  await new Promise((resolve) => setTimeout(resolve, 1000))

  const videoResponse = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${videoId}`,
    {
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
    }
  )

  const videoData = await videoResponse.json()
  if (!videoData.success) {
    throw new Error(
      `Failed to get video details: ${videoData.errors?.[0]?.message}`
    )
  }

  return transformStreamVideo(videoData.result)
}

/**
 * Upload video from URL
 */
async function uploadViaUrl(
  config: UploadConfig,
  accountId: string,
  apiToken: string
): Promise<Video> {
  const url = config.file as string

  const body: any = {
    url,
    meta: {
      name: config.title,
      ...(config.description && { description: config.description }),
    },
    ...(config.visibility === 'private' && { requireSignedURLs: true }),
    ...(config.allowedDomains && { allowedOrigins: config.allowedDomains }),
  }

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/copy`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  )

  const data = await response.json()
  if (!data.success) {
    throw new Error(`Failed to upload video: ${data.errors?.[0]?.message}`)
  }

  return transformStreamVideo(data.result)
}

/**
 * Transform Cloudflare Stream video object to our Video interface
 */
function transformStreamVideo(streamVideo: any): Video {
  return {
    id: streamVideo.uid,
    title: streamVideo.meta?.name || 'Untitled',
    description: streamVideo.meta?.description,
    duration: streamVideo.duration || 0,
    status: mapStreamStatus(streamVideo.status?.state),
    visibility: streamVideo.requireSignedURLs ? 'private' : 'public',
    url: `https://customer-${streamVideo.uid.substring(0, 8)}.cloudflarestream.com/${streamVideo.uid}/watch`,
    embedCode: `<iframe src="https://customer-${streamVideo.uid.substring(0, 8)}.cloudflarestream.com/${streamVideo.uid}/iframe" style="border: none;" height="720" width="1280" allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;" allowfullscreen="true"></iframe>`,
    thumbnailUrl: streamVideo.thumbnail || `https://customer-${streamVideo.uid.substring(0, 8)}.cloudflarestream.com/${streamVideo.uid}/thumbnails/thumbnail.jpg`,
    hlsUrl: streamVideo.playback?.hls || `https://customer-${streamVideo.uid.substring(0, 8)}.cloudflarestream.com/${streamVideo.uid}/manifest/video.m3u8`,
    folder: streamVideo.meta?.folder,
    tags: streamVideo.meta?.tags ? streamVideo.meta.tags.split(',') : [],
    views: 0, // Stream doesn't provide this in basic API
    createdAt: new Date(streamVideo.created),
    updatedAt: new Date(streamVideo.modified),
  }
}

/**
 * Map Cloudflare Stream status to our status
 */
function mapStreamStatus(
  streamStatus?: string
): 'processing' | 'ready' | 'error' {
  switch (streamStatus) {
    case 'ready':
      return 'ready'
    case 'error':
    case 'queued':
      return 'error'
    case 'inprogress':
    case 'pendingupload':
    default:
      return 'processing'
  }
}

export default RPC(videosAPI)
