/**
 * R2 Storage Utilities
 * Upload generated media (images, audio, video) to R2 bucket
 */

import type { AIServiceEnv } from './types'

/**
 * Generate unique filename for media
 */
export function generateMediaFilename(type: 'image' | 'audio' | 'video', extension: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 15)
  return `${type}/${timestamp}-${random}.${extension}`
}

/**
 * Upload image to R2
 * @returns R2 URL for the uploaded image
 */
export async function uploadImageToR2(
  env: AIServiceEnv,
  imageData: ArrayBuffer | Uint8Array | string,
  mimeType: string = 'image/png'
): Promise<string> {
  const extension = mimeType.split('/')[1] || 'png'
  const filename = generateMediaFilename('image', extension)

  // Convert data to appropriate format
  let data: ArrayBuffer
  if (typeof imageData === 'string') {
    // Base64 string
    const binaryString = atob(imageData)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    data = bytes.buffer
  } else if (imageData instanceof Uint8Array) {
    data = imageData.buffer
  } else {
    data = imageData
  }

  await env.MEDIA_BUCKET.put(filename, data, {
    httpMetadata: {
      contentType: mimeType,
    },
  })

  // Return public URL (assuming bucket has public access or custom domain)
  return `https://media.ai.do/${filename}`
}

/**
 * Download image from URL and upload to R2
 * @returns R2 URL for the uploaded image
 */
export async function downloadAndUploadImage(
  env: AIServiceEnv,
  imageUrl: string,
  mimeType: string = 'image/png'
): Promise<string> {
  const response = await fetch(imageUrl)
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status} ${response.statusText}`)
  }

  const imageData = await response.arrayBuffer()
  return await uploadImageToR2(env, imageData, mimeType)
}

/**
 * Upload audio to R2
 * @returns R2 URL for the uploaded audio
 */
export async function uploadAudioToR2(
  env: AIServiceEnv,
  audioData: ArrayBuffer,
  format: string = 'mp3'
): Promise<string> {
  const filename = generateMediaFilename('audio', format)
  const mimeType = `audio/${format}`

  await env.MEDIA_BUCKET.put(filename, audioData, {
    httpMetadata: {
      contentType: mimeType,
    },
  })

  // Return public URL
  return `https://media.ai.do/${filename}`
}

/**
 * Upload video to R2 (for future video generation)
 * @returns R2 URL for the uploaded video
 */
export async function uploadVideoToR2(
  env: AIServiceEnv,
  videoData: ArrayBuffer,
  format: string = 'mp4'
): Promise<string> {
  const filename = generateMediaFilename('video', format)
  const mimeType = `video/${format}`

  await env.MEDIA_BUCKET.put(filename, videoData, {
    httpMetadata: {
      contentType: mimeType,
    },
  })

  // Return public URL
  return `https://media.ai.do/${filename}`
}

/**
 * Delete media from R2
 */
export async function deleteMediaFromR2(env: AIServiceEnv, filename: string): Promise<void> {
  await env.MEDIA_BUCKET.delete(filename)
}

/**
 * Get media metadata from R2
 */
export async function getMediaMetadata(env: AIServiceEnv, filename: string): Promise<R2Object | null> {
  return await env.MEDIA_BUCKET.head(filename)
}
