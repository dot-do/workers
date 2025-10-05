/**
 * Schema.org Type Definitions and Validation
 * Zod schemas for common Schema.org types
 */

import { z } from 'zod'

// ============================================================================
// Base Schema.org Type
// ============================================================================

export const ThingSchema = z.object({
  '@context': z.literal('https://schema.org').optional(),
  '@type': z.string(),
  '@id': z.string().url().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  url: z.string().url().optional(),
  image: z.string().url().optional(),
  identifier: z.string().optional(),
  sameAs: z.array(z.string().url()).optional(),
  additionalType: z.string().url().optional(),
  alternateName: z.string().optional(),
})

export type Thing = z.infer<typeof ThingSchema>

// ============================================================================
// Person Schema
// ============================================================================

export const PersonSchema = ThingSchema.extend({
  '@type': z.literal('Person'),
  givenName: z.string().optional(),
  familyName: z.string().optional(),
  email: z.string().email().optional(),
  telephone: z.string().optional(),
  jobTitle: z.string().optional(),
  worksFor: z.string().url().optional(), // URI reference
  affiliation: z.string().url().optional(),
  alumniOf: z.string().url().optional(),
  award: z.array(z.string()).optional(),
  birthDate: z.string().optional(),
  birthPlace: z.string().optional(),
  gender: z.string().optional(),
  nationality: z.string().optional(),
  knows: z.array(z.string().url()).optional(), // URI references
})

export type Person = z.infer<typeof PersonSchema>

// ============================================================================
// Organization Schema
// ============================================================================

export const OrganizationSchema = ThingSchema.extend({
  '@type': z.literal('Organization'),
  legalName: z.string().optional(),
  address: z.string().optional(),
  email: z.string().email().optional(),
  telephone: z.string().optional(),
  foundingDate: z.string().optional(),
  founder: z.array(z.string().url()).optional(), // URI references
  numberOfEmployees: z.number().optional(),
  location: z.string().optional(),
  parentOrganization: z.string().url().optional(),
  subOrganization: z.array(z.string().url()).optional(),
  department: z.array(z.string().url()).optional(),
  member: z.array(z.string().url()).optional(),
  award: z.array(z.string()).optional(),
  brand: z.string().optional(),
  logo: z.string().url().optional(),
})

export type Organization = z.infer<typeof OrganizationSchema>

// ============================================================================
// Product Schema
// ============================================================================

export const ProductSchema = ThingSchema.extend({
  '@type': z.literal('Product'),
  brand: z.string().optional(),
  manufacturer: z.string().url().optional(), // URI reference
  category: z.string().optional(),
  sku: z.string().optional(),
  gtin: z.string().optional(),
  productID: z.string().optional(),
  offers: z.array(z.string().url()).optional(), // URI references
  aggregateRating: z
    .object({
      ratingValue: z.number(),
      reviewCount: z.number(),
    })
    .optional(),
  review: z.array(z.string().url()).optional(),
  releaseDate: z.string().optional(),
})

export type Product = z.infer<typeof ProductSchema>

// ============================================================================
// CreativeWork Schema
// ============================================================================

export const CreativeWorkSchema = ThingSchema.extend({
  '@type': z.literal('CreativeWork'),
  author: z.array(z.string().url()).optional(), // URI references
  creator: z.array(z.string().url()).optional(),
  dateCreated: z.string().optional(),
  dateModified: z.string().optional(),
  datePublished: z.string().optional(),
  publisher: z.string().url().optional(),
  license: z.string().url().optional(),
  version: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  inLanguage: z.string().optional(),
  genre: z.string().optional(),
  abstract: z.string().optional(),
  text: z.string().optional(),
  encodingFormat: z.string().optional(),
})

export type CreativeWork = z.infer<typeof CreativeWorkSchema>

// ============================================================================
// SoftwareApplication Schema
// ============================================================================

export const SoftwareApplicationSchema = CreativeWorkSchema.extend({
  '@type': z.literal('SoftwareApplication'),
  applicationCategory: z.string().optional(),
  applicationSubCategory: z.string().optional(),
  downloadUrl: z.string().url().optional(),
  installUrl: z.string().url().optional(),
  operatingSystem: z.string().optional(),
  softwareVersion: z.string().optional(),
  softwareRequirements: z.string().optional(),
  permissions: z.array(z.string()).optional(),
  availableOnDevice: z.string().optional(),
  countriesSupported: z.array(z.string()).optional(),
  screenshot: z.array(z.string().url()).optional(),
})

export type SoftwareApplication = z.infer<typeof SoftwareApplicationSchema>

// ============================================================================
// Place Schema
// ============================================================================

export const PlaceSchema = ThingSchema.extend({
  '@type': z.literal('Place'),
  address: z.string().optional(),
  geo: z
    .object({
      latitude: z.number(),
      longitude: z.number(),
    })
    .optional(),
  containedInPlace: z.string().url().optional(), // URI reference
  containsPlace: z.array(z.string().url()).optional(),
})

export type Place = z.infer<typeof PlaceSchema>

