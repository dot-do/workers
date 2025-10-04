import { readFileSync, readdirSync, statSync } from 'fs'
import { join, extname } from 'path'
import matter from 'gray-matter'
import type { CollectionConfig, Field } from 'payload'
import type { MDXCollectionFrontmatter, MDXField, ParsedCollection } from './types'

/**
 * Parse an MDX file and extract collection configuration
 */
export function parseCollectionMDX(filePath: string): ParsedCollection | null {
  try {
    const content = readFileSync(filePath, 'utf-8')
    const { data, content: mdxContent } = matter(content)

    // Validate required fields
    if (!data.name || !data.slug || !data.fields) {
      console.warn(`MDX file ${filePath} missing required fields (name, slug, fields)`)
      return null
    }

    const frontmatter = data as MDXCollectionFrontmatter

    // Convert MDX config to Payload CollectionConfig
    const config: CollectionConfig = {
      slug: frontmatter.slug,
      fields: convertMDXFields(frontmatter.fields),
      admin: frontmatter.admin
        ? {
            useAsTitle: frontmatter.admin.useAsTitle,
            defaultColumns: frontmatter.admin.defaultColumns,
            group: frontmatter.admin.group,
            description: frontmatter.admin.description,
          }
        : undefined,
      access: convertAccess(frontmatter.access),
      hooks: convertHooks(frontmatter.hooks),
      timestamps: frontmatter.timestamps !== false, // Default true
    }

    return {
      config,
      mdxSource: content,
      filePath,
    }
  } catch (error) {
    console.error(`Error parsing MDX file ${filePath}:`, error)
    return null
  }
}

/**
 * Convert MDX field definitions to Payload Field objects
 */
function convertMDXFields(mdxFields: MDXField[]): Field[] {
  return mdxFields.map((field) => {
    const baseField: any = {
      name: field.name,
      type: field.type,
      label: field.label,
      required: field.required,
      unique: field.unique,
      defaultValue: field.defaultValue,
      admin: field.admin,
    }

    // Handle relationship fields
    if (field.type === 'relationship') {
      baseField.relationTo = field.relationTo
      baseField.hasMany = field.hasMany
    }

    // Handle array fields
    if (field.type === 'array') {
      baseField.fields = field.fields ? convertMDXFields(field.fields) : []
      baseField.minRows = field.minRows
      baseField.maxRows = field.maxRows
    }

    // Handle select/radio fields
    if (field.type === 'select' || field.type === 'radio') {
      baseField.options = field.options
    }

    // Handle text fields
    if (field.type === 'text' || field.type === 'textarea') {
      baseField.minLength = field.minLength
      baseField.maxLength = field.maxLength
    }

    // Handle number fields
    if (field.type === 'number') {
      baseField.min = field.min
      baseField.max = field.max
    }

    // Handle blocks/richText
    if (field.type === 'blocks' || field.type === 'richText') {
      baseField.blocks = field.blocks
    }

    return baseField as Field
  })
}

/**
 * Convert MDX access rules to Payload access control
 */
function convertAccess(access?: MDXCollectionFrontmatter['access']) {
  if (!access) return undefined

  return {
    read: convertAccessRule(access.read),
    create: convertAccessRule(access.create),
    update: convertAccessRule(access.update),
    delete: convertAccessRule(access.delete),
  }
}

/**
 * Convert single access rule (supports strings like 'authenticated', 'admin')
 */
function convertAccessRule(rule?: boolean | string) {
  if (rule === undefined) return undefined
  if (typeof rule === 'boolean') return () => rule

  // Convert string rules to functions
  if (rule === 'authenticated') {
    return ({ req }: any) => Boolean(req.user)
  }
  if (rule === 'admin') {
    return ({ req }: any) => Boolean(req.user?.role === 'admin')
  }
  if (rule === 'public') {
    return () => true
  }

  // Default: parse as boolean
  return () => rule === 'true'
}

/**
 * Convert MDX hooks (hook names as strings) to Payload hook functions
 */
function convertHooks(hooks?: MDXCollectionFrontmatter['hooks']) {
  if (!hooks) return undefined

  // For now, just log hook names - actual implementation will require hook registry
  const convertedHooks: any = {}

  if (hooks.beforeChange) {
    convertedHooks.beforeChange = hooks.beforeChange.map((hookName: string) => {
      return async ({ data, req }: any) => {
        console.log(`Hook: ${hookName} (beforeChange)`)
        // TODO: Look up and execute registered hook function
        return data
      }
    })
  }

  if (hooks.afterChange) {
    convertedHooks.afterChange = hooks.afterChange.map((hookName: string) => {
      return async ({ doc, req }: any) => {
        console.log(`Hook: ${hookName} (afterChange)`)
        // TODO: Look up and execute registered hook function
        return doc
      }
    })
  }

  // Add other hook types as needed

  return convertedHooks
}

/**
 * Scan a directory recursively for MDX collection files
 */
export function scanCollectionDirectory(dir: string): ParsedCollection[] {
  const collections: ParsedCollection[] = []

  function walk(currentPath: string) {
    const files = readdirSync(currentPath)

    for (const file of files) {
      const filePath = join(currentPath, file)
      const stat = statSync(filePath)

      if (stat.isDirectory()) {
        walk(filePath)
      } else if (extname(file) === '.mdx') {
        const parsed = parseCollectionMDX(filePath)
        if (parsed) {
          collections.push(parsed)
        }
      }
    }
  }

  try {
    walk(dir)
  } catch (error) {
    console.error(`Error scanning directory ${dir}:`, error)
  }

  return collections
}

/**
 * Load all collections from specified directories
 */
export function loadCollectionsFromMDX(dirs: string[]): CollectionConfig[] {
  const allCollections: CollectionConfig[] = []

  for (const dir of dirs) {
    const collections = scanCollectionDirectory(dir)
    allCollections.push(...collections.map((c) => c.config))
  }

  return allCollections
}
