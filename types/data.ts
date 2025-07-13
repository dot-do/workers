export type Data = {
  id: `https://${string}`
  type?: string
  data?: any
  content?: string
  meta?: any
}

export type $Data = {
  $id: `https://${string}`
  $type?: string
  $data?: any
  $code?: string
  $content?: string
  $meta?: any
} & Record<string, any>

export type Meta = {
  created: string
  updated: string
  version: number
  mdast: any
  html: string
  hash: string
  tags: string[]
  author: string
  source: string
  license: string
  description: string
}