// ============================================================================
// Event Schema
// ============================================================================

export const EventSchema = ThingSchema.extend({
  '@type': z.literal('Event'),
  startDate: z.string(),
  endDate: z.string().optional(),
  location: z.string().url().optional(), // URI reference
  organizer: z.array(z.string().url()).optional(),
  performer: z.array(z.string().url()).optional(),
  attendee: z.array(z.string().url()).optional(),
  eventStatus: z.string().optional(),
  eventAttendanceMode: z.string().optional(),
})

export type Event = z.infer<typeof EventSchema>

// ============================================================================
// Offer Schema
// ============================================================================

export const OfferSchema = ThingSchema.extend({
  '@type': z.literal('Offer'),
  price: z.number().optional(),
  priceCurrency: z.string().optional(),
  availability: z.string().optional(),
  itemOffered: z.string().url().optional(), // URI reference
  seller: z.string().url().optional(),
  validFrom: z.string().optional(),
  validThrough: z.string().optional(),
})

export type Offer = z.infer<typeof OfferSchema>

// ============================================================================
// Type Registry - Map string types to Zod schemas
// ============================================================================

export const SchemaOrgTypes = {
  Thing: ThingSchema,
  Person: PersonSchema,
  Organization: OrganizationSchema,
  Product: ProductSchema,
  CreativeWork: CreativeWorkSchema,
  SoftwareApplication: SoftwareApplicationSchema,
  Place: PlaceSchema,
  Event: EventSchema,
  Offer: OfferSchema,
} as const

export type SchemaOrgTypeName = keyof typeof SchemaOrgTypes

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate a thing against its Schema.org type
 */
export function validateThing(type: string, data: unknown): Thing {
  const schema = SchemaOrgTypes[type as SchemaOrgTypeName] || ThingSchema
  return schema.parse(data)
}

/**
 * Check if a type is a valid Schema.org type
 */
export function isValidType(type: string): type is SchemaOrgTypeName {
  return type in SchemaOrgTypes
}

/**
 * Get the Zod schema for a Schema.org type
 */
export function getSchemaForType(type: string) {
  return SchemaOrgTypes[type as SchemaOrgTypeName] || ThingSchema
}

// ============================================================================
// Common Schema.org Predicates (Relationships)
// ============================================================================

export const CommonPredicates = {
  // Person relationships
  worksFor: 'https://schema.org/worksFor',
  knows: 'https://schema.org/knows',
  alumniOf: 'https://schema.org/alumniOf',
  affiliation: 'https://schema.org/affiliation',
  parent: 'https://schema.org/parent',
  children: 'https://schema.org/children',
  spouse: 'https://schema.org/spouse',
  sibling: 'https://schema.org/sibling',

  // Organization relationships
  parentOrganization: 'https://schema.org/parentOrganization',
  subOrganization: 'https://schema.org/subOrganization',
  department: 'https://schema.org/department',
  member: 'https://schema.org/member',
  founder: 'https://schema.org/founder',

  // Creative work relationships
  author: 'https://schema.org/author',
  creator: 'https://schema.org/creator',
  publisher: 'https://schema.org/publisher',
  contributor: 'https://schema.org/contributor',

  // Product relationships
  manufacturer: 'https://schema.org/manufacturer',
  brand: 'https://schema.org/brand',
  offers: 'https://schema.org/offers',

  // Generic relationships
  relatedTo: 'https://schema.org/relatedTo',
  about: 'https://schema.org/about',
  mentions: 'https://schema.org/mentions',
  partOf: 'https://schema.org/isPartOf',
  hasPart: 'https://schema.org/hasPart',
} as const

/**
 * Get the inverse of a predicate (if it exists)
 */
export function getInversePredicate(predicate: string): string | undefined {
  const inverseMap: Record<string, string> = {
    [CommonPredicates.worksFor]: 'https://schema.org/employee',
    [CommonPredicates.parentOrganization]: CommonPredicates.subOrganization,
    [CommonPredicates.subOrganization]: CommonPredicates.parentOrganization,
    [CommonPredicates.partOf]: CommonPredicates.hasPart,
    [CommonPredicates.hasPart]: CommonPredicates.partOf,
    [CommonPredicates.parent]: CommonPredicates.children,
    [CommonPredicates.children]: CommonPredicates.parent,
  }
  return inverseMap[predicate]
}

// ============================================================================
// URI Builders
// ============================================================================

/**
 * Build a Schema.org URI for a thing
 */
export function buildThingUri(type: string, id: string): string {
  return `https://schema.org/${type}/${id}`
}

/**
 * Build a predicate URI
 */
export function buildPredicateUri(property: string): string {
  return `https://schema.org/${property}`
}

/**
 * Parse a Schema.org URI
 */
export function parseSchemaOrgUri(uri: string): { type: string; id: string } | null {
  const match = uri.match(/^https:\/\/schema\.org\/([^/]+)\/(.+)$/)
  if (!match) return null
  return { type: match[1], id: match[2] }
}
