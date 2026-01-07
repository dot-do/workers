/**
 * brands.as - Create and manage brand assets
 *
 * Generate and manage brand identities, logos, and design systems.
 * brands.as/my-brand, brands.as/startup, brands.as/product
 *
 * @see https://brands.as
 *
 * @example
 * ```typescript
 * import { brands } from 'brands.as'
 *
 * // Create a brand
 * const brand = await brands.create({
 *   name: 'acme',
 *   displayName: 'Acme Inc',
 *   industry: 'technology',
 *   values: ['innovation', 'simplicity', 'trust']
 * })
 *
 * // Generate a logo
 * const logo = await brands.generateLogo('acme', {
 *   style: 'modern',
 *   colors: ['#3B82F6', '#1E40AF']
 * })
 *
 * // Get brand guidelines
 * const guidelines = await brands.guidelines('acme')
 * ```
 */

import { createClient, type ClientOptions } from 'rpc.do'

// Types
export interface BrandConfig {
  /** Brand name/slug */
  name: string
  /** Display name */
  displayName?: string
  /** Tagline */
  tagline?: string
  /** Industry */
  industry?: string
  /** Brand values */
  values?: string[]
  /** Target audience */
  audience?: string
  /** Brand personality traits */
  personality?: string[]
  /** Primary colors */
  colors?: string[]
  /** Typography preferences */
  typography?: {
    headings?: string
    body?: string
  }
}

export interface Brand {
  id: string
  name: string
  displayName?: string
  tagline?: string
  industry?: string
  values: string[]
  audience?: string
  personality: string[]
  status: 'draft' | 'active' | 'archived'
  createdAt: Date
  updatedAt: Date
}

export interface ColorPalette {
  primary: string
  secondary: string
  accent: string
  background: string
  text: string
  muted: string
  variations: Record<string, string[]>
}

export interface Typography {
  headings: {
    fontFamily: string
    weights: number[]
    sizes: Record<string, string>
  }
  body: {
    fontFamily: string
    weights: number[]
    lineHeight: number
  }
  code?: {
    fontFamily: string
  }
}

export interface Logo {
  id: string
  brandId: string
  type: 'primary' | 'icon' | 'wordmark' | 'combination'
  variants: {
    light: string
    dark: string
    monochrome: string
  }
  formats: {
    svg: string
    png: Record<string, string>
    pdf?: string
  }
  createdAt: Date
}

export interface LogoGenerateOptions {
  style?: 'modern' | 'classic' | 'playful' | 'minimal' | 'bold'
  colors?: string[]
  iconStyle?: 'abstract' | 'literal' | 'lettermark' | 'mascot'
  variations?: number
}

export interface BrandGuidelines {
  brand: Brand
  colors: ColorPalette
  typography: Typography
  logos: Logo[]
  voiceAndTone: {
    voice: string[]
    tone: string[]
    doAndDonts: { do: string[]; dont: string[] }
  }
  usage: {
    logoUsage: string[]
    colorUsage: string[]
    spacing: Record<string, string>
  }
  downloadUrl: string
}

export interface BrandAsset {
  id: string
  brandId: string
  type: 'logo' | 'icon' | 'illustration' | 'photo' | 'pattern' | 'template'
  name: string
  url: string
  formats: string[]
  tags: string[]
  createdAt: Date
}

// Client interface
export interface BrandsAsClient {
  /**
   * Create a brand
   */
  create(config: BrandConfig): Promise<Brand>

  /**
   * Get brand details
   */
  get(name: string): Promise<Brand>

  /**
   * List all brands
   */
  list(options?: { status?: Brand['status']; limit?: number }): Promise<Brand[]>

  /**
   * Update a brand
   */
  update(name: string, config: Partial<BrandConfig>): Promise<Brand>

  /**
   * Delete a brand
   */
  delete(name: string): Promise<void>

  /**
   * Generate a logo
   */
  generateLogo(name: string, options?: LogoGenerateOptions): Promise<Logo[]>

  /**
   * Get logos
   */
  logos(name: string): Promise<Logo[]>

  /**
   * Set primary logo
   */
  setPrimaryLogo(name: string, logoId: string): Promise<Brand>

  /**
   * Delete a logo
   */
  deleteLogo(name: string, logoId: string): Promise<void>

  /**
   * Generate color palette
   */
  generateColors(name: string, options?: { baseColor?: string; mood?: string }): Promise<ColorPalette>

  /**
   * Get color palette
   */
  colors(name: string): Promise<ColorPalette>

  /**
   * Set color palette
   */
  setColors(name: string, palette: Partial<ColorPalette>): Promise<ColorPalette>

  /**
   * Generate typography
   */
  generateTypography(name: string, options?: { style?: string }): Promise<Typography>

  /**
   * Get typography
   */
  typography(name: string): Promise<Typography>

  /**
   * Set typography
   */
  setTypography(name: string, typography: Partial<Typography>): Promise<Typography>

  /**
   * Get brand guidelines
   */
  guidelines(name: string): Promise<BrandGuidelines>

  /**
   * Export brand kit
   */
  export(name: string, format?: 'zip' | 'figma' | 'sketch'): Promise<string>

  /**
   * Upload an asset
   */
  uploadAsset(name: string, asset: { type: BrandAsset['type']; name: string; file: ArrayBuffer; tags?: string[] }): Promise<BrandAsset>

  /**
   * List assets
   */
  assets(name: string, options?: { type?: BrandAsset['type']; limit?: number }): Promise<BrandAsset[]>

  /**
   * Delete an asset
   */
  deleteAsset(name: string, assetId: string): Promise<void>

  /**
   * Generate social media kit
   */
  socialKit(name: string, platforms?: ('twitter' | 'linkedin' | 'facebook' | 'instagram')[]): Promise<Record<string, { profile: string; cover: string; post: string }>>

  /**
   * Generate brand from description
   */
  generate(prompt: string): Promise<Brand>
}

/**
 * Create a configured brands.as client
 */
export function Brands(options?: ClientOptions): BrandsAsClient {
  return createClient<BrandsAsClient>('https://brands.as', options)
}

/**
 * Default brands.as client instance
 */
export const brands: BrandsAsClient = Brands()

// Convenience exports
export const create = (config: BrandConfig) => brands.create(config)
export const generateLogo = (name: string, options?: LogoGenerateOptions) => brands.generateLogo(name, options)
export const guidelines = (name: string) => brands.guidelines(name)

export default brands

// Re-export types
export type { ClientOptions } from 'rpc.do'